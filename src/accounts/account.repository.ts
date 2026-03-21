import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity, AccountSequenceEntity } from './account.entity';
import { AccountModel } from './account.model';
import { AccountMapper } from './account.mapper';
import { AccountCurrency, AccountType } from './account.enums';

@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly repo: Repository<AccountEntity>,
    @InjectRepository(AccountSequenceEntity)
    private readonly sequenceRepo: Repository<AccountSequenceEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async save(account: AccountModel): Promise<void> {
    await this.repo.save(AccountMapper.toEntity(account));
  }

  async findById(id: string): Promise<AccountModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? AccountMapper.toDomain(entity) : null;
  }

  async findByClientId(clientId: string): Promise<AccountModel[]> {
    const entities = await this.repo.find({
      where: { client_id: clientId },
      order: { created_at: 'DESC' },
    });
    return entities.map(AccountMapper.toDomain);
  }

  async findAll(): Promise<AccountModel[]> {
    const entities = await this.repo.find({ order: { created_at: 'DESC' } });
    return entities.map(AccountMapper.toDomain);
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

  /** Atomically add `amount` to the account's balance. */
  async credit(id: string, amount: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [amount, id],
    );
  }
}
