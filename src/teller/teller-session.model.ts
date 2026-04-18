import Decimal from 'decimal.js';
import { TellerSessionStatus, TellerTxType } from './teller.enums';

export interface TellerSessionModelProps {
  id: string;
  tellerId: string;
  branchId: string;
  sessionNumber: string;
  date: string; // YYYY-MM-DD — business date, one session per teller per day
  status: TellerSessionStatus;

  // Float request
  requestedAmountFC: string;
  requestedAmountUSD: string;

  // Approved by manager
  approvedAmountFC: string;
  approvedAmountUSD: string;
  approvedBy: string | undefined;
  approvedAt: Date | undefined;

  // Running cash position — updated with each transaction
  openingCashFC: string;
  openingCashUSD: string;
  cashInFC: string; // sum of all deposits (FC)
  cashInUSD: string; // sum of all deposits (USD)
  cashOutFC: string; // sum of all withdrawals (FC)
  cashOutUSD: string; // sum of all withdrawals (USD)

  // EOD — submitted by teller
  declaredClosingCashFC: string | undefined;
  declaredClosingCashUSD: string | undefined;
  submittedAt: Date | undefined;

  // Reconciliation — confirmed by manager
  reconciledBy: string | undefined;
  reconciledAt: Date | undefined;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Teller session domain model.
 *
 * Owns the session lifecycle and all cash-position rules.
 * No NestJS, no TypeORM — pure TypeScript.
 *
 * Lifecycle:
 *   REQUESTED → APPROVED → OPEN → PENDING_RECONCILIATION → CLOSED
 */
export class TellerSessionModel {
  readonly id: string;
  readonly tellerId: string;
  readonly branchId: string;
  readonly sessionNumber: string;
  readonly date: string;
  readonly createdAt: Date;

  status: TellerSessionStatus;
  requestedAmountFC: string;
  requestedAmountUSD: string;
  approvedAmountFC: string;
  approvedAmountUSD: string;
  approvedBy: string | undefined;
  approvedAt: Date | undefined;
  openingCashFC: string;
  openingCashUSD: string;
  cashInFC: string;
  cashInUSD: string;
  cashOutFC: string;
  cashOutUSD: string;
  declaredClosingCashFC: string | undefined;
  declaredClosingCashUSD: string | undefined;
  submittedAt: Date | undefined;
  reconciledBy: string | undefined;
  reconciledAt: Date | undefined;
  updatedAt: Date;

