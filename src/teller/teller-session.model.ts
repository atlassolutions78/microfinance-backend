import { TellerSessionStatus, TellerTxType } from './teller.enums';

export interface TellerSessionModelProps {
  id: string;
  tellerId: string;
  branchId: string;
  date: string; // YYYY-MM-DD — business date, one session per teller per day
  status: TellerSessionStatus;

  // Float request
  requestedAmountFC: number;
  requestedAmountUSD: number;

  // Approved by manager
  approvedAmountFC: number;
  approvedAmountUSD: number;
  approvedBy: string | undefined;
  approvedAt: Date | undefined;

  // Running cash position — updated with each transaction
  openingCashFC: number;
  openingCashUSD: number;
  cashInFC: number; // sum of all deposits (FC)
  cashInUSD: number; // sum of all deposits (USD)
  cashOutFC: number; // sum of all withdrawals (FC)
  cashOutUSD: number; // sum of all withdrawals (USD)

  // EOD — submitted by teller
  declaredClosingCashFC: number | undefined;
  declaredClosingCashUSD: number | undefined;
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
  readonly date: string;
  readonly createdAt: Date;

  status: TellerSessionStatus;
  requestedAmountFC: number;
  requestedAmountUSD: number;
  approvedAmountFC: number;
  approvedAmountUSD: number;
  approvedBy: string | undefined;
  approvedAt: Date | undefined;
  openingCashFC: number;
  openingCashUSD: number;
  cashInFC: number;
  cashInUSD: number;
  cashOutFC: number;
  cashOutUSD: number;
  declaredClosingCashFC: number | undefined;
  declaredClosingCashUSD: number | undefined;
  submittedAt: Date | undefined;
  reconciledBy: string | undefined;
  reconciledAt: Date | undefined;
  updatedAt: Date;

  constructor(props: TellerSessionModelProps) {
    this.id = props.id;
    this.tellerId = props.tellerId;
    this.branchId = props.branchId;
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
    this.approvedAmountFC = amountFC;
    this.approvedAmountUSD = amountUSD;
    this.openingCashFC = amountFC;
    this.openingCashUSD = amountUSD;
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
      if (currency === 'FC') this.cashInFC += amount;
      else this.cashInUSD += amount;
    } else {
      if (currency === 'FC') this.cashOutFC += amount;
      else this.cashOutUSD += amount;
    }
    this.updatedAt = new Date();
  }

  /**
   * Teller submits EOD with their physical cash count.
   * Moves session to PENDING_RECONCILIATION.
   */
  submitForReconciliation(declaredFC: number, declaredUSD: number): void {
    if (this.status !== TellerSessionStatus.OPEN) {
      throw new Error(
        `Cannot submit EOD for a session in status: ${this.status}`,
      );
    }
    if (declaredFC < 0 || declaredUSD < 0) {
      throw new Error('Declared closing cash cannot be negative.');
    }
    this.declaredClosingCashFC = declaredFC;
    this.declaredClosingCashUSD = declaredUSD;
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

  get expectedClosingCashFC(): number {
    return this.openingCashFC + this.cashInFC - this.cashOutFC;
  }

  get expectedClosingCashUSD(): number {
    return this.openingCashUSD + this.cashInUSD - this.cashOutUSD;
  }

  /** Positive = surplus, negative = deficit. Defined only after EOD submission. */
  get varianceFC(): number {
    if (this.declaredClosingCashFC === undefined) return 0;
    return this.declaredClosingCashFC - this.expectedClosingCashFC;
  }

  get varianceUSD(): number {
    if (this.declaredClosingCashUSD === undefined) return 0;
    return this.declaredClosingCashUSD - this.expectedClosingCashUSD;
  }

  assertCanProcessTransaction(): void {
    if (this.status !== TellerSessionStatus.OPEN) {
      throw new Error(
        `Transactions can only be processed on an OPEN session. Current status: ${this.status}`,
      );
    }
  }

  assertHasCashFor(amount: number, currency: 'FC' | 'USD'): void {
    const available =
      currency === 'FC'
        ? this.expectedClosingCashFC
        : this.expectedClosingCashUSD;
    if (available < amount) {
      throw new Error(
        `Insufficient teller cash for this withdrawal. Available: ${available} ${currency}, requested: ${amount} ${currency}`,
      );
    }
  }
}
