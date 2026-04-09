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
 * Header accounts (10, 32, 57, etc.) are never posted to directly.
 */
export const COA_CODES = {
  // ── Equity (Classe 1) ─────────────────────────────────────────────────────

  // Capital
  CAPITAL_FC: '10000001',
  CAPITAL_USD: '10000002',

  // Retained earnings
  RETAINED_EARNINGS_FC: '12000001',
  RETAINED_EARNINGS_USD: '12000002',
  ACCUMULATED_LOSSES_FC: '12100001',
  ACCUMULATED_LOSSES_USD: '12100002',

  // Current year result
  NET_PROFIT_FC: '13000001',
  NET_PROFIT_USD: '13000002',
  NET_LOSS_FC: '13100001',
  NET_LOSS_USD: '13100002',

  // ── Assets — Loans (Classe 3 — Credits) ──────────────────────────────────

  LOANS_ORDINARY_FC: '32510001',
  LOANS_ORDINARY_USD: '32510002',
  LOANS_OVERDRAFT_FC: '32520001',
  LOANS_OVERDRAFT_USD: '32520002',
  LOANS_SALARY_FC: '32530001',
  LOANS_SALARY_USD: '32530002',

  // ── Assets — Cash / Treasury (Classe 5) ──────────────────────────────────

  VAULT_MAIN_FC: '57010001',
  VAULT_MAIN_USD: '57010002',

  // Header accounts — never posted to directly.
  // Per-branch safe and teller accounts are provisioned as children
  // when a branch is created (5702XXYY) or a teller's first session
  // is requested (5703XXYY). XX = branch seq, YY = teller seq.
  VAULT_BRANCH_HEADER: '5702',
  TELLER_CASH_HEADER: '5703',

  // ── Liabilities — Customer Accounts (Classe 3 — Deposits) ────────────────

  CUSTOMER_CURRENT_FC: '33000000',
  CUSTOMER_CURRENT_USD: '33010000',
  CUSTOMER_CHECKING_FC: '33100000',
  CUSTOMER_CHECKING_USD: '33110000',
  CUSTOMER_SAVINGS_FC: '33200000',
  CUSTOMER_SAVINGS_USD: '33201000',

  // ── Income (Classe 7) ────────────────────────────────────────────────────

  INTEREST_SALARY_ADVANCE_FC: '71210001',
  INTEREST_SALARY_ADVANCE_USD: '71210002',
  INTEREST_ORDINARY_LOAN_FC: '71211001',
  INTEREST_ORDINARY_LOAN_USD: '71211002',
  INTEREST_OVERDRAFT_FC: '71212001',
  INTEREST_OVERDRAFT_USD: '71212002',
  FEE_INCOME_FC: '72000001',
  FEE_INCOME_USD: '72000002',
  PENALTY_INCOME_FC: '73130001',
  PENALTY_INCOME_USD: '73130002',

  // ── Expenses (Classe 6) ──────────────────────────────────────────────────

  WATER: '64000000',
  ELECTRICITY: '64001000',
  FUEL: '64003000',
  OFFICE_SUPPLIES: '64020000',
  TRAVEL: '64100000',
  TELECOMMUNICATIONS: '64200000',
  RENT: '64240000',
  IT_SERVICES: '64270000',
  SALARIES: '65010000',

  // ── Teller variance / suspense (Classe 5) ────────────────────────────────
  // Used to record EOD surplus (+) or deficit (-) after teller reconciliation.

  TELLER_VARIANCE_FC: '57040001',
  TELLER_VARIANCE_USD: '57040002',

  // ── Remittance transit (Classe 4) ─────────────────────────────────────────
  // Clearing liability that holds cash in transit between branches.
  // Credited on Leg 1 (send), debited on Leg 2 (payout) or cancellation.

  REMITTANCE_TRANSIT_FC: '45191001',
  REMITTANCE_TRANSIT_USD: '45191002',
} as const;

export type CoaCode = (typeof COA_CODES)[keyof typeof COA_CODES];
