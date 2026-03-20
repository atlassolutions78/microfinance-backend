export interface TransferModelProps {
  id: string;
  debitTransactionId: string;
  creditTransactionId: string | undefined;
  isInternal: boolean;
  recipientName: string | undefined;
  feeAmount: number;
  claimReference: string | undefined;
}

export class TransferModel {
  readonly id: string;
  readonly debitTransactionId: string;
  readonly creditTransactionId: string | undefined;
  readonly isInternal: boolean;
  readonly recipientName: string | undefined;
  readonly feeAmount: number;
  readonly claimReference: string | undefined;

  constructor(props: TransferModelProps) {
    this.id = props.id;
    this.debitTransactionId = props.debitTransactionId;
    this.creditTransactionId = props.creditTransactionId;
    this.isInternal = props.isInternal;
    this.recipientName = props.recipientName;
    this.feeAmount = props.feeAmount;
    this.claimReference = props.claimReference;
  }
}
