import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { AccountRepository } from './account.repository';
import { AccountPolicy } from './account.policy';
import { AccountModel } from './account.model';
import { AccountCurrency, AccountStatus, AccountType } from './account.enums';
import { OpenAccountDto, GetAccountsQueryDto } from './account.dto';
import { ClientService } from '../clients/client.service';
import { ClientType } from '../clients/client.enums';
import { UserModel } from '../users/user.model';

/**
 * Orchestrates account use cases.
 *
 * Pattern per use case:
 *   1. Fetch what is needed
 *   2. Check policy (eligibility rules)
 *   3. Tell the domain model to act (model enforces its own rules)
 *   4. Persist the result
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly clientService: ClientService,
  ) {}

  async open(dto: OpenAccountDto, user: UserModel): Promise<AccountModel> {
    if (!user.branchId) {
      throw new ForbiddenException('User has no assigned branch.');
    }

    const client = await this.clientService.findById(dto.clientId);

    AccountPolicy.assertTypeAllowed(client.type as ClientType, dto.accountType);

    const seq = await this.accountRepository.nextSequence(dto.accountType);
    const accountNumber = AccountService.formatAccountNumber(
      dto.accountType,
      dto.currency,
      seq,
    );

    const account = new AccountModel({
      id: randomUUID(),
      accountNumber,
      clientId: dto.clientId,
      branchId: user.branchId,
      accountType: dto.accountType,
      currency: dto.currency,
      status: AccountStatus.PENDING,
      balance: '0.00',
      openedBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.accountRepository.save(account);
    return account;
  }

  async findAll(
    query?: GetAccountsQueryDto,
  ): Promise<{ data: AccountModel[]; total: number }> {
    return this.accountRepository.findAll(query);
  }

  async findById(id: string): Promise<AccountModel> {
    return this.findOrFail(id);
  }

  async findByIdEnriched(id: string): Promise<AccountModel> {
    const account = await this.findOrFail(id);
    await this.enrichWithClientName(account);
    return account;
  }

  async findByClientId(clientId: string): Promise<AccountModel[]> {
    return this.accountRepository.findByClientId(clientId);
  }

  async findByAccountNumber(accountNumber: string): Promise<AccountModel> {
    const account =
      await this.accountRepository.findByAccountNumber(accountNumber);
    if (!account)
      throw new NotFoundException(`Account not found: ${accountNumber}`);
    await this.enrichWithClientName(account);
    return account;
  }

  async searchByAccountNumber(query: string): Promise<AccountModel[]> {
    const accounts = await this.accountRepository.searchByAccountNumber(query);
    await Promise.all(accounts.map((a) => this.enrichWithClientName(a)));
    return accounts;
  }

  /**
   * Updates the stored balance on the accounts table after a transaction.
   * Also activates the account (story 2.2) if it is PENDING and the new
   * balance is at least $20 (first deposit rule).
   */
  async recordBalance(
    accountId: string,
    newBalance: string,
    em?: EntityManager,
  ): Promise<void> {
    await this.accountRepository.updateBalance(accountId, newBalance, em);
    const account = await this.accountRepository.findById(accountId);
    if (
      account?.status === AccountStatus.PENDING &&
      AccountPolicy.meetsActivationThreshold(newBalance)
    ) {
      await this.accountRepository.updateStatus(
        accountId,
        AccountStatus.ACTIVE,
        em,
      );
    }
  }

  async activate(id: string): Promise<AccountModel> {
    const account = await this.findOrFail(id);
    try {
      account.activate();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.accountRepository.save(account);
    return account;
  }

  async suspend(id: string): Promise<AccountModel> {
    const account = await this.findOrFail(id);
    try {
      account.suspend();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.accountRepository.save(account);
    return account;
  }

  async markDormant(id: string): Promise<AccountModel> {
    const account = await this.findOrFail(id);
    try {
      account.markDormant();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.accountRepository.save(account);
    return account;
  }

  async reactivate(id: string): Promise<AccountModel> {
    const account = await this.findOrFail(id);
    try {
      account.reactivate();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.accountRepository.save(account);
    return account;
  }

  async close(id: string): Promise<AccountModel> {
    const account = await this.findOrFail(id);
    try {
      account.close();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.accountRepository.save(account);
    return account;
  }

  private async enrichWithClientName(account: AccountModel): Promise<void> {
    const client = await this.clientService.findById(account.clientId);
    account.clientNumber = client.clientNumber;
    if (client.firstName && client.lastName) {
      account.clientName = `${client.firstName} ${client.lastName}`;
    } else if (client.companyName) {
      account.clientName = client.companyName;
    }
  }

  private async findOrFail(id: string): Promise<AccountModel> {
    const account = await this.accountRepository.findById(id);
    if (!account) throw new NotFoundException(`Account ${id} not found.`);
    return account;
  }

  private static formatAccountNumber(
    type: AccountType,
    currency: AccountCurrency,
    seq: number,
  ): string {
    if (type === AccountType.SAVINGS) {
      return AccountRepository.formatSavingsNumber(seq);
    }
    return AccountRepository.formatCadecoNumber(seq, type, currency);
  }
}
