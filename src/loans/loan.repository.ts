import { Injectable } from '@nestjs/common';
import { LoanModel } from './loan.model';
import { LoanRecord } from './loan.entity';
import { LoanMapper } from './loan.mapper';
import { LoanStatus } from './loan.enums';

/**
 * Handles all data access for loans.
 *
 * Currently uses an in-memory store so the module works without a database.
 * When you add TypeORM or Prisma: replace the in-memory logic inside each
 * method. The service and the rest of the module stay completely unchanged.
 */
@Injectable()
export class LoanRepository {
  private readonly store = new Map<string, LoanRecord>();

  async save(loan: LoanModel): Promise<void> {
    this.store.set(loan.id, LoanMapper.toRecord(loan));
  }

  async findById(id: string): Promise<LoanModel | null> {
    const record = this.store.get(id);
    return record ? LoanMapper.toDomain(record) : null;
  }

  async findAll(): Promise<LoanModel[]> {
    return Array.from(this.store.values()).map(LoanMapper.toDomain);
  }

  async countActiveByMember(memberId: string): Promise<number> {
    return Array.from(this.store.values()).filter(
      (r) => r.member_id === memberId && r.status === LoanStatus.ACTIVE,
    ).length;
  }
}
