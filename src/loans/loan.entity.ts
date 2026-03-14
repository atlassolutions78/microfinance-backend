import { LoanStatus } from './loan.enums';
import { LoanType } from './loan.enums';

/**
 * Represents the loan as stored in the database — the DB record shape.
 *
 * Note the snake_case columns: this mirrors actual DB conventions.
 * The domain model (loan.model.ts) uses camelCase — the mapper translates.
 *
 * When you add TypeORM: convert this interface into a class with
 * @Entity() and @Column() decorators. The mapper stays unchanged.
 */
export interface LoanRecord {
  id: string;
  member_id: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  type: LoanType;
  purpose: string;
  status: LoanStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  disbursed_at: Date | null;
  created_at: Date;
}
