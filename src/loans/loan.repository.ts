import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import {
  ActiveLoansQueryDto,
  CollectionsQueryDto,
  LoanApplicationsQueryDto,
  QueryLoansDto,
} from './loan.dto';
import { LoanMapper } from './loan.mapper';
import {
  IndividualProfileEntity,
  OrganizationProfileEntity,
} from '../clients/client.entity';
import {
  CollectionItem,
  LoanDocument,
  LoanModel,
  LoanPayment,
  LoanPenalty,
  LoanReminder,
  RepaymentScheduleItem,
} from './loan.model';
import {
  LoanDocumentEntity,
  LoanEntity,
  LoanPaymentEntity,
  LoanPenaltyEntity,
  LoanReminderEntity,
  LoanSequenceEntity,
  RepaymentScheduleEntity,
} from './loan.entity';
import { LoanCurrency, LoanStatus, LoanType, RepaymentStatus } from './loan.enums';

@Injectable()
export class LoanRepository {
  constructor(
    @InjectRepository(LoanEntity)
    private readonly loanRepo: Repository<LoanEntity>,

    @InjectRepository(LoanSequenceEntity)
    private readonly seqRepo: Repository<LoanSequenceEntity>,

    @InjectRepository(RepaymentScheduleEntity)
    private readonly scheduleRepo: Repository<RepaymentScheduleEntity>,

    @InjectRepository(LoanPaymentEntity)
    private readonly paymentRepo: Repository<LoanPaymentEntity>,

    @InjectRepository(LoanPenaltyEntity)
    private readonly penaltyRepo: Repository<LoanPenaltyEntity>,

    @InjectRepository(LoanDocumentEntity)
    private readonly documentRepo: Repository<LoanDocumentEntity>,

    @InjectRepository(LoanReminderEntity)
    private readonly reminderRepo: Repository<LoanReminderEntity>,

    private readonly dataSource: DataSource,
  ) {}

  // --- Loan CRUD ---

  async save(loan: LoanModel): Promise<void> {
    await this.loanRepo.save(LoanMapper.toEntity(loan));
  }

  async findById(id: string): Promise<LoanModel | null> {
    const e = await this.loanRepo.findOne({ where: { id } });
    if (!e) return null;
    const model = LoanMapper.toDomain(e);
    const clientMap = await this.resolveClientNames([model.clientId]);
    const c = clientMap.get(model.clientId);
    if (c) { model.clientName = c.name; model.clientNumber = c.clientNumber; }
    return model;
  }

  async findAll(
    query?: QueryLoansDto,
  ): Promise<{ data: LoanModel[]; total: number }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const search = query?.search?.trim();

    const qb = this.loanRepo
      .createQueryBuilder('l')
      .leftJoin(IndividualProfileEntity, 'ip', 'ip.client_id = l.client_id')
      .leftJoin(OrganizationProfileEntity, 'op', 'op.client_id = l.client_id')
      .orderBy('l.created_at', 'DESC');

    if (query?.status) {
      qb.andWhere('l.status = :status', { status: query.status });
    }
    if (query?.type) {
      qb.andWhere('l.type = :type', { type: query.type });
    }
    if (query?.clientId) {
      qb.andWhere('l.client_id = :clientId', { clientId: query.clientId });
    }

