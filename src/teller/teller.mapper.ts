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
  subtotal: number;
  createdAt: Date;
}

export interface TellerTransactionRecord {
  id: string;
  sessionId: string;
  type: TellerTxType;
  amount: number;
  currency: string;
  accountId: string;
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
      date: e.date,
      status: e.status,
      requestedAmountFC: Number(e.requested_amount_fc),
      requestedAmountUSD: Number(e.requested_amount_usd),
      approvedAmountFC: Number(e.approved_amount_fc),
      approvedAmountUSD: Number(e.approved_amount_usd),
      approvedBy: e.approved_by ?? undefined,
      approvedAt: e.approved_at ?? undefined,
      openingCashFC: Number(e.opening_cash_fc),
      openingCashUSD: Number(e.opening_cash_usd),
      cashInFC: Number(e.cash_in_fc),
      cashInUSD: Number(e.cash_in_usd),
      cashOutFC: Number(e.cash_out_fc),
      cashOutUSD: Number(e.cash_out_usd),
      declaredClosingCashFC:
        e.declared_closing_cash_fc !== null
          ? Number(e.declared_closing_cash_fc)
          : undefined,
      declaredClosingCashUSD:
        e.declared_closing_cash_usd !== null
          ? Number(e.declared_closing_cash_usd)
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
    e.date = m.date;
    e.status = m.status;
    e.requested_amount_fc = m.requestedAmountFC;
    e.requested_amount_usd = m.requestedAmountUSD;
    e.approved_amount_fc = m.approvedAmountFC;
    e.approved_amount_usd = m.approvedAmountUSD;
    e.approved_by = m.approvedBy ?? null;
    e.approved_at = m.approvedAt ?? null;
    e.opening_cash_fc = m.openingCashFC;
    e.opening_cash_usd = m.openingCashUSD;
    e.cash_in_fc = m.cashInFC;
    e.cash_in_usd = m.cashInUSD;
    e.cash_out_fc = m.cashOutFC;
    e.cash_out_usd = m.cashOutUSD;
    e.declared_closing_cash_fc = m.declaredClosingCashFC ?? null;
    e.declared_closing_cash_usd = m.declaredClosingCashUSD ?? null;
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
      subtotal: Number(e.subtotal),
      createdAt: e.created_at,
    };
  }

  static txToRecord(e: TellerTransactionEntity): TellerTransactionRecord {
    return {
      id: e.id,
      sessionId: e.session_id,
      type: e.type,
      amount: Number(e.amount),
      currency: e.currency,
      accountId: e.account_id,
      reference: e.reference,
      description: e.description ?? undefined,
      createdAt: e.created_at,
    };
  }
}
