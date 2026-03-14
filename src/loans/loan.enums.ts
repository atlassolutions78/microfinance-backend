export enum LoanStatus {
  PENDING = 'PENDING',       // Application submitted, awaiting review
  APPROVED = 'APPROVED',     // Reviewed and approved, not yet disbursed
  REJECTED = 'REJECTED',     // Reviewed and declined
  ACTIVE = 'ACTIVE',         // Disbursed, repayments ongoing
  CLOSED = 'CLOSED',         // Fully repaid
  DEFAULTED = 'DEFAULTED',   // Missed repayments beyond allowed threshold
}

export enum LoanType {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
  EMERGENCY = 'EMERGENCY',
  BUSINESS = 'BUSINESS',
  AGRICULTURAL = 'AGRICULTURAL',
}
