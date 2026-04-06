import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AccountService } from '../accounts/account.service';
import { ClientService } from '../clients/client.service';
import { KycStatus } from '../clients/client.enums';
import { UserModel } from '../users/user.model';
import { AccountingService } from '../accounting/accounting.service';
import { COA_CODES } from '../accounting/accounting.enums';
import { NotificationsService } from '../notifications/notifications.service';
import { LoanRepository } from './loan.repository';
import { LoanPolicy, LOAN_PRODUCTS } from './loan.policy';
import {
  LoanDocument,
  LoanModel,
  LoanPayment,
  LoanPenalty,
  LoanReminder,
  RepaymentScheduleItem,
} from './loan.model';
import {
  LoanCurrency,
  LoanStatus,
  LoanType,
  ReminderChannel,
  ReminderStatus,
  RepaymentStatus,
} from './loan.enums';
import {
  ApplyLoanDto,
  DisburseDto,
  QueryLoansDto,
  RecordPaymentDto,
  RejectLoanDto,
} from './loan.dto';

@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly accountService: AccountService,
    private readonly clientService: ClientService,
    private readonly accountingService: AccountingService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
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
    const activeCount = await this.loanRepository.countActiveByClient(
      dto.clientId,
    );
    LoanPolicy.assertCanApply(activeCount);

    // 3. Validate the selected account
    const clientAccounts = await this.accountService.findByClientId(
      dto.clientId,
    );
    const account = clientAccounts.find((a) => a.id === dto.accountId);
    if (!account) {
      throw new NotFoundException(
        'Account not found or does not belong to this client.',
      );
    }
    LoanPolicy.assertAccountEligible(account);

    // 4. Product rules
    LoanPolicy.assertAmountRange(dto.principalAmount);
    const termMonths = LoanPolicy.deriveTermMonths(dto.type, dto.termMonths);
    const product = LOAN_PRODUCTS[dto.type];

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

  async reject(
    id: string,
    dto: RejectLoanDto,
    user: UserModel,
  ): Promise<LoanModel> {
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

  async disburse(
    id: string,
    dto: DisburseDto,
    user: UserModel,
  ): Promise<LoanModel> {
    const loan = await this.findOrFail(id);

    // If the officer chose a different disbursement account, validate and apply it now.
    if (dto.accountId && dto.accountId !== loan.accountId) {
      const clientAccounts = await this.accountService.findByClientId(
        loan.clientId,
      );
      const account = clientAccounts.find((a) => a.id === dto.accountId);
      if (!account) {
        throw new NotFoundException(
          'Account not found or does not belong to this client.',
        );
      }
      LoanPolicy.assertAccountEligible(account);
      loan.accountId = dto.accountId;
    }

    try {
      loan.disburse(user.id);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    // Generate and persist repayment schedule
    const schedule = loan.computeSchedule(loan.disbursedAt!);
    await this.loanRepository.saveSchedule(schedule);

    // Credit the disbursement amount to the client's account (atomic: balance + journal)
    const { loanReceivableCode, savingsCode } = this.getCoaCodes(
      loan.type,
      loan.currency,
    );
    const disbAccount = await this.accountService.findById(loan.accountId);
    const newBalance = disbAccount.balance + loan.principalAmount;
    await this.dataSource.transaction(async (em) => {
      await this.accountService.recordBalance(loan.accountId, newBalance, em);
      await this.accountingService.postLoanDisbursementToSavings(
        loan.principalAmount,
        loan.currency,
        loanReceivableCode,
        savingsCode,
        loan.branchId,
        user.id,
        `Loan disbursement — ${loan.loanNumber}`,
        em,
      );
    });

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

    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.DEFAULTED
    ) {
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

    // Fetch assessed penalties for this installment
    const penalties = await this.loanRepository.findPenaltiesForScheduleItem(
      target.id,
    );
    const totalPenalty = penalties.reduce((sum, p) => sum + p.penaltyAmount, 0);

    // Repayment split:
    //   loanReceivableCredit = principal + assessed penalty (clears the receivable)
    //   interestCredit       = interest (goes to Interest Income)
    // Penalty income was already recognised at assessment time — not credited again here.
    const loanReceivableCredit = target.principalAmount + totalPenalty;
    const interestCredit = target.interestAmount;

    const { loanReceivableCode, interestIncomeCode, savingsCode } =
      this.getCoaCodes(loan.type, loan.currency);

    const penaltyIncomeCode =
      loan.currency === LoanCurrency.FC
        ? COA_CODES.PENALTY_INCOME_FC
        : COA_CODES.PENALTY_INCOME_USD;

    // Atomic: debit account + post journal
    const totalDebit = loanReceivableCredit + interestCredit;
    const repayAccount = await this.accountService.findById(loan.accountId);
    if (repayAccount.balance < totalDebit) {
      throw new BadRequestException(
        `Insufficient account balance for repayment. Required: ${totalDebit}, available: ${repayAccount.balance}.`,
      );
    }
    const repayNewBalance = repayAccount.balance - totalDebit;
    await this.dataSource.transaction(async (em) => {
      await this.accountService.recordBalance(
        loan.accountId,
        repayNewBalance,
        em,
      );
      await this.accountingService.postLoanRepaymentFromSavings(
        loanReceivableCredit,
        interestCredit,
        0,
        loan.currency,
        savingsCode,
        loanReceivableCode,
        interestIncomeCode,
        penaltyIncomeCode,
        loan.branchId,
        user.id,
        `Loan repayment — ${loan.loanNumber} installment #${target.installmentNumber}`,
        em,
      );
    });

    // Update domain objects
    target.markPaid();
    loan.applyPayment(target.principalAmount);

    await this.loanRepository.saveScheduleItem(target);
    await this.loanRepository.save(loan);

    // Record the payment receipt
    const payment = new LoanPayment();
    payment.id = randomUUID();
    payment.loanId = id;
    payment.scheduleId = target.id;
    payment.transactionId = null as any;
    payment.amount = loanReceivableCredit + interestCredit;
    payment.currency = loan.currency as unknown as LoanCurrency;
    payment.paymentDate = new Date();
    payment.recordedBy = user.id;
    payment.notes = dto.notes ?? null;
    payment.createdAt = new Date();
    await this.loanRepository.savePayment(payment);

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
  async processLatePenalties(): Promise<{
    processed: number;
    reminders: number;
  }> {
    const overdueItems = await this.loanRepository.findOverdueScheduleItems();
    let processed = 0;
    let reminders = 0;

    for (const item of overdueItems) {
      const loan = await this.loanRepository.findById(item.loanId);
      if (!loan) continue;

      if (!item.reminderSentAt) {
        // First overdue detection: send reminder and start penalty clock
        const contact = await this.clientService
          .getContactInfo(loan.clientId)
          .catch(() => ({
            name: null,
            phone: null,
            email: null,
          }));

        const results = await this.notificationsService.sendLoanReminder({
          loanNumber: loan.loanNumber,
          installmentNumber: item.installmentNumber,
          dueDate: item.dueDate,
          amount: item.totalAmount,
          currency: loan.currency,
          clientName: contact.name ?? undefined,
          clientPhone: contact.phone ?? undefined,
          clientEmail: contact.email ?? undefined,
        });

        const now = new Date();
        for (const result of results) {
          const reminder = new LoanReminder();
          reminder.id = randomUUID();
          reminder.loanId = loan.id;
          reminder.scheduleId = item.id;
          reminder.channel = result.channel as unknown as ReminderChannel;
          reminder.status = result.status as unknown as ReminderStatus;
          reminder.errorMessage = result.errorMessage;
          reminder.sentAt = now;
          await this.loanRepository.saveReminder(reminder);
        }

        // Start the penalty clock regardless of delivery outcome
        item.reminderSentAt = now;
        reminders++;
        item.markLate();
      } else {
        const daysSinceReminder = Math.floor(
          (Date.now() - item.reminderSentAt.getTime()) / 86_400_000,
        );

        if (daysSinceReminder >= 30) {
          // Penalty threshold reached: apply once
          const alreadyPenalised =
            await this.loanRepository.existsPenaltyForScheduleItem(item.id);
          if (!alreadyPenalised) {
            const overdueAmount = item.totalAmount - item.paidAmount;
            const penaltyAmount = LoanPolicy.computePenalty(overdueAmount);

            const penalty = new LoanPenalty();
            penalty.id = randomUUID();
            penalty.loanId = loan.id;
            penalty.scheduleId = item.id;
            penalty.penaltyRate = 0.11;
            penalty.penaltyAmount = penaltyAmount;
            penalty.appliedAt = new Date();
            penalty.createdAt = new Date();
            await this.loanRepository.savePenalty(penalty);

            // Post accounting entry at assessment time (accrual basis)
            const { loanReceivableCode } = this.getCoaCodes(
              loan.type,
              loan.currency,
            );
            const penaltyIncomeCode =
              loan.currency === LoanCurrency.FC
                ? COA_CODES.PENALTY_INCOME_FC
                : COA_CODES.PENALTY_INCOME_USD;
            try {
              await this.accountingService.postPenaltyAssessment(
                penaltyAmount,
                loan.currency,
                loanReceivableCode,
                penaltyIncomeCode,
                loan.branchId,
                loan.appliedBy,
                `Penalty on loan ${loan.loanNumber} installment #${item.installmentNumber}`,
              );
            } catch (err) {
              this.logger.error(
                `Penalty accounting failed for loan ${loan.loanNumber} installment #${item.installmentNumber}: ${(err as Error).message}`,
              );
            }

            processed++;
          }
          item.markOverdue();
        } else {
          item.markLate();
        }
      }

      await this.loanRepository.saveScheduleItem(item);
    }

    return { processed, reminders };
  }

  /**
   * Scans all schedule items due today or earlier (status PENDING or LATE) and
   * automatically debits the client's account for each, provided the balance is sufficient.
   * Items with insufficient balance are skipped and remain in their current status.
   * Call this on a daily scheduler or trigger manually via the admin endpoint.
   */
  async processScheduledRepayments(): Promise<{
    processed: number;
    skipped: number;
  }> {
    const dueItems = await this.loanRepository.findDueScheduleItems();
    let processed = 0;
    let skipped = 0;

    for (const item of dueItems) {
      const loan = await this.loanRepository.findById(item.loanId);
      if (!loan) continue;

      // Compute total due for this installment (principal + interest + any assessed penalties)
      const penalties = await this.loanRepository.findPenaltiesForScheduleItem(
        item.id,
      );
      const totalPenalty = penalties.reduce(
        (sum, p) => sum + p.penaltyAmount,
        0,
      );
      const totalDue =
        item.principalAmount + item.interestAmount + totalPenalty;

      // Check balance — skip the installment if funds are insufficient
      const clientAccounts = await this.accountService.findByClientId(
        loan.clientId,
      );
      const account = clientAccounts.find((a) => a.id === loan.accountId);
      if (!account || account.balance < totalDue) {
        skipped++;
        continue;
      }

      const { loanReceivableCode, interestIncomeCode, savingsCode } =
        this.getCoaCodes(loan.type, loan.currency);
      const penaltyIncomeCode =
        loan.currency === LoanCurrency.FC
          ? COA_CODES.PENALTY_INCOME_FC
          : COA_CODES.PENALTY_INCOME_USD;

      try {
        const autoAccount = await this.accountService.findById(loan.accountId);
        if (autoAccount.balance < totalDue) {
          skipped++;
          continue;
        }
        const autoNewBalance = autoAccount.balance - totalDue;
        await this.dataSource.transaction(async (em) => {
          await this.accountService.recordBalance(
            loan.accountId,
            autoNewBalance,
            em,
          );
          await this.accountingService.postLoanRepaymentFromSavings(
            item.principalAmount + totalPenalty,
            item.interestAmount,
            0,
            loan.currency,
            savingsCode,
            loanReceivableCode,
            interestIncomeCode,
            penaltyIncomeCode,
            loan.branchId,
            'system',
            `Auto-repayment — ${loan.loanNumber} installment #${item.installmentNumber}`,
            em,
          );
        });

        item.markPaid();
        loan.applyPayment(item.principalAmount);
        await this.loanRepository.saveScheduleItem(item);
        await this.loanRepository.save(loan);

        const payment = new LoanPayment();
        payment.id = randomUUID();
        payment.loanId = loan.id;
        payment.scheduleId = item.id;
        payment.transactionId = null as any;
        payment.amount = totalDue;
        payment.currency = loan.currency as unknown as LoanCurrency;
        payment.paymentDate = new Date();
        payment.recordedBy = 'system';
        payment.notes = 'Auto-repayment';
        payment.createdAt = new Date();
        await this.loanRepository.savePayment(payment);

        processed++;
      } catch (err) {
        this.logger.error(
          `Auto-repayment failed for loan ${loan.loanNumber} installment #${item.installmentNumber}: ${(err as Error).message}`,
        );
        skipped++;
      }
    }

    return { processed, skipped };
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async findAll(query: QueryLoansDto): Promise<LoanModel[]> {
    return this.loanRepository.findAll({
      status: query.status,
      type: query.type,
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

  private getCoaCodes(type: LoanType, currency: LoanCurrency) {
    const isFc = currency === LoanCurrency.FC;
    const loanReceivableCode = {
      [LoanType.SALARY_ADVANCE]: isFc
        ? COA_CODES.LOANS_SALARY_FC
        : COA_CODES.LOANS_SALARY_USD,
      [LoanType.PERSONAL_LOAN]: isFc
        ? COA_CODES.LOANS_ORDINARY_FC
        : COA_CODES.LOANS_ORDINARY_USD,
      [LoanType.OVERDRAFT]: isFc
        ? COA_CODES.LOANS_OVERDRAFT_FC
        : COA_CODES.LOANS_OVERDRAFT_USD,
    }[type];
    const interestIncomeCode = {
      [LoanType.SALARY_ADVANCE]: isFc
        ? COA_CODES.INTEREST_SALARY_ADVANCE_FC
        : COA_CODES.INTEREST_SALARY_ADVANCE_USD,
      [LoanType.PERSONAL_LOAN]: isFc
        ? COA_CODES.INTEREST_ORDINARY_LOAN_FC
        : COA_CODES.INTEREST_ORDINARY_LOAN_USD,
      [LoanType.OVERDRAFT]: isFc
        ? COA_CODES.INTEREST_OVERDRAFT_FC
        : COA_CODES.INTEREST_OVERDRAFT_USD,
    }[type];
    const savingsCode = isFc
      ? COA_CODES.CUSTOMER_SAVINGS_FC
      : COA_CODES.CUSTOMER_SAVINGS_USD;
    return { loanReceivableCode, interestIncomeCode, savingsCode };
  }
}
