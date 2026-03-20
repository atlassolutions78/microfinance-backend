import { TransactionRecord, TransferRecord } from './transaction.entity';
import { TransactionModel } from './transaction.model';
import { TransferModel } from './transfer.model';

export class TransactionMapper {
  static toDomain(record: TransactionRecord): TransactionModel {
    return new TransactionModel({
      id: record.id,
      accountId: record.account_id,
      branchId: record.branch_id,
      type: record.type,
      amount: Number(record.amount),
      currency: record.currency,
      balanceAfter: Number(record.balance_after),
      reference: record.reference,
      description: record.description ?? undefined,
      performedBy: record.performed_by,
      createdAt: record.created_at,
    });
  }

  static toRecord(model: TransactionModel): TransactionRecord {
    return {
      id: model.id,
      account_id: model.accountId,
      branch_id: model.branchId,
      type: model.type,
      amount: model.amount,
      currency: model.currency,
      balance_after: model.balanceAfter,
      reference: model.reference,
      description: model.description ?? null,
      performed_by: model.performedBy,
      created_at: model.createdAt,
    };
  }

  static transferToDomain(record: TransferRecord): TransferModel {
    return new TransferModel({
      id: record.id,
      debitTransactionId: record.debit_transaction_id,
      creditTransactionId: record.credit_transaction_id ?? undefined,
      isInternal: record.is_internal,
      recipientName: record.recipient_name ?? undefined,
      feeAmount: Number(record.fee_amount),
      claimReference: record.claim_reference ?? undefined,
    });
  }

  static transferToRecord(model: TransferModel): TransferRecord {
    return {
      id: model.id,
      debit_transaction_id: model.debitTransactionId,
      credit_transaction_id: model.creditTransactionId ?? null,
      is_internal: model.isInternal,
      recipient_name: model.recipientName ?? null,
      fee_amount: model.feeAmount,
      claim_reference: model.claimReference ?? null,
    };
  }
}
