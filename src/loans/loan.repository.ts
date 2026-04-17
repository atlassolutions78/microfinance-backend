import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { QueryLoansDto } from './loan.dto';
import { LoanMapper } from './loan.mapper';
import {
  IndividualProfileEntity,
  OrganizationProfileEntity,
} from '../clients/client.entity';
import {
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
import { LoanStatus, LoanType, RepaymentStatus } from './loan.enums';

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
    return e ? LoanMapper.toDomain(e) : null;
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

    return { data: entities.map(LoanMapper.toDomain), total };
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
}
