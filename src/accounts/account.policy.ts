import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ClientType } from '../clients/client.enums';
import { AccountCurrency, AccountType } from './account.enums';

const ALLOWED_ACCOUNT_TYPES: Record<ClientType, AccountType[]> = {
  [ClientType.INDIVIDUAL]: [AccountType.SAVINGS, AccountType.CHECKING],
  [ClientType.ORGANIZATION]: [AccountType.BUSINESS_CURRENT],
};

export class AccountPolicy {
  static readonly MIN_ACTIVATION_BALANCE_USD = 20;
  static readonly MIN_ACTIVATION_BALANCE_FC = 1500;

  static meetsActivationThreshold(newBalance: string, currency: AccountCurrency): boolean {
    const threshold =
      currency === AccountCurrency.FC
        ? AccountPolicy.MIN_ACTIVATION_BALANCE_FC
        : AccountPolicy.MIN_ACTIVATION_BALANCE_USD;
    return new Decimal(newBalance).greaterThanOrEqualTo(threshold);
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
