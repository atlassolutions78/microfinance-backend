import { AccountTxType, Currency } from './teller.enums';

export interface AccountTxModelProps {
  id: string;
  accountId: string;
  branchId: string;
  type: AccountTxType;
  amount: number;
  currency: Currency;
  balanceAfter: number;
  reference: string;
  description: string | undefined;
  performedBy: string;
  createdAt: Date;
}

export class AccountTxModel {
  readonly id: string;
  readonly accountId: string;
  readonly branchId: string;
  readonly type: AccountTxType;
  readonly amount: number;
  readonly currency: Currency;
  readonly balanceAfter: number;
  readonly reference: string;
  readonly description: string | undefined;
  readonly performedBy: string;
  readonly createdAt: Date;

  constructor(props: AccountTxModelProps) {
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

  static create(props: AccountTxModelProps): AccountTxModel {
    if (props.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }
    return new AccountTxModel(props);
  }
}
