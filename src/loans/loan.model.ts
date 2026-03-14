import { LoanStatus } from './loan.enums';
import { LoanType } from './loan.enums';

export interface LoanModelProps {
  id: string;
  memberId: string;
  amount: number;
  interestRate: number; // annual rate as decimal, e.g. 0.18 = 18%
  termMonths: number;
  type: LoanType;
  purpose: string;
  status: LoanStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  disbursedAt?: Date;
  createdAt: Date;
}

/**
 * The loan domain model.
 *
 * This class owns the loan lifecycle and all business rules that concern
 * the loan itself. No NestJS, no database — pure TypeScript.
 *
 * If a rule only needs data already on this object, it belongs here.
 * If a rule needs external data (e.g. member history), it belongs in loan.policy.ts.
 */
export class LoanModel {
  readonly id: string;
  readonly memberId: string;
  readonly amount: number;
  readonly interestRate: number;
  readonly termMonths: number;
  readonly type: LoanType;
  readonly purpose: string;
  readonly createdAt: Date;

  status: LoanStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  disbursedAt?: Date;

  constructor(props: LoanModelProps) {
    this.id = props.id;
    this.memberId = props.memberId;
    this.amount = props.amount;
    this.interestRate = props.interestRate;
    this.termMonths = props.termMonths;
    this.type = props.type;
    this.purpose = props.purpose;
    this.status = props.status;
    this.rejectionReason = props.rejectionReason;
    this.approvedBy = props.approvedBy;
    this.approvedAt = props.approvedAt;
    this.disbursedAt = props.disbursedAt;
    this.createdAt = props.createdAt;
  }

  // --- Lifecycle transitions ---

  approve(approverId: string): void {
    if (this.status !== LoanStatus.PENDING) {
      throw new Error(`Cannot approve a loan in status: ${this.status}`);
    }
    this.status = LoanStatus.APPROVED;
    this.approvedBy = approverId;
    this.approvedAt = new Date();
  }

  reject(reason: string): void {
    if (this.status !== LoanStatus.PENDING) {
      throw new Error(`Cannot reject a loan in status: ${this.status}`);
    }
    this.status = LoanStatus.REJECTED;
    this.rejectionReason = reason;
  }

  disburse(): void {
    if (this.status !== LoanStatus.APPROVED) {
      throw new Error(`Cannot disburse a loan in status: ${this.status}`);
    }
    this.status = LoanStatus.ACTIVE;
    this.disbursedAt = new Date();
  }

  close(): void {
    if (this.status !== LoanStatus.ACTIVE) {
      throw new Error(`Cannot close a loan in status: ${this.status}`);
    }
    this.status = LoanStatus.CLOSED;
  }

  markDefaulted(): void {
    if (this.status !== LoanStatus.ACTIVE) {
      throw new Error(
        `Cannot mark as defaulted a loan in status: ${this.status}`,
      );
    }
    this.status = LoanStatus.DEFAULTED;
  }

  // --- Business calculations ---

  totalRepayable(): number {
    // Flat interest: principal + (principal × rate × term in years)
    return (
      this.amount + this.amount * this.interestRate * (this.termMonths / 12)
    );
  }

  monthlyInstalment(): number {
    return this.totalRepayable() / this.termMonths;
  }
}
