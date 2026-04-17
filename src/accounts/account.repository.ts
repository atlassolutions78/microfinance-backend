import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, In, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { AccountEntity, AccountSequenceEntity } from './account.entity';
import { AccountModel } from './account.model';
import { AccountMapper, AccountStatementRecord, AccountStatementLineRecord } from './account.mapper';
import { AccountCurrency, AccountStatus, AccountType } from './account.enums';
import { GetAccountsQueryDto } from './account.dto';
import { UserEntity } from '../users/user.entity';
import {
  IndividualProfileEntity,
  OrganizationProfileEntity,
} from '../clients/client.entity';

@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly repo: Repository<AccountEntity>,
    @InjectRepository(AccountSequenceEntity)
    private readonly sequenceRepo: Repository<AccountSequenceEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async save(account: AccountModel): Promise<void> {
    await this.repo.save(AccountMapper.toEntity(account));
  }

  async findById(id: string): Promise<AccountModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    const model = AccountMapper.toDomain(entity);
    const nameMap = await this.resolveUserNames([entity.opened_by]);
    model.openedByName = nameMap.get(entity.opened_by);
    return model;
  }

  async findByClientId(clientId: string): Promise<AccountModel[]> {
    const entities = await this.repo.find({
      where: { client_id: clientId },
      order: { created_at: 'DESC' },
    });
    const userIds = new Set(entities.map((e) => e.opened_by));
    const nameMap = await this.resolveUserNames([...userIds]);
    return entities.map((e) => {
      const model = AccountMapper.toDomain(e);
      model.openedByName = nameMap.get(e.opened_by);
      return model;
    });
  }

  async findAll(
    query?: GetAccountsQueryDto,
  ): Promise<{ data: AccountModel[]; total: number }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const search = query?.search?.trim();

    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoin(IndividualProfileEntity, 'ip', 'ip.client_id = a.client_id')
      .leftJoin(OrganizationProfileEntity, 'op', 'op.client_id = a.client_id')
      .orderBy('a.created_at', 'DESC');

    if (query?.type) {
      qb.andWhere('a.account_type = :type', { type: query.type.toUpperCase() });
    }

    if (query?.status) {
      qb.andWhere('a.status = :status', { status: query.status.toUpperCase() });
    }

    if (search) {
      qb.andWhere(
        `(
          a.account_number ILIKE :search
          OR ip.first_name ILIKE :search
          OR ip.last_name ILIKE :search
          OR op.organization_name ILIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const userIds = new Set(entities.map((e) => e.opened_by));
    const nameMap = await this.resolveUserNames([...userIds]);
    const data = entities.map((e) => {
      const model = AccountMapper.toDomain(e);
      model.openedByName = nameMap.get(e.opened_by);
      return model;
    });

    return { data, total };
  }

  async findByAccountNumber(
    accountNumber: string,
  ): Promise<AccountModel | null> {
    const entity = await this.repo.findOne({
      where: { account_number: accountNumber },
    });
    return entity ? AccountMapper.toDomain(entity) : null;
  }

  async searchByAccountNumber(
    query: string,
    limit = 20,
  ): Promise<AccountModel[]> {
    const escaped = query
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    const entities = await this.repo.find({
      where: { account_number: ILike(`%${escaped}%`) },
      order: { account_number: 'ASC' },
      take: limit,
    });
    const userIds = new Set(entities.map((e) => e.opened_by));
    const nameMap = await this.resolveUserNames([...userIds]);
    return entities.map((e) => {
      const model = AccountMapper.toDomain(e);
      model.openedByName = nameMap.get(e.opened_by);
      return model;
    });
  }

  async updateBalance(
    id: string,
    newBalance: string,
    em?: EntityManager,
  ): Promise<void> {
    const repo = em ? em.getRepository(AccountEntity) : this.repo;
    await repo.update(id, { balance: newBalance });
  }

  async updateStatus(
    id: string,
    status: AccountStatus,
    em?: EntityManager,
  ): Promise<void> {
    const repo = em ? em.getRepository(AccountEntity) : this.repo;
    await repo.update(id, { status });
  }

  /**
   * Atomically increments and returns the next sequence number for a given
   * account type. Uses a row-level lock to prevent duplicate numbers under
   * concurrent requests.
   */
  async nextSequence(type: AccountType): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      let seq = await manager.findOne(AccountSequenceEntity, {
        where: { type },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seq) {
        seq = manager.create(AccountSequenceEntity, { type, last_seq: 0 });
      }

      seq.last_seq += 1;
      await manager.save(AccountSequenceEntity, seq);
      return seq.last_seq;
    });
  }

  /**
   * Formats an account number for SAVINGS accounts.
   *
   * Format: `{A} {BBB}\2 serie 433`
   *   - A increments every 1000 accounts, starting at 50
   *   - BBB is the position within the current block (001 on seq=1, then 000 rolls over)
   *   - \2 is fixed separator, "serie 433" is the fixed series label
   *
   * Sequence → number:
   *   1  → "50 001\2 serie 433"
   *   999  → "50 999\2 serie 433"
   *   1000 → "51 000\2 serie 433"
   *   1001 → "51 001\2 serie 433"
   */
  static formatSavingsNumber(seq: number): string {
    const prefix = 50 + Math.floor(seq / 1000);
    const counter = seq % 1000;
    return `${prefix} ${String(counter).padStart(3, '0')}\\2 serie 433`;
  }

  /**
   * Formats an account number for CHECKING and BUSINESS_CURRENT accounts.
   *
   * Format: `CADECO-1000-{A}.{BBB} {series}/{currency}`
   *   - A increments every 1000 accounts, starting at 100
   *   - BBB is the position within the current block
   *   - series: A for CHECKING, B for BUSINESS_CURRENT
   *   - currency symbol: $ for USD, FC for FC
   *
   * Examples:
   *   CHECKING + USD  → "CADECO-1000-100.001 A/$"
   *   CHECKING + FC   → "CADECO-1000-100.001 A/FC"
   *   BUSINESS_CURRENT + USD → "CADECO-1000-100.001 B/$"
   *   BUSINESS_CURRENT + FC  → "CADECO-1000-100.001 B/FC"
   */
  static formatCadecoNumber(
    seq: number,
    accountType: AccountType,
    currency: AccountCurrency,
  ): string {
    const prefix = 100 + Math.floor(seq / 1000);
    const counter = seq % 1000;
    const base = `CADECO-1000-${prefix}.${String(counter).padStart(3, '0')}`;
    const series = accountType === AccountType.BUSINESS_CURRENT ? 'B' : 'A';
    const currencySymbol = currency === AccountCurrency.USD ? '$' : 'FC';
    return `${base} ${series}/${currencySymbol}`;
  }

  async getStatement(
    accountId: string,
    from: Date,
    to: Date,
  ): Promise<AccountStatementRecord | null> {
    // ── 1. Account + client info ─────────────────────────────────────────────
    const accountRows: Array<{
      id: string;
      account_number: string;
      account_type: string;
      currency: string;
      client_name: string | null;
      client_number: string;
    }> = await this.dataSource.query(
      `SELECT
         a.id,
         a.account_number,
         a.account_type,
         a.currency,
         COALESCE(
           ip.first_name || ' ' || ip.last_name,
           op.organization_name
         ) AS client_name,
         c.client_number
       FROM accounts a
       JOIN clients c              ON c.id = a.client_id
       LEFT JOIN individual_profiles ip  ON ip.client_id = a.client_id
       LEFT JOIN organization_profiles op ON op.client_id = a.client_id
       WHERE a.id = $1`,
      [accountId],
    );

    if (accountRows.length === 0) return null;
    const acct = accountRows[0];

    // ── 2. Opening balance — last balance_after strictly before `from` ───────
    const openingRows: Array<{ balance_after: string }> =
      await this.dataSource.query(
        `SELECT balance_after
         FROM client_transactions
         WHERE account_id = $1
           AND created_at::date < $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [accountId, from],
      );

    const openingBalance = openingRows.length > 0
      ? new Decimal(openingRows[0].balance_after).toFixed(2)
      : '0.00';

    // ── 3. Transactions in period ────────────────────────────────────────────
    const txRows: Array<{
      created_at: Date;
      reference: string;
      description: string | null;
      amount: string;
      balance_after: string;
    }> = await this.dataSource.query(
      `SELECT created_at, reference, description, amount, balance_after
       FROM client_transactions
       WHERE account_id = $1
         AND created_at::date BETWEEN $2 AND $3
       ORDER BY created_at ASC`,
      [accountId, from, to],
    );

    // Determine debit/credit by comparing consecutive balances
    let prevBalance = new Decimal(openingBalance);
    const transactions: AccountStatementLineRecord[] = txRows.map((row) => {
      const balanceAfter = new Decimal(row.balance_after);
      const amount = new Decimal(row.amount).abs();
      const isCredit = balanceAfter.greaterThanOrEqualTo(prevBalance);
      prevBalance = balanceAfter;

      return {
        date: row.created_at,
        reference: row.reference,
        description: row.description,
        debit:   isCredit ? '0.00' : amount.toFixed(2),
        credit:  isCredit ? amount.toFixed(2) : '0.00',
        balance: balanceAfter.toFixed(2),
      };
    });

    const closingBalance = txRows.length > 0
      ? new Decimal(txRows[txRows.length - 1].balance_after).toFixed(2)
      : openingBalance;

    return {
      account: {
        id: acct.id,
        accountNumber: acct.account_number,
        type: acct.account_type,
        currency: acct.currency,
      },
      client: {
        name: acct.client_name ?? 'Unknown',
        clientNumber: acct.client_number,
      },
      period: { from, to },
      openingBalance,
      closingBalance,
      transactions,
    };
  }

  private async resolveUserNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: { id: true, first_name: true, last_name: true },
    });
    return new Map(users.map((u) => [u.id, `${u.first_name} ${u.last_name}`]));
  }
}
