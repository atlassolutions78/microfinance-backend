import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import {
  AccountingMapper,
  BalanceSheetRecord,
  BalanceSheetSectionRecord,
  ChartOfAccountsRecord,
  GeneralLedgerAccountRecord,
  GeneralLedgerLineRecord,
  IncomeStatementRecord,
  JournalEntryRecord,
  TrialBalanceLineRecord,
  TrialBalanceRecord,
} from './accounting.mapper';
import { ChartAccountType } from './accounting.enums';
import { UserEntity } from 'src/users/user.entity';

@Injectable()
export class AccountingRepository {
  constructor(
    @InjectRepository(ChartOfAccountsEntity)
    private readonly coaRepo: Repository<ChartOfAccountsEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly entryRepo: Repository<JournalEntryEntity>,
    @InjectRepository(JournalLineEntity)
    private readonly lineRepo: Repository<JournalLineEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Looks up a chart-of-accounts entry by its numeric code.
   * COA is institution-wide — no branch or currency filter needed.
   * Throws NotFoundException if the account has not been seeded.
   */
  async findChartAccount(
    code: string,
    em?: EntityManager,
  ): Promise<ChartOfAccountsEntity> {
    const repo = em ? em.getRepository(ChartOfAccountsEntity) : this.coaRepo;
    const entity = await repo.findOne({
      where: { code, is_active: true },
    });
    if (!entity) {
      throw new NotFoundException(
        `Chart of accounts entry not found: code="${code}". ` +
          `Ensure chart_of_accounts is seeded before processing transactions.`,
      );
    }
    return entity;
  }

  /**
   * Persists a journal entry and all its lines atomically.
   * When called inside a dataSource.transaction(), pass the EntityManager
   * so all writes share the same connection.
   */
  async saveEntry(
    entry: JournalEntryEntity,
    lines: JournalLineEntity[],
    em?: EntityManager,
  ): Promise<void> {
    if (em) {
      const savedEntry = await em.save(JournalEntryEntity, entry);
      for (const line of lines) {
        line.journal_entry_id = savedEntry.id;
        await em.save(JournalLineEntity, line);
      }
    } else {
      const savedEntry = await this.entryRepo.save(entry);
      for (const line of lines) {
        line.journal_entry_id = savedEntry.id;
        await this.lineRepo.save(line);
      }
    }
  }

  async findAll(
    branchId?: string,
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: JournalEntryRecord[]; total: number }> {
    const p = page ?? 1;
    const l = limit ?? 20;
    const s = search?.trim();

    const qb = this.entryRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.lines', 'line')
      .leftJoinAndSelect('line.chartAccount', 'coa')
      .orderBy('e.created_at', 'DESC');

    if (branchId) {
      qb.andWhere('e.branch_id = :branchId', { branchId });
    }

    if (s) {
      qb.andWhere(
        '(e.reference ILIKE :search OR e.description ILIKE :search)',
        { search: `%${s}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip((p - 1) * l)
      .take(l)
      .getMany();

    const userIds = new Set<string>();
    for (const e of entities) {
      if (e.created_by) userIds.add(e.created_by);
      if (e.posted_by) userIds.add(e.posted_by);
    }
    const nameMap = await this.resolveUserNames([...userIds]);

    const data = entities.map((e) =>
      AccountingMapper.entryToDomain(
        e,
        nameMap.get(e.created_by),
        e.posted_by ? (nameMap.get(e.posted_by) ?? null) : null,
      ),
    );

    return { data, total };
  }

  async findById(id: string): Promise<JournalEntryRecord | null> {
    const entity = await this.entryRepo.findOne({
      where: { id },
      relations: ['lines', 'lines.chartAccount'],
    });
    if (!entity) return null;

    const userIds = [entity.created_by, entity.posted_by].filter(
      Boolean,
    ) as string[];
    const nameMap = await this.resolveUserNames(userIds);

    return AccountingMapper.entryToDomain(
      entity,
      nameMap.get(entity.created_by),
      entity.posted_by ? (nameMap.get(entity.posted_by) ?? null) : null,
    );
  }

  async findChartAccounts(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{ data: ChartOfAccountsRecord[]; total: number }> {
    const qb = this.coaRepo
      .createQueryBuilder('coa')
      .orderBy('coa.code', 'ASC');

    if (search) {
      qb.where('coa.code ILIKE :s OR coa.name ILIKE :s', { s: `%${search}%` });
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data: entities.map(AccountingMapper.coaToDomain), total };
  }

  /**
   * Returns the highest branch sequence number already provisioned.
   * Branch seq is encoded in digits 5–6 of any 5702XX01 vault FC code.
   * Returns 0 if no branches have been provisioned yet.
   */
  async getMaxBranchSeq(): Promise<number> {
    const result: Array<{ max_seq: number | null }> =
      await this.coaRepo.manager.query(
        `SELECT MAX(CAST(SUBSTRING(code, 5, 2) AS INTEGER)) AS max_seq
         FROM chart_of_accounts
         WHERE code ~ '^5702[0-9]{2}01$'`,
      );
    return result[0]?.max_seq ?? 0;
  }

  /**
   * Returns the highest teller sequence number provisioned within a branch.
   * Teller seq is encoded in digits 7–8 of a 5703XXYY code (01–49 = FC range).
   * Returns 0 if no tellers have been provisioned for this branch yet.
   */
  async getMaxTellerSeqForBranch(branchSeq: number): Promise<number> {
    const prefix = `5703${String(branchSeq).padStart(2, '0')}`;
    const result: Array<{ max_seq: number | null }> =
      await this.coaRepo.manager.query(
        `SELECT MAX(CAST(SUBSTRING(code, 7, 2) AS INTEGER)) AS max_seq
         FROM chart_of_accounts
         WHERE code LIKE $1
           AND LENGTH(code) = 8
           AND CAST(SUBSTRING(code, 7, 2) AS INTEGER) BETWEEN 1 AND 49`,
        [`${prefix}%`],
      );
    return result[0]?.max_seq ?? 0;
  }

  /**
   * Creates a new chart-of-accounts entry.
   * Used when provisioning per-branch and per-teller cash accounts.
   */
  async createChartAccount(
    params: {
      code: string;
      name: string;
      type: ChartAccountType;
      parentId: string | null;
      createdBy: string;
    },
    em?: EntityManager,
  ): Promise<ChartOfAccountsEntity> {
    const repo = em ? em.getRepository(ChartOfAccountsEntity) : this.coaRepo;
    const entity = repo.create({
      code: params.code,
      name: params.name,
      type: params.type,
      parent_id: params.parentId,
      is_active: true,
      created_by: params.createdBy,
    });
    return repo.save(entity);
  }

  private async resolveUserNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: { id: true, first_name: true, last_name: true },
    });
    return new Map(users.map((u) => [u.id, `${u.first_name} ${u.last_name}`]));
  }

  // ─── Accounting reports ───────────────────────────────────────────────────

  async getGeneralLedger(
    branchId?: string,
    from?: Date,
    to?: Date,
    currency?: string,
  ): Promise<GeneralLedgerAccountRecord[]> {
    const params: any[] = [];
    const extraFilters: string[] = [];

    if (branchId)  extraFilters.push(`je.branch_id = $${params.push(branchId)}`);
    if (from)      extraFilters.push(`je.created_at::date >= $${params.push(from)}`);
    if (to)        extraFilters.push(`je.created_at::date <= $${params.push(to)}`);
    if (currency)  extraFilters.push(`jl.currency = $${params.push(currency)}`);

    const extraWhere = extraFilters.length ? `AND ${extraFilters.join(' AND ')}` : '';

    const rows: Array<{
      account_id: string;
      code: string;
      name: string;
      type: ChartAccountType;
      entry_id: string;
      reference: string;
      date: Date;
      entry_description: string | null;
      line_description: string | null;
      debit: string;
      credit: string;
      currency: string;
    }> = await this.entryRepo.manager.query(
      `SELECT
         coa.id          AS account_id,
         coa.code,
         coa.name,
         coa.type,
         je.id           AS entry_id,
         je.reference,
         je.created_at   AS date,
         je.description  AS entry_description,
         jl.description  AS line_description,
         jl.debit,
         jl.credit,
         jl.currency
       FROM journal_lines jl
       JOIN journal_entries je    ON je.id  = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'POSTED'
         ${extraWhere}
       ORDER BY coa.code, je.created_at, jl.id`,
      params,
    );

    // Internal accumulator uses Decimal for precision
    const accountMap = new Map<string, {
      accountId: string; code: string; name: string; type: ChartAccountType;
      totalDebit: Decimal; totalCredit: Decimal;
      lines: GeneralLedgerLineRecord[];
    }>();

    for (const r of rows) {
      if (!accountMap.has(r.account_id)) {
        accountMap.set(r.account_id, {
          accountId: r.account_id, code: r.code, name: r.name, type: r.type,
          totalDebit: new Decimal(0), totalCredit: new Decimal(0), lines: [],
        });
      }
      const acct = accountMap.get(r.account_id)!;
      const debit  = new Decimal(r.debit);
      const credit = new Decimal(r.credit);
      acct.totalDebit  = acct.totalDebit.plus(debit);
      acct.totalCredit = acct.totalCredit.plus(credit);

      const isDebitNormal = r.type === ChartAccountType.ASSET || r.type === ChartAccountType.EXPENSE;
      const prevBalance = acct.lines.length > 0
        ? new Decimal(acct.lines[acct.lines.length - 1].runningBalance)
        : new Decimal(0);
      const delta = isDebitNormal ? debit.minus(credit) : credit.minus(debit);

      acct.lines.push({
        journalEntryId: r.entry_id,
        reference: r.reference,
        date: r.date,
        description: r.line_description ?? r.entry_description,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        currency: r.currency,
        runningBalance: prevBalance.plus(delta).toFixed(2),
      });
    }

    return [...accountMap.values()].map((acct) => {
      const isDebitNormal = acct.type === ChartAccountType.ASSET || acct.type === ChartAccountType.EXPENSE;
      const closingBalance = isDebitNormal
        ? acct.totalDebit.minus(acct.totalCredit)
        : acct.totalCredit.minus(acct.totalDebit);
      return {
        accountId: acct.accountId,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        totalDebit: acct.totalDebit.toFixed(2),
        totalCredit: acct.totalCredit.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
        lines: acct.lines,
      };
    });
  }

  async getBalanceSheet(
    asOf: Date,
    branchId?: string,
    currency?: string,
  ): Promise<BalanceSheetRecord> {
    const params: any[] = [asOf];
    const extraFilters: string[] = [];

    if (branchId) extraFilters.push(`je.branch_id = $${params.push(branchId)}`);
    if (currency) extraFilters.push(`jl.currency = $${params.push(currency)}`);

    const extraWhere = extraFilters.length ? `AND ${extraFilters.join(' AND ')}` : '';

    const rows: Array<{
      account_id: string;
      code: string;
      name: string;
      type: ChartAccountType;
      total_debit: string;
      total_credit: string;
    }> = await this.entryRepo.manager.query(
      `SELECT
         coa.id   AS account_id,
         coa.code,
         coa.name,
         coa.type,
         COALESCE(SUM(jl.debit),  0) AS total_debit,
         COALESCE(SUM(jl.credit), 0) AS total_credit
       FROM journal_lines jl
       JOIN journal_entries je    ON je.id  = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'POSTED'
         AND je.created_at::date <= $1
         AND coa.type IN ('ASSET', 'LIABILITY', 'EQUITY')
         ${extraWhere}
       GROUP BY coa.id, coa.code, coa.name, coa.type
       ORDER BY coa.code`,
      params,
    );

    const makeSection = (type: ChartAccountType): BalanceSheetSectionRecord => {
      const isDebitNormal = type === ChartAccountType.ASSET;
      const accounts = rows
        .filter((r) => r.type === type)
        .map((r) => {
          const debit  = new Decimal(r.total_debit);
          const credit = new Decimal(r.total_credit);
          const balance = isDebitNormal ? debit.minus(credit) : credit.minus(debit);
          return { accountId: r.account_id, code: r.code, name: r.name, balance: balance.toFixed(2) };
        });
      const total = accounts.reduce((s, a) => s.plus(a.balance), new Decimal(0));
      return { type, accounts, total: total.toFixed(2) };
    };

    const assets      = makeSection(ChartAccountType.ASSET);
    const liabilities = makeSection(ChartAccountType.LIABILITY);
    const equity      = makeSection(ChartAccountType.EQUITY);
    const totalLE     = new Decimal(liabilities.total).plus(equity.total);

    return {
      asOf,
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity: totalLE.toFixed(2),
      isBalanced: new Decimal(assets.total).equals(totalLE),
    };
  }

  async getIncomeStatement(
    from: Date,
    to: Date,
    branchId?: string,
    currency?: string,
  ): Promise<IncomeStatementRecord> {
    const params: any[] = [from, to];
    const extraFilters: string[] = [];

    if (branchId) extraFilters.push(`je.branch_id = $${params.push(branchId)}`);
    if (currency) extraFilters.push(`jl.currency = $${params.push(currency)}`);

    const extraWhere = extraFilters.length ? `AND ${extraFilters.join(' AND ')}` : '';

    const rows: Array<{
      account_id: string;
      code: string;
      name: string;
      type: ChartAccountType;
      total_debit: string;
      total_credit: string;
    }> = await this.entryRepo.manager.query(
      `SELECT
         coa.id   AS account_id,
         coa.code,
         coa.name,
         coa.type,
         COALESCE(SUM(jl.debit),  0) AS total_debit,
         COALESCE(SUM(jl.credit), 0) AS total_credit
       FROM journal_lines jl
       JOIN journal_entries je    ON je.id  = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'POSTED'
         AND je.created_at::date BETWEEN $1 AND $2
         AND coa.type IN ('INCOME', 'EXPENSE')
         ${extraWhere}
       GROUP BY coa.id, coa.code, coa.name, coa.type
       ORDER BY coa.code`,
      params,
    );

    const incomeAccounts = rows
      .filter((r) => r.type === ChartAccountType.INCOME)
      .map((r) => ({
        accountId: r.account_id,
        code: r.code,
        name: r.name,
        amount: new Decimal(r.total_credit).minus(r.total_debit).toFixed(2),
      }));

    const expenseAccounts = rows
      .filter((r) => r.type === ChartAccountType.EXPENSE)
      .map((r) => ({
        accountId: r.account_id,
        code: r.code,
        name: r.name,
        amount: new Decimal(r.total_debit).minus(r.total_credit).toFixed(2),
      }));

    const totalIncome   = incomeAccounts.reduce((s, a) => s.plus(a.amount), new Decimal(0));
    const totalExpenses = expenseAccounts.reduce((s, a) => s.plus(a.amount), new Decimal(0));

    return {
      from,
      to,
      income:   { accounts: incomeAccounts,   total: totalIncome.toFixed(2)   },
      expenses: { accounts: expenseAccounts,  total: totalExpenses.toFixed(2) },
      netProfit: totalIncome.minus(totalExpenses).toFixed(2),
    };
  }

  async getTrialBalance(
    asOf: Date,
    branchId?: string,
    currency?: string,
  ): Promise<TrialBalanceRecord> {
    const params: any[] = [asOf];
    const extraFilters: string[] = [];

    if (branchId) extraFilters.push(`je.branch_id = $${params.push(branchId)}`);
    if (currency) extraFilters.push(`jl.currency = $${params.push(currency)}`);

    const extraWhere = extraFilters.length ? `AND ${extraFilters.join(' AND ')}` : '';

    const rows: Array<{
      account_id: string;
      code: string;
      name: string;
      type: ChartAccountType;
      total_debit: string;
      total_credit: string;
    }> = await this.entryRepo.manager.query(
      `SELECT
         coa.id   AS account_id,
         coa.code,
         coa.name,
         coa.type,
         COALESCE(SUM(jl.debit),  0) AS total_debit,
         COALESCE(SUM(jl.credit), 0) AS total_credit
       FROM journal_lines jl
       JOIN journal_entries je    ON je.id  = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'POSTED'
         AND je.created_at::date <= $1
         AND coa.is_active = true
         ${extraWhere}
       GROUP BY coa.id, coa.code, coa.name, coa.type
       ORDER BY coa.code`,
      params,
    );

    const isDebitNormal = (type: ChartAccountType) =>
      type === ChartAccountType.ASSET || type === ChartAccountType.EXPENSE;

    let totalDebits  = new Decimal(0);
    let totalCredits = new Decimal(0);

    const lines: TrialBalanceLineRecord[] = rows.map((r) => {
      const debit      = new Decimal(r.total_debit);
      const credit     = new Decimal(r.total_credit);
      const debitSide  = isDebitNormal(r.type);
      const balance    = debitSide ? debit.minus(credit) : credit.minus(debit);

      totalDebits  = totalDebits.plus(debit);
      totalCredits = totalCredits.plus(credit);

      return {
        accountId: r.account_id,
        code: r.code,
        name: r.name,
        type: r.type,
        totalDebit: debit.toFixed(2),
        totalCredit: credit.toFixed(2),
        balance: balance.toFixed(2),
        normalBalance: debitSide ? 'DEBIT' : 'CREDIT',
      };
    });

    return {
      asOf,
      lines,
      totalDebits:  totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      isBalanced:   totalDebits.equals(totalCredits),
    };
  }
}