  constructor(props: TellerSessionModelProps) {
    this.id = props.id;
    this.tellerId = props.tellerId;
    this.branchId = props.branchId;
    this.sessionNumber = props.sessionNumber;
    this.date = props.date;
    this.status = props.status;
    this.requestedAmountFC = props.requestedAmountFC;
    this.requestedAmountUSD = props.requestedAmountUSD;
    this.approvedAmountFC = props.approvedAmountFC;
    this.approvedAmountUSD = props.approvedAmountUSD;
    this.approvedBy = props.approvedBy;
    this.approvedAt = props.approvedAt;
    this.openingCashFC = props.openingCashFC;
    this.openingCashUSD = props.openingCashUSD;
    this.cashInFC = props.cashInFC;
    this.cashInUSD = props.cashInUSD;
    this.cashOutFC = props.cashOutFC;
    this.cashOutUSD = props.cashOutUSD;
    this.declaredClosingCashFC = props.declaredClosingCashFC;
    this.declaredClosingCashUSD = props.declaredClosingCashUSD;
    this.submittedAt = props.submittedAt;
    this.reconciledBy = props.reconciledBy;
    this.reconciledAt = props.reconciledAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // ── Lifecycle transitions ────────────────────────────────────────────────────

  approve(managerId: string, amountFC: number, amountUSD: number): void {
    if (this.status !== TellerSessionStatus.REQUESTED) {
      throw new Error(`Cannot approve a session in status: ${this.status}`);
    }
    if (amountFC < 0 || amountUSD < 0) {
      throw new Error('Approved amounts cannot be negative.');
    }
    if (amountFC === 0 && amountUSD === 0) {
      throw new Error(
        'At least one currency amount must be greater than zero.',
      );
    }
    this.approvedAmountFC = new Decimal(amountFC).toFixed(2);
    this.approvedAmountUSD = new Decimal(amountUSD).toFixed(2);
    this.openingCashFC = this.approvedAmountFC;
    this.openingCashUSD = this.approvedAmountUSD;
    this.approvedBy = managerId;
    this.approvedAt = new Date();
    this.status = TellerSessionStatus.APPROVED;
    this.updatedAt = new Date();
  }

  open(): void {
    if (this.status !== TellerSessionStatus.APPROVED) {
      throw new Error(`Cannot open a session in status: ${this.status}`);
    }
    this.status = TellerSessionStatus.OPEN;
    this.updatedAt = new Date();
  }

  /**
   * Records a cash movement after a successful transaction.
   * Called by the service after the account and journal entries are committed.
   */
  recordCashMovement(
    type: TellerTxType.DEPOSIT | TellerTxType.WITHDRAWAL,
    amount: number,
    currency: 'FC' | 'USD',
  ): void {
    if (this.status !== TellerSessionStatus.OPEN) {
      throw new Error(
        `Cannot record movement on a session in status: ${this.status}`,
      );
    }
    if (amount <= 0) {
      throw new Error('Movement amount must be positive.');
    }
    if (type === TellerTxType.DEPOSIT) {
      if (currency === 'FC') this.cashInFC = new Decimal(this.cashInFC).plus(amount).toFixed(2);
      else this.cashInUSD = new Decimal(this.cashInUSD).plus(amount).toFixed(2);
    } else {
      if (currency === 'FC') this.cashOutFC = new Decimal(this.cashOutFC).plus(amount).toFixed(2);
      else this.cashOutUSD = new Decimal(this.cashOutUSD).plus(amount).toFixed(2);
    }
    this.updatedAt = new Date();
  }

  /**
   * Teller submits EOD with their physical cash count.
   * Moves session to PENDING_RECONCILIATION.
   */
  submitForReconciliation(declaredFC: number, declaredUSD: number): void {  // amounts come from DTO as numbers
    if (this.status !== TellerSessionStatus.OPEN) {
      throw new Error(
        `Cannot submit EOD for a session in status: ${this.status}`,
      );
    }
    if (declaredFC < 0 || declaredUSD < 0) {
      throw new Error('Declared closing cash cannot be negative.');
    }
    this.declaredClosingCashFC = new Decimal(declaredFC).toFixed(2);
    this.declaredClosingCashUSD = new Decimal(declaredUSD).toFixed(2);
    this.submittedAt = new Date();
    this.status = TellerSessionStatus.PENDING_RECONCILIATION;
    this.updatedAt = new Date();
  }

  /**
   * Branch manager confirms EOD reconciliation and closes the session.
   */
  close(managerId: string): void {
    if (this.status !== TellerSessionStatus.PENDING_RECONCILIATION) {
      throw new Error(`Cannot close a session in status: ${this.status}`);
    }
    this.reconciledBy = managerId;
    this.reconciledAt = new Date();
    this.status = TellerSessionStatus.CLOSED;
    this.updatedAt = new Date();
  }

  // ── Computed cash position ───────────────────────────────────────────────────

  get expectedClosingCashFC(): string {
    return new Decimal(this.openingCashFC)
      .plus(this.cashInFC)
      .minus(this.cashOutFC)
      .toFixed(2);
  }

  get expectedClosingCashUSD(): string {
    return new Decimal(this.openingCashUSD)
      .plus(this.cashInUSD)
      .minus(this.cashOutUSD)
      .toFixed(2);
  }

  /** Positive = surplus, negative = deficit. Defined only after EOD submission. */
  get varianceFC(): string {
    if (this.declaredClosingCashFC === undefined) return '0.00';
    return new Decimal(this.declaredClosingCashFC)
      .minus(this.expectedClosingCashFC)
      .toFixed(2);
  }

  get varianceUSD(): string {
    if (this.declaredClosingCashUSD === undefined) return '0.00';
    return new Decimal(this.declaredClosingCashUSD)
      .minus(this.expectedClosingCashUSD)
      .toFixed(2);
  }

  assertCanProcessTransaction(): void {
    if (this.status !== TellerSessionStatus.OPEN) {
      throw new Error(
        `Transactions can only be processed on an OPEN session. Current status: ${this.status}`,
      );
    }
  }

  assertHasCashFor(amount: number, currency: 'FC' | 'USD'): void {
    const available = currency === 'FC'
      ? this.expectedClosingCashFC
      : this.expectedClosingCashUSD;
    if (new Decimal(available).lessThan(amount)) {
      throw new Error(
        `Insufficient teller cash for this withdrawal. Available: ${available} ${currency}, requested: ${amount} ${currency}`,
      );
    }
  }
}
