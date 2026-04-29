import Decimal from 'decimal.js';
import { RemittanceEntity } from './remittance.entity';
import { RemittanceModel } from './remittance.model';

export class RemittanceMapper {
  static toDomain(e: RemittanceEntity): RemittanceModel {
    return new RemittanceModel({
      id: e.id,
      reference: e.reference,
      sendingSessionId: e.sending_session_id,
      sendingTellerId: e.sending_teller_id,
      sendingBranchId: e.sending_branch_id,
      receivingBranchId: e.receiving_branch_id,
      amount: new Decimal(e.amount).toFixed(2),
      currency: e.currency,
      recipientName: e.recipient_name,
      recipientIdType: e.recipient_id_type,
      recipientIdNumber: e.recipient_id_number,
      recipientPhone: e.recipient_phone ?? undefined,
      status: e.status,
      payoutSessionId: e.payout_session_id ?? undefined,
      payoutTellerId: e.payout_teller_id ?? undefined,
      paidAt: e.paid_at ?? undefined,
      cancelledBy: e.cancelled_by ?? undefined,
      cancelledAt: e.cancelled_at ?? undefined,
      cancellationReason: e.cancellation_reason ?? undefined,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    });
  }

  static toEntity(m: RemittanceModel): RemittanceEntity {
    const e = new RemittanceEntity();
    e.id = m.id;
    e.reference = m.reference;
    e.sending_session_id = m.sendingSessionId;
    e.sending_teller_id = m.sendingTellerId;
    e.sending_branch_id = m.sendingBranchId;
    e.receiving_branch_id = m.receivingBranchId;
    e.amount = new Decimal(m.amount).toDecimalPlaces(2).toNumber();
    e.currency = m.currency;
    e.recipient_name = m.recipientName;
    e.recipient_id_type = m.recipientIdType;
    e.recipient_id_number = m.recipientIdNumber;
    e.recipient_phone = m.recipientPhone ?? null;
    e.status = m.status;
    e.payout_session_id = m.payoutSessionId ?? null;
    e.payout_teller_id = m.payoutTellerId ?? null;
    e.paid_at = m.paidAt ?? null;
    e.cancelled_by = m.cancelledBy ?? null;
    e.cancelled_at = m.cancelledAt ?? null;
    e.cancellation_reason = m.cancellationReason ?? null;
    return e;
  }
}
