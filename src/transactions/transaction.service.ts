import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
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
import { Currency, TransactionType } from './transaction.enums';
import { AccountService } from '../accounts/account.service';
import { AccountStatus } from '../accounts/account.enums';
import { AccountingService } from '../accounting/accounting.service';
import { COA_CODES } from '../accounting/accounting.enums';

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
    private readonly accountingService: AccountingService,
    private readonly dataSource: DataSource,
  ) {}

  private generateReference(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `TXN-${yyyymmdd}-${hex}`;
  }

  private async findOrFail(id: string): Promise<TransactionModel> {
    const tx = await this.repo.findById(id);
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    return tx;
  }

  async deposit(dto: DepositDto): Promise<TransactionModel> {
    // ── Pre-flight (outside DB transaction — read-only) ───────────────────────
    const account = await this.accountService.findById(dto.accountId);
    if (
      account.status === AccountStatus.SUSPENDED ||
      account.status === AccountStatus.CLOSED ||
      account.status === AccountStatus.DORMANT
    ) {
      throw new BadRequestException(
        `Account is ${account.status.toLowerCase()} and cannot accept deposits.`,
      );
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

    // ── Atomic persistence ────────────────────────────────────────────────────
    await this.dataSource.transaction(async (em) => {
      await this.repo.save(tx, em);
      await this.accountService.recordBalance(dto.accountId, newBalance, em);
      const tellerCode =
        dto.currency === 'FC' ? COA_CODES.TELLER_FC : COA_CODES.TELLER_USD;
      const savingsCode =
        dto.currency === 'FC'
          ? COA_CODES.CUSTOMER_SAVINGS_FC
          : COA_CODES.CUSTOMER_SAVINGS_USD;
      await this.accountingService.postDeposit(
        dto.amount,
        dto.currency,
        tellerCode,
        savingsCode,
        dto.branchId,
        dto.performedBy,
        dto.accountId,
        dto.description,
        em,
      );
    });

    return tx;
  }

  async withdraw(dto: WithdrawalDto): Promise<TransactionModel> {
    // ── Pre-flight ────────────────────────────────────────────────────────────
    const account = await this.accountService.findById(dto.accountId);
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Account is ${account.status.toLowerCase()} and cannot process withdrawals.`,
      );
    }

    if (dto.accountType === 'BUSINESS') {
      TransactionPolicy.assertSignaturePolicy(dto.accountType, dto.accountId);
    }

    const balance = await this.repo.getBalance(dto.accountId);
    TransactionPolicy.assertSufficientBalance(
      balance,
      dto.amount,
      dto.accountId,
    );

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

    // ── Atomic persistence ────────────────────────────────────────────────────
    await this.dataSource.transaction(async (em) => {
      await this.repo.save(tx, em);
      await this.accountService.recordBalance(dto.accountId, newBalance, em);
      const tellerCode =
        dto.currency === 'FC' ? COA_CODES.TELLER_FC : COA_CODES.TELLER_USD;
      const savingsCode =
        dto.currency === 'FC'
          ? COA_CODES.CUSTOMER_SAVINGS_FC
          : COA_CODES.CUSTOMER_SAVINGS_USD;
      await this.accountingService.postWithdrawal(
        dto.amount,
        dto.currency,
        tellerCode,
        savingsCode,
        dto.branchId,
        dto.performedBy,
        dto.accountId,
        dto.description,
        em,
      );
    });

    return tx;
  }

  async internalTransfer(dto: InternalTransferDto): Promise<TransferResult> {
    // ── Pre-flight ────────────────────────────────────────────────────────────
    const source = await this.accountService.findById(dto.sourceAccountId);
    if (source.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Source account is ${source.status.toLowerCase()} and cannot process transfers.`,
      );
    }
    const dest = await this.accountService.findById(dto.destinationAccountId);
    if (dest.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Destination account is ${dest.status.toLowerCase()} and cannot receive transfers.`,
      );
    }

    const sourceBalance = await this.repo.getBalance(dto.sourceAccountId);
    TransactionPolicy.assertSufficientBalance(
      sourceBalance,
      dto.amount,
      dto.sourceAccountId,
    );

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

    // ── Atomic persistence ────────────────────────────────────────────────────
    await this.dataSource.transaction(async (em) => {
      await this.repo.save(debit, em);
      await this.repo.save(credit, em);
      await this.repo.saveTransfer(transfer, em);
      await this.accountService.recordBalance(
        dto.sourceAccountId,
        sourceNewBalance,
        em,
      );
      await this.accountService.recordBalance(
        dto.destinationAccountId,
        destNewBalance,
        em,
      );
      const srcSavingsCode =
        dto.currency === 'FC'
          ? COA_CODES.CUSTOMER_SAVINGS_FC
          : COA_CODES.CUSTOMER_SAVINGS_USD;
      await this.accountingService.postWithdrawal(
        dto.amount,
        dto.currency,
        srcSavingsCode,
        srcSavingsCode,
        dto.branchId,
        dto.performedBy,
        dto.sourceAccountId,
        dto.description,
        em,
      );
    });

    return { debit, credit, transfer };
  }

  async externalTransfer(
    dto: ExternalTransferDto,
  ): Promise<ExternalTransferResult> {
    // ── Pre-flight ────────────────────────────────────────────────────────────
    const account = await this.accountService.findById(dto.sourceAccountId);
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Account is ${account.status.toLowerCase()} and cannot process transfers.`,
      );
    }

    const balance = await this.repo.getBalance(dto.sourceAccountId);
    const feeAmount = Math.round(dto.amount * 0.01 * 10000) / 10000;
    const totalDebit = dto.amount + feeAmount;

    TransactionPolicy.assertSufficientBalance(
      balance,
      totalDebit,
      dto.sourceAccountId,
    );

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

    // ── Atomic persistence ────────────────────────────────────────────────────
    await this.dataSource.transaction(async (em) => {
      await this.repo.save(debit, em);
      await this.repo.save(fee, em);
      await this.repo.saveTransfer(transfer, em);
      await this.accountService.recordBalance(
        dto.sourceAccountId,
        balanceAfterFee,
        em,
      );
      const extTellerCode =
        dto.currency === 'FC' ? COA_CODES.TELLER_FC : COA_CODES.TELLER_USD;
      const extSavingsCode =
        dto.currency === 'FC'
          ? COA_CODES.CUSTOMER_SAVINGS_FC
          : COA_CODES.CUSTOMER_SAVINGS_USD;
      await this.accountingService.postWithdrawal(
        dto.amount,
        dto.currency,
        extTellerCode,
        extSavingsCode,
        dto.branchId,
        dto.performedBy,
        dto.sourceAccountId,
        dto.description,
        em,
      );
      if (feeAmount > 0) {
        const feeCode =
          dto.currency === 'FC'
            ? COA_CODES.FEE_INCOME_FC
            : COA_CODES.FEE_INCOME_USD;
        await this.accountingService.postExpense(
          feeAmount,
          dto.currency,
          feeCode,
          extTellerCode,
          dto.branchId,
          dto.performedBy,
          `Transfer fee for external transfer`,
          em,
        );
      }
    });

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

  // ---------------------------------------------------------------------------
  // Loan operations
  // ---------------------------------------------------------------------------

  /**
   * Credits the loan principal into the client's account and writes the
   * corresponding journal entry atomically.
   * DR Loan Receivable / CR Customer Savings
   */
  async loanDisbursement(params: {
    accountId: string;
    branchId: string;
    amount: number;
    currency: Currency;
    performedBy: string;
    loanReceivableCode: string;
    savingsCode: string;
    description?: string;
  }): Promise<TransactionModel> {
    const balance = await this.repo.getBalance(params.accountId);
    const newBalance = balance + params.amount;

    const tx = TransactionModel.create({
      id: randomUUID(),
      accountId: params.accountId,
      branchId: params.branchId,
      type: TransactionType.LOAN_DISBURSEMENT,
      amount: params.amount,
      currency: params.currency,
      balanceAfter: newBalance,
      reference: this.generateReference(),
      description: params.description ?? 'Loan disbursement',
      performedBy: params.performedBy,
      createdAt: new Date(),
    });

    await this.dataSource.transaction(async (em) => {
      await this.repo.save(tx, em);
      await this.accountService.recordBalance(params.accountId, newBalance, em);
      await this.accountingService.postLoanDisbursementToSavings(
        params.amount,
        params.currency,
        params.loanReceivableCode,
        params.savingsCode,
        params.branchId,
        params.performedBy,
        params.accountId,
        params.description,
        em,
      );
    });

    return tx;
  }

  /**
   * Debits the repayment amount from the client's account and posts the
   * corresponding journal entry atomically.
   *
   * Repayment priority (already computed by the caller):
   *   loanReceivableCredit = principal + any assessed penalty (clears the receivable)
   *   interestCredit       = interest portion (goes to Interest Income)
   *
   * Journal: DR Customer Savings (total) / CR Loan Receivable / CR Interest Income
   *
   * Note: penalty income was recognised at assessment time
   * (postPenaltyAssessment) so it is NOT credited again here.
   */
  async loanRepayment(params: {
    accountId: string;
    branchId: string;
    loanReceivableCredit: number;
    interestCredit: number;
    currency: Currency;
    performedBy: string;
    loanReceivableCode: string;
    interestIncomeCode: string;
    savingsCode: string;
    penaltyIncomeCode: string;   // required by postLoanRepaymentFromSavings
    description?: string;
  } & { currency: Currency }): Promise<TransactionModel> {
    const totalDebit = params.loanReceivableCredit + params.interestCredit;

    const balance = await this.repo.getBalance(params.accountId);
    if (balance < totalDebit) {
      throw new BadRequestException(
        `Insufficient account balance for repayment. Required: ${totalDebit}, available: ${balance}.`,
      );
    }

    const newBalance = balance - totalDebit;

    const tx = TransactionModel.create({
      id: randomUUID(),
      accountId: params.accountId,
      branchId: params.branchId,
      type: TransactionType.LOAN_REPAYMENT,
      amount: totalDebit,
      currency: params.currency,
      balanceAfter: newBalance,
      reference: this.generateReference(),
      description: params.description ?? 'Loan repayment',
      performedBy: params.performedBy,
      createdAt: new Date(),
    });

    await this.dataSource.transaction(async (em) => {
      await this.repo.save(tx, em);
      await this.accountService.recordBalance(params.accountId, newBalance, em);
      // Pass loanReceivableCredit as "principal" — this clears the principal
      // + any assessed penalty from Loan Receivable.
      // penaltyAmount is 0 because penalty income was already recognised at assessment.
      await this.accountingService.postLoanRepaymentFromSavings(
        params.loanReceivableCredit,
        params.interestCredit,
        0,
        params.currency,
        params.savingsCode,
        params.loanReceivableCode,
        params.interestIncomeCode,
        params.penaltyIncomeCode,
        params.branchId,
        params.performedBy,
        params.accountId,
        params.description,
        em,
      );
    });

    return tx;
  }
}
