import { LoanModel } from './loan.model';
import { LoanRecord } from './loan.entity';

/**
 * Translates between the DB record shape (LoanRecord) and the
 * domain model (LoanModel). This is the only place that knows about both.
 *
 * If the DB schema changes (column renamed, type changed), you fix it here.
 * The domain model and repository stay untouched.
 */
export class LoanMapper {
  static toDomain(record: LoanRecord): LoanModel {
    return new LoanModel({
      id: record.id,
      memberId: record.member_id,
      amount: record.amount,
      interestRate: record.interest_rate,
      termMonths: record.term_months,
      type: record.type,
      purpose: record.purpose,
      status: record.status,
      rejectionReason: record.rejection_reason ?? undefined,
      approvedBy: record.approved_by ?? undefined,
      approvedAt: record.approved_at ?? undefined,
      disbursedAt: record.disbursed_at ?? undefined,
      createdAt: record.created_at,
    });
  }

  static toRecord(model: LoanModel): LoanRecord {
    return {
      id: model.id,
      member_id: model.memberId,
      amount: model.amount,
      interest_rate: model.interestRate,
      term_months: model.termMonths,
      type: model.type,
      purpose: model.purpose,
      status: model.status,
      rejection_reason: model.rejectionReason ?? null,
      approved_by: model.approvedBy ?? null,
      approved_at: model.approvedAt ?? null,
      disbursed_at: model.disbursedAt ?? null,
      created_at: model.createdAt,
    };
  }
}
