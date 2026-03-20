import { BadRequestException } from '@nestjs/common';
import { ClientType } from '../clients/client.enums';
import { AccountType } from './account.enums';

const ALLOWED_ACCOUNT_TYPES: Record<ClientType, AccountType[]> = {
  [ClientType.INDIVIDUAL]: [AccountType.SAVINGS, AccountType.CHECKING],
  [ClientType.ORGANIZATION]: [AccountType.BUSINESS_CURRENT],
};

export class AccountPolicy {
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
