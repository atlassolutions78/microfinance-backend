import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import {
  AccountingMapper,
  ChartOfAccountsRecord,
  JournalEntryRecord,
} from './accounting.mapper';
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
   * Looks up a chart-of-accounts entry by its standard code, branch, and currency.
   * Throws NotFoundException if the account has not been seeded for this branch.
   */
  async findChartAccount(
    code: string,
    branchId: string,
    currency: string,
    em?: EntityManager,
  ): Promise<ChartOfAccountsEntity> {
    const repo = em ? em.getRepository(ChartOfAccountsEntity) : this.coaRepo;
    const entity = await repo.findOne({
      where: {
        code,
        branch_id: branchId,
        currency: currency as any,
        is_active: true,
      },
    });
    if (!entity) {
      throw new NotFoundException(
        `Chart of accounts entry not found: code="${code}", branch="${branchId}", currency="${currency}". ` +
          `Ensure chart_of_accounts is seeded for this branch before processing transactions.`,
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
    operationType?: string,
  ): Promise<JournalEntryRecord[]> {
    const where: Record<string, any> = {};
    if (branchId) where.branch_id = branchId;
    if (operationType) where.operation_type = operationType;

    const entities = await this.entryRepo.find({
      where,
      relations: ['lines'],
      order: { created_at: 'DESC' },
    });
    return entities.map((e) => AccountingMapper.entryToDomain(e));
  }

  async findById(id: string): Promise<JournalEntryRecord | null> {
    const entity = await this.entryRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!entity) return null;

    // Resolve performer name — performed_by stores the user UUID
    let performedByName: string | undefined;
    const user = await this.userRepo.findOne({
      where: { id: entity.performed_by },
      select: { id: true, first_name: true, last_name: true },
    });
    if (user) {
      performedByName = `${user.first_name} ${user.last_name}`;
    }

    return AccountingMapper.entryToDomain(entity, performedByName);
  }

  async findChartAccounts(branchId?: string): Promise<ChartOfAccountsRecord[]> {
    const where: Record<string, any> = {};
    if (branchId) where.branch_id = branchId;
    const entities = await this.coaRepo.find({ where });
    return entities.map(AccountingMapper.coaToDomain);
  }
}
