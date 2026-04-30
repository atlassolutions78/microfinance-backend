import { RemittanceStatus } from './remittance.enums';
import { Currency } from '../teller/teller.enums';
import { IdType } from '../clients/client.enums';

export interface RemittanceModelProps {
  id: string;
  reference: string;
  sendingSessionId: string;
  sendingTellerId: string;
  sendingBranchId: string;
  receivingBranchId: string;
  amount: string;
  currency: Currency;
  recipientName: string;
  recipientIdType: IdType;
  recipientIdNumber: string;
  recipientPhone: string | undefined;
  status: RemittanceStatus;
  payoutSessionId: string | undefined;
  payoutTellerId: string | undefined;
  paidAt: Date | undefined;
  cancelledBy: string | undefined;
  cancelledAt: Date | undefined;
  cancellationReason: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Remittance domain model.
 *
 * Owns the remittance lifecycle and all transition rules.
 * No NestJS, no TypeORM — pure TypeScript.
 *
 * Lifecycle:
 *   PENDING → PAID        (recipient collects at receiving branch)
 *   PENDING → CANCELLED   (sending teller or manager cancels before payout)
 */
export class RemittanceModel {
  readonly id: string;
  readonly reference: string;
  readonly sendingSessionId: string;
  readonly sendingTellerId: string;
  readonly sendingBranchId: string;
  readonly receivingBranchId: string;
  readonly amount: string;
  readonly currency: Currency;
  readonly recipientName: string;
  readonly recipientIdType: IdType;
  readonly recipientIdNumber: string;
  readonly recipientPhone: string | undefined;
  readonly createdAt: Date;

  status: RemittanceStatus;
  payoutSessionId: string | undefined;
  payoutTellerId: string | undefined;
  paidAt: Date | undefined;
  cancelledBy: string | undefined;
  cancelledAt: Date | undefined;
  cancellationReason: string | undefined;
  updatedAt: Date;

  constructor(props: RemittanceModelProps) {
    this.id = props.id;
    this.reference = props.reference;
    this.sendingSessionId = props.sendingSessionId;
    this.sendingTellerId = props.sendingTellerId;
    this.sendingBranchId = props.sendingBranchId;
    this.receivingBranchId = props.receivingBranchId;
    this.amount = props.amount;
    this.currency = props.currency;
    this.recipientName = props.recipientName;
    this.recipientIdType = props.recipientIdType;
    this.recipientIdNumber = props.recipientIdNumber;
    this.recipientPhone = props.recipientPhone;
    this.status = props.status;
    this.payoutSessionId = props.payoutSessionId;
    this.payoutTellerId = props.payoutTellerId;
    this.paidAt = props.paidAt;
    this.cancelledBy = props.cancelledBy;
    this.cancelledAt = props.cancelledAt;
    this.cancellationReason = props.cancellationReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Leg 2 — recipient collects cash at receiving branch.
   * Called after the journal entry and teller session update are committed.
   */
  markPaid(payoutSessionId: string, payoutTellerId: string): void {
    if (this.status !== RemittanceStatus.PENDING) {
      throw new Error(`Cannot pay out a remittance in status: ${this.status}`);
    }
    this.status = RemittanceStatus.PAID;
    this.payoutSessionId = payoutSessionId;
    this.payoutTellerId = payoutTellerId;
    this.paidAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Cancel before payout. Cash returns to the sending teller's drawer.
   */
  cancel(cancelledBy: string, reason?: string): void {
    if (this.status !== RemittanceStatus.PENDING) {
      throw new Error(
        `Cannot cancel a remittance in status: ${this.status}`,
      );
    }
    this.status = RemittanceStatus.CANCELLED;
    this.cancelledBy = cancelledBy;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.updatedAt = new Date();
  }
}
