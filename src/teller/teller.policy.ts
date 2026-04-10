import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/user.enums';
import { AccountType, AccountCurrency } from '../accounts/account.enums';
import { COA_CODES } from '../accounting/accounting.enums';

export class TellerPolicy {
  /**
   * Ensures the requesting user is a TELLER role.
   */
  static assertIsTeller(role: UserRole): void {
    if (role !== UserRole.TELLER) {
      throw new ForbiddenException('Only tellers can request a session.');
    }
  }

  /**
   * Ensures the approving user is a BRANCH_MANAGER.
   */
  static assertIsBranchManager(role: UserRole): void {
    if (role !== UserRole.BRANCH_MANAGER && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only branch managers can approve teller sessions.',
      );
    }
  }

  /**
   * Ensures a teller does not already have a session on the given date.
   */
  static assertNoDuplicateSession(existingSessionExists: boolean): void {
    if (existingSessionExists) {
      throw new BadRequestException(
        "A session already exists for this teller on today's date. Only one session per teller per day is allowed.",
      );
    }
  }

  /**
   * Ensures the session belongs to the teller requesting the action.
   */
  static assertSessionOwnedByTeller(
    sessionTellerId: string,
    requestingTellerId: string,
  ): void {
    if (sessionTellerId !== requestingTellerId) {
      throw new ForbiddenException('You can only act on your own session.');
    }
  }

  /**
   * Ensures the session belongs to the branch of the acting manager.
   */
  static assertSessionInBranch(
    sessionBranchId: string,
    managerBranchId: string,
  ): void {
    if (sessionBranchId !== managerBranchId) {
      throw new ForbiddenException(
        'This session does not belong to your branch.',
      );
    }
  }

  /**
   * Returns the correct COA liability code for a client account based on its
   * type and currency. This ensures each deposit/withdrawal posts to the right
   * aggregate in the journal (SAVINGS, CHECKING, or BUSINESS_CURRENT).
   */
  static clientSavingsCode(
    accountType: AccountType,
    currency: AccountCurrency,
  ): string {
    const isFC = currency === AccountCurrency.FC;
    switch (accountType) {
      case AccountType.SAVINGS:
        return isFC
          ? COA_CODES.CUSTOMER_SAVINGS_FC
          : COA_CODES.CUSTOMER_SAVINGS_USD;
      case AccountType.CHECKING:
        return isFC
          ? COA_CODES.CUSTOMER_CHECKING_FC
          : COA_CODES.CUSTOMER_CHECKING_USD;
      case AccountType.BUSINESS_CURRENT:
        return isFC
          ? COA_CODES.CUSTOMER_CURRENT_FC
          : COA_CODES.CUSTOMER_CURRENT_USD;
    }
  }

  /**
   * Ensures requested float amounts are valid (at least one currency > 0).
   */
  static assertValidFloatRequest(
    requestedAmountFC: number,
    requestedAmountUSD: number,
  ): void {
    if (requestedAmountFC < 0 || requestedAmountUSD < 0) {
      throw new BadRequestException('Float amounts cannot be negative.');
    }
    if (requestedAmountFC === 0 && requestedAmountUSD === 0) {
      throw new BadRequestException(
        'At least one currency amount must be greater than zero.',
      );
    }
  }
}
