import { ForbiddenException } from '@nestjs/common';
import { LoanType } from './loan.enums';

/**
 * Business rules that require external context — data that is not on the
 * loan itself but is needed to decide whether an action is allowed.
 *
 * Rules that only need the loan's own data belong on LoanModel instead.
 */

const MAX_ACTIVE_LOANS = 2;

const MIN_AMOUNT = 10_000;

const MAX_AMOUNT: Record<LoanType, number> = {
  [LoanType.INDIVIDUAL]: 5_000_000,
  [LoanType.GROUP]: 20_000_000,
  [LoanType.EMERGENCY]: 500_000,
  [LoanType.BUSINESS]: 10_000_000,
  [LoanType.AGRICULTURAL]: 3_000_000,
};

export class LoanPolicy {
  /**
   * A member may not hold more than MAX_ACTIVE_LOANS active loans at a time.
   */
  static assertCanApply(activeLoansCount: number): void {
    if (activeLoansCount >= MAX_ACTIVE_LOANS) {
      throw new ForbiddenException(
        `Member already has ${activeLoansCount} active loan(s). Maximum is ${MAX_ACTIVE_LOANS}.`,
      );
    }
  }

  /**
   * Loan amount must be within the allowed range for the given product type.
   */
  static assertAmount(amount: number, type: LoanType): void {
    if (amount < MIN_AMOUNT) {
      throw new ForbiddenException(
        `Minimum loan amount is ${MIN_AMOUNT.toLocaleString()}.`,
      );
    }

    const max = MAX_AMOUNT[type];
    if (amount > max) {
      throw new ForbiddenException(
        `Maximum loan amount for ${type} loans is ${max.toLocaleString()}.`,
      );
    }
  }
}
