import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { SequenceService } from '../sequences/sequence.service';
import { TellerRepository } from './teller.repository';
import { TellerPolicy } from './teller.policy';
import { TellerSessionModel } from './teller-session.model';
import {
  BranchCoaAccountEntity,
  SessionDenominationEntity,
  TellerCoaAccountEntity,
  TellerTransactionEntity,
} from './teller.entity';
import {
  TellerSessionStatus,
  TellerTxType,
  DenominationType,
} from './teller.enums';
import {
  SessionDenominationRecord,
  TellerTransactionRecord,
} from './teller.mapper';
import {
  RequestSessionDto,
  ApproveSessionDto,
  DenominationEntryDto,
  SubmitEodDto,
  TellerDepositDto,
  TellerWithdrawalDto,
  TellerTransferDto,
  DepositPreviewQuery,
  WithdrawalPreviewQuery,
  TransferPreviewQuery,
  ListSessionsQueryDto,
} from './teller.dto';
import { AccountService } from '../accounts/account.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountStatus } from '../accounts/account.enums';
import { AccountTxModel } from './account-tx.model';
import { AccountTxType, Currency } from './teller.enums';
import { COA_CODES } from '../accounting/accounting.enums';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';

export interface SessionWithTransactions {
  session: TellerSessionModel;
  transactions: TellerTransactionRecord[];
  denominations: SessionDenominationRecord[];
}

export interface WithdrawalPreview {
  account: {
    id: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    status: string;
    currentBalance: string;
    balanceAfter: string;
    clientId: string;
    clientName?: string;
    clientNumber?: string;
  };
  journalEntry: {
    debit: { code: string; name: string; amount: string; currency: string };
    credit: { code: string; name: string; amount: string; currency: string };
  };
  tellerCashPosition: {
    currentFC: string;
    currentUSD: string;
  };
}

export interface TransferPreview {
  source: {
    id: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    status: string;
    currentBalance: string;
    balanceAfter: string;
    clientId: string;
    clientName?: string;
    clientNumber?: string;
  };
  destination: {
    id: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    status: string;
    currentBalance: string;
    balanceAfter: string;
    clientId: string;
    clientName?: string;
    clientNumber?: string;
  };
  journalEntry: {
    debit: { code: string; name: string; amount: string; currency: string };
    credit: { code: string; name: string; amount: string; currency: string };
  };
}

export interface DepositPreview {
  account: {
    id: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    status: string;
    currentBalance: string;
    balanceAfter: string;
    clientId: string;
    clientName?: string;
    clientNumber?: string;
  };
  journalEntry: {
    debit: { code: string; name: string; amount: string; currency: string };
    credit: { code: string; name: string; amount: string; currency: string };
  };
  tellerCashPosition: {
    currentFC: string;
    currentUSD: string;
  };
}

