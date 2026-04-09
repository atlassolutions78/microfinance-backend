import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
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
  IncomeStatementRecord,
  JournalEntryRecord,
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

  async findAll(branchId?: string): Promise<JournalEntryRecord[]> {
    const where: Record<string, any> = {};
    if (branchId) where.branch_id = branchId;

    const entities = await this.entryRepo.find({
      where,
      relations: ['lines', 'lines.chartAccount'],
      order: { created_at: 'DESC' },
    });

    const userIds = new Set<string>();
    for (const e of entities) {
      if (e.created_by) userIds.add(e.created_by);
      if (e.posted_by) userIds.add(e.posted_by);
    }
    const nameMap = await this.resolveUserNames([...userIds]);

    return entities.map((e) =>
      AccountingMapper.entryToDomain(
        e,
        nameMap.get(e.created_by),
        e.posted_by ? (nameMap.get(e.posted_by) ?? null) : null,
      ),
    );
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

  async findChartAccounts(): Promise<ChartOfAccountsRecord[]> {
    const entities = await this.coaRepo.find({ order: { code: 'ASC' } });
    return entities.map(AccountingMapper.coaToDomain);
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
  ): Promise<GeneralLedgerAccountRecord[]> {
    const params: any[] = [];
    const branchFilter = branchId
      ? `AND je.branch_id = $${params.push(branchId)}`
      : '';

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
       JOIN journal_entries je  ON je.id  = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'POSTED'
         ${branchFilter}
       ORDER BY coa.code, je.created_at, jl.id`,
      params,
    );

    // Group by account
    const accountMap = new Map<string, GeneralLedgerAccountRecord>();
    for (const r of rows) {
      if (!accountMap.has(r.account_id)) {
        accountMap.set(r.account_id, {
          accountId: r.account_id,
          code: r.code,
          name: r.name,
          type: r.type,
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
          lines: [],
        });
      }
      const acct = accountMap.get(r.account_id)!;
      const debit = Number(r.debit);
      const credit = Number(r.credit);
      acct.totalDebit += debit;
      acct.totalCredit += credit;

      // Running balance in normal direction for this account type
      const isDebitNormal =
        r.type === ChartAccountType.ASSET ||
        r.type === ChartAccountType.EXPENSE;
      const prev =
        acct.lines.length > 0
          ? acct.lines[acct.lines.length - 1].runningBalance
          : 0;
      const delta = isDebitNormal ? debit - credit : credit - debit;

      acct.lines.push({
        journalEntryId: r.entry_id,
        reference: r.reference,
        date: r.date,
        description: r.line_description ?? r.entry_description,
        debit,
        credit,
        currency: r.currency,
        runningBalance: prev + delta,
      });
    }

    // Set closing balance
    for (const acct of accountMap.values()) {
      const isDebitNormal =
        acct.type === ChartAccountType.ASSET ||
        acct.type === ChartAccountType.EXPENSE;
      acct.closingBalance = isDebitNormal
        ? acct.totalDebit - acct.totalCredit
        : acct.totalCredit - acct.totalDebit;
    }

    return [...accountMap.values()];
  }

  async getBalanceSheet(
    asOf: Date,
    branchId?: string,
  ): Promise<BalanceSheetRecord> {
    const params: any[] = [asOf];
    const branchFilter = branchId
      ? `AND je.branch_id = $${params.push(branchId)}`
      : '';

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
       JOIN journal_entries je  ON je.id  = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'POSTED'
         AND je.created_at::date <= $1
         AND coa.type IN ('ASSET', 'LIABILITY', 'EQUITY')
         ${branchFilter}
       GROUP BY coa.id, coa.code, coa.name, coa.type
       ORDER BY coa.code`,
      params,
    );

    const makeSection = (type: ChartAccountType): BalanceSheetSectionRecord => {
      const isDebitNormal = type === ChartAccountType.ASSET;
      const accounts = rows
        .filter((r) => r.type === type)
        .map((r) => ({
          accountId: r.account_id,
          code: r.code,
          name: r.name,
          balance: isDebitNormal
            ? Number(r.total_debit) - Number(r.total_credit)
            : Number(r.total_credit) - Number(r.total_debit),
        }));
      return {
        type,
        accounts,
        total: accounts.reduce((s, a) => s + a.balance, 0),
      };
    };

    const assets = makeSection(ChartAccountType.ASSET);
    const liabilities = makeSection(ChartAccountType.LIABILITY);
    const equity = makeSection(ChartAccountType.EQUITY);
    const totalLiabilitiesAndEquity = liabilities.total + equity.total;

    return {
      asOf,
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(assets.total - totalLiabilitiesAndEquity) < 0.0001,
    };
  }

  async getIncomeStatement(
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<IncomeStatementRecord> {
    const params: any[] = [from, to];
    const branchFilter = branchId
      ? `AND je.branch_id = $${params.push(branchId)}`
      : '';

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
       JOIN journal_entries je  ON je.id  = jl.journal_entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.status = 'POSTED'
         AND je.created_at::date BETWEEN $1 AND $2
         AND coa.type IN ('INCOME', 'EXPENSE')
         ${branchFilter}
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
        amount: Number(r.total_credit) - Number(r.total_debit),
      }));

    const expenseAccounts = rows
      .filter((r) => r.type === ChartAccountType.EXPENSE)
      .map((r) => ({
        accountId: r.account_id,
        code: r.code,
        name: r.name,
        amount: Number(r.total_debit) - Number(r.total_credit),
      }));

    const totalIncome = incomeAccounts.reduce((s, a) => s + a.amount, 0);
    const totalExpenses = expenseAccounts.reduce((s, a) => s + a.amount, 0);

    return {
      from,
      to,
      income: { accounts: incomeAccounts, total: totalIncome },
      expenses: { accounts: expenseAccounts, total: totalExpenses },
      netProfit: totalIncome - totalExpenses,
    };
  }
}
