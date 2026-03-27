import { JournalEntryDraft } from './accounting.model';

const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeDraft(
  lines: { debit: number; credit: number }[],
): JournalEntryDraft {
  return new JournalEntryDraft(
    BRANCH_ID,
    USER_ID,
    undefined,
    lines.map((l) => ({
      accountCode: '1101',
      debit: l.debit,
      credit: l.credit,
      currency: 'USD',
    })),
  );
}

describe('JournalEntryDraft', () => {
  describe('assertBalanced()', () => {
    it('does not throw when debits equal credits (single pair)', () => {
      const draft = makeDraft([
        { debit: 500, credit: 0 },
        { debit: 0, credit: 500 },
      ]);
      expect(() => draft.assertBalanced()).not.toThrow();
    });

    it('does not throw when three lines balance (1 debit, 2 credits)', () => {
      const draft = new JournalEntryDraft(BRANCH_ID, USER_ID, undefined, [
        { accountCode: '2101', debit: 110, credit: 0,   currency: 'USD' },
        { accountCode: '1201', debit: 0,   credit: 100, currency: 'USD' },
        { accountCode: '4101', debit: 0,   credit: 10,  currency: 'USD' },
      ]);
      expect(() => draft.assertBalanced()).not.toThrow();
    });

    it('throws when debits exceed credits', () => {
      const draft = makeDraft([
        { debit: 500, credit: 0 },
        { debit: 0, credit: 400 },
      ]);
      expect(() => draft.assertBalanced()).toThrow(/unbalanced/i);
    });

    it('throws when credits exceed debits', () => {
      const draft = makeDraft([
        { debit: 300, credit: 0 },
        { debit: 0, credit: 500 },
      ]);
      expect(() => draft.assertBalanced()).toThrow(/unbalanced/i);
    });

    it('does not throw when difference is within floating-point tolerance (< 0.0001)', () => {
      const draft = makeDraft([
        { debit: 100.00001, credit: 0 },
        { debit: 0, credit: 100 },
      ]);
      expect(() => draft.assertBalanced()).not.toThrow();
    });

    it('throws when difference exceeds floating-point tolerance', () => {
      const draft = makeDraft([
        { debit: 100.001, credit: 0 },
        { debit: 0, credit: 100 },
      ]);
      expect(() => draft.assertBalanced()).toThrow(/unbalanced/i);
    });
  });
});
