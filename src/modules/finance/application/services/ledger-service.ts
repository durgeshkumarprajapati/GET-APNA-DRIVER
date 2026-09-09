import 'server-only';
import type { FinancialTransaction, Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { LedgerAccountNotFoundError, UnbalancedLedgerTransactionError } from '../../domain/errors';
import { ZERO, roundMoney, toDecimal } from '../../domain/money';
import type { PostFinancialTransactionInput } from '../../domain/types';

/**
 * Posts one balanced FinancialTransaction and its LedgerEntry lines
 * atomically. This is the only function in the codebase that should ever
 * create a FinancialTransaction — payment-service.ts, refund-service.ts, and
 * settlement-service.ts all call through here rather than writing ledger
 * rows themselves, so every posting is validated and idempotent the same way.
 *
 * Idempotent: if `idempotencyKey` matches an existing FinancialTransaction,
 * that transaction is returned unchanged instead of posting a duplicate —
 * critical for webhook processing, which may see the same logical event
 * more than once.
 */
export async function postFinancialTransaction(
  input: PostFinancialTransactionInput,
  db: Db = prisma,
): Promise<FinancialTransaction> {
  if (input.idempotencyKey) {
    const existing = await db.financialTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return existing;
    }
  }

  // Application-level balance check as defense in depth. The database's
  // deferred trigger (prisma/sql/001_ledger_balance_trigger.sql) is the
  // authoritative guarantee — this just fails fast, before any writes,
  // when a caller has a bug.
  let totalDebits = ZERO;
  let totalCredits = ZERO;
  for (const posting of input.postings) {
    totalDebits = totalDebits.add(toDecimal(posting.debitAmount));
    totalCredits = totalCredits.add(toDecimal(posting.creditAmount));
  }
  if (!roundMoney(totalDebits).equals(roundMoney(totalCredits))) {
    throw new UnbalancedLedgerTransactionError(totalDebits.toFixed(4), totalCredits.toFixed(4));
  }

  return db.$transaction(async (tx: Db) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        transactionType: input.transactionType,
        referenceEntityType: input.referenceEntityType,
        referenceEntityId: input.referenceEntityId,
        idempotencyKey: input.idempotencyKey ?? null,
        description: input.description,
        reversesTransactionId: input.reversesTransactionId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    for (const posting of input.postings) {
      const account = await tx.ledgerAccount.findUnique({ where: { code: posting.accountCode } });
      if (!account) {
        throw new LedgerAccountNotFoundError(posting.accountCode);
      }

      await tx.ledgerEntry.create({
        data: {
          financialTransactionId: transaction.id,
          ledgerAccountId: account.id,
          debitAmount: posting.debitAmount,
          creditAmount: posting.creditAmount,
        },
      });
    }

    return transaction;
  });
}

/** Admin visibility into posted financial transactions and their ledger lines. */
export async function listFinancialTransactions(db: Db = prisma) {
  return db.financialTransaction.findMany({
    orderBy: { postedAt: 'desc' },
    take: 200,
    include: { entries: { include: { ledgerAccount: true } } },
  });
}
