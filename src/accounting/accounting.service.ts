import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import { COA_CODES, JournalEntryStatus } from './accounting.enums';
import { JournalEntryDraft, JournalLineSpec } from './accounting.model';
import { AccountingRepository } from './accounting.repository';
import {
  ChartOfAccountsRecord,
  JournalEntryGroupRecord,
  JournalEntryRecord,
} from './accounting.mapper';

@Injectable()
export class AccountingService {
  constructor(private readonly repo: AccountingRepository) {}

  // ─── Posting helpers ─────────────────────────────────────────────────────────

  async postDeposit(
    amount: number,
    currency: string,
    tellerCode: string,
    clientSavingsCode: string,
    branchId: string,
    createdBy: string,
    clientAccountId?: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: tellerCode, debit: amount, credit: 0, currency },
      {
        accountCode: clientSavingsCode,
        debit: 0,
        credit: amount,
        currency,
        clientAccountId,
      },
    ]);
    return this.post(draft, em);
  }

  async postWithdrawal(
    amount: number,
    currency: string,
    tellerCode: string,
    clientSavingsCode: string,
    branchId: string,
    createdBy: string,
    clientAccountId?: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      {
        accountCode: clientSavingsCode,
        debit: amount,
        credit: 0,
        currency,
        clientAccountId,
      },
      { accountCode: tellerCode, debit: 0, credit: amount, currency },
    ]);
    return this.post(draft, em);
  }

  /**
   * Step 1 of loan disbursement: credit the client's savings account.
   * Step 2 is a normal withdrawal by the client.
   */
  async postLoanDisbursementToSavings(
    amount: number,
    currency: string,
    loanReceivableCode: string,
    clientSavingsCode: string,
    branchId: string,
    createdBy: string,
    clientAccountId?: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      {
        accountCode: loanReceivableCode,
        debit: amount,
        credit: 0,
        currency,
      },
      {
        accountCode: clientSavingsCode,
        debit: 0,
        credit: amount,
        currency,
        clientAccountId,
      },
    ]);
    return this.post(draft, em);
  }

  /**
   * Loan repayment: client deposits cash (step 1), then the repayment
   * is deducted from their savings (step 2), split into principal + interest
   * and optionally + penalty.
   */
  async postLoanRepaymentFromSavings(
    principal: number,
    interest: number,
    penalty: number,
    currency: string,
    clientSavingsCode: string,
    loanReceivableCode: string,
    interestIncomeCode: string,
    penaltyIncomeCode: string,
    branchId: string,
    createdBy: string,
    clientAccountId?: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const total = principal + interest + penalty;
    const lines: JournalLineSpec[] = [
      {
        accountCode: clientSavingsCode,
        debit: total,
        credit: 0,
        currency,
        clientAccountId,
      },
      {
        accountCode: loanReceivableCode,
        debit: 0,
        credit: principal,
        currency,
      },
    ];
    if (interest > 0) {
      lines.push({
        accountCode: interestIncomeCode,
        debit: 0,
        credit: interest,
        currency,
      });
    }
    if (penalty > 0) {
      lines.push({
        accountCode: penaltyIncomeCode,
        debit: 0,
        credit: penalty,
        currency,
      });
    }
    const draft = new JournalEntryDraft(branchId, createdBy, description, lines);
    return this.post(draft, em);
  }

  async postVaultToTeller(
    amount: number,
    currency: string,
    tellerCode: string,
    vaultCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: tellerCode, debit: amount, credit: 0, currency },
      { accountCode: vaultCode, debit: 0, credit: amount, currency },
    ]);
    return this.post(draft, em);
  }

  async postExpense(
    amount: number,
    currency: string,
    expenseCode: string,
    cashCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: expenseCode, debit: amount, credit: 0, currency },
      { accountCode: cashCode, debit: 0, credit: amount, currency },
    ]);
    return this.post(draft, em);
  }

  /**
   * Posts a reversal of an existing entry.
   * The reversal flips every debit/credit on the original lines.
   * The original entry is NOT automatically marked as REVERSED here —
   * that update must be done separately by the caller.
   */
  async postReversal(
    originalLines: JournalLineSpec[],
    reversalOf: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const reversedLines: JournalLineSpec[] = originalLines.map((l) => ({
      accountCode: l.accountCode,
      clientAccountId: l.clientAccountId,
      debit: l.credit,
      credit: l.debit,
      currency: l.currency,
      description: l.description,
    }));
    const draft = new JournalEntryDraft(
      branchId,
      createdBy,
      description,
      reversedLines,
      reversalOf,
    );
    return this.post(draft, em);
  }

  // ─── Query helpers ───────────────────────────────────────────────────────────

  async findEntries(branchId?: string): Promise<JournalEntryRecord[]> {
    return this.repo.findAll(branchId);
  }

  /**
   * Returns entries grouped so that reversal entries are nested under
   * the original entry they reverse. Standalone entries appear with an
   * empty reversals array.
   */
  async findGroupedEntries(
    branchId?: string,
  ): Promise<JournalEntryGroupRecord[]> {
    const entries = await this.repo.findAll(branchId);

    const byId = new Map<string, JournalEntryRecord>();
    const reversalsMap = new Map<string, JournalEntryRecord[]>();

    for (const entry of entries) {
      byId.set(entry.id, entry);
      if (!reversalsMap.has(entry.id)) {
        reversalsMap.set(entry.id, []);
      }
    }

    for (const entry of entries) {
      if (entry.reversalOf && byId.has(entry.reversalOf)) {
        const list = reversalsMap.get(entry.reversalOf)!;
        if (!list.some((r) => r.id === entry.id)) {
          list.push(entry);
        }
      }
    }

    return entries
      .filter((e) => !e.reversalOf || !byId.has(e.reversalOf))
      .map((e) => ({
        entry: e,
        reversals: reversalsMap.get(e.id) ?? [],
      }));
  }

  async findEntryById(id: string): Promise<JournalEntryRecord | null> {
    return this.repo.findById(id);
  }

  async findChartAccounts(): Promise<ChartOfAccountsRecord[]> {
    return this.repo.findChartAccounts();
  }

  // ─── Core private method ─────────────────────────────────────────────────────

  private async post(
    draft: JournalEntryDraft,
    em?: EntityManager,
  ): Promise<string> {
    draft.assertBalanced();

    const resolvedAccounts = new Map<string, ChartOfAccountsEntity>();
    for (const line of draft.lines) {
      if (!resolvedAccounts.has(line.accountCode)) {
        const coa = await this.repo.findChartAccount(line.accountCode, em);
        resolvedAccounts.set(line.accountCode, coa);
      }
    }

    const entry = new JournalEntryEntity();
    entry.reference = this.generateReference();
    entry.branch_id = draft.branchId;
    entry.created_by = draft.createdBy;
    entry.description = draft.description ?? null;
    entry.status = JournalEntryStatus.POSTED;
    entry.reversal_of = draft.reversalOf ?? null;
    entry.posted_by = draft.createdBy;
    entry.posted_at = new Date();
    entry.transaction_id = null;

    const lines: JournalLineEntity[] = draft.lines.map((spec) => {
      const coa = resolvedAccounts.get(spec.accountCode)!;
      const line = new JournalLineEntity();
      line.account_id = coa.id;
      line.client_account_id = spec.clientAccountId ?? null;
      line.debit = String(spec.debit);
      line.credit = String(spec.credit);
      line.currency = spec.currency;
      line.description = spec.description ?? null;
      return line;
    });

    await this.repo.saveEntry(entry, lines, em);
    return entry.reference;
  }

  private generateReference(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `JE-${yyyymmdd}-${hex}`;
  }
}
