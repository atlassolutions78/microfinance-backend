import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import {
  DepositDto,
  ExternalTransferDto,
  InternalTransferDto,
  WithdrawalDto,
} from './transaction.dto';
import { TransactionModel } from './transaction.model';
import { TransferModel } from './transfer.model';
import { TransactionRepository } from './transaction.repository';
import { TransactionPolicy } from './transaction.policy';
import { TransactionType } from './transaction.enums';
import { AccountService } from '../accounts/account.service';
import { AccountStatus } from '../accounts/account.enums';

export interface TransferResult {
  debit: TransactionModel;
  credit: TransactionModel;
  transfer: TransferModel;
}

export interface ExternalTransferResult {
  debit: TransactionModel;
  fee: TransactionModel;
  transfer: TransferModel;
}

@Injectable()
export class TransactionService {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly accountService: AccountService,
  ) {}

  private generateReference(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `TXN-${yyyymmdd}-${hex}`;
  }

  private async findOrFail(id: string): Promise<TransactionModel> {
    const tx = await this.repo.findById(id);
    if (!tx) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return tx;
  }

  async deposit(dto: DepositDto): Promise<TransactionModel> {
    const account = await this.accountService.findById(dto.accountId);
    if (account.status === AccountStatus.SUSPENDED || account.status === AccountStatus.CLOSED || account.status === AccountStatus.DORMANT) {
      throw new BadRequestException(`Account is ${account.status.toLowerCase()} and cannot accept deposits.`);
    }

    const balance = await this.repo.getBalance(dto.accountId);
    const newBalance = balance + dto.amount;

    const tx = TransactionModel.create({
      id: randomUUID(),
      accountId: dto.accountId,
      branchId: dto.branchId,
      type: TransactionType.DEPOSIT,
      amount: dto.amount,
      currency: dto.currency,
      balanceAfter: newBalance,
      reference: this.generateReference(),
      description: dto.description,
      performedBy: dto.performedBy,
      createdAt: new Date(),
    });

    await this.repo.save(tx);
    await this.accountService.recordBalance(dto.accountId, newBalance);

    return tx;
  }

  async withdraw(dto: WithdrawalDto): Promise<TransactionModel> {
    const account = await this.accountService.findById(dto.accountId);
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`Account is ${account.status.toLowerCase()} and cannot process withdrawals.`);
    }

    if (dto.accountType === 'BUSINESS') {
      TransactionPolicy.assertSignaturePolicy(dto.accountType, dto.accountId);
    }

    const balance = await this.repo.getBalance(dto.accountId);
    TransactionPolicy.assertSufficientBalance(balance, dto.amount, dto.accountId);

    const newBalance = balance - dto.amount;

    const tx = TransactionModel.create({
      id: randomUUID(),
      accountId: dto.accountId,
      branchId: dto.branchId,
      type: TransactionType.WITHDRAWAL,
      amount: dto.amount,
      currency: dto.currency,
      balanceAfter: newBalance,
      reference: this.generateReference(),
      description: dto.description,
      performedBy: dto.performedBy,
      createdAt: new Date(),
    });

    await this.repo.save(tx);
    await this.accountService.recordBalance(dto.accountId, newBalance);

    return tx;
  }

  async internalTransfer(dto: InternalTransferDto): Promise<TransferResult> {
    const source = await this.accountService.findById(dto.sourceAccountId);
    if (source.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`Source account is ${source.status.toLowerCase()} and cannot process transfers.`);
    }
    const dest = await this.accountService.findById(dto.destinationAccountId);
    if (dest.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`Destination account is ${dest.status.toLowerCase()} and cannot receive transfers.`);
    }

    const sourceBalance = await this.repo.getBalance(dto.sourceAccountId);
    TransactionPolicy.assertSufficientBalance(sourceBalance, dto.amount, dto.sourceAccountId);

    const destBalance = await this.repo.getBalance(dto.destinationAccountId);
    const sourceNewBalance = sourceBalance - dto.amount;
    const destNewBalance = destBalance + dto.amount;

    const debit = TransactionModel.create({
      id: randomUUID(),
      accountId: dto.sourceAccountId,
      branchId: dto.branchId,
      type: TransactionType.TRANSFER_OUT,
      amount: dto.amount,
      currency: dto.currency,
      balanceAfter: sourceNewBalance,
      reference: this.generateReference(),
      description: dto.description,
      performedBy: dto.performedBy,
      createdAt: new Date(),
    });

    const credit = TransactionModel.create({
      id: randomUUID(),
      accountId: dto.destinationAccountId,
      branchId: dto.branchId,
      type: TransactionType.TRANSFER_IN,
      amount: dto.amount,
      currency: dto.currency,
      balanceAfter: destNewBalance,
      reference: this.generateReference(),
      description: dto.description,
      performedBy: dto.performedBy,
      createdAt: new Date(),
    });

    const transfer = new TransferModel({
      id: randomUUID(),
      debitTransactionId: debit.id,
      creditTransactionId: credit.id,
      isInternal: true,
      recipientName: undefined,
      feeAmount: 0,
      claimReference: undefined,
    });

    await this.repo.save(debit);
    await this.repo.save(credit);
    await this.repo.saveTransfer(transfer);
    await this.accountService.recordBalance(dto.sourceAccountId, sourceNewBalance);
    await this.accountService.recordBalance(dto.destinationAccountId, destNewBalance);

    return { debit, credit, transfer };
  }

  async externalTransfer(dto: ExternalTransferDto): Promise<ExternalTransferResult> {
    const account = await this.accountService.findById(dto.sourceAccountId);
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`Account is ${account.status.toLowerCase()} and cannot process transfers.`);
    }

    const balance = await this.repo.getBalance(dto.sourceAccountId);
    const feeAmount = Math.round(dto.amount * 0.01 * 10000) / 10000;
    const totalDebit = dto.amount + feeAmount;

    TransactionPolicy.assertSufficientBalance(balance, totalDebit, dto.sourceAccountId);

    const balanceAfterPrincipal = balance - dto.amount;
    const balanceAfterFee = balanceAfterPrincipal - feeAmount;

    const debit = TransactionModel.create({
      id: randomUUID(),
      accountId: dto.sourceAccountId,
      branchId: dto.branchId,
      type: TransactionType.TRANSFER_OUT,
      amount: dto.amount,
      currency: dto.currency,
      balanceAfter: balanceAfterPrincipal,
      reference: this.generateReference(),
      description: dto.description,
      performedBy: dto.performedBy,
      createdAt: new Date(),
    });

    const fee = TransactionModel.create({
      id: randomUUID(),
      accountId: dto.sourceAccountId,
      branchId: dto.branchId,
      type: TransactionType.FEE,
      amount: feeAmount,
      currency: dto.currency,
      balanceAfter: balanceAfterFee,
      reference: this.generateReference(),
      description: `Transfer fee for ${debit.reference}`,
      performedBy: dto.performedBy,
      createdAt: new Date(),
    });

    const transfer = new TransferModel({
      id: randomUUID(),
      debitTransactionId: debit.id,
      creditTransactionId: undefined,
      isInternal: false,
      recipientName: dto.recipientName,
      feeAmount,
      claimReference: dto.claimReference,
    });

    await this.repo.save(debit);
    await this.repo.save(fee);
    await this.repo.saveTransfer(transfer);
    await this.accountService.recordBalance(dto.sourceAccountId, balanceAfterFee);

    return { debit, fee, transfer };
  }

  async findByAccount(accountId: string): Promise<TransactionModel[]> {
    return this.repo.findByAccountId(accountId);
  }

  async findById(id: string): Promise<TransactionModel> {
    return this.findOrFail(id);
  }

  async findTransferByTransaction(txId: string): Promise<TransferModel | null> {
    return this.repo.findTransferByDebitId(txId);
  }

  async findAll(): Promise<TransactionModel[]> {
    return this.repo.findAll();
  }
}
