export enum TellerSessionStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  OPEN = 'OPEN',
  PENDING_RECONCILIATION = 'PENDING_RECONCILIATION',
  CLOSED = 'CLOSED',
}

export enum DenominationType {
  FLOAT_APPROVAL = 'FLOAT_APPROVAL',   // manager hands cash to teller
  EOD_DECLARATION = 'EOD_DECLARATION', // teller counts drawer at close
}

export enum TellerTxType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER = 'TRANSFER',
}

// ── Account transaction enums (formerly in the transactions module) ───────────

export enum AccountTxType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  FEE = 'FEE',
  PENALTY = 'PENALTY',
}

export enum Currency {
  USD = 'USD',
  FC = 'FC',
}
