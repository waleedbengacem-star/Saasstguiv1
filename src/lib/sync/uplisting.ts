import { prisma, runInTenantContext } from '@/lib/db/client';
import { BookingStatus, ContactType } from '@prisma/client';

function normalizeChannel(rawChannel: string | null | undefined): string {
  if (!rawChannel) return 'Direct';
  const c = rawChannel.toLowerCase();
  if (c.includes('airbnb')) return 'Airbnb';
  if (c.includes('booking')) return 'Booking.com';
  if (c.includes('agoda')) return 'Agoda';
  if (c.includes('vrbo') || c.includes('homeaway')) return 'VRBO';
  if (c.includes('direct') || c === 'uplisting') return 'Direct';
  return rawChannel.charAt(0).toUpperCase() + rawChannel.slice(1);
}

const chunkArray = (arr: any[], size: number) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount: number;
  logs: string[];
}

export async function syncBookingsForOrg(
  orgId: string,
  userId: string,
  apiKey: string,
  incomingMappings?: Record<string, { uplistingId: string; uplistingName: string }>
): Promise<SyncResult> {
  const debugLogs: string[] = [];
  let syncedCount = 0;
  const logDebug = (msg: string) => {
    const timestamp = new Date().toISOString();
    debugLogs.push(`[${timestamp}] ${msg}`);
    console.log(`[Sync Debug - Org ${orgId}] ${msg}`);
  };

  try {
    logDebug(`=== Sync started for org ${orgId} ===`);

    // 1. Fetch all local properties to see which ones are mapped
    const localProperties = await prisma.property.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    });

    const mappedProperties = localProperties
      .map((p: any) => {
        const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
        // If caller passed fresh mappings (e.g. just-linked property), overlay them
        const override = incomingMappings?.[p.id];
        if (override) {
          return { ...p, extraDetails: { ...extra, uplistingId: override.uplistingId, uplistingName: override.uplistingName } };
        }
        return p;
      })
      .filter((p: any) => {
        const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
        return !!extra.uplistingId;
      });

    logDebug(`Found ${localProperties.length} local properties. Mapped count = ${mappedProperties.length}.`);

    if (mappedProperties.length === 0) {
      logDebug(`No mapped properties found, exiting.`);
      
      // Save debug logs to DB
      try {
        await prisma.uplistingSyncLog.create({
          data: {
            organizationId: orgId,
            direction: 'sync',
            eventType: 'manual_sync_debug',
            payload: { logs: debugLogs },
            status: 'empty',
          }
        });
      } catch (logDbErr) {
        console.error('Failed to save manual sync log to DB:', logDbErr);
      }

      return {
        success: true,
        message: 'No connected properties found to sync. Link your properties to Uplisting first.',
        syncedCount: 0,
        logs: debugLogs
      };
    }

    // 2. Fetch bookings from Uplisting
    let rawBookings: any[] = [];
    const base64Key = Buffer.from(apiKey.trim()).toString('base64');

    logDebug(`Attempt 1: Fetching all bookings via GET /bookings`);
    try {
      const res = await fetch('https://connect.uplisting.io/bookings', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${base64Key}`,
          'Content-Type': 'application/json',
        },
      });
      
      const text = await res.text();
      if (res.ok) {
        let body;
        try {
          body = JSON.parse(text);
        } catch (parseErr: any) {
          logDebug(`Attempt 1 failed to parse JSON: ${parseErr.message}`);
        }
        
        if (body && Array.isArray(body.bookings)) {
          rawBookings = body.bookings;
        } else if (body && Array.isArray(body.data)) {
          rawBookings = body.data;
        } else if (body && Array.isArray(body)) {
          rawBookings = body;
        }
      }
    } catch (e: any) {
      logDebug(`Attempt 1 fetch error: ${e.message}`);
    }

    if (rawBookings.length === 0) {
      logDebug(`Attempt 2: Fetching bookings per property...`);
      for (const prop of mappedProperties) {
        const extra = prop.extraDetails as any;
        const uplistingId = extra.uplistingId;
        if (!uplistingId) continue;

        try {
          const res = await fetch(`https://connect.uplisting.io/bookings/${uplistingId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${base64Key}`,
              'Content-Type': 'application/json',
            },
          });
          
          const text = await res.text();
          if (res.ok) {
            let body;
            try {
              body = JSON.parse(text);
            } catch (parseErr: any) {
              logDebug(`Attempt 2 failed to parse JSON for ${prop.name}: ${parseErr.message}`);
            }
            
            const dataArr = body?.bookings || body?.data || (Array.isArray(body) ? body : []);
            rawBookings.push(...dataArr);
          }
        } catch (err: any) {
          logDebug(`Attempt 2 failed for property ${prop.name}: ${err.message}`);
        }
      }
    }

    logDebug(`Total raw bookings retrieved: ${rawBookings.length}`);

    if (rawBookings.length === 0) {
      try {
        await prisma.uplistingSyncLog.create({
          data: {
            organizationId: orgId,
            direction: 'sync',
            eventType: 'manual_sync_debug',
            payload: { logs: debugLogs },
            status: 'empty',
          }
        });
      } catch (logDbErr) {
        console.error('Failed to save manual sync log to DB:', logDbErr);
      }

      return {
        success: true,
        message: 'No bookings retrieved from Uplisting API.',
        syncedCount: 0,
        logs: debugLogs
      };
    }

    // 3. Process and upsert bookings in tenant context
    syncedCount = 0;

    // Log first booking structure for debugging
    if (rawBookings.length > 0) {
      const sample = rawBookings[0];
      const sampleAttrs = sample.attributes || sample;
      logDebug(`Sample booking structure — top-level keys: [${Object.keys(sample).join(', ')}]`);
      logDebug(`Sample booking attrs keys: [${Object.keys(sampleAttrs).join(', ')}]`);
      logDebug(`Sample booking relationships: ${JSON.stringify(sample.relationships || {})}`);
      logDebug(`Mapped uplistingIds: [${mappedProperties.map((p: any) => (p.extraDetails as any)?.uplistingId).join(', ')}]`);
    }

    // Fetch organization settings to check for deleted bookings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true }
    });
    const orgSettings = org?.settings && typeof org.settings === 'object' ? (org.settings as any) : {};
    const deletedUplistingBookingIds = Array.isArray(orgSettings.deletedUplistingBookingIds)
      ? orgSettings.deletedUplistingBookingIds.map(String)
      : [];

    const batches = chunkArray(rawBookings, 15);
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (item) => {
          const id = item.id;
          const attrs = item.attributes || item;

          const externalBookingId = attrs.booking_id || attrs.id || id;
          if (externalBookingId && deletedUplistingBookingIds.includes(String(externalBookingId))) {
            logDebug(`Skipping booking ${externalBookingId} because it was deleted locally.`);
            return;
          }

          // Uplisting uses JSONAPI format: property ref can be in:
          //   1. attrs.property_id / attrs.propertyId (flat format)
          //   2. item.relationships.property.data.id (JSONAPI format)
          //   3. attrs.listing_id / attrs.unit_id (alternate field names)
          const bookingPropertyId =
            attrs.property_id ||
            attrs.propertyId ||
            attrs.listing_id ||
            attrs.listingId ||
            attrs.unit_id ||
            attrs.unitId ||
            item.relationships?.property?.data?.id ||
            item.relationships?.listing?.data?.id ||
            item.relationships?.unit?.data?.id;

          if (!bookingPropertyId) {
            logDebug(`Skipping booking ${item.id} — no property_id found. Keys: ${Object.keys(attrs).join(', ')}`);
            return;
          }

          const property = mappedProperties.find((p: any) => {
            const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
            return String(extra.uplistingId) === String(bookingPropertyId);
          });

          if (!property) {
            logDebug(`Skipping booking ${item.id} — property_id ${bookingPropertyId} not matched to any local mapped property.`);
            return;
          }

          const checkIn = new Date(attrs.check_in || attrs.start_date || attrs.check_in_date);
          const checkOut = new Date(attrs.check_out || attrs.end_date || attrs.check_out_date);

          if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return;

          let bookingStatus: BookingStatus = BookingStatus.confirmed;
          const rawStatus = String(attrs.status || '').toLowerCase();
          if (rawStatus === 'cancelled' || rawStatus === 'canceled') {
            bookingStatus = BookingStatus.cancelled;
          } else if (rawStatus === 'checked_in') {
            bookingStatus = BookingStatus.checked_in;
          } else if (rawStatus === 'checked_out') {
            bookingStatus = BookingStatus.checked_out;
          } else if (rawStatus === 'pending' || rawStatus === 'draft') {
            bookingStatus = BookingStatus.draft;
          }

          const grossAmount = Number(attrs.accomodation_total || attrs.accommodation_total || attrs.gross_revenue || attrs.total_price || attrs.gross_amount || attrs.payout || attrs.total_payout || 0);
          const securityDeposit = Number(attrs.security_deposit || 0);
          const taxAmount = Number(attrs.booking_taxes || attrs.tax_amount || attrs.taxAmount || attrs.lodging_tax || 0);
          const totalAmount = grossAmount + taxAmount + securityDeposit;

          const guestEmail = attrs.guest_email || attrs.guestEmail || `guest_${externalBookingId}@ota.com`;
          const guestPhone = attrs.guest_phone || attrs.guestPhone || null;
          const guestName = attrs.guest_name || attrs.guestName || 'OTA Guest';

          // Resolve channelRuleId based on property mapping or global mapping
          let resolvedChannelRuleId: string | null = null;

          // 1. Check property-specific channel rules first (from property.extraDetails)
          const propExtra = property.extraDetails && typeof property.extraDetails === 'object' ? property.extraDetails : {};
          const propChannelRuleIds = propExtra.channelRuleIds || {};
          const bookingChannelLower = (attrs.channel || attrs.source || '').trim().toLowerCase();

          if (propChannelRuleIds && Object.keys(propChannelRuleIds).length > 0) {
            const matchedKey = Object.keys(propChannelRuleIds).find(
              k => bookingChannelLower.includes(k.toLowerCase()) || k.toLowerCase().includes(bookingChannelLower)
            );
            if (matchedKey) {
              resolvedChannelRuleId = propChannelRuleIds[matchedKey];
            }
          }

          // 2. Fallback to global organization settings channel account mapping (pms_channel_mappings)
          if (!resolvedChannelRuleId && orgSettings && orgSettings.pms_channel_mappings) {
            let mappings: any = {};
            try {
              mappings = typeof orgSettings.pms_channel_mappings === 'string'
                ? JSON.parse(orgSettings.pms_channel_mappings)
                : orgSettings.pms_channel_mappings;
            } catch (e) {}

            const rawChannel = (attrs.channel || '').trim().toLowerCase();
            const rawSource = (attrs.source || '').trim().toLowerCase();

            const matchedEntry = Object.entries(mappings).find(([ruleId, mapObj]: [string, any]) => {
              const code = (mapObj?.uplistingCode || '').trim().toLowerCase();
              return code && (code === rawChannel || code === rawSource);
            });

            if (matchedEntry) {
              resolvedChannelRuleId = matchedEntry[0];
            }
          }

          try {
            await runInTenantContext(orgId, userId, async (tx) => {
              // Check if booking exists
              const existingBooking = await tx.booking.findFirst({
                where: {
                  organizationId: orgId,
                  externalBookingId: String(externalBookingId),
                },
              });

              if (existingBooking) {
                const existingExtra: any = existingBooking.extraDetails && typeof existingBooking.extraDetails === 'object'
                  ? existingBooking.extraDetails
                  : {};
                if (existingExtra.isLocallyModified) {
                  logDebug(`Preserving local changes for booking ID ${externalBookingId}. Skipping sync overwrite.`);
                  await tx.booking.update({
                    where: { id: existingBooking.id },
                    data: {
                      uplistingSyncedAt: new Date(),
                    },
                  });
                  return;
                }
              }

              // Find or create Guest contact
              let guest = await tx.contact.findFirst({
                where: {
                  organizationId: orgId,
                  contactType: ContactType.guest,
                  email: guestEmail,
                },
              });

              if (!guest) {
                const nameParts = guestName.split(' ');
                const firstName = nameParts[0] || 'Guest';
                const lastName = nameParts.slice(1).join(' ') || '';
                guest = await tx.contact.create({
                  data: {
                    organizationId: orgId,
                    contactType: ContactType.guest,
                    firstName,
                    lastName,
                    email: guestEmail,
                    phone: guestPhone,
                    isActive: true,
                  },
                });
              }

              // Retrieve existing extraDetails to preserve user modifications
              const existingExtra: any = (existingBooking && existingBooking.extraDetails && typeof existingBooking.extraDetails === 'object')
                ? existingBooking.extraDetails
                : {};

              const extraDetails = {
                ...existingExtra,
                guest_name: guestName,
                payout: String(grossAmount),
                cleaning_fee: String(attrs.cleaning_fee || attrs.cleaningFee || 0),
                discounts: String(attrs.discounts || 0),
                service_charge: String(attrs.service_fee || attrs.service_charge || 0),
                destination_fee: existingExtra.destination_fee || '0.00',
                resort_fee: existingExtra.resort_fee || '0.00',
                vat_amount: existingExtra.vat_amount || '0.00',
                dtcm_fee: String(attrs.lodging_tax || attrs.dtcm_fee || 0),
                tax_amount: String(taxAmount),
                payment_processing_fee: existingExtra.payment_processing_fee || '0.00',
                commission: String(attrs.commission || 0),
                commission_vat: String(attrs.commission_vat || 0),
                booked_at: attrs.booked_at || attrs.bookedAt || new Date().toISOString(),
                raw_booking: attrs,
                raw_property_name: attrs.property_name || property.name,
              };

              const channelSource = normalizeChannel(attrs.channel || attrs.source || 'Uplisting OTA Sync');

               if (existingBooking) {
                await tx.booking.update({
                  where: { id: existingBooking.id },
                  data: {
                    propertyId: property.id,
                    guestContactId: guest.id,
                    checkIn,
                    checkOut,
                    status: bookingStatus,
                    source: channelSource,
                    grossAmount,
                    taxAmount,
                    securityDeposit,
                    totalAmount,
                    uplistingSyncedAt: new Date(),
                    extraDetails,
                    channelRuleId: resolvedChannelRuleId,
                  },
                });
              } else {
                await tx.booking.create({
                  data: {
                    organizationId: orgId,
                    propertyId: property.id,
                    guestContactId: guest.id,
                    checkIn,
                    checkOut,
                    status: bookingStatus,
                    source: channelSource,
                    externalBookingId: String(externalBookingId),
                    grossAmount,
                    taxAmount,
                    securityDeposit,
                    totalAmount,
                    currency: attrs.currency || 'AED',
                    uplistingSyncedAt: new Date(),
                    extraDetails,
                    channelRuleId: resolvedChannelRuleId,
                  },
                });
              }
            });
            syncedCount++;
          } catch (err: any) {
            logDebug(`Error syncing booking ID ${externalBookingId}: ${err.message || err}`);
          }
        })
      );
    }

    // Collect all retrieved external booking IDs
    const retrievedExternalIds = new Set<string>(
      rawBookings.map((item) => {
        const attrs = item.attributes || item;
        const extId = attrs.booking_id || attrs.id || item.id;
        return String(extId);
      }).filter(Boolean)
    );

    // Cancel local bookings that are missing from Uplisting's active response
    // Filter to future checkOuts (or checked out within last 2 days) to protect older history
    const recentThreshold = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    try {
      await runInTenantContext(orgId, userId, async (tx) => {
        const bookingsToCancel = await tx.booking.findMany({
          where: {
            organizationId: orgId,
            externalBookingId: { not: null },
            status: { not: BookingStatus.cancelled },
            checkOut: { gte: recentThreshold },
          },
        });

        for (const b of bookingsToCancel) {
          if (b.externalBookingId && !retrievedExternalIds.has(b.externalBookingId)) {
            logDebug(`Booking ID ${b.id} (external: ${b.externalBookingId}) is missing from Uplisting. Marking as cancelled.`);
            const extra = b.extraDetails && typeof b.extraDetails === 'object' ? b.extraDetails : {};
            await tx.booking.update({
              where: { id: b.id },
              data: {
                status: BookingStatus.cancelled,
                extraDetails: {
                  ...extra,
                  status: 'cancelled',
                },
              },
            });
          }
        }
      });
    } catch (cancelErr: any) {
      logDebug(`Error during sync-cancellation checks: ${cancelErr.message || cancelErr}`);
    }

    // Save debug logs to DB
    try {
      await prisma.uplistingSyncLog.create({
        data: {
          organizationId: orgId,
          direction: 'sync',
          eventType: 'manual_sync_debug',
          payload: { logs: debugLogs },
          status: 'success',
        }
      });
    } catch (logDbErr) {
      console.error('Failed to save manual sync log to DB:', logDbErr);
    }

    return {
      success: true,
      message: `Successfully synchronized ${syncedCount} bookings from Uplisting.`,
      syncedCount,
      logs: debugLogs
    };

  } catch (error: any) {
    logDebug(`CRITICAL API ERROR: ${error.message || error}`);
    try {
      await prisma.uplistingSyncLog.create({
        data: {
          organizationId: orgId,
          direction: 'sync',
          eventType: 'manual_sync_debug',
          payload: { logs: debugLogs, error: error.message || String(error) },
          status: 'error',
          errorMessage: error.message || 'Exception occurred during sync',
        }
      });
    } catch (logDbErr) {
      console.error('Failed to save manual sync log error to DB:', logDbErr);
    }
    return {
      success: false,
      message: error.message || 'Internal Server Error during synchronization',
      syncedCount,
      logs: debugLogs
    };
  }
}
