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
// Collection item (read model for overdue installments view)
// ---------------------------------------------------------------------------

export interface CollectionItem {
  loanId: string;
  loanNumber: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  outstandingBalance: string;
  currency: LoanCurrency;
  loanStatus: LoanStatus;
  lateSince: string;
  daysLate: number;
}

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

  markPaid(): void {
    this.status = RepaymentStatus.PAID;
    this.paidAmount = this.totalAmount;
    this.paidAt = new Date();
  }
}

// ---------------------------------------------------------------------------
// Loan reminder (value object)
// ---------------------------------------------------------------------------

export class LoanReminder {
  id: string;
  loanId: string;
  scheduleId: string | undefined;
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
  scheduleId: string | undefined;
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
  lateSince?: Date;
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
  lateSince?: Date;
  updatedAt: Date;

  /** Client's display name — populated at read time, not persisted. */
  clientName?: string;
  /** Client's number (e.g. CL-000001) — populated at read time, not persisted. */
  clientNumber?: string;

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
    this.lateSince = props.lateSince;
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
      this.lateSince = undefined;
    }
  }

  /** Called when the last installment due date passes without full repayment. */
  markLate(lateSince: Date): void {
    this.lateSince = lateSince;
    this.status = LoanStatus.WATCH;
    this.updatedAt = new Date();
  }

  /** Re-classifies the loan into the correct aging bucket based on days since lateSince. */
  classifyLate(): void {
    if (!this.lateSince) return;
    const days = Math.floor((Date.now() - this.lateSince.getTime()) / 86_400_000);
    if (days <= 90) this.status = LoanStatus.WATCH;
    else if (days <= 180) this.status = LoanStatus.SUBSTANDARD;
    else if (days <= 360) this.status = LoanStatus.DOUBTFUL;
    else if (days <= 720) this.status = LoanStatus.LOSS;
    else this.status = LoanStatus.WRITE_OFF;
    this.updatedAt = new Date();
  }

  daysLate(): number {
    if (!this.lateSince) return 0;
    return Math.floor((Date.now() - this.lateSince.getTime()) / 86_400_000);
  }

  // --- Business calculations ---

  /** Monthly instalment for display. Salary Advance: single payment P(1+r).
   *  Overdraft: regular principal-only instalment P/n (last adds flat interest).
   *  Personal Loan: amortised instalment. */
  monthlyInstalment(): string {
    const r = new Decimal(this.interestRate);
    const n = this.termMonths;
    const P = new Decimal(this.principalAmount);

    if (r.isZero()) return P.div(n).toFixed(2);

    if (this.type === LoanType.SALARY_ADVANCE) {
      // Single bullet payment: principal + one month's interest
      return P.times(r.plus(1)).toDecimalPlaces(2).toString();
    }

    if (this.type === LoanType.OVERDRAFT) {
      // Equal principal split; last instalment also carries P×r interest
      return P.div(n).toDecimalPlaces(2).toString();
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
    const rate = new Decimal(this.interestRate);
    const items: RepaymentScheduleItem[] = [];

    if (this.type === LoanType.SALARY_ADVANCE) {
      // Single bullet: principal + one month's flat interest
      const dueDate = new Date(disbursedAt);
      dueDate.setMonth(dueDate.getMonth() + 1);
      const principal = new Decimal(this.principalAmount).toDecimalPlaces(2);
      const interest = principal.times(rate).toDecimalPlaces(2);
      const item = new RepaymentScheduleItem();
      item.id = randomUUID();
      item.loanId = this.id;
      item.installmentNumber = 1;
      item.dueDate = dueDate;
      item.principalAmount = principal.toString();
      item.interestAmount = interest.toString();
      item.totalAmount = principal.plus(interest).toString();
      item.paidAmount = '0.00';
      item.status = RepaymentStatus.PENDING;
      return [item];
    }

    if (this.type === LoanType.OVERDRAFT) {
      // Equal principal each month; interest (P×r, once) added only on last instalment
      const principal = new Decimal(this.principalAmount);
      const flatInterest = principal.times(rate).toDecimalPlaces(2);
      const regularPrincipal = principal
        .div(this.termMonths)
        .toDecimalPlaces(2);
      let balance = principal;

      for (let i = 1; i <= this.termMonths; i++) {
        const dueDate = new Date(disbursedAt);
        dueDate.setMonth(dueDate.getMonth() + i);
        const isLast = i === this.termMonths;
        // Mop up rounding on the last instalment's principal
        const principalPortion = isLast
          ? balance.toDecimalPlaces(2)
          : regularPrincipal;
        const interestPortion = isLast ? flatInterest : new Decimal(0);
        balance = balance.minus(principalPortion);

        const item = new RepaymentScheduleItem();
        item.id = randomUUID();
        item.loanId = this.id;
        item.installmentNumber = i;
        item.dueDate = dueDate;
        item.principalAmount = principalPortion.toString();
        item.interestAmount = interestPortion.toFixed(2);
        item.totalAmount = principalPortion.plus(interestPortion).toString();
        item.paidAmount = '0.00';
        item.status = RepaymentStatus.PENDING;
        items.push(item);
      }
      return items;
    }

    const monthlyPayment = new Decimal(this.monthlyInstalment());
    let balance = new Decimal(this.principalAmount);

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
