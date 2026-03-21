import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import {
  COA_CODES,
  JournalLineSide,
  JournalOperationType,
} from './accounting.enums';
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

  // ─── Public posting helpers ──────────────────────────────────────────────────

  async postDeposit(
    amount: number,
    currency: string,
    branchId: string,
    performedBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    const draft = new JournalEntryDraft(
      JournalOperationType.DEPOSIT,
      branchId,
      performedBy,
      description,
      [
        {
          accountCode: COA_CODES.CASH,
          side: JournalLineSide.DEBIT,
          amount,
          currency,
        },
        {
          accountCode: COA_CODES.MEMBER_DEPOSITS,
          side: JournalLineSide.CREDIT,
          amount,
          currency,
        },
      ],
    );
    await this.post(draft, em);
  }

  async postWithdrawal(
    amount: number,
    currency: string,
    branchId: string,
    performedBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    const draft = new JournalEntryDraft(
      JournalOperationType.WITHDRAWAL,
      branchId,
      performedBy,
      description,
      [
        {
          accountCode: COA_CODES.MEMBER_DEPOSITS,
          side: JournalLineSide.DEBIT,
          amount,
          currency,
        },
        {
          accountCode: COA_CODES.CASH,
          side: JournalLineSide.CREDIT,
          amount,
          currency,
        },
      ],
    );
    await this.post(draft, em);
  }

  async postInternalTransfer(
    amount: number,
    currency: string,
    branchId: string,
    performedBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    const draft = new JournalEntryDraft(
      JournalOperationType.TRANSFER,
      branchId,
      performedBy,
      description,
      [
        {
          accountCode: COA_CODES.MEMBER_DEPOSITS,
          side: JournalLineSide.DEBIT,
          amount,
          currency,
        },
        {
          accountCode: COA_CODES.MEMBER_DEPOSITS,
          side: JournalLineSide.CREDIT,
          amount,
          currency,
        },
      ],
    );
    await this.post(draft, em);
  }

  /**
   * External transfer produces two separate journal entries:
   * 1. The transfer itself (Member Deposits → Cash)
   * 2. The fee (Cash → Fee Income)
   */
  async postExternalTransfer(
    amount: number,
    feeAmount: number,
    currency: string,
    branchId: string,
    performedBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    const transferDraft = new JournalEntryDraft(
      JournalOperationType.TRANSFER,
      branchId,
      performedBy,
      description,
      [
        {
          accountCode: COA_CODES.MEMBER_DEPOSITS,
          side: JournalLineSide.DEBIT,
          amount,
          currency,
        },
        {
          accountCode: COA_CODES.CASH,
          side: JournalLineSide.CREDIT,
          amount,
          currency,
        },
      ],
    );
    const transferRef = await this.post(transferDraft, em);

    if (feeAmount > 0) {
      const feeDraft = new JournalEntryDraft(
        JournalOperationType.FEE_PENALTY,
        branchId,
        performedBy,
        description,
        [
          {
            accountCode: COA_CODES.CASH,
            side: JournalLineSide.DEBIT,
            amount: feeAmount,
            currency,
          },
          {
            accountCode: COA_CODES.FEE_INCOME,
            side: JournalLineSide.CREDIT,
            amount: feeAmount,
            currency,
          },
        ],
        transferRef,
      );
      await this.post(feeDraft, em);
    }
  }

  async postFeePenalty(
    amount: number,
    isPenalty: boolean,
    currency: string,
    branchId: string,
    performedBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    const creditCode = isPenalty
      ? COA_CODES.PENALTY_INCOME
      : COA_CODES.FEE_INCOME;
    const draft = new JournalEntryDraft(
      JournalOperationType.FEE_PENALTY,
      branchId,
      performedBy,
      description,
      [
        {
          accountCode: COA_CODES.CASH,
          side: JournalLineSide.DEBIT,
          amount,
          currency,
        },
        {
          accountCode: creditCode,
          side: JournalLineSide.CREDIT,
          amount,
          currency,
        },
      ],
    );
    await this.post(draft, em);
  }

  /** Stub — wired when Epic 4 (Loan Module) is implemented. */
  async postLoanDisbursement(
    amount: number,
    currency: string,
    branchId: string,
    performedBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    const draft = new JournalEntryDraft(
      JournalOperationType.LOAN_DISBURSEMENT,
      branchId,
      performedBy,
      description,
      [
        {
          accountCode: COA_CODES.LOANS_RECEIVABLE,
          side: JournalLineSide.DEBIT,
          amount,
          currency,
        },
        {
          accountCode: COA_CODES.CASH,
          side: JournalLineSide.CREDIT,
          amount,
          currency,
        },
      ],
    );
    await this.post(draft, em);
  }

  /** Stub — wired when Epic 4 (Loan Module) is implemented. */
  async postLoanRepayment(
    principal: number,
    interest: number,
    currency: string,
    branchId: string,
    performedBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    const total = principal + interest;
    const lines: JournalLineSpec[] = [
      {
        accountCode: COA_CODES.CASH,
        side: JournalLineSide.DEBIT,
        amount: total,
        currency,
      },
      {
        accountCode: COA_CODES.LOANS_RECEIVABLE,
        side: JournalLineSide.CREDIT,
        amount: principal,
        currency,
      },
    ];
    if (interest > 0) {
      lines.push({
        accountCode: COA_CODES.INTEREST_INCOME,
        side: JournalLineSide.CREDIT,
        amount: interest,
        currency,
      });
    }
    const draft = new JournalEntryDraft(
      JournalOperationType.LOAN_REPAYMENT,
      branchId,
      performedBy,
      description,
      lines,
    );
    await this.post(draft, em);
  }

  // ─── Query helpers ───────────────────────────────────────────────────────────

  async findEntries(
    branchId?: string,
    operationType?: string,
  ): Promise<JournalEntryRecord[]> {
    return this.repo.findAll(branchId, operationType);
  }

  /**
   * Returns entries grouped so that child entries (those with a relatedReference)
   * are nested under their parent entry. Standalone entries appear with an empty
   * related array.
   */
  async findGroupedEntries(
    branchId?: string,
    operationType?: string,
  ): Promise<JournalEntryGroupRecord[]> {
    const entries = await this.repo.findAll(branchId, operationType);

    const byRef = new Map<string, JournalEntryRecord>();
    const children = new Map<string, JournalEntryRecord[]>();

    for (const entry of entries) {
      byRef.set(entry.reference, entry);
      if (!children.has(entry.reference)) {
        children.set(entry.reference, []);
      }
    }

    for (const entry of entries) {
      if (entry.relatedReference && byRef.has(entry.relatedReference)) {
        const list = children.get(entry.relatedReference)!;
        if (!list.some((c) => c.id === entry.id)) {
          list.push(entry);
        }
      }
    }

    // Only return parent-level entries (those without a relatedReference,
    // or whose relatedReference doesn't match any known entry)
    return entries
      .filter((e) => !e.relatedReference || !byRef.has(e.relatedReference))
      .map((e) => ({
        entry: e,
        related: children.get(e.reference) ?? [],
      }));
  }

  async findEntryById(id: string): Promise<JournalEntryRecord | null> {
    return this.repo.findById(id);
  }

  async findChartAccounts(branchId?: string): Promise<ChartOfAccountsRecord[]> {
    return this.repo.findChartAccounts(branchId);
  }

  // ─── Core private method ─────────────────────────────────────────────────────

  private async post(
    draft: JournalEntryDraft,
    em?: EntityManager,
  ): Promise<string> {
    draft.assertBalanced();

    // Resolve each line's accountCode → ChartOfAccountsEntity.id
    const resolvedAccounts = new Map<string, ChartOfAccountsEntity>();
    for (const line of draft.lines) {
      const key = `${line.accountCode}:${line.currency}`;
      if (!resolvedAccounts.has(key)) {
        const coa = await this.repo.findChartAccount(
          line.accountCode,
          draft.branchId,
          line.currency,
          em,
        );
        resolvedAccounts.set(key, coa);
      }
    }

    const entry = new JournalEntryEntity();
    entry.reference = this.generateReference();
    entry.operation_type = draft.operationType;
    entry.branch_id = draft.branchId;
    entry.performed_by = draft.performedBy;
    entry.description = draft.description ?? null;
    entry.related_reference = draft.relatedReference ?? null;

    const lines: JournalLineEntity[] = draft.lines.map((spec) => {
      const coa = resolvedAccounts.get(`${spec.accountCode}:${spec.currency}`)!;
      const line = new JournalLineEntity();
      line.account_id = coa.id;
      line.side = spec.side;
      line.amount = String(spec.amount);
      line.currency = spec.currency;
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
