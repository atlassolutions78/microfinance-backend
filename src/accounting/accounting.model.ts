import { JournalLineSide, JournalOperationType } from './accounting.enums';

export type JournalLineSpec = {
  accountCode: string;
  side: JournalLineSide;
  amount: number;
  currency: string;
};

/**
 * A draft journal entry — not yet persisted.
 *
 * Calling assertBalanced() before saving enforces the double-entry invariant:
 * Σ debits must equal Σ credits. Any discrepancy throws immediately so the
 * calling DB transaction rolls back before any data is written.
 */
export class JournalEntryDraft {
  constructor(
    public readonly operationType: JournalOperationType,
    public readonly branchId: string,
    public readonly performedBy: string,
    public readonly description: string | undefined,
    public readonly lines: JournalLineSpec[],
    public readonly relatedReference?: string,
  ) {}

  assertBalanced(): void {
    const sum = (side: JournalLineSide) =>
      this.lines
        .filter((l) => l.side === side)
        .reduce((s, l) => s + l.amount, 0);

    const debits = sum(JournalLineSide.DEBIT);
    const credits = sum(JournalLineSide.CREDIT);

    if (Math.abs(debits - credits) > 0.0001) {
      throw new Error(
        `Unbalanced journal entry (${this.operationType}): debits=${debits} credits=${credits}`,
      );
    }
  }
}
