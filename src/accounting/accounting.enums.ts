export enum ChartAccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum JournalOperationType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER = 'TRANSFER',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  FEE_PENALTY = 'FEE_PENALTY',
}

export enum JournalLineSide {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

/**
 * Standard codes used to look up accounts in chart_of_accounts.
 * Unique per (code, branch_id, currency).
 */
export const COA_CODES = {
  CASH: 'CASH',
  MEMBER_DEPOSITS: 'MEMBER_DEPOSITS',
  LOANS_RECEIVABLE: 'LOANS_RECEIVABLE',
  INTEREST_INCOME: 'INTEREST_INCOME',
  FEE_INCOME: 'FEE_INCOME',
  PENALTY_INCOME: 'PENALTY_INCOME',
} as const;

export type CoaCode = (typeof COA_CODES)[keyof typeof COA_CODES];
