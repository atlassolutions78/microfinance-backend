import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { SequenceService } from '../sequences/sequence.service';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import { ChartAccountType, JournalEntryStatus } from './accounting.enums';
import { JournalEntryDraft, JournalLineSpec } from './accounting.model';
import { AccountingRepository } from './accounting.repository';
import {
  BalanceSheetRecord,
  ChartOfAccountsRecord,
  GeneralLedgerAccountRecord,
  IncomeStatementRecord,
  JournalEntryGroupRecord,
  JournalEntryRecord,
  TrialBalanceRecord,
} from './accounting.mapper';

@Injectable()
export class AccountingService {
  constructor(
    private readonly repo: AccountingRepository,
    private readonly sequenceService: SequenceService,
  ) {}

  // ─── Posting helpers ─────────────────────────────────────────────────────────

  async postDeposit(
    amount: number,
    currency: string,
    tellerCode: string,
    clientSavingsCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
    transactionId?: string,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: tellerCode, debit: amount, credit: 0, currency },
      { accountCode: clientSavingsCode, debit: 0, credit: amount, currency },
    ]);
    return this.post(draft, em, transactionId);
  }

  async postWithdrawal(
    amount: number,
    currency: string,
    tellerCode: string,
    clientSavingsCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
    transactionId?: string,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: clientSavingsCode, debit: amount, credit: 0, currency },
      { accountCode: tellerCode, debit: 0, credit: amount, currency },
    ]);
    return this.post(draft, em, transactionId);
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
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: loanReceivableCode, debit: amount, credit: 0, currency },
      { accountCode: clientSavingsCode, debit: 0, credit: amount, currency },
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
    const draft = new JournalEntryDraft(
      branchId,
      createdBy,
      description,
      lines,
    );
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

  /**
   * Float approval: vault releases cash to a teller's till.
   * Posts one entry per currency that has a non-zero amount.
   * tellerCode / vaultCode must be the teller-specific COA codes.
   */
  async postTellerFloatApproval(
    amountFC: number,
    amountUSD: number,
    tellerFcCode: string,
    tellerUsdCode: string,
    vaultFcCode: string,
    vaultUsdCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<void> {
    if (amountFC > 0) {
      await this.postVaultToTeller(
        amountFC,
        'FC',
        tellerFcCode,
        vaultFcCode,
        branchId,
        createdBy,
        description,
        em,
      );
    }
    if (amountUSD > 0) {
      await this.postVaultToTeller(
        amountUSD,
        'USD',
        tellerUsdCode,
        vaultUsdCode,
        branchId,
        createdBy,
        description,
        em,
      );
    }
  }

  /**
   * Book transfer between two client accounts (no physical cash movement).
   * Dr. source account's COA liability  →  Cr. destination account's COA liability.
   * Source and destination may have different account types (e.g. SAVINGS → CHECKING).
   */
  async postBookTransfer(
    amount: number,
    currency: string,
    sourceCoaCode: string,
    destCoaCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
    transactionId?: string,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: sourceCoaCode, debit: amount, credit: 0, currency },
      { accountCode: destCoaCode, debit: 0, credit: amount, currency },
    ]);
    return this.post(draft, em, transactionId);
  }

  /**
   * EOD reconciliation: clears the teller's till back to the vault.
   * Any variance (surplus or deficit) posts to the TELLER_VARIANCE account.
   *
   * Journal for FC (same pattern for USD):
   *   Dr. VAULT_BRANCH_FC    declared
   *   Dr. TELLER_VARIANCE_FC deficit   (if actual < expected)
   *   Cr. TELLER_FC          expected
   *   Cr. TELLER_VARIANCE_FC surplus   (if actual > expected)
   */
  async postTellerReconciliation(
    params: {
      expectedFC: number;
      declaredFC: number;
      expectedUSD: number;
      declaredUSD: number;
      tellerFcCode: string;
      tellerUsdCode: string;
      vaultFcCode: string;
      vaultUsdCode: string;
      varianceFcCode: string;
      varianceUsdCode: string;
      branchId: string;
      createdBy: string;
      description?: string;
    },
    em?: EntityManager,
  ): Promise<void> {
    const postCurrency = async (
      expected: number,
      declared: number,
      tellerCode: string,
      vaultCode: string,
      varianceCode: string,
      currency: string,
    ) => {
      if (expected === 0 && declared === 0) return;
      const variance = new Decimal(declared).minus(expected); // positive = surplus, negative = deficit
      const lines: JournalLineSpec[] = [
        { accountCode: vaultCode, debit: declared, credit: 0, currency },
        { accountCode: tellerCode, debit: 0, credit: expected, currency },
      ];
      if (!variance.isZero()) {
        if (variance.isPositive()) {
          // surplus: vault gets more than expected → credit variance
          lines.push({
            accountCode: varianceCode,
            debit: 0,
            credit: variance.toNumber(),
            currency,
          });
        } else {
          // deficit: teller short → debit variance
          lines.push({
            accountCode: varianceCode,
            debit: variance.abs().toNumber(),
            credit: 0,
            currency,
          });
        }
      }
      const draft = new JournalEntryDraft(
        params.branchId,
        params.createdBy,
        params.description,
        lines,
      );
      await this.post(draft, em);
    };

    await postCurrency(
      params.expectedFC,
      params.declaredFC,
      params.tellerFcCode,
      params.vaultFcCode,
      params.varianceFcCode,
      'FC',
    );
    await postCurrency(
      params.expectedUSD,
      params.declaredUSD,
      params.tellerUsdCode,
      params.vaultUsdCode,
      params.varianceUsdCode,
      'USD',
    );
  }

  /**
   * Provisions vault FC/USD and teller-aggregate FC/USD COA accounts for a
   * new branch. Called lazily when a branch's first teller session is requested.
   *
   * Code scheme (XX = next branch seq, zero-padded):
   *   5702XX01  branch vault FC          (child of 5702 header)
   *   5702XX02  branch vault USD         (child of 5702 header)
   *   5703XX00  branch teller agg FC     (child of 5703 header)
   *   5703XX50  branch teller agg USD    (child of 5703 header)
   */
  async provisionBranchCoaAccounts(
    branchName: string,
    createdBy: string,
    em?: EntityManager,
  ): Promise<{
    branchSeq: number;
    vaultFcCode: string;
    vaultUsdCode: string;
    tellerFcCode: string;
    tellerUsdCode: string;
    vaultFcId: string;
    vaultUsdId: string;
    tellerFcId: string;
    tellerUsdId: string;
  }> {
    const maxSeq = await this.repo.getMaxBranchSeq();
    const branchSeq = maxSeq + 1;
    const xx = String(branchSeq).padStart(2, '0');

    const vaultFcCode = `5702${xx}01`;
    const vaultUsdCode = `5702${xx}02`;
    const tellerFcCode = `5703${xx}00`;
    const tellerUsdCode = `5703${xx}50`;

    const vaultHeader = await this.repo.findChartAccount('5702', em);
    const tellerHeader = await this.repo.findChartAccount('5703', em);

    const vaultFcEntity = await this.repo.createChartAccount(
      {
        code: vaultFcCode,
        name: `Coffre – ${branchName} (FC)`,
        type: ChartAccountType.ASSET,
        parentId: vaultHeader.id,
        createdBy,
      },
      em,
    );
    const vaultUsdEntity = await this.repo.createChartAccount(
      {
        code: vaultUsdCode,
        name: `Coffre – ${branchName} (USD)`,
        type: ChartAccountType.ASSET,
        parentId: vaultHeader.id,
        createdBy,
      },
      em,
    );
    const tellerFcEntity = await this.repo.createChartAccount(
      {
        code: tellerFcCode,
        name: `Caisse guichet – ${branchName} (FC)`,
        type: ChartAccountType.ASSET,
        parentId: tellerHeader.id,
        createdBy,
      },
      em,
    );
    const tellerUsdEntity = await this.repo.createChartAccount(
      {
        code: tellerUsdCode,
        name: `Caisse guichet – ${branchName} (USD)`,
        type: ChartAccountType.ASSET,
        parentId: tellerHeader.id,
        createdBy,
      },
      em,
    );

    return {
      branchSeq,
      vaultFcCode,
      vaultUsdCode,
      tellerFcCode,
      tellerUsdCode,
      vaultFcId: vaultFcEntity.id,
      vaultUsdId: vaultUsdEntity.id,
      tellerFcId: tellerFcEntity.id,
      tellerUsdId: tellerUsdEntity.id,
    };
  }

  /**
   * Provisions individual FC + USD COA accounts for a teller under their
   * branch's teller aggregate accounts.
   *
   * Code scheme (XX = branch_seq, NN = next teller seq within branch):
   *   5703XXNN      teller FC   (NN = 01–49, child of 5703XX00)
   *   5703XX(NN+50) teller USD  (NN+50 = 51–99, child of 5703XX50)
   */
  async provisionTellerCoaAccounts(
    tellerName: string,
    branchSeq: number,
    branchTellerFcCode: string,
    branchTellerUsdCode: string,
    createdBy: string,
    em?: EntityManager,
  ): Promise<{ fcCode: string; usdCode: string; fcId: string; usdId: string }> {
    const maxSeq = await this.repo.getMaxTellerSeqForBranch(branchSeq);
    const tellerSeq = maxSeq + 1;

    if (tellerSeq > 49) {
      throw new Error(
        `Branch sequence ${branchSeq} has reached the maximum of 49 tellers.`,
      );
    }

    const xx = String(branchSeq).padStart(2, '0');
    const nn = String(tellerSeq).padStart(2, '0');
    const fcCode = `5703${xx}${nn}`;
    const usdCode = `5703${xx}${String(tellerSeq + 50).padStart(2, '0')}`;

    const fcParent = await this.repo.findChartAccount(branchTellerFcCode, em);
    const usdParent = await this.repo.findChartAccount(branchTellerUsdCode, em);

    const fcEntity = await this.repo.createChartAccount(
      {
        code: fcCode,
        name: `Caisse Teller – ${tellerName} (FC)`,
        type: ChartAccountType.ASSET,
        parentId: fcParent.id,
        createdBy,
      },
      em,
    );
    const usdEntity = await this.repo.createChartAccount(
      {
        code: usdCode,
        name: `Caisse Teller – ${tellerName} (USD)`,
        type: ChartAccountType.ASSET,
        parentId: usdParent.id,
        createdBy,
      },
      em,
    );

    return { fcCode, usdCode, fcId: fcEntity.id, usdId: usdEntity.id };
  }

  /**
   * Remittance Leg 1 — sending teller receives cash from sender.
   * DR: Teller Cash COA  →  CR: Remittance Transit
   */
  async postRemittanceSend(
    amount: number,
    currency: string,
    tellerCashCode: string,
    transitCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: tellerCashCode, debit: amount, credit: 0, currency },
      { accountCode: transitCode, debit: 0, credit: amount, currency },
    ]);
    return this.post(draft, em);
  }

  /**
   * Remittance Leg 2 — receiving teller pays out cash to recipient.
   * Also used for cancellation (cash returns to sending teller's drawer).
   * DR: Remittance Transit  →  CR: Teller Cash COA
   */
  async postRemittancePayout(
    amount: number,
    currency: string,
    transitCode: string,
    tellerCashCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: transitCode, debit: amount, credit: 0, currency },
      { accountCode: tellerCashCode, debit: 0, credit: amount, currency },
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
   * Penalty assessment entry (accrual basis):
   *   DR Loan Receivable  (asset increases — client owes more)
   *   CR Penalty Income   (income recognized at assessment)
   */
  async postPenaltyAssessment(
    amount: number,
    currency: string,
    loanReceivableCode: string,
    penaltyIncomeCode: string,
    branchId: string,
    createdBy: string,
    description?: string,
    em?: EntityManager,
  ): Promise<string> {
    const draft = new JournalEntryDraft(branchId, createdBy, description, [
      { accountCode: loanReceivableCode, debit: amount, credit: 0, currency },
      { accountCode: penaltyIncomeCode, debit: 0, credit: amount, currency },
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

  async findEntries(
    branchId?: string,
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: JournalEntryRecord[]; total: number }> {
    return this.repo.findAll(branchId, search, page, limit);
  }

  /**
   * Returns entries grouped so that reversal entries are nested under
   * the original entry they reverse. Standalone entries appear with an
   * empty reversals array.
   */
  async findGroupedEntries(
    branchId?: string,
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: JournalEntryGroupRecord[]; total: number }> {
    const { data: entries, total } = await this.repo.findAll(
      branchId,
      search,
      page,
      limit,
    );

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

    const data = entries
      .filter((e) => !e.reversalOf || !byId.has(e.reversalOf))
      .map((e) => ({
        entry: e,
        reversals: reversalsMap.get(e.id) ?? [],
      }));

    return { data, total };
  }

  async findEntryById(id: string): Promise<JournalEntryRecord | null> {
    return this.repo.findById(id);
  }

  async findChartAccounts(
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<{ data: ChartOfAccountsRecord[]; total: number }> {
    return this.repo.findChartAccounts(page, limit, search);
  }

  async findChartAccountByCode(
    code: string,
  ): Promise<{ code: string; name: string }> {
    const entity = await this.repo.findChartAccount(code);
    return { code: entity.code, name: entity.name };
  }

  async getGeneralLedger(
    branchId?: string,
    from?: Date,
    to?: Date,
    currency?: string,
  ): Promise<GeneralLedgerAccountRecord[]> {
    return this.repo.getGeneralLedger(branchId, from, to, currency);
  }

  async getBalanceSheet(
    asOf: Date,
    branchId?: string,
    currency?: string,
  ): Promise<BalanceSheetRecord> {
    return this.repo.getBalanceSheet(asOf, branchId, currency);
  }

  async getIncomeStatement(
    from: Date,
    to: Date,
    branchId?: string,
    currency?: string,
  ): Promise<IncomeStatementRecord> {
    return this.repo.getIncomeStatement(from, to, branchId, currency);
  }

  async getTrialBalance(
    asOf: Date,
    branchId?: string,
    currency?: string,
  ): Promise<TrialBalanceRecord> {
    return this.repo.getTrialBalance(asOf, branchId, currency);
  }

  // ─── Core private method ─────────────────────────────────────────────────────

  private async post(
    draft: JournalEntryDraft,
    em?: EntityManager,
    transactionId?: string,
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
    entry.reference = await this.sequenceService.nextReference(draft.branchId, 'JE');
    entry.branch_id = draft.branchId;
    entry.created_by = draft.createdBy;
    entry.description = draft.description ?? null;
    entry.status = JournalEntryStatus.POSTED;
    entry.reversal_of = draft.reversalOf ?? null;
    entry.posted_by = draft.createdBy;
    entry.posted_at = new Date();
    entry.transaction_id = transactionId ?? null;

    const lines: JournalLineEntity[] = draft.lines.map((spec) => {
      const coa = resolvedAccounts.get(spec.accountCode)!;
      const line = new JournalLineEntity();
      line.account_id = coa.id;
      line.debit = String(spec.debit);
      line.credit = String(spec.credit);
      line.currency = spec.currency;
      line.description = spec.description ?? null;
      return line;
    });

    await this.repo.saveEntry(entry, lines, em);
    return entry.reference;
  }

}
