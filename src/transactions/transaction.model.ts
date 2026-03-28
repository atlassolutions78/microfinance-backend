import { Currency, TransactionType } from './transaction.enums';

export interface TransactionModelProps {
  id: string;
  accountId: string;
  branchId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  balanceAfter: number;
  reference: string;
  description: string | undefined;
  performedBy: string;
  createdAt: Date;
}

export class TransactionModel {
  readonly id: string;
  readonly accountId: string;
  readonly branchId: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly currency: Currency;
  readonly balanceAfter: number;
  readonly reference: string;
  readonly description: string | undefined;
  readonly performedBy: string;
  readonly createdAt: Date;

  constructor(props: TransactionModelProps) {
    this.id = props.id;
    this.accountId = props.accountId;
    this.branchId = props.branchId;
    this.type = props.type;
    this.amount = props.amount;
    this.currency = props.currency;
    this.balanceAfter = props.balanceAfter;
    this.reference = props.reference;
    this.description = props.description;
    this.performedBy = props.performedBy;
    this.createdAt = props.createdAt;
  }

  static create(props: TransactionModelProps): TransactionModel {
    if (props.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }
    return new TransactionModel(props);
  }

  isDebit(): boolean {
    return [
      TransactionType.WITHDRAWAL,
      TransactionType.TRANSFER_OUT,
      TransactionType.FEE,
      TransactionType.PENALTY,
    ].includes(this.type);
  }

  isCredit(): boolean {
    return !this.isDebit();
  }
}