@Injectable()
export class TellerService {
  constructor(
    private readonly repo: TellerRepository,
    private readonly accountService: AccountService,
    private readonly accountingService: AccountingService,
    private readonly sequenceService: SequenceService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Float request ────────────────────────────────────────────────────────────

  async requestSession(
    dto: RequestSessionDto,
    user: UserModel,
  ): Promise<TellerSessionModel> {
    if (!user.branchId) {
      throw new BadRequestException('User has no assigned branch.');
    }

    TellerPolicy.assertIsTeller(user.role);
    TellerPolicy.assertValidFloatRequest(
      dto.requestedAmountFC,
      dto.requestedAmountUSD,
    );

    const today = this.todayDate();
    // TODO: re-enable before production
    // const existing = await this.repo.findSessionByTellerAndDate(user.id, today);
    // TellerPolicy.assertNoDuplicateSession(!!existing);

    // Provision branch and teller COA accounts lazily on first session
    await this.ensureBranchCoaAccounts(user.branchId, user.id);
    const tellerName = `${user.firstName} ${user.lastName}`;
    await this.ensureTellerCoaAccounts(
      user.id,
      tellerName,
      user.branchId,
      user.id,
    );

    const sessionNumber = await this.sequenceService.nextReference(user.branchId, 'SES');

    const session = new TellerSessionModel({
      id: randomUUID(),
      tellerId: user.id,
      branchId: user.branchId,
      sessionNumber,
      date: today,
      status: TellerSessionStatus.REQUESTED,
      requestedAmountFC: new Decimal(dto.requestedAmountFC).toFixed(2),
      requestedAmountUSD: new Decimal(dto.requestedAmountUSD).toFixed(2),
      approvedAmountFC: '0.00',
      approvedAmountUSD: '0.00',
      approvedBy: undefined,
      approvedAt: undefined,
      openingCashFC: '0.00',
      openingCashUSD: '0.00',
      cashInFC: '0.00',
      cashInUSD: '0.00',
      cashOutFC: '0.00',
      cashOutUSD: '0.00',
      declaredClosingCashFC: undefined,
      declaredClosingCashUSD: undefined,
      submittedAt: undefined,
      reconciledBy: undefined,
      reconciledAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repo.saveSession(session);
    return session;
  }

  // ── Approval ─────────────────────────────────────────────────────────────────

  async approveSession(
    sessionId: string,
    dto: ApproveSessionDto,
    manager: UserModel,
  ): Promise<TellerSessionModel> {
    if (!manager.branchId) {
      throw new BadRequestException('Manager has no assigned branch.');
    }

    TellerPolicy.assertIsBranchManager(manager.role);

    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionInBranch(session.branchId, manager.branchId);

    session.approve(manager.id, dto.approvedAmountFC, dto.approvedAmountUSD);

    const coaAccounts = await this.repo.findCoaAccounts(session.tellerId);
    if (!coaAccounts) {
      throw new BadRequestException(
        'Teller COA accounts not found. The teller must request a session first.',
      );
    }

    const branchCoa = await this.repo.findBranchCoaAccounts(session.branchId);
    if (!branchCoa) {
      throw new BadRequestException(
        'Branch COA accounts not found. The branch must be provisioned before approving sessions.',
      );
    }

    const denominationEntities = this.buildDenominationEntities(
      sessionId,
      DenominationType.FLOAT_APPROVAL,
      dto.denominationsFC,
      dto.denominationsUSD,
    );

    await this.dataSource.transaction(async (em) => {
      await this.repo.saveSession(session, em);
      await this.accountingService.postTellerFloatApproval(
        dto.approvedAmountFC,
        dto.approvedAmountUSD,
        coaAccounts.fc_account_code,
        coaAccounts.usd_account_code,
        branchCoa.vault_fc_code,
        branchCoa.vault_usd_code,
        session.branchId,
        manager.id,
        `Float approval for session ${sessionId}`,
        em,
      );
      await this.repo.saveDenominations(denominationEntities, em);
    });

    return session;
  }

  // ── Open ─────────────────────────────────────────────────────────────────────

  async openSession(
    sessionId: string,
    user: UserModel,
  ): Promise<TellerSessionModel> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, user.id);
    session.open();
    await this.repo.saveSession(session);
    return session;
  }

  // ── Deposit preview ──────────────────────────────────────────────────────────

  async depositPreview(
    sessionId: string,
    query: DepositPreviewQuery,
    teller: UserModel,
  ): Promise<DepositPreview> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    const account = await this.accountService.findByIdEnriched(query.accountId);
    if (
      account.status === AccountStatus.SUSPENDED ||
      account.status === AccountStatus.CLOSED ||
      account.status === AccountStatus.DORMANT
    ) {
      throw new BadRequestException(
        `Account is ${account.status.toLowerCase()} and cannot accept deposits.`,
      );
    }

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const currency = query.currency;
    const tellerCode =
      currency === Currency.FC
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const clientCoaCode = TellerPolicy.clientSavingsCode(
      account.accountType,
      account.currency,
    );

    const [tellerCoa, clientCoa] = await Promise.all([
      this.accountingService.findChartAccountByCode(tellerCode),
      this.accountingService.findChartAccountByCode(clientCoaCode),
    ]);

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        status: account.status,
        currentBalance: account.balance,
        balanceAfter: new Decimal(account.balance).plus(query.amount).toFixed(2),
        clientId: account.clientId,
        clientName: account.clientName,
        clientNumber: account.clientNumber,
      },
      journalEntry: {
        debit: {
          code: tellerCoa.code,
          name: tellerCoa.name,
          amount: new Decimal(query.amount).toFixed(2),
          currency,
        },
        credit: {
          code: clientCoa.code,
          name: clientCoa.name,
          amount: new Decimal(query.amount).toFixed(2),
          currency,
        },
      },
      tellerCashPosition: {
        currentFC: session.expectedClosingCashFC,
        currentUSD: session.expectedClosingCashUSD,
      },
    };
  }

  // ── Deposit ──────────────────────────────────────────────────────────────────

  async deposit(
    sessionId: string,
    dto: TellerDepositDto,
    teller: UserModel,
  ): Promise<AccountTxModel> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

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

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const currency = dto.currency;
    const tellerCode =
      currency === Currency.FC
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const clientCoaCode = TellerPolicy.clientSavingsCode(
      account.accountType,
      account.currency,
    );

    const balance = account.balance;
    const newBalance = new Decimal(balance).plus(dto.amount).toFixed(2);
    const reference = await this.sequenceService.nextReference(session.branchId, 'TLR');

    const tx = AccountTxModel.create({
      id: randomUUID(),
      accountId: dto.accountId,
      branchId: session.branchId,
      type: AccountTxType.DEPOSIT,
      amount: new Decimal(dto.amount).toFixed(4),
      currency: dto.currency,
      balanceAfter: newBalance,
      reference,
      description: dto.description,
      performedBy: teller.id,
      createdAt: new Date(),
    });

    await this.dataSource.transaction(async (em) => {
      await this.repo.saveAccountTx(tx, em);
      await this.accountService.recordBalance(dto.accountId, newBalance, em);
      await this.accountingService.postDeposit(
        dto.amount,
        currency,
        tellerCode,
        clientCoaCode,
        session.branchId,
        teller.id,
        dto.description,
        em,
        tx.id,
      );
      session.recordCashMovement(TellerTxType.DEPOSIT, dto.amount, currency);
      await this.repo.saveSession(session, em);
      await this.saveTellerTx(
        { sessionId, type: TellerTxType.DEPOSIT, dto, reference },
        em,
      );
    });

    return tx;
  }

  // ── Withdrawal preview ───────────────────────────────────────────────────────

  async withdrawalPreview(
    sessionId: string,
    query: WithdrawalPreviewQuery,
    teller: UserModel,
  ): Promise<WithdrawalPreview> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    const currency = query.currency;
    session.assertHasCashFor(query.amount, currency);

    const account = await this.accountService.findByIdEnriched(query.accountId);
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Account is ${account.status.toLowerCase()} and cannot process withdrawals.`,
      );
    }

    if (new Decimal(account.balance).lessThan(query.amount)) {
      throw new BadRequestException(
        `Insufficient account balance. Available: ${account.balance}, requested: ${query.amount}`,
      );
    }

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const tellerCode =
      currency === Currency.FC
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const clientCoaCode = TellerPolicy.clientSavingsCode(
      account.accountType,
      account.currency,
    );

    const [clientCoa, tellerCoa] = await Promise.all([
      this.accountingService.findChartAccountByCode(clientCoaCode),
      this.accountingService.findChartAccountByCode(tellerCode),
    ]);

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        status: account.status,
        currentBalance: account.balance,
        balanceAfter: new Decimal(account.balance).minus(query.amount).toFixed(2),
        clientId: account.clientId,
        clientName: account.clientName,
        clientNumber: account.clientNumber,
      },
      journalEntry: {
        debit: {
          code: clientCoa.code,
          name: clientCoa.name,
          amount: new Decimal(query.amount).toFixed(2),
          currency,
        },
        credit: {
          code: tellerCoa.code,
          name: tellerCoa.name,
          amount: new Decimal(query.amount).toFixed(2),
          currency,
        },
      },
      tellerCashPosition: {
        currentFC: session.expectedClosingCashFC,
        currentUSD: session.expectedClosingCashUSD,
      },
    };
  }

  // ── Withdrawal ───────────────────────────────────────────────────────────────

  async withdraw(
    sessionId: string,
    dto: TellerWithdrawalDto,
    teller: UserModel,
  ): Promise<AccountTxModel> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    const currency = dto.currency;
    session.assertHasCashFor(dto.amount, currency);

    const account = await this.accountService.findById(dto.accountId);
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Account is ${account.status.toLowerCase()} and cannot process withdrawals.`,
      );
    }

    const balance = account.balance;
    if (new Decimal(balance).lessThan(dto.amount)) {
      throw new BadRequestException(
        `Insufficient account balance. Available: ${balance}, requested: ${dto.amount}`,
      );
    }

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const tellerCode =
      currency === Currency.FC
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const clientCoaCode = TellerPolicy.clientSavingsCode(
      account.accountType,
      account.currency,
    );

    const newBalance = new Decimal(balance).minus(dto.amount).toFixed(2);
    const reference = await this.sequenceService.nextReference(session.branchId, 'TLR');

    const tx = AccountTxModel.create({
      id: randomUUID(),
      accountId: dto.accountId,
      branchId: session.branchId,
      type: AccountTxType.WITHDRAWAL,
      amount: new Decimal(dto.amount).toFixed(4),
      currency: dto.currency,
      balanceAfter: newBalance,
      reference,
      description: dto.description,
      performedBy: teller.id,
      createdAt: new Date(),
    });

    await this.dataSource.transaction(async (em) => {
      await this.repo.saveAccountTx(tx, em);
      await this.accountService.recordBalance(dto.accountId, newBalance, em);
      await this.accountingService.postWithdrawal(
        dto.amount,
        currency,
        tellerCode,
        clientCoaCode,
        session.branchId,
        teller.id,
        dto.description,
        em,
        tx.id,
      );
      session.recordCashMovement(TellerTxType.WITHDRAWAL, dto.amount, currency);
      await this.repo.saveSession(session, em);
      await this.saveTellerTx(
        { sessionId, type: TellerTxType.WITHDRAWAL, dto, reference },
        em,
      );
    });

    return tx;
  }

  // ── Transfer preview ─────────────────────────────────────────────────────────

  async transferPreview(
    sessionId: string,
    query: TransferPreviewQuery,
    teller: UserModel,
  ): Promise<TransferPreview> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    const [source, dest] = await Promise.all([
      this.accountService.findByIdEnriched(query.sourceAccountId),
      this.accountService.findByIdEnriched(query.destinationAccountId),
    ]);

    if (source.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Source account is ${source.status.toLowerCase()} and cannot process transfers.`,
      );
    }
    if (dest.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Destination account is ${dest.status.toLowerCase()} and cannot receive transfers.`,
      );
    }

    if (new Decimal(source.balance).lessThan(query.amount)) {
      throw new BadRequestException(
        `Insufficient source account balance. Available: ${source.balance}, requested: ${query.amount}`,
      );
    }

    const currency = query.currency;
    const sourceCoaCode = TellerPolicy.clientSavingsCode(
      source.accountType,
      source.currency,
    );
    const destCoaCode = TellerPolicy.clientSavingsCode(
      dest.accountType,
      dest.currency,
    );

    const [sourceCoa, destCoa] = await Promise.all([
      this.accountingService.findChartAccountByCode(sourceCoaCode),
      this.accountingService.findChartAccountByCode(destCoaCode),
    ]);

    return {
      source: {
        id: source.id,
        accountNumber: source.accountNumber,
        accountType: source.accountType,
        currency: source.currency,
        status: source.status,
        currentBalance: source.balance,
        balanceAfter: new Decimal(source.balance).minus(query.amount).toFixed(2),
        clientId: source.clientId,
        clientName: source.clientName,
        clientNumber: source.clientNumber,
      },
      destination: {
        id: dest.id,
        accountNumber: dest.accountNumber,
        accountType: dest.accountType,
        currency: dest.currency,
        status: dest.status,
        currentBalance: dest.balance,
        balanceAfter: new Decimal(dest.balance).plus(query.amount).toFixed(2),
        clientId: dest.clientId,
        clientName: dest.clientName,
        clientNumber: dest.clientNumber,
      },
      journalEntry: {
        debit: {
          code: sourceCoa.code,
          name: sourceCoa.name,
          amount: new Decimal(query.amount).toFixed(2),
          currency,
        },
        credit: {
          code: destCoa.code,
          name: destCoa.name,
          amount: new Decimal(query.amount).toFixed(2),
          currency,
        },
      },
    };
  }

  // ── Transfer (book entry — no cash movement) ─────────────────────────────────

  async transfer(
    sessionId: string,
    dto: TellerTransferDto,
    teller: UserModel,
  ): Promise<{ debit: AccountTxModel; credit: AccountTxModel }> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    const [source, dest] = await Promise.all([
      this.accountService.findById(dto.sourceAccountId),
      this.accountService.findById(dto.destinationAccountId),
    ]);

    if (source.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Source account is ${source.status.toLowerCase()} and cannot process transfers.`,
      );
    }
    if (dest.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Destination account is ${dest.status.toLowerCase()} and cannot receive transfers.`,
      );
    }

    const sourceBalance = source.balance;
    if (new Decimal(sourceBalance).lessThan(dto.amount)) {
      throw new BadRequestException(
        `Insufficient source account balance. Available: ${sourceBalance}, requested: ${dto.amount}`,
      );
    }

    const currency = dto.currency;
    const sourceCoaCode = TellerPolicy.clientSavingsCode(
      source.accountType,
      source.currency,
    );
    const destCoaCode = TellerPolicy.clientSavingsCode(
      dest.accountType,
      dest.currency,
    );

    const destBalance = dest.balance;
    const sourceNewBalance = new Decimal(sourceBalance).minus(dto.amount).toFixed(2);
    const destNewBalance = new Decimal(destBalance).plus(dto.amount).toFixed(2);
    const reference = await this.sequenceService.nextReference(session.branchId, 'TLR');

    const debit = AccountTxModel.create({
      id: randomUUID(),
      accountId: dto.sourceAccountId,
      branchId: session.branchId,
      type: AccountTxType.TRANSFER_OUT,
      amount: new Decimal(dto.amount).toFixed(4),
      currency,
      balanceAfter: sourceNewBalance,
      reference,
      description: dto.description,
      performedBy: teller.id,
      createdAt: new Date(),
    });

    const credit = AccountTxModel.create({
      id: randomUUID(),
      accountId: dto.destinationAccountId,
      branchId: session.branchId,
      type: AccountTxType.TRANSFER_IN,
      amount: new Decimal(dto.amount).toFixed(4),
      currency,
      balanceAfter: destNewBalance,
      reference: await this.sequenceService.nextReference(session.branchId, 'TLR'),
      description: dto.description,
      performedBy: teller.id,
      createdAt: new Date(),
    });

    await this.dataSource.transaction(async (em) => {
      await this.repo.saveAccountTx(debit, em);
      await this.repo.saveAccountTx(credit, em);
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
      // Book transfer: Dr. source COA, Cr. dest COA (no teller cash impact)
      await this.accountingService.postBookTransfer(
        dto.amount,
        currency,
        sourceCoaCode,
        destCoaCode,
        session.branchId,
        teller.id,
        dto.description,
        em,
        debit.id,
      );
      // Record a single teller tx entry for the transfer (session cash unchanged)
      const tellerTxEntity = new TellerTransactionEntity();
      tellerTxEntity.id = randomUUID();
      tellerTxEntity.session_id = sessionId;
      tellerTxEntity.type = TellerTxType.TRANSFER;
      tellerTxEntity.amount = dto.amount;
      tellerTxEntity.currency = currency;
      tellerTxEntity.account_id = dto.sourceAccountId;
      tellerTxEntity.reference = reference;
      tellerTxEntity.description = dto.description ?? null;
      await this.repo.saveTx(tellerTxEntity, em);
    });

    return { debit, credit };
  }

  // ── EOD submission ───────────────────────────────────────────────────────────

  async submitEod(
    sessionId: string,
    dto: SubmitEodDto,
    teller: UserModel,
  ): Promise<TellerSessionModel> {
    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.submitForReconciliation(
      dto.declaredClosingCashFC,
      dto.declaredClosingCashUSD,
    );

    const denominationEntities = this.buildDenominationEntities(
      sessionId,
      DenominationType.EOD_DECLARATION,
      dto.denominationsFC,
      dto.denominationsUSD,
    );

    await this.dataSource.transaction(async (em) => {
      await this.repo.saveSession(session, em);
      await this.repo.saveDenominations(denominationEntities, em);
    });

    return session;
  }

  // ── Manager closes session after reconciliation ───────────────────────────────

  async closeSession(
    sessionId: string,
    manager: UserModel,
  ): Promise<TellerSessionModel> {
    if (!manager.branchId) {
      throw new BadRequestException('Manager has no assigned branch.');
    }

    TellerPolicy.assertIsBranchManager(manager.role);

    const session = await this.findOrFail(sessionId);
    TellerPolicy.assertSessionInBranch(session.branchId, manager.branchId);

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);

    const branchCoa = await this.repo.findBranchCoaAccounts(session.branchId);
    if (!branchCoa) {
      throw new BadRequestException(
        'Branch COA accounts not found. The branch must be provisioned before closing sessions.',
      );
    }

    session.close(manager.id);

    await this.dataSource.transaction(async (em) => {
      await this.repo.saveSession(session, em);
      await this.accountingService.postTellerReconciliation(
        {
          expectedFC: new Decimal(session.expectedClosingCashFC).toNumber(),
          declaredFC: new Decimal(
            session.declaredClosingCashFC ?? session.expectedClosingCashFC,
          ).toNumber(),
          expectedUSD: new Decimal(session.expectedClosingCashUSD).toNumber(),
          declaredUSD: new Decimal(
            session.declaredClosingCashUSD ?? session.expectedClosingCashUSD,
          ).toNumber(),
          tellerFcCode: coaAccounts.fc_account_code,
          tellerUsdCode: coaAccounts.usd_account_code,
          vaultFcCode: branchCoa.vault_fc_code,
          vaultUsdCode: branchCoa.vault_usd_code,
          varianceFcCode: COA_CODES.TELLER_VARIANCE_FC,
          varianceUsdCode: COA_CODES.TELLER_VARIANCE_USD,
          branchId: session.branchId,
          createdBy: manager.id,
          description: `EOD reconciliation for session ${session.sessionNumber}`,
        },
        em,
      );
    });

    return session;
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async getSession(
    sessionId: string,
    requestingUser: UserModel,
  ): Promise<SessionWithTransactions> {
    const session = await this.findOrFail(sessionId);

    // Tellers can only see their own sessions; managers see any session in their branch
    if (requestingUser.role === UserRole.TELLER) {
      TellerPolicy.assertSessionOwnedByTeller(
        session.tellerId,
        requestingUser.id,
      );
    }

    const [transactions, denominations] = await Promise.all([
      this.repo.findTxsBySession(sessionId),
      this.repo.findDenominationsBySession(sessionId),
    ]);
    return { session, transactions, denominations };
  }

  async listSessions(
    requestingUser: UserModel,
    query?: ListSessionsQueryDto,
  ): Promise<{ data: TellerSessionModel[]; total: number }> {
    if (!requestingUser.branchId) return { data: [], total: 0 };

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;

    if (requestingUser.role === UserRole.TELLER) {
      return this.repo.findSessionsByTeller(requestingUser.id, page, limit);
    }

    return this.repo.findSessionsByBranch(requestingUser.branchId, page, limit);
  }

  async listPendingReconciliation(
    manager: UserModel,
  ): Promise<TellerSessionModel[]> {
    TellerPolicy.assertIsBranchManager(manager.role);
    if (!manager.branchId) return [];
    return this.repo.findPendingReconciliationByBranch(manager.branchId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findOrFail(id: string): Promise<TellerSessionModel> {
    const session = await this.repo.findSessionById(id);
    if (!session)
      throw new NotFoundException(`Teller session ${id} not found.`);
    return session;
  }

  private async ensureBranchCoaAccounts(
    branchId: string,
    createdBy: string,
  ): Promise<void> {
    const existing = await this.repo.findBranchCoaAccounts(branchId);
    if (existing) return;

    const result = await this.accountingService.provisionBranchCoaAccounts(
      `Branch-${branchId.slice(0, 8)}`,
      createdBy,
    );

    const entity = new BranchCoaAccountEntity();
    entity.id = randomUUID();
    entity.branch_id = branchId;
    entity.branch_seq = result.branchSeq;
    entity.vault_fc_code = result.vaultFcCode;
    entity.vault_usd_code = result.vaultUsdCode;
    entity.teller_fc_code = result.tellerFcCode;
    entity.teller_usd_code = result.tellerUsdCode;
    entity.vault_fc_coa_id = result.vaultFcId;
    entity.vault_usd_coa_id = result.vaultUsdId;
    entity.teller_fc_coa_id = result.tellerFcId;
    entity.teller_usd_coa_id = result.tellerUsdId;

    await this.repo.saveBranchCoaAccounts(entity);
  }

  private async ensureTellerCoaAccounts(
    tellerId: string,
    tellerName: string,
    branchId: string,
    createdBy: string,
  ): Promise<void> {
    const existing = await this.repo.findCoaAccounts(tellerId);
    if (existing) return;

    const branchCoa = await this.repo.findBranchCoaAccounts(branchId);
    if (!branchCoa) {
      throw new BadRequestException(
        'Branch COA accounts not found. Cannot provision teller accounts.',
      );
    }

    const { fcCode, usdCode, fcId, usdId } =
      await this.accountingService.provisionTellerCoaAccounts(
        tellerName,
        branchCoa.branch_seq,
        branchCoa.teller_fc_code,
        branchCoa.teller_usd_code,
        createdBy,
      );

    const mapping = new TellerCoaAccountEntity();
    mapping.id = randomUUID();
    mapping.teller_id = tellerId;
    mapping.branch_id = branchId;
    mapping.fc_account_code = fcCode;
    mapping.usd_account_code = usdCode;
    mapping.fc_coa_id = fcId;
    mapping.usd_coa_id = usdId;

    await this.repo.saveCoaAccounts(mapping);
  }

  private async getCoaAccountsOrFail(
    tellerId: string,
  ): Promise<TellerCoaAccountEntity> {
    const accounts = await this.repo.findCoaAccounts(tellerId);
    if (!accounts) {
      throw new NotFoundException(
        `COA accounts not provisioned for teller ${tellerId}. The teller must request a session first.`,
      );
    }
    return accounts;
  }

  private async saveTellerTx(
    params: {
      sessionId: string;
      type: TellerTxType.DEPOSIT | TellerTxType.WITHDRAWAL;
      dto: TellerDepositDto | TellerWithdrawalDto;
      reference: string;
    },
    em: import('typeorm').EntityManager,
  ): Promise<void> {
    const entity = new TellerTransactionEntity();
    entity.id = randomUUID();
    entity.session_id = params.sessionId;
    entity.type = params.type;
    entity.amount = params.dto.amount;
    entity.currency = params.dto.currency;
    entity.account_id = (params.dto as TellerDepositDto).accountId;
    entity.reference = params.reference;
    entity.description = params.dto.description ?? null;
    await this.repo.saveTx(entity, em);
  }

  private buildDenominationEntities(
    sessionId: string,
    type: DenominationType,
    fc: DenominationEntryDto[] | undefined,
    usd: DenominationEntryDto[] | undefined,
  ): SessionDenominationEntity[] {
    const entities: SessionDenominationEntity[] = [];
    for (const d of fc ?? []) {
      const e = new SessionDenominationEntity();
      e.id = randomUUID();
      e.session_id = sessionId;
      e.type = type;
      e.currency = Currency.FC;
      e.denomination = d.denomination;
      e.quantity = d.quantity;
      e.subtotal = new Decimal(d.denomination).times(d.quantity).toDecimalPlaces(4).toNumber();
      entities.push(e);
    }
    for (const d of usd ?? []) {
      const e = new SessionDenominationEntity();
      e.id = randomUUID();
      e.session_id = sessionId;
      e.type = type;
      e.currency = Currency.USD;
      e.denomination = d.denomination;
      e.quantity = d.quantity;
      e.subtotal = new Decimal(d.denomination).times(d.quantity).toDecimalPlaces(4).toNumber();
      entities.push(e);
    }
    return entities;
  }

  private todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
