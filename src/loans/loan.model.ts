import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import {
  LoanCurrency,
  LoanDocumentType,
  LoanStatus,
  LoanType,
  ReminderChannel,
  ReminderStatus,
  RepaymentStatus,
} from './loan.enums';

// ---------------------------------------------------------------------------
// Repayment schedule item
// ---------------------------------------------------------------------------

export class RepaymentScheduleItem {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: Date;
  principalAmount: string;
  interestAmount: string;
  totalAmount: string;
  paidAmount: string;
  status: RepaymentStatus;
  paidAt?: Date;
  reminderSentAt?: Date;

  markPaid(): void {
    this.status = RepaymentStatus.PAID;
    this.paidAmount = this.totalAmount; // string = string ✓
    this.paidAt = new Date();
  }

  markLate(): void {
    if (this.status === RepaymentStatus.PAID) return;
    if (this.status === RepaymentStatus.OVERDUE) return;
    this.status = RepaymentStatus.LATE;
  }

  markOverdue(): void {
    if (this.status === RepaymentStatus.PAID) return;
    this.status = RepaymentStatus.OVERDUE;
  }

  isPastDue(): boolean {
    return new Date() > this.dueDate && this.status !== RepaymentStatus.PAID;
  }

  daysOverdue(): number {
    if (!this.isPastDue()) return 0;
    return Math.floor((Date.now() - this.dueDate.getTime()) / 86_400_000);
  }
}

// ---------------------------------------------------------------------------
// Loan reminder (value object)
// ---------------------------------------------------------------------------

export class LoanReminder {
  id: string;
  loanId: string;
  scheduleId: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  errorMessage: string | null;
  sentAt: Date;
}

// ---------------------------------------------------------------------------
// Loan payment (value object — no business logic)
// ---------------------------------------------------------------------------

