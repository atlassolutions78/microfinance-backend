export enum ChartAccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

/**
 * Standard numeric codes used to look up posting accounts in chart_of_accounts.
 * These are leaf-level accounts — the only ones that appear in journal_lines.
 * Header accounts (1000, 1100, 2000, etc.) are never posted to directly.
 */
export const COA_CODES = {
  // Assets — Cash & Vault
  TELLER1_USD: '1101',
  TELLER1_FC: '1102',
  TELLER2_USD: '1103',
  TELLER2_FC: '1104',
  VAULT_USD: '1105',
  VAULT_FC: '1106',

  // Assets — Loans Receivable
  LOANS_STANDARD_USD: '1201',
  LOANS_STANDARD_FC: '1202',
  LOANS_SALARY_USD: '1203',
  LOANS_SALARY_FC: '1204',
  LOANS_OVERDRAFT_USD: '1205',
  LOANS_OVERDRAFT_FC: '1206',

  // Liabilities — Customer Accounts (control accounts)
  CUSTOMER_SAVINGS_USD: '2101',
  CUSTOMER_SAVINGS_FC: '2102',
  CUSTOMER_CHECKING_USD: '2201',
  CUSTOMER_CHECKING_FC: '2202',
  CUSTOMER_BUSINESS_USD: '2301',
  CUSTOMER_BUSINESS_FC: '2302',

  // Equity
  SHARE_CAPITAL: '3100',
  RETAINED_EARNINGS: '3200',

  // Income
  INTEREST_INCOME_USD: '4101',
  INTEREST_INCOME_FC: '4102',
  FEE_INCOME_USD: '4201',
  FEE_INCOME_FC: '4202',
  PENALTY_INCOME_USD: '4301',
  PENALTY_INCOME_FC: '4302',

  // Expenses
  SALARIES: '5100',
  RENT: '5200',
  UTILITIES: '5300',
} as const;

export type CoaCode = (typeof COA_CODES)[keyof typeof COA_CODES];
