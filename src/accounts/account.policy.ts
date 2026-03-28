import { BadRequestException } from '@nestjs/common';
import { ClientType } from '../clients/client.enums';
import { AccountType } from './account.enums';

const ALLOWED_ACCOUNT_TYPES: Record<ClientType, AccountType[]> = {
  [ClientType.INDIVIDUAL]: [AccountType.SAVINGS, AccountType.CHECKING],
  [ClientType.ORGANIZATION]: [AccountType.BUSINESS_CURRENT],
};

export class AccountPolicy {
  /**
   * Minimum deposit amount (in USD) required to activate a PENDING account.
   * Story 2.2: first deposit ≥ MIN_ACTIVATION_BALANCE flips status to ACTIVE.
   */
  static readonly MIN_ACTIVATION_BALANCE = 20;

  /**
   * Asserts that a deposit amount is sufficient to activate a PENDING account.
   * Called by the transaction service before applying the activation rule.
   */
  static meetsActivationThreshold(newBalance: number): boolean {
    return newBalance >= AccountPolicy.MIN_ACTIVATION_BALANCE;
  }

  /**
   * Validates that the requested account type is permitted for the given
   * client type. Individual clients may open savings or checking accounts;
   * organization clients may only open business current accounts.
   */
  static assertTypeAllowed(
    clientType: ClientType,
    accountType: AccountType,
  ): void {
    const allowed = ALLOWED_ACCOUNT_TYPES[clientType];
    if (!allowed) {
      throw new BadRequestException(
        `Unrecognised client type "${clientType}". Expected INDIVIDUAL or ORGANIZATION. ` +
          `This may indicate a stale DB enum value — run the latest migrations.`,
      );
    }
    if (!allowed.includes(accountType)) {
      throw new BadRequestException(
        `A ${clientType} client cannot open a ${accountType} account. ` +
          `Allowed types: ${allowed.join(', ')}.`,
      );
    }
  }
}
