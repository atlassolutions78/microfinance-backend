import Decimal from 'decimal.js';
import {
  SessionDenominationEntity,
  TellerSessionEntity,
  TellerTransactionEntity,
} from './teller.entity';
import { TellerSessionModel } from './teller-session.model';
import { Currency, DenominationType, TellerTxType } from './teller.enums';

export interface SessionDenominationRecord {
  id: string;
  sessionId: string;
  type: DenominationType;
  currency: Currency;
  denomination: number;
  quantity: number;
  subtotal: string;
  createdAt: Date;
}

export interface TellerTransactionRecord {
  id: string;
  sessionId: string;
  type: TellerTxType;
  amount: string;
  currency: string;
  accountId: string;
  /** Client's account number — e.g. "50 001\2 serie 433" */
  accountNumber: string | null;
  /** Client's full name or organisation name */
  clientName: string | null;
  /** Account balance after this transaction */
  balanceAfter: string | null;
  reference: string;
  description: string | undefined;
  createdAt: Date;
}

export class TellerMapper {
  static sessionToDomain(e: TellerSessionEntity): TellerSessionModel {
    return new TellerSessionModel({
      id: e.id,
      tellerId: e.teller_id,
      branchId: e.branch_id,
      sessionNumber: e.session_number,
      date: e.date,
      status: e.status,
      requestedAmountFC: new Decimal(e.requested_amount_fc).toFixed(2),
      requestedAmountUSD: new Decimal(e.requested_amount_usd).toFixed(2),
      approvedAmountFC: new Decimal(e.approved_amount_fc).toFixed(2),
      approvedAmountUSD: new Decimal(e.approved_amount_usd).toFixed(2),
      approvedBy: e.approved_by ?? undefined,
      approvedAt: e.approved_at ?? undefined,
      openingCashFC: new Decimal(e.opening_cash_fc).toFixed(2),
      openingCashUSD: new Decimal(e.opening_cash_usd).toFixed(2),
      cashInFC: new Decimal(e.cash_in_fc).toFixed(2),
      cashInUSD: new Decimal(e.cash_in_usd).toFixed(2),
      cashOutFC: new Decimal(e.cash_out_fc).toFixed(2),
      cashOutUSD: new Decimal(e.cash_out_usd).toFixed(2),
      declaredClosingCashFC:
        e.declared_closing_cash_fc !== null
          ? new Decimal(e.declared_closing_cash_fc).toFixed(2)
          : undefined,
      declaredClosingCashUSD:
        e.declared_closing_cash_usd !== null
          ? new Decimal(e.declared_closing_cash_usd).toFixed(2)
          : undefined,
      submittedAt: e.submitted_at ?? undefined,
      reconciledBy: e.reconciled_by ?? undefined,
      reconciledAt: e.reconciled_at ?? undefined,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    });
  }

  static sessionToEntity(m: TellerSessionModel): TellerSessionEntity {
    const e = new TellerSessionEntity();
    e.id = m.id;
    e.teller_id = m.tellerId;
    e.branch_id = m.branchId;
    e.session_number = m.sessionNumber;
    e.date = m.date;
    e.status = m.status;
    e.requested_amount_fc = Number(m.requestedAmountFC);
    e.requested_amount_usd = Number(m.requestedAmountUSD);
    e.approved_amount_fc = Number(m.approvedAmountFC);
    e.approved_amount_usd = Number(m.approvedAmountUSD);
    e.approved_by = m.approvedBy ?? null;
    e.approved_at = m.approvedAt ?? null;
    e.opening_cash_fc = Number(m.openingCashFC);
    e.opening_cash_usd = Number(m.openingCashUSD);
    e.cash_in_fc = Number(m.cashInFC);
    e.cash_in_usd = Number(m.cashInUSD);
    e.cash_out_fc = Number(m.cashOutFC);
    e.cash_out_usd = Number(m.cashOutUSD);
    e.declared_closing_cash_fc = m.declaredClosingCashFC !== undefined ? Number(m.declaredClosingCashFC) : null;
    e.declared_closing_cash_usd = m.declaredClosingCashUSD !== undefined ? Number(m.declaredClosingCashUSD) : null;
    e.submitted_at = m.submittedAt ?? null;
    e.reconciled_by = m.reconciledBy ?? null;
    e.reconciled_at = m.reconciledAt ?? null;
    return e;
  }

  static denominationToRecord(
    e: SessionDenominationEntity,
  ): SessionDenominationRecord {
    return {
      id: e.id,
      sessionId: e.session_id,
      type: e.type,
      currency: e.currency,
      denomination: Number(e.denomination),
      quantity: Number(e.quantity),
      subtotal: new Decimal(e.subtotal).toFixed(2),
      createdAt: e.created_at,
    };
  }

  static txToRecord(
    e: TellerTransactionEntity,
    accountNumber: string | null = null,
    clientName: string | null = null,
    balanceAfter: string | null = null,
  ): TellerTransactionRecord {
    return {
      id: e.id,
      sessionId: e.session_id,
      type: e.type,
      amount: new Decimal(e.amount).toFixed(2),
      currency: e.currency,
      accountId: e.account_id,
      accountNumber,
      clientName,
      balanceAfter,
      reference: e.reference,
      description: e.description ?? undefined,
      createdAt: e.created_at,
    };
  }
}
