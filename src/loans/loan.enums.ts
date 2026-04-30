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
  PENDING     = 'PENDING',      // application submitted, awaiting officer review
  APPROVED    = 'APPROVED',     // officer approved, not yet disbursed
  REJECTED    = 'REJECTED',     // officer declined
  ACTIVE      = 'ACTIVE',       // disbursed, repayments in progress
  CLOSED      = 'CLOSED',       // fully repaid
  WATCH       = 'WATCH',        // 1–90 days past last due date
  SUBSTANDARD = 'SUBSTANDARD',  // 91–180 days past last due date
  DOUBTFUL    = 'DOUBTFUL',     // 181–360 days past last due date
  LOSS        = 'LOSS',         // 361–720 days past last due date
  WRITE_OFF   = 'WRITE_OFF',    // 721+ days past last due date
}

export enum RepaymentStatus {
  PENDING = 'PENDING',  // installment not yet paid
  PAID    = 'PAID',     // paid in full
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
