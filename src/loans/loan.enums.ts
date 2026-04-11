export enum LoanType {
  SALARY_ADVANCE = 'SALARY_ADVANCE',
  PERSONAL_LOAN  = 'PERSONAL_LOAN',
  OVERDRAFT      = 'OVERDRAFT',
}

export enum LoanCurrency {
  USD = 'USD',
  FC  = 'FC',
}

export enum LoanStatus {
  PENDING   = 'PENDING',    // application submitted, awaiting officer review
  APPROVED  = 'APPROVED',   // officer approved, not yet disbursed
  REJECTED  = 'REJECTED',   // officer declined
  ACTIVE    = 'ACTIVE',     // disbursed, repayments in progress
  CLOSED    = 'CLOSED',     // fully repaid
  DEFAULTED = 'DEFAULTED',  // write-off / seriously overdue
}

export enum RepaymentStatus {
  PENDING = 'PENDING',  // installment not yet paid
  PAID    = 'PAID',     // paid in full
  LATE    = 'LATE',     // 1–29 days past due date
  OVERDUE = 'OVERDUE',  // ≥ 30 days past due − penalty applied
}

export enum LoanDocumentType {
  MOU               = 'MOU',               // Memorandum of Understanding
  COMMITMENT_LETTER = 'COMMITMENT_LETTER', // Letter of Commitment
  REQUEST_LETTER    = 'REQUEST_LETTER',    // Request Letter
}

export enum ReminderChannel {
  EMAIL = 'EMAIL',
  SMS   = 'SMS',
}

export enum ReminderStatus {
  SENT   = 'SENT',
  FAILED = 'FAILED',
}
