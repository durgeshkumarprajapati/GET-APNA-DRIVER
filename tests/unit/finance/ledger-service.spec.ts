const mockTx = {
  financialTransaction: { create: jest.fn(), findUnique: jest.fn() },
  ledgerAccount: { findUnique: jest.fn() },
  ledgerEntry: { create: jest.fn() },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    financialTransaction: { findUnique: jest.fn() },
  },
}));

import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { prisma } from '@/shared/database/prisma';
import {
  UnbalancedLedgerTransactionError,
  LedgerAccountNotFoundError,
} from '@/modules/finance/domain/errors';

const mockedTopLevelFindUnique = (
  prisma as unknown as { financialTransaction: { findUnique: jest.Mock } }
).financialTransaction.findUnique;

describe('postFinancialTransaction', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('posts a balanced transaction with all its ledger entries', async () => {
    mockedTopLevelFindUnique.mockResolvedValue(null);
    mockTx.financialTransaction.create.mockResolvedValue({ id: 'txn-1' });
    mockTx.ledgerAccount.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: `account-${where.code}` }),
    );

    const result = await postFinancialTransaction({
      transactionType: 'PAYMENT_CAPTURED',
      referenceEntityType: 'Payment',
      referenceEntityId: 'payment-1',
      description: 'test',
      postings: [
        { accountCode: 'PAYMENT_PROVIDER_CLEARING', debitAmount: '100.0000', creditAmount: '0' },
        { accountCode: 'PLATFORM_REVENUE_COMMISSION', debitAmount: '0', creditAmount: '20.0000' },
        { accountCode: 'DRIVER_PAYABLE', debitAmount: '0', creditAmount: '80.0000' },
      ],
    });

    expect(result.id).toBe('txn-1');
    expect(mockTx.ledgerEntry.create).toHaveBeenCalledTimes(3);
    // Regression guard: LedgerEntry has no amount/direction field — only
    // single-sided debitAmount/creditAmount (see the CHECK constraint in
    // prisma/sql/001_ledger_balance_trigger.sql). A prior version of this
    // function wrote `amount`/`direction`, which isn't a real field on the
    // model at all — every call silently threw "Unknown argument `amount`"
    // against a real database, undetected by this test (which only checked
    // the call count) or by tsc (Prisma's `create()` input type suppresses
    // excess-property checking). Asserting the exact shape here closes that gap.
    expect(mockTx.ledgerEntry.create).toHaveBeenCalledWith({
      data: {
        financialTransactionId: 'txn-1',
        ledgerAccountId: 'account-PAYMENT_PROVIDER_CLEARING',
        debitAmount: '100.0000',
        creditAmount: '0.0000',
      },
    });
    expect(mockTx.ledgerEntry.create).toHaveBeenCalledWith({
      data: {
        financialTransactionId: 'txn-1',
        ledgerAccountId: 'account-PLATFORM_REVENUE_COMMISSION',
        debitAmount: '0.0000',
        creditAmount: '20.0000',
      },
    });
  });

  it('rejects an unbalanced set of postings before writing anything', async () => {
    mockedTopLevelFindUnique.mockResolvedValue(null);

    await expect(
      postFinancialTransaction({
        transactionType: 'PAYMENT_CAPTURED',
        referenceEntityType: 'Payment',
        referenceEntityId: 'payment-1',
        description: 'unbalanced',
        postings: [
          { accountCode: 'PAYMENT_PROVIDER_CLEARING', debitAmount: '100.0000', creditAmount: '0' },
          { accountCode: 'DRIVER_PAYABLE', debitAmount: '0', creditAmount: '99.0000' },
        ],
      }),
    ).rejects.toThrow(UnbalancedLedgerTransactionError);

    expect(mockTx.financialTransaction.create).not.toHaveBeenCalled();
  });

  it('throws when a posting references an unknown ledger account', async () => {
    mockedTopLevelFindUnique.mockResolvedValue(null);
    mockTx.financialTransaction.create.mockResolvedValue({ id: 'txn-2' });
    mockTx.ledgerAccount.findUnique.mockResolvedValue(null);

    await expect(
      postFinancialTransaction({
        transactionType: 'PAYMENT_CAPTURED',
        referenceEntityType: 'Payment',
        referenceEntityId: 'payment-1',
        description: 'test',
        postings: [
          { accountCode: 'NOT_A_REAL_ACCOUNT', debitAmount: '10.0000', creditAmount: '0' },
          { accountCode: 'SOME_OTHER_ACCOUNT', debitAmount: '0', creditAmount: '10.0000' },
        ],
      }),
    ).rejects.toThrow(LedgerAccountNotFoundError);
  });

  it('is idempotent: returns the existing transaction instead of re-posting for a known idempotencyKey', async () => {
    mockedTopLevelFindUnique.mockResolvedValue({ id: 'existing-txn' });

    const result = await postFinancialTransaction({
      transactionType: 'PAYMENT_CAPTURED',
      referenceEntityType: 'Payment',
      referenceEntityId: 'payment-1',
      idempotencyKey: 'payment_captured:payment-1',
      description: 'test',
      postings: [{ accountCode: 'X', debitAmount: '10.0000', creditAmount: '0' }],
    });

    expect(result.id).toBe('existing-txn');
    expect(mockTx.financialTransaction.create).not.toHaveBeenCalled();
  });
});
