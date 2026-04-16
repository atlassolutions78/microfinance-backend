/**
 * Specification for a single line in a journal entry draft.
 * Exactly one of debit or credit must be non-zero per line.
 */
export type JournalLineSpec = {
  accountCode: string;
  debit: number;
  credit: number;
  currency: string;
  description?: string;
};

import Decimal from 'decimal.js';

/**
 * A draft journal entry — not yet persisted.
 *
 * Calling assertBalanced() before saving enforces the double-entry invariant:
 * Σ debits must equal Σ credits. Any discrepancy throws immediately so the
 * calling DB transaction rolls back before any data is written.
 */
export class JournalEntryDraft {
  constructor(
    public readonly branchId: string,
    public readonly createdBy: string,
    public readonly description: string | undefined,
    public readonly lines: JournalLineSpec[],
    public readonly reversalOf?: string,
  ) {}

  assertBalanced(): void {
    const totalDebit = this.lines.reduce((s, l) => new Decimal(s).plus(l.debit), new Decimal(0));
    const totalCredit = this.lines.reduce((s, l) => new Decimal(s).plus(l.credit), new Decimal(0));

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(
        `Unbalanced journal entry: debits=${totalDebit} credits=${totalCredit}`,
      );
    }
  }
}
