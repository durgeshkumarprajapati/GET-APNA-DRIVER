import 'server-only';
import { Prisma, type DriverWallet, type WalletChangeType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { DriverWalletNotFoundError } from '../../domain/errors';
import { ZERO, roundMoney, toDecimal } from '../../domain/money';

export async function getDriverWalletByProfileId(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverWallet> {
  const wallet = await db.driverWallet.findUnique({ where: { driverProfileId } });
  if (!wallet) {
    throw new DriverWalletNotFoundError(driverProfileId);
  }
  return wallet;
}

export interface ApplyWalletChangeInput {
  driverProfileId: string;
  financialTransactionId: string;
  changeType: WalletChangeType;
  /** Signed decimal strings; omitted means no change to that bucket. */
  availableDelta?: string;
  pendingDelta?: string;
  reservedDelta?: string;
  totalEarnedDelta?: string;
  totalSettledDelta?: string;
}

/**
 * The only function permitted to change DriverWallet balances. Must be
 * called with the same `tx` used for the FinancialTransaction it derives
 * from (see ledger-service.ts) — a wallet balance never moves without a
 * corresponding ledger posting. Creates the wallet on first use, applies the
 * deltas, and appends one WalletTransaction row explaining the change,
 * atomically with the caller's transaction.
 *
 * Idempotent per `financialTransactionId`: if this financial transaction has
 * already been applied to this wallet (e.g. a webhook and a client-verify
 * call raced to capture the same payment, and ledger-service.ts's own
 * idempotency made both resolve to the same FinancialTransaction id), the
 * second call is a no-op that returns the wallet unchanged — enforced by a
 * unique constraint at the database level, not just a check-then-act guard.
 */
export async function applyWalletChange(
  input: ApplyWalletChangeInput,
  db: Db,
): Promise<DriverWallet> {
  const existing = await db.driverWallet.findUnique({
    where: { driverProfileId: input.driverProfileId },
  });
  const wallet =
    existing ??
    (await db.driverWallet.create({ data: { driverProfileId: input.driverProfileId } }));

  const alreadyApplied = await db.walletTransaction.findUnique({
    where: {
      driverWalletId_financialTransactionId: {
        driverWalletId: wallet.id,
        financialTransactionId: input.financialTransactionId,
      },
    },
  });
  if (alreadyApplied) {
    return wallet;
  }

  const availableDelta = input.availableDelta ? toDecimal(input.availableDelta) : ZERO;
  const pendingDelta = input.pendingDelta ? toDecimal(input.pendingDelta) : ZERO;
  const reservedDelta = input.reservedDelta ? toDecimal(input.reservedDelta) : ZERO;
  const totalEarnedDelta = input.totalEarnedDelta ? toDecimal(input.totalEarnedDelta) : ZERO;
  const totalSettledDelta = input.totalSettledDelta ? toDecimal(input.totalSettledDelta) : ZERO;

  const updated = await db.driverWallet.update({
    where: { id: wallet.id },
    data: {
      availableBalance: roundMoney(toDecimal(wallet.availableBalance).add(availableDelta)),
      pendingBalance: roundMoney(toDecimal(wallet.pendingBalance).add(pendingDelta)),
      reservedBalance: roundMoney(toDecimal(wallet.reservedBalance).add(reservedDelta)),
      totalEarned: roundMoney(toDecimal(wallet.totalEarned).add(totalEarnedDelta)),
      totalSettled: roundMoney(toDecimal(wallet.totalSettled).add(totalSettledDelta)),
    },
  });

  try {
    await db.walletTransaction.create({
      data: {
        driverWalletId: updated.id,
        financialTransactionId: input.financialTransactionId,
        changeType: input.changeType,
        availableDelta: roundMoney(availableDelta),
        pendingDelta: roundMoney(pendingDelta),
        reservedDelta: roundMoney(reservedDelta),
        balanceAfterAvailable: updated.availableBalance,
        balanceAfterPending: updated.pendingBalance,
        balanceAfterReserved: updated.reservedBalance,
      },
    });
  } catch (error: unknown) {
    // Belt-and-suspenders for the race the pre-check above already handles
    // in the common case: the unique constraint is the actual guarantee.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return wallet;
    }
    throw error;
  }

  return updated;
}

export interface DriverWalletSummary {
  driverProfileId: string;
  availableBalance: string;
  pendingBalance: string;
  reservedBalance: string;
  totalEarned: string;
  totalSettled: string;
  currency: string;
}

/**
 * Read-only summary. A driver who has never earned anything has no wallet
 * row yet (rows are created lazily by applyWalletChange on first use) — this
 * returns a synthesized zero-balance summary for that case rather than
 * creating a row as a side effect of a read.
 */
export async function getDriverWalletSummary(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverWalletSummary> {
  const wallet = await db.driverWallet.findUnique({ where: { driverProfileId } });
  if (!wallet) {
    return {
      driverProfileId,
      availableBalance: '0.0000',
      pendingBalance: '0.0000',
      reservedBalance: '0.0000',
      totalEarned: '0.0000',
      totalSettled: '0.0000',
      currency: 'INR',
    };
  }

  return {
    driverProfileId: wallet.driverProfileId,
    availableBalance: wallet.availableBalance.toFixed(4),
    pendingBalance: wallet.pendingBalance.toFixed(4),
    reservedBalance: wallet.reservedBalance.toFixed(4),
    totalEarned: wallet.totalEarned.toFixed(4),
    totalSettled: wallet.totalSettled.toFixed(4),
    currency: wallet.currency,
  };
}

export async function listDriverWalletTransactions(driverProfileId: string, db: Db = prisma) {
  const wallet = await db.driverWallet.findUnique({ where: { driverProfileId } });
  if (!wallet) {
    return [];
  }
  return db.walletTransaction.findMany({
    where: { driverWalletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

/** Resolves the caller's own driver profile, then returns their wallet summary. */
export async function getOwnDriverWalletSummary(
  driverUserId: string,
  db: Db = prisma,
): Promise<DriverWalletSummary> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  return getDriverWalletSummary(profile.id, db);
}

export async function listOwnDriverWalletTransactions(driverUserId: string, db: Db = prisma) {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  return listDriverWalletTransactions(profile.id, db);
}
