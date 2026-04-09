import { BadRequestException } from '@nestjs/common';
import { AccountModel } from '../accounts/account.model';
import { AccountStatus } from '../accounts/account.enums';
import { LoanType } from './loan.enums';

// ---------------------------------------------------------------------------
// Loan product catalogue
// ---------------------------------------------------------------------------

export interface LoanProduct {
  /** Monthly interest rate as a decimal, e.g. 0.025 = 2.5 % per month. */
  monthlyRate: number;
  /** Allowed term(s) in months. Fixed products have a single value. */
  allowedTerms: number[];
  /** One-time fee charged at application in USD. */
  formFeeUsd: number;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Interest label shown in the UI (e.g. "2.5% per month"). */
  rateLabel: string;
}

export const LOAN_PRODUCTS: Record<LoanType, LoanProduct> = {
  [LoanType.SALARY_ADVANCE]: {
    monthlyRate: 0.025, // 2.5 % per month (flat single payment)
    allowedTerms: [1],
    formFeeUsd: 12,
    label: 'Salary Advance',
    rateLabel: '2.5% per month',
  },
  [LoanType.PERSONAL_LOAN]: {
    monthlyRate: 0.05 / 12, // 5 % annual â†’ ~0.4167 % per month
    allowedTerms: [10, 12],
    formFeeUsd: 0,
    label: 'Personal Loan',
    rateLabel: '5% annual',
  },
  [LoanType.OVERDRAFT]: {
    monthlyRate: 0.025, // 2.5 % per month
    allowedTerms: [3],
    formFeeUsd: 0,
    label: 'Overdraft',
    rateLabel: '2.5% per month',
  },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ACTIVE_LOANS = 1;
const MIN_ACCOUNT_AGE_MONTHS = 6;
export const PENALTY_RATE = 0.11; // 11 % applied to overdue installment amount

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export class LoanPolicy {
  /** Client must not hold more than MAX_ACTIVE_LOANS active (or approved) loans. */
  static assertCanApply(activeLoansCount: number): void {
    if (activeLoansCount >= MAX_ACTIVE_LOANS) {
      throw new BadRequestException(
        `Client already has ${activeLoansCount} active loan(s). Maximum is ${MAX_ACTIVE_LOANS}.`,
      );
    }
  }

  /**
   * The account selected for disbursement must be ACTIVE and opened at
   * least MIN_ACCOUNT_AGE_MONTHS ago.
   */
  static assertAccountEligible(account: AccountModel): void {
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `The selected account must be ACTIVE to receive a loan disbursement. Current status: ${account.status}.`,
      );
    }

    const minOpenDate = new Date();
    minOpenDate.setMonth(minOpenDate.getMonth() - MIN_ACCOUNT_AGE_MONTHS);

    if (account.createdAt > minOpenDate) {
      throw new BadRequestException(
        `Loan eligibility requires an account that is at least ${MIN_ACCOUNT_AGE_MONTHS} months old. ` +
          `This account was opened on ${account.createdAt.toDateString()}.`,
      );
    }
  }

  /** Derive and validate the term months for the requested loan type. */
  static deriveTermMonths(type: LoanType, requested?: number): number {
    const { allowedTerms } = LOAN_PRODUCTS[type];

    if (allowedTerms.length === 1) {
      // Fixed-term product â€” ignore whatever the caller sent
      return allowedTerms[0];
    }

    if (!requested || !allowedTerms.includes(requested)) {
      throw new BadRequestException(
        `Term for ${type} must be one of [${allowedTerms.join(', ')}] months.`,
      );
    }
    return requested;
  }

  /** Amount must be positive. */
  static assertAmountRange(amount: number): void {
    if (amount <= 0) {
      throw new BadRequestException(
        'Principal amount must be greater than zero.',
      );
    }
  }

  /** Compute the 11 % penalty on the remaining unpaid amount of an installment. */
  static computePenalty(overdueAmount: number): number {
    return Math.round(overdueAmount * PENALTY_RATE * 100) / 100;
  }
}
