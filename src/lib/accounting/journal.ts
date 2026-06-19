// @ts-nocheck
import { PrismaClient } from '@prisma/client';

export interface JournalLineInput {
  accountCode: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  propertyId?: string;
  contactId?: string;
}

export interface JournalEntryInput {
  entryDate: Date;
  description: string;
  currency?: string;
  exchangeRate?: number;
  referenceType?: string;
  referenceId?: string;
  lines: JournalLineInput[];
}

/**
 * Creates a balanced double-entry journal entry and its lines.
 * Enforces Sum(Debits) == Sum(Credits) at the database transaction level.
 */
export async function createJournalEntry(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  orgId: string,
  userId: string,
  input: JournalEntryInput
) {
  const currency = input.currency || 'AED';
  const exchangeRate = input.exchangeRate || 1.0;
  const lines = input.lines;

  if (lines.length < 2) {
    throw new Error('A journal entry must contain at least 2 lines.');
  }

  // Calculate totals and verify debits equal credits
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    totalDebits += line.debitAmount;
    totalCredits += line.creditAmount;
  }

  // Use a small epsilon for floating-point comparison
  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    throw new Error(`Unbalanced Journal Entry: Debits (${totalDebits}) must equal Credits (${totalCredits}).`);
  }

  if (totalDebits <= 0) {
    throw new Error('Journal entry total must be greater than zero.');
  }

  // Get all accounts by code for the organization
  const accountCodes = lines.map((l) => l.accountCode);
  const accounts = await tx.chartOfAccount.findMany({
    where: {
      organizationId: orgId,
      code: { in: accountCodes },
      isActive: true,
    },
  });

  const accountMap = new Map(accounts.map((a) => [a.code, a]));

  // Verify all codes exist
  for (const line of lines) {
    if (!accountMap.has(line.accountCode)) {
      throw new Error(`Chart of Account with code '${line.accountCode}' does not exist or is inactive.`);
    }
  }

  // Autogenerate an entry number
  const todayStr = input.entryDate.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await tx.journalEntry.count({
    where: {
      organizationId: orgId,
      entryDate: input.entryDate,
    },
  });
  const entryNumber = `JE-${todayStr}-${String(count + 1).padStart(4, '0')}`;

  // Create the journal entry
  const entry = await tx.journalEntry.create({
    data: {
      organizationId: orgId,
      entryNumber,
      entryDate: input.entryDate,
      description: input.description,
      currency,
      exchangeRate,
      referenceType: input.referenceType || null,
      referenceId: input.referenceId || null,
      postedBy: userId,
      createdBy: userId,
      status: 'posted',
    },
  });

  // Create the journal lines
  await Promise.all(
    lines.map(async (line) => {
      const account = accountMap.get(line.accountCode)!;
      const debitBase = Number((line.debitAmount * exchangeRate).toFixed(2));
      const creditBase = Number((line.creditAmount * exchangeRate).toFixed(2));

      return tx.journalLine.create({
        data: {
          organizationId: orgId,
          journalEntryId: entry.id,
          accountId: account.id,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          debitBase,
          creditBase,
          description: line.description || null,
          propertyId: line.propertyId || null,
          contactId: line.contactId || null,
        },
      });
    })
  );

  return entry;
}
