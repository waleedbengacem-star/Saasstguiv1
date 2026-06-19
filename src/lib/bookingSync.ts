import { prisma } from './db/client';

/**
 * Synchronizes a booking to a linked partner property in another tenant organization.
 * 
 * @param bookingId The ID of the modified or created booking
 */
export async function syncBookingToLinkedProperty(bookingId: string) {
  try {
    // 1. Fetch original booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        property: true
      }
    });

    if (!booking) {
      console.log(`[Booking Sync] Booking ${bookingId} not found.`);
      return;
    }

    const bookingExtra = booking.extraDetails && typeof booking.extraDetails === 'object'
      ? (booking.extraDetails as Record<string, any>)
      : {};

    // Prevent recursive loop if this booking update came from a sync operation
    if (bookingExtra.isSyncing) {
      console.log(`[Booking Sync] Booking ${bookingId} is already in sync state. Skipping.`);
      
      // Reset isSyncing flag to false so future manual edits can be synced
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          extraDetails: {
            ...bookingExtra,
            isSyncing: false
          }
        }
      });
      return;
    }

    const property = booking.property;
    const originalGuest = booking.guest;

    let targetPropertyId: string | null = null;
    let targetOrgId: string | null = null;
    let isReverseSync = false;

    // Check if the property itself has mapping details (Forward Sync)
    const propertyExtra = property.extraDetails && typeof property.extraDetails === 'object'
      ? (property.extraDetails as Record<string, any>)
      : {};

    if (propertyExtra.linkedPropertyId && propertyExtra.linkedOrganizationId) {
      targetPropertyId = propertyExtra.linkedPropertyId;
      targetOrgId = propertyExtra.linkedOrganizationId;
    } else {
      // Check if this property is the TARGET of another property's mapping (Reverse Sync)
      // Query all properties to find if any is mapped to the current property
      const allProps = await prisma.property.findMany({
        where: { deletedAt: null }
      });
      const mappingProperty = allProps.find(p => {
        const pExtra = p.extraDetails && typeof p.extraDetails === 'object' ? (p.extraDetails as Record<string, any>) : {};
        return pExtra.linkedPropertyId === property.id;
      });

      if (mappingProperty) {
        targetPropertyId = mappingProperty.id;
        targetOrgId = mappingProperty.organizationId;
        isReverseSync = true;
      }
    }

    if (!targetPropertyId || !targetOrgId) {
      console.log(`[Booking Sync] Property ${property.id} is not linked. Skipping sync.`);
      return;
    }

    console.log(`[Booking Sync] Syncing booking ${booking.id} to org ${targetOrgId}, property ${targetPropertyId} (Reverse sync: ${isReverseSync})`);

    // 2. Find or create guest contact in the target tenant workspace
    let targetGuestId: string;
    const existingGuest = await prisma.contact.findFirst({
      where: {
        organizationId: targetOrgId,
        contactType: 'guest',
        email: originalGuest.email || undefined,
        deletedAt: null
      }
    });

    if (existingGuest) {
      targetGuestId = existingGuest.id;
    } else {
      const newGuest = await prisma.contact.create({
        data: {
          organizationId: targetOrgId,
          contactType: 'guest',
          firstName: originalGuest.firstName || 'Guest',
          lastName: originalGuest.lastName || 'Partner Sync',
          email: originalGuest.email || null,
          phone: originalGuest.phone || null,
          isActive: true
        }
      });
      targetGuestId = newGuest.id;
    }

    // 3. Determine target booking reference
    const linkedBookingId = bookingExtra.linkedBookingId || bookingExtra.linkedFromBookingId;
    let targetBooking = null;

    if (linkedBookingId) {
      const existingTarget = await prisma.booking.findUnique({
        where: { id: linkedBookingId }
      });

      if (existingTarget) {
        targetBooking = await prisma.booking.update({
          where: { id: linkedBookingId },
          data: {
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            status: booking.status,
            source: booking.source || 'Partner Sync',
            grossAmount: booking.grossAmount,
            securityDeposit: booking.securityDeposit,
            taxAmount: booking.taxAmount,
            totalAmount: booking.totalAmount,
            currency: booking.currency,
            extraDetails: {
              isSyncing: true,
              [isReverseSync ? 'linkedBookingId' : 'linkedFromBookingId']: booking.id,
              [isReverseSync ? 'linkedOrgId' : 'linkedFromOrgId']: booking.organizationId
            }
          }
        });
      }
    }

    if (!targetBooking) {
      // Create new booking in target workspace
      targetBooking = await prisma.booking.create({
        data: {
          organizationId: targetOrgId,
          propertyId: targetPropertyId,
          guestContactId: targetGuestId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: booking.status,
          source: booking.source || 'Partner Sync',
          grossAmount: booking.grossAmount,
          securityDeposit: booking.securityDeposit,
          taxAmount: booking.taxAmount,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          extraDetails: {
            isSyncing: true,
            [isReverseSync ? 'linkedBookingId' : 'linkedFromBookingId']: booking.id,
            [isReverseSync ? 'linkedOrgId' : 'linkedFromOrgId']: booking.organizationId
          }
        }
      });

      // Update original booking reference
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          extraDetails: {
            ...bookingExtra,
            [isReverseSync ? 'linkedFromBookingId' : 'linkedBookingId']: targetBooking.id,
            [isReverseSync ? 'linkedFromOrgId' : 'linkedOrgId']: targetOrgId
          }
        }
      });
    }

    console.log(`[Booking Sync] Booking synced successfully. Counterpart booking ID: ${targetBooking.id}`);
  } catch (error) {
    console.error('[Booking Sync] Error during synchronization:', error);
  }
}

/**
 * Synchronizes booking deletion (cancelling the linked counterpart booking).
 * 
 * @param linkedBookingId The ID of the counterpart booking to cancel
 * @param targetOrgId The organization ID of the counterpart booking
 */
export async function syncDeletedBooking(linkedBookingId: string, targetOrgId: string) {
  try {
    const existing = await prisma.booking.findUnique({
      where: { id: linkedBookingId }
    });

    if (existing && existing.status !== 'cancelled') {
      await prisma.booking.update({
        where: { id: linkedBookingId },
        data: {
          status: 'cancelled',
          extraDetails: {
            isSyncing: true,
            notes: 'Cancelled due to cancellation/deletion of source partner booking'
          }
        }
      });
      console.log(`[Booking Sync] Synced deletion. Cancelled counterpart booking: ${linkedBookingId}`);
    }
  } catch (error) {
    console.error('[Booking Sync] Error cancelling counterpart booking:', error);
  }
}
