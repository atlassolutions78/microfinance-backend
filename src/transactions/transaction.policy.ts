import { BadRequestException } from '@nestjs/common';

export class TransactionPolicy {
  static assertSufficientBalance(
    balance: number,
    amount: number,
    accountId: string,
  ): void {
    if (balance < amount) {
      throw new BadRequestException(
        `Insufficient balance on account ${accountId}. Available: ${balance}, requested: ${amount}.`,
      );
    }
  }

  // TODO: validate that the account exists and is ACTIVE once the accounts module is built.
  static assertAccountActive(_accountId: string): void {
    // no-op until accounts module is available
  }

  // TODO: enforce mandatory signatory count for BUSINESS accounts once the accounts module is built.
  static assertSignaturePolicy(_accountType: string, _accountId: string): void {
    // no-op until accounts module is available
  }
}
