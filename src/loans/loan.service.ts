import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AccountService } from '../accounts/account.service';
import { ClientService } from '../clients/client.service';
import { KycStatus } from '../clients/client.enums';
import { UserModel } from '../users/user.model';
import { LoanRepository } from './loan.repository';
import { LoanPolicy, LOAN_PRODUCTS } from './loan.policy';
import {
  LoanDocument,
  LoanModel,
  LoanPayment,
  LoanPenalty,
  RepaymentScheduleItem,
} from './loan.model';
import { LoanCurrency, LoanStatus, RepaymentStatus } from './loan.enums';
import {
  ApplyLoanDto,
  QueryLoansDto,
  RecordPaymentDto,
  RejectLoanDto,
} from './loan.dto';

@Injectable()
export class LoanService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly accountService: AccountService,
    private readonly clientService: ClientService,
  ) {}

  // ---------------------------------------------------------------------------
  // Application
  // ---------------------------------------------------------------------------

  async apply(dto: ApplyLoanDto, user: UserModel): Promise<LoanModel> {
    // 1. Validate client KYC
    const client = await this.clientService.findById(dto.clientId);
    if (client.kycStatus !== KycStatus.APPROVED) {
      throw new BadRequestException(
        `Client KYC must be APPROVED to apply for a loan. Current status: ${client.kycStatus}.`,
      );
    }

    // 2. Check active loan count
    const activeCount = await this.loanRepository.countActiveByClient(dto.clientId);
    LoanPolicy.assertCanApply(activeCount);

    // 3. Validate the selected account
    const clientAccounts = await this.accountService.findByClientId(dto.clientId);
    const account = clientAccounts.find((a) => a.id === dto.accountId);
    if (!account) {
      throw new NotFoundException('Account not found or does not belong to this client.');
    }
    LoanPolicy.assertAccountEligible(account);

    // 4. Product rules
    LoanPolicy.assertAmountRange(dto.principalAmount);
    const termMonths = LoanPolicy.deriveTermMonths(dto.type, dto.termMonths);
    const product = LOAN_PRODUCTS[dto.type];
    const formFee = LoanPolicy.deriveFormFee(dto.type, dto.currency);

    // 5. Generate loan number
    const loanNumber = await this.loanRepository.nextLoanNumber();

    // 6. Create domain object
    const loan = new LoanModel({
      id: randomUUID(),
      loanNumber,
      clientId: dto.clientId,
      accountId: dto.accountId,
      branchId: user.branchId!,
      type: dto.type,
      currency: dto.currency,
      principalAmount: dto.principalAmount,
      outstandingBalance: 0,
      interestRate: product.monthlyRate,
      termMonths,
      formFee,
      purpose: dto.purpose,
      status: LoanStatus.PENDING,
      appliedBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.loanRepository.save(loan);

    // 7. Persist loan documents
    for (const d of dto.documents) {
      const doc = new LoanDocument();
      doc.id = randomUUID();
      doc.loanId = loan.id;
      doc.documentType = d.documentType;
      doc.fileName = d.fileName;
      doc.fileUrl = d.fileUrl;
      doc.uploadedBy = user.id;
      doc.uploadedAt = new Date();
      await this.loanRepository.saveDocument(doc);
    }

    return loan;
  }

  // ---------------------------------------------------------------------------
  // Officer review
  // ---------------------------------------------------------------------------

  async approve(id: string, user: UserModel): Promise<LoanModel> {
    const loan = await this.findOrFail(id);
    try {
      loan.approve(user.id);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.loanRepository.save(loan);
    return loan;
  }

  async reject(id: string, dto: RejectLoanDto, user: UserModel): Promise<LoanModel> {
    const loan = await this.findOrFail(id);
    try {
      loan.reject(user.id, dto.reason);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.loanRepository.save(loan);
    return loan;
  }

  // ---------------------------------------------------------------------------
  // Disbursement
  // ---------------------------------------------------------------------------

  async disburse(id: string, user: UserModel): Promise<LoanModel> {
    const loan = await this.findOrFail(id);
    try {
      loan.disburse(user.id);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    // Generate and persist repayment schedule
    const schedule = loan.computeSchedule(loan.disbursedAt!);
    await this.loanRepository.saveSchedule(schedule);

    // Credit the disbursement amount to the client's account
    // TODO: also create a LOAN_DISBURSEMENT transaction record in the ledger
    await this.accountService.credit(loan.accountId, loan.principalAmount);

    await this.loanRepository.save(loan);
    return loan;
  }

  // ---------------------------------------------------------------------------
  // Repayment
  // ---------------------------------------------------------------------------

  async recordPayment(
    id: string,
    dto: RecordPaymentDto,
    user: UserModel,
  ): Promise<LoanModel> {
    const loan = await this.findOrFail(id);

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.DEFAULTED) {
      throw new BadRequestException(
        `Payments can only be recorded on ACTIVE loans. Current status: ${loan.status}.`,
      );
    }

    const allItems = await this.loanRepository.findScheduleByLoanId(id);

    let target: RepaymentScheduleItem | undefined;
    if (dto.scheduleId) {
      target = allItems.find(
        (i) => i.id === dto.scheduleId && i.status !== RepaymentStatus.PAID,
      );
      if (!target) {
        throw new NotFoundException('Schedule item not found or already paid.');
      }
    } else {
      target = allItems
        .filter((i) => i.status !== RepaymentStatus.PAID)
        .sort((a, b) => a.installmentNumber - b.installmentNumber)[0];
      if (!target) {
        throw new BadRequestException('All installments are already paid.');
      }
    }

    target.markPaid();
    loan.applyPayment(target.principalAmount);

    // Save the updated schedule item and loan
    await this.loanRepository.saveScheduleItem(target);
    await this.loanRepository.save(loan);

    // Record the payment receipt
    const payment = new LoanPayment();
    payment.id = randomUUID();
    payment.loanId = id;
    payment.scheduleId = target.id;
    payment.amount = dto.amount;
    payment.currency = loan.currency as unknown as LoanCurrency;
    payment.paymentDate = new Date();
    payment.recordedBy = user.id;
    payment.notes = dto.notes ?? null;
    payment.createdAt = new Date();
    await this.loanRepository.savePayment(payment);

    // TODO: create LOAN_REPAYMENT transaction record in the ledger

    return loan;
  }

  // ---------------------------------------------------------------------------
  // Late payment & penalty processing
  // ---------------------------------------------------------------------------

  /**
   * Scans all overdue schedule items and applies the 11 % penalty to those
   * that are â‰¥ 30 days past their due date (only once per installment).
   * Items 1â€“29 days overdue are marked LATE with no penalty.
   * Call this on a scheduler (e.g. daily cron) or trigger manually via the admin endpoint.
   */
  async processLatePenalties(): Promise<{ processed: number }> {
    const overdueItems = await this.loanRepository.findOverdueScheduleItems();
    let processed = 0;

    for (const item of overdueItems) {
      if (item.daysOverdue() >= 30) {
        // Penalty applied only once
        const alreadyPenalised = await this.loanRepository.existsPenaltyForScheduleItem(item.id);
        if (!alreadyPenalised) {
          const overdueAmount = item.totalAmount - item.paidAmount;
          const penaltyAmount = LoanPolicy.computePenalty(overdueAmount);

          const penalty = new LoanPenalty();
          penalty.id = randomUUID();
          penalty.loanId = item.loanId;
          penalty.scheduleId = item.id;
          penalty.penaltyRate = 0.11;
          penalty.penaltyAmount = penaltyAmount;
          penalty.appliedAt = new Date();
          penalty.createdAt = new Date();

          await this.loanRepository.savePenalty(penalty);
          processed++;
        }
        item.markOverdue();
      } else {
        item.markLate();
      }
      await this.loanRepository.saveScheduleItem(item);
    }

    return { processed };
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async findAll(query: QueryLoansDto): Promise<LoanModel[]> {
    return this.loanRepository.findAll({
      status: query.status,
      clientId: query.clientId,
    });
  }

  async findById(id: string): Promise<LoanModel> {
    return this.findOrFail(id);
  }

  async getSchedule(id: string): Promise<RepaymentScheduleItem[]> {
    await this.findOrFail(id);
    return this.loanRepository.findScheduleByLoanId(id);
  }

  async getPayments(id: string): Promise<LoanPayment[]> {
    await this.findOrFail(id);
    return this.loanRepository.findPaymentsByLoanId(id);
  }

  async getPenalties(id: string): Promise<LoanPenalty[]> {
    await this.findOrFail(id);
    return this.loanRepository.findPenaltiesByLoanId(id);
  }

  async getDocuments(id: string): Promise<LoanDocument[]> {
    await this.findOrFail(id);
    return this.loanRepository.findDocumentsByLoanId(id);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async findOrFail(id: string): Promise<LoanModel> {
    const loan = await this.loanRepository.findById(id);
    if (!loan) throw new NotFoundException(`Loan ${id} not found.`);
    return loan;
  }
}
