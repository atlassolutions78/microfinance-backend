import { JournalEntryDraft } from './accounting.model';
import { JournalLineSide, JournalOperationType } from './accounting.enums';

const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeDraft(
  lines: { side: JournalLineSide; amount: number }[],
): JournalEntryDraft {
  return new JournalEntryDraft(
    JournalOperationType.DEPOSIT,
    BRANCH_ID,
    USER_ID,
    undefined,
    lines.map((l) => ({
      accountCode: 'CASH',
      side: l.side,
      amount: l.amount,
      currency: 'USD',
    })),
  );
}

describe('JournalEntryDraft', () => {
  describe('assertBalanced()', () => {
    it('does not throw when debits equal credits (single pair)', () => {
      const draft = makeDraft([
        { side: JournalLineSide.DEBIT, amount: 500 },
        { side: JournalLineSide.CREDIT, amount: 500 },
      ]);
      expect(() => draft.assertBalanced()).not.toThrow();
    });

    it('does not throw when three lines balance (1 debit, 2 credits)', () => {
      const draft = new JournalEntryDraft(
        JournalOperationType.LOAN_REPAYMENT,
        BRANCH_ID,
        USER_ID,
        undefined,
        [
          {
            accountCode: 'CASH',
            side: JournalLineSide.DEBIT,
            amount: 110,
            currency: 'USD',
          },
          {
            accountCode: 'LOANS_RECEIVABLE',
            side: JournalLineSide.CREDIT,
            amount: 100,
            currency: 'USD',
          },
          {
            accountCode: 'INTEREST_INCOME',
            side: JournalLineSide.CREDIT,
            amount: 10,
            currency: 'USD',
          },
        ],
      );
      expect(() => draft.assertBalanced()).not.toThrow();
    });

    it('throws when debits exceed credits', () => {
      const draft = makeDraft([
        { side: JournalLineSide.DEBIT, amount: 500 },
        { side: JournalLineSide.CREDIT, amount: 400 },
      ]);
      expect(() => draft.assertBalanced()).toThrow(/unbalanced/i);
    });

    it('throws when credits exceed debits', () => {
      const draft = makeDraft([
        { side: JournalLineSide.DEBIT, amount: 300 },
        { side: JournalLineSide.CREDIT, amount: 500 },
      ]);
      expect(() => draft.assertBalanced()).toThrow(/unbalanced/i);
    });

    it('does not throw when difference is within floating-point tolerance (< 0.0001)', () => {
      const draft = makeDraft([
        { side: JournalLineSide.DEBIT, amount: 100.00001 },
        { side: JournalLineSide.CREDIT, amount: 100 },
      ]);
      expect(() => draft.assertBalanced()).not.toThrow();
    });

    it('throws when difference exceeds floating-point tolerance', () => {
      const draft = makeDraft([
        { side: JournalLineSide.DEBIT, amount: 100.001 },
        { side: JournalLineSide.CREDIT, amount: 100 },
      ]);
      expect(() => draft.assertBalanced()).toThrow(/unbalanced/i);
    });
  });
});