    if (search) {
      qb.andWhere(
        `(
          l.loan_number ILIKE :search
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

    const models = entities.map(LoanMapper.toDomain);
    const clientIds = [...new Set(models.map((m) => m.clientId))];
    const clientMap = await this.resolveClientNames(clientIds);
    for (const m of models) {
      const c = clientMap.get(m.clientId);
      if (c) { m.clientName = c.name; m.clientNumber = c.clientNumber; }
    }
    return { data: models, total };
  }

  async countActiveByClient(clientId: string): Promise<number> {
    return this.loanRepo.count({
      where: {
        client_id: clientId,
        status: In([LoanStatus.ACTIVE, LoanStatus.APPROVED]),
      },
    });
  }

  // --- Loan number sequence ---

  async nextLoanNumber(): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const year = new Date().getFullYear();

      let seq = await manager.findOne(LoanSequenceEntity, {
        where: { year },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seq) {
        seq = manager.create(LoanSequenceEntity, { year, last_seq: 0 });
      }

      seq.last_seq += 1;
      await manager.save(LoanSequenceEntity, seq);

      return `LN-${year}-${String(seq.last_seq).padStart(7, '0')}`;
    });
  }

  // --- Schedule ---

  async saveSchedule(items: RepaymentScheduleItem[]): Promise<void> {
    await this.scheduleRepo.save(items.map(LoanMapper.scheduleItemToEntity));
  }

  async saveScheduleItem(item: RepaymentScheduleItem): Promise<void> {
    await this.scheduleRepo.save(LoanMapper.scheduleItemToEntity(item));
  }

  async findScheduleByLoanId(loanId: string): Promise<RepaymentScheduleItem[]> {
    const entities = await this.scheduleRepo.find({
      where: { loan_id: loanId },
      order: { installment_number: 'ASC' },
    });
    return entities.map(LoanMapper.scheduleItemToDomain);
  }

  /** Returns all unpaid schedule items across ACTIVE loans whose due_date has passed. */
  async findOverdueScheduleItems(): Promise<RepaymentScheduleItem[]> {
    const entities = await this.scheduleRepo
      .createQueryBuilder('s')
      .innerJoin(LoanEntity, 'l', 'l.id = s.loan_id')
      .where('l.status = :active', { active: LoanStatus.ACTIVE })
      .andWhere('s.status != :paid', { paid: RepaymentStatus.PAID })
      .andWhere('s.due_date < CURRENT_DATE')
      .getMany();
    return entities.map(LoanMapper.scheduleItemToDomain);
  }

  /** Returns all PENDING or LATE schedule items across ACTIVE loans due today or earlier. */
  async findDueScheduleItems(): Promise<RepaymentScheduleItem[]> {
    const entities = await this.scheduleRepo
      .createQueryBuilder('s')
      .innerJoin(LoanEntity, 'l', 'l.id = s.loan_id')
      .where('l.status = :active', { active: LoanStatus.ACTIVE })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [RepaymentStatus.PENDING, RepaymentStatus.LATE],
      })
      .andWhere('s.due_date <= CURRENT_DATE')
      .orderBy('s.due_date', 'ASC')
      .getMany();
    return entities.map(LoanMapper.scheduleItemToDomain);
  }

  // --- Payments ---

  async savePayment(payment: LoanPayment): Promise<void> {
    await this.paymentRepo.save(LoanMapper.paymentToEntity(payment));
  }

  async findPaymentsByLoanId(loanId: string): Promise<LoanPayment[]> {
    const entities = await this.paymentRepo.find({
      where: { loan_id: loanId },
      order: { payment_date: 'DESC' },
    });
    return entities.map(LoanMapper.paymentToDomain);
  }

  // --- Penalties ---

  async savePenalty(penalty: LoanPenalty): Promise<void> {
    await this.penaltyRepo.save(LoanMapper.penaltyToEntity(penalty));
  }

  async findPenaltiesByLoanId(loanId: string): Promise<LoanPenalty[]> {
    const entities = await this.penaltyRepo.find({
      where: { loan_id: loanId },
      order: { applied_at: 'DESC' },
    });
    return entities.map(LoanMapper.penaltyToDomain);
  }

  async existsPenaltyForScheduleItem(scheduleId: string): Promise<boolean> {
    return (
      (await this.penaltyRepo.count({ where: { schedule_id: scheduleId } })) > 0
    );
  }

  async findPenaltiesForScheduleItem(
    scheduleId: string,
  ): Promise<LoanPenalty[]> {
    const entities = await this.penaltyRepo.find({
      where: { schedule_id: scheduleId },
    });
    return entities.map(LoanMapper.penaltyToDomain);
  }

  // --- Documents ---

  async saveDocument(doc: LoanDocument): Promise<void> {
    await this.documentRepo.save(LoanMapper.documentToEntity(doc));
  }

  async findDocumentsByLoanId(loanId: string): Promise<LoanDocument[]> {
    const entities = await this.documentRepo.find({
      where: { loan_id: loanId },
      order: { uploaded_at: 'ASC' },
    });
    return entities.map(LoanMapper.documentToDomain);
  }

  // --- Reminders ---

  async saveReminder(reminder: LoanReminder): Promise<void> {
    await this.reminderRepo.save(LoanMapper.reminderToEntity(reminder));
  }

  async findRemindersByScheduleId(scheduleId: string): Promise<LoanReminder[]> {
    const entities = await this.reminderRepo.find({
      where: { schedule_id: scheduleId },
    });
    return entities.map(LoanMapper.reminderToDomain);
  }

  // --- Scoped list queries ---

  async findApplications(
    query: LoanApplicationsQueryDto,
  ): Promise<{ data: LoanModel[]; total: number }> {
    const page = query.page ?? 1;
    const search = query.search?.trim();

    const qb = this.loanRepo
      .createQueryBuilder('l')
      .leftJoin(IndividualProfileEntity, 'ip', 'ip.client_id = l.client_id')
      .leftJoin(OrganizationProfileEntity, 'op', 'op.client_id = l.client_id')
      .orderBy('l.created_at', 'DESC');

    if (query.status) {
      qb.andWhere('l.status = :status', { status: query.status });
    } else {
      qb.andWhere('l.status IN (:...statuses)', {
        statuses: [LoanStatus.PENDING, LoanStatus.APPROVED],
      });
    }
    if (query.type) qb.andWhere('l.type = :type', { type: query.type });
    if (query.currency) qb.andWhere('l.currency = :currency', { currency: query.currency });
    if (search) {
      qb.andWhere(
        `(l.loan_number ILIKE :search OR ip.first_name ILIKE :search OR ip.last_name ILIKE :search OR op.organization_name ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb.skip((page - 1) * 8).take(8).getMany();
    return this.toEnrichedPage(entities, total);
  }

  async findActiveLoans(
    query: ActiveLoansQueryDto,
  ): Promise<{ data: LoanModel[]; total: number }> {
    const page = query.page ?? 1;
    const search = query.search?.trim();

    const qb = this.loanRepo
      .createQueryBuilder('l')
      .leftJoin(IndividualProfileEntity, 'ip', 'ip.client_id = l.client_id')
      .leftJoin(OrganizationProfileEntity, 'op', 'op.client_id = l.client_id')
      .andWhere('l.status = :status', { status: LoanStatus.ACTIVE })
      .orderBy('l.created_at', 'DESC');

    if (query.type) qb.andWhere('l.type = :type', { type: query.type });
    if (query.currency) qb.andWhere('l.currency = :currency', { currency: query.currency });
    if (search) {
      qb.andWhere(
        `(l.loan_number ILIKE :search OR ip.first_name ILIKE :search OR ip.last_name ILIKE :search OR op.organization_name ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const entities = await qb.skip((page - 1) * 8).take(8).getMany();
    return this.toEnrichedPage(entities, total);
  }

  async findCollections(
    query: CollectionsQueryDto,
  ): Promise<{ data: CollectionItem[]; total: number }> {
    const page = query.page ?? 1;
    const offset = (page - 1) * 8;
    const search = query.search?.trim();

    const statuses = query.repaymentStatus
      ? [query.repaymentStatus]
      : [RepaymentStatus.LATE, RepaymentStatus.OVERDUE];

    const conditions: string[] = [];
    const params: unknown[] = [];

    conditions.push(`s.status::text = ANY($1::text[])`);
    params.push(statuses);

    if (query.currency) {
      const idx = params.length + 1;
      conditions.push(`l.currency = $${idx}`);
      params.push(query.currency);
    }

    if (search) {
      const idx = params.length + 1;
      conditions.push(
        `(l.loan_number ILIKE $${idx} OR ip.first_name ILIKE $${idx} OR ip.last_name ILIKE $${idx} OR op.organization_name ILIKE $${idx})`,
      );
      params.push(`%${search}%`);
    }

    const where = conditions.join(' AND ');
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const baseSql = `
      FROM loan_repayment_schedules s
      JOIN loans l ON l.id = s.loan_id
      JOIN clients c ON c.id = l.client_id
      LEFT JOIN individual_profiles ip ON ip.client_id = l.client_id
      LEFT JOIN organization_profiles op ON op.client_id = l.client_id
      WHERE ${where}`;

    const [countRows, rows] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) AS total ${baseSql}`, params),
      this.dataSource.query(
        `SELECT
           s.id               AS schedule_id,
           l.id               AS loan_id,
           l.loan_number,
           l.client_id,
           l.currency,
           s.installment_number,
           s.due_date,
           s.total_amount,
           s.paid_amount,
           s.status           AS repayment_status,
           GREATEST(0, (CURRENT_DATE - s.due_date::date)) AS days_overdue,
           COALESCE(ip.first_name || ' ' || ip.last_name, op.organization_name) AS client_name,
           c.client_number
         ${baseSql}
         ORDER BY s.due_date ASC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, 8, offset],
      ),
    ]);

    const total = parseInt(countRows[0]?.total ?? '0', 10);
    const data: CollectionItem[] = rows.map((r: Record<string, string>) => ({
      scheduleId: r.schedule_id,
      loanId: r.loan_id,
      loanNumber: r.loan_number,
      clientId: r.client_id,
      clientName: r.client_name ?? '',
      clientNumber: r.client_number,
      installmentNumber: parseInt(r.installment_number, 10),
      dueDate: r.due_date,
      totalAmount: new Decimal(r.total_amount).toFixed(2),
      paidAmount: new Decimal(r.paid_amount).toFixed(2),
      outstandingAmount: new Decimal(r.total_amount).minus(r.paid_amount).toFixed(2),
      repaymentStatus: r.repayment_status as RepaymentStatus,
      daysOverdue: parseInt(r.days_overdue, 10),
      currency: r.currency as LoanCurrency,
    }));

    return { data, total };
  }

  private async toEnrichedPage(
    entities: LoanEntity[],
    total: number,
  ): Promise<{ data: LoanModel[]; total: number }> {
    const models = entities.map(LoanMapper.toDomain);
    const clientIds = [...new Set(models.map((m) => m.clientId))];
    const clientMap = await this.resolveClientNames(clientIds);
    for (const m of models) {
      const c = clientMap.get(m.clientId);
      if (c) { m.clientName = c.name; m.clientNumber = c.clientNumber; }
    }
    return { data: models, total };
  }

  private async resolveClientNames(
    ids: string[],
  ): Promise<Map<string, { name: string; clientNumber: string }>> {
    if (ids.length === 0) return new Map();
    const rows: Array<{ id: string; client_number: string; name: string }> =
      await this.dataSource.query(
        `SELECT c.id, c.client_number,
                COALESCE(ip.first_name || ' ' || ip.last_name, op.organization_name) AS name
         FROM clients c
         LEFT JOIN individual_profiles  ip ON ip.client_id = c.id
         LEFT JOIN organization_profiles op ON op.client_id = c.id
         WHERE c.id = ANY($1)`,
        [ids],
      );
    return new Map(
      rows.map((r) => [r.id, { name: r.name ?? '', clientNumber: r.client_number }]),
    );
  }
}