export class LoanPayment {
  id: string;
  loanId: string;
  scheduleId: string | null;
  transactionId: string | null;
  amount: string;
  currency: LoanCurrency;
  paymentDate: Date;
  recordedBy: string;
  notes: string | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Loan penalty (value object)
// ---------------------------------------------------------------------------

export class LoanPenalty {
  id: string;
  loanId: string;
  scheduleId: string;
  penaltyRate: string;
  penaltyAmount: string;
  appliedAt: Date;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Loan document (value object)
// ---------------------------------------------------------------------------

export class LoanDocument {
  id: string;
  loanId: string;
  documentType: LoanDocumentType;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// ---------------------------------------------------------------------------
// Loan domain model
// ---------------------------------------------------------------------------

export interface LoanModelProps {
  id: string;
  loanNumber: string;
  clientId: string;
  accountId: string;
  branchId: string;
  type: LoanType;
  currency: LoanCurrency;
  principalAmount: string;
  outstandingBalance: string;
  interestRate: string; // monthly rate as a decimal, e.g. 0.025 = 2.5 %/month
  termMonths: number;
  purpose?: string;
  status: LoanStatus;
  rejectionReason?: string;
  appliedBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  disbursedAt?: Date;
  disbursedBy?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class LoanModel {
  readonly id: string;
  readonly loanNumber: string;
  readonly clientId: string;
  accountId: string;
  readonly branchId: string;
  readonly type: LoanType;
  readonly currency: LoanCurrency;
  readonly principalAmount: string;
  readonly interestRate: string;
  readonly termMonths: number;
  readonly purpose?: string;
  readonly appliedBy: string;
  readonly createdAt: Date;

  outstandingBalance: string;
  status: LoanStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  disbursedAt?: Date;
  disbursedBy?: string;
  closedAt?: Date;
  updatedAt: Date;

  constructor(props: LoanModelProps) {
    this.id = props.id;
    this.loanNumber = props.loanNumber;
    this.clientId = props.clientId;
    this.accountId = props.accountId;
    this.branchId = props.branchId;
    this.type = props.type;
    this.currency = props.currency;
    this.principalAmount = props.principalAmount;
    this.outstandingBalance = props.outstandingBalance;
    this.interestRate = props.interestRate;
    this.termMonths = props.termMonths;
    this.purpose = props.purpose;
    this.status = props.status;
    this.rejectionReason = props.rejectionReason;
    this.appliedBy = props.appliedBy;
    this.reviewedBy = props.reviewedBy;
    this.reviewedAt = props.reviewedAt;
    this.disbursedAt = props.disbursedAt;
    this.disbursedBy = props.disbursedBy;
    this.closedAt = props.closedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // --- Lifecycle transitions ---

  approve(reviewerId: string): void {
    if (this.status !== LoanStatus.PENDING) {
      throw new Error(`Cannot approve a loan in status: ${this.status}`);
    }
    this.status = LoanStatus.APPROVED;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.updatedAt = new Date();
  }

  reject(reviewerId: string, reason: string): void {
    if (this.status !== LoanStatus.PENDING) {
      throw new Error(`Cannot reject a loan in status: ${this.status}`);
    }
    this.status = LoanStatus.REJECTED;
    this.rejectionReason = reason;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.updatedAt = new Date();
  }

  disburse(disbursedById: string): void {
    if (this.status !== LoanStatus.APPROVED) {
      throw new Error(`Cannot disburse a loan in status: ${this.status}`);
    }
    this.status = LoanStatus.ACTIVE;
    this.outstandingBalance = this.principalAmount;
    this.disbursedAt = new Date();
    this.disbursedBy = disbursedById;
    this.updatedAt = new Date();
  }

  /**
   * Called when a schedule installment's principal portion has been collected.
   * Reduces outstanding balance. When fully paid, transitions to CLOSED.
   */
  applyPayment(principalCollected: string): void {
    const reduced = new Decimal(this.outstandingBalance).minus(principalCollected);
    this.outstandingBalance = (reduced.isNegative() ? new Decimal(0) : reduced)
      .toDecimalPlaces(2)
      .toString();
    this.updatedAt = new Date();
    if (new Decimal(this.outstandingBalance).isZero()) {
      this.status = LoanStatus.CLOSED;
      this.closedAt = new Date();
    }
  }

  markDefaulted(): void {
    if (this.status !== LoanStatus.ACTIVE) {
      throw new Error(
        `Cannot mark as defaulted a loan in status: ${this.status}`,
      );
    }
    this.status = LoanStatus.DEFAULTED;
    this.updatedAt = new Date();
  }

  // --- Business calculations ---

  /** Monthly instalment using standard amortisation formula. */
  monthlyInstalment(): string {
    const r = new Decimal(this.interestRate);
    const n = this.termMonths;
    const P = new Decimal(this.principalAmount);

    if (r.isZero()) return P.div(n).toFixed(2);

    if (n === 1) {
      // Salary Advance: flat single payment
      return P.times(r.plus(1)).toFixed(2);
    }

    // Amortisation: P × r(1+r)^n / [(1+r)^n - 1]
    const factor = r.plus(1).pow(n);
    return P.times(r.times(factor))
      .div(factor.minus(1))
      .toDecimalPlaces(2)
      .toString();
  }

  /**
   * Generates the full repayment schedule starting from the disbursal date.
   * Each row contains principal, interest, and total per installment.
   */
  computeSchedule(disbursedAt: Date): RepaymentScheduleItem[] {
    const items: RepaymentScheduleItem[] = [];
    const monthlyPayment = new Decimal(this.monthlyInstalment());
    let balance = new Decimal(this.principalAmount);
    const rate = new Decimal(this.interestRate);

    for (let i = 1; i <= this.termMonths; i++) {
      const dueDate = new Date(disbursedAt);
      dueDate.setMonth(dueDate.getMonth() + i);

      const isLast = i === this.termMonths;
      const interestPortion = balance.times(rate).toDecimalPlaces(2);
      // On the last installment, mop up any rounding residual
      const principalPortion = isLast
        ? balance.toDecimalPlaces(2)
        : monthlyPayment.minus(interestPortion).toDecimalPlaces(2);
      const total = isLast
        ? principalPortion.plus(interestPortion).toDecimalPlaces(2)
        : monthlyPayment;
      const newBalance = balance.minus(principalPortion);
      balance = newBalance.isNegative() ? new Decimal(0) : newBalance;

      const item = new RepaymentScheduleItem();
      item.id = randomUUID();
      item.loanId = this.id;
      item.installmentNumber = i;
      item.dueDate = dueDate;
      item.principalAmount = principalPortion.toString();
      item.interestAmount = interestPortion.toString();
      item.totalAmount = total.toString();
      item.paidAmount = '0.00';
      item.status = RepaymentStatus.PENDING;

      items.push(item);
    }

    return items;
  }
}
