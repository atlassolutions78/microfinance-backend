import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { SequenceService } from '../sequences/sequence.service';
import { RemittanceRepository } from './remittance.repository';
import { RemittanceModel } from './remittance.model';
import { RemittanceStatus } from './remittance.enums';
import {
  CancelRemittanceDto,
  GetRemittancesQueryDto,
  PayoutRemittanceDto,
  PayoutRemittancePreviewQuery,
  SendRemittanceDto,
  SendRemittancePreviewQuery,
} from './remittance.dto';

export interface SendRemittancePreview {
  journalEntry: {
    debit: { code: string; name: string; amount: number; currency: string };
    credit: { code: string; name: string; amount: number; currency: string };
  };
  tellerCashPosition: {
    currentFC: string;
    currentUSD: string;
    afterFC: string;
    afterUSD: string;
  };
  receivingBranch: { id: string; name: string; code: string };
}

export interface PayoutRemittancePreview {
  remittance: {
    id: string;
    reference: string;
    amount: string;
    currency: string;
    recipientName: string;
    recipientIdNumber: string;
    recipientPhone: string | undefined;
    sendingBranchId: string;
  };
  journalEntry: {
    debit: { code: string; name: string; amount: number; currency: string };
    credit: { code: string; name: string; amount: number; currency: string };
  };
  tellerCashPosition: {
    currentFC: string;
    currentUSD: string;
    afterFC: string;
    afterUSD: string;
  };
}
import { TellerRepository } from '../teller/teller.repository';
import { AccountingService } from '../accounting/accounting.service';
import { SettingsService } from '../settings/settings.service';
import { UserModel } from '../users/user.model';
import { UserRole } from '../users/user.enums';
import { TellerPolicy } from '../teller/teller.policy';
import { TellerTxType } from '../teller/teller.enums';
import { COA_CODES } from '../accounting/accounting.enums';

@Injectable()
export class RemittanceService {
  constructor(
    private readonly repo: RemittanceRepository,
    private readonly tellerRepo: TellerRepository,
    private readonly accountingService: AccountingService,
    private readonly settingsService: SettingsService,
    private readonly sequenceService: SequenceService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Send preview ─────────────────────────────────────────────────────────────

  async sendPreview(
    query: SendRemittancePreviewQuery,
    teller: UserModel,
  ): Promise<SendRemittancePreview> {
    const session = await this.findSessionOrFail(query.sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    if (session.branchId === query.receivingBranchId) {
      throw new BadRequestException(
        'Sending and receiving branch must be different.',
      );
    }

    const receivingBranch = await this.settingsService.findBranchById(
      query.receivingBranchId,
    );

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const tellerCode =
      query.currency === 'FC'
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const transitCode =
      query.currency === 'FC'
        ? COA_CODES.REMITTANCE_TRANSIT_FC
        : COA_CODES.REMITTANCE_TRANSIT_USD;

    const [tellerCoa, transitCoa] = await Promise.all([
      this.accountingService.findChartAccountByCode(tellerCode),
      this.accountingService.findChartAccountByCode(transitCode),
    ]);

    const isFC = query.currency === 'FC';

    return {
      journalEntry: {
        debit: {
          code: tellerCoa.code,
          name: tellerCoa.name,
          amount: query.amount,
          currency: query.currency,
        },
        credit: {
          code: transitCoa.code,
          name: transitCoa.name,
          amount: query.amount,
          currency: query.currency,
        },
      },
      tellerCashPosition: {
        currentFC: session.expectedClosingCashFC,
        currentUSD: session.expectedClosingCashUSD,
        afterFC: isFC
          ? new Decimal(session.expectedClosingCashFC).plus(query.amount).toFixed(4)
          : session.expectedClosingCashFC,
        afterUSD: isFC
          ? session.expectedClosingCashUSD
          : new Decimal(session.expectedClosingCashUSD).plus(query.amount).toFixed(4),
      },
      receivingBranch: {
        id: receivingBranch.id,
        name: receivingBranch.name,
        code: receivingBranch.code,
      },
    };
  }

  // ── Payout preview ────────────────────────────────────────────────────────────

  async payoutPreview(
    remittanceId: string,
    query: PayoutRemittancePreviewQuery,
    teller: UserModel,
  ): Promise<PayoutRemittancePreview> {
    const remittance = await this.findOrFail(remittanceId);

    if (remittance.status !== RemittanceStatus.PENDING) {
      throw new BadRequestException(
        `Remittance is ${remittance.status.toLowerCase()} and cannot be paid out.`,
      );
    }

    const session = await this.findSessionOrFail(query.payoutSessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    if (session.branchId !== remittance.receivingBranchId) {
      throw new ForbiddenException(
        'This remittance must be paid out at the designated receiving branch.',
      );
    }

    session.assertHasCashFor(new Decimal(remittance.amount).toNumber(), remittance.currency);

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const tellerCode =
      remittance.currency === 'FC'
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const transitCode =
      remittance.currency === 'FC'
        ? COA_CODES.REMITTANCE_TRANSIT_FC
        : COA_CODES.REMITTANCE_TRANSIT_USD;

    const [transitCoa, tellerCoa] = await Promise.all([
      this.accountingService.findChartAccountByCode(transitCode),
      this.accountingService.findChartAccountByCode(tellerCode),
    ]);

    const isFC = remittance.currency === 'FC';

    return {
      remittance: {
        id: remittance.id,
        reference: remittance.reference,
        amount: remittance.amount,
        currency: remittance.currency,
        recipientName: remittance.recipientName,
        recipientIdNumber: remittance.recipientIdNumber,
        recipientPhone: remittance.recipientPhone,
        sendingBranchId: remittance.sendingBranchId,
      },
      journalEntry: {
        debit: {
          code: transitCoa.code,
          name: transitCoa.name,
          amount: new Decimal(remittance.amount).toNumber(),
          currency: remittance.currency,
        },
        credit: {
          code: tellerCoa.code,
          name: tellerCoa.name,
          amount: new Decimal(remittance.amount).toNumber(),
          currency: remittance.currency,
        },
      },
      tellerCashPosition: {
        currentFC: session.expectedClosingCashFC,
        currentUSD: session.expectedClosingCashUSD,
        afterFC: isFC
          ? new Decimal(session.expectedClosingCashFC).minus(remittance.amount).toFixed(4)
          : session.expectedClosingCashFC,
        afterUSD: isFC
          ? session.expectedClosingCashUSD
          : new Decimal(session.expectedClosingCashUSD).minus(remittance.amount).toFixed(4),
      },
    };
  }

  // ── Leg 1 — Sending teller receives cash and initiates the remittance ─────────

  async send(
    dto: SendRemittanceDto,
    teller: UserModel,
  ): Promise<RemittanceModel> {
    TellerPolicy.assertIsTeller(teller.role);

    const session = await this.findSessionOrFail(dto.sessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    if (session.branchId === dto.receivingBranchId) {
      throw new BadRequestException(
        'Sending and receiving branch must be different.',
      );
    }

    // Validate receiving branch exists
    await this.settingsService.findBranchById(dto.receivingBranchId);

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const tellerCode =
      dto.currency === 'FC'
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const transitCode =
      dto.currency === 'FC'
        ? COA_CODES.REMITTANCE_TRANSIT_FC
        : COA_CODES.REMITTANCE_TRANSIT_USD;

    const remittance = new RemittanceModel({
      id: randomUUID(),
      reference: await this.sequenceService.nextReference(session.branchId, 'RMT'),
      sendingSessionId: dto.sessionId,
      sendingTellerId: teller.id,
      sendingBranchId: session.branchId,
      receivingBranchId: dto.receivingBranchId,
      amount: new Decimal(dto.amount).toFixed(4),
      currency: dto.currency,
      recipientName: dto.recipientName,
      recipientIdNumber: dto.recipientIdNumber,
      recipientPhone: dto.recipientPhone,
      status: RemittanceStatus.PENDING,
      payoutSessionId: undefined,
      payoutTellerId: undefined,
      paidAt: undefined,
      cancelledBy: undefined,
      cancelledAt: undefined,
      cancellationReason: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.dataSource.transaction(async (em) => {
      await this.repo.save(remittance, em);
      // DR Teller Cash / CR Remittance Transit
      await this.accountingService.postRemittanceSend(
        dto.amount,
        dto.currency,
        tellerCode,
        transitCode,
        session.branchId,
        teller.id,
        `Remittance send — ref ${remittance.reference} to ${dto.recipientName}`,
        em,
      );
      // Cash came into the teller's drawer from the sender
      session.recordCashMovement(
        TellerTxType.DEPOSIT,
        dto.amount,
        dto.currency,
      );
      await this.tellerRepo.saveSession(session, em);
    });

    return remittance;
  }

  // ── Leg 2 — Receiving teller pays out cash to the recipient ──────────────────

  async payout(
    remittanceId: string,
    dto: PayoutRemittanceDto,
    teller: UserModel,
  ): Promise<RemittanceModel> {
    TellerPolicy.assertIsTeller(teller.role);

    const remittance = await this.findOrFail(remittanceId);

    if (remittance.status !== RemittanceStatus.PENDING) {
      throw new BadRequestException(
        `Remittance is ${remittance.status.toLowerCase()} and cannot be paid out.`,
      );
    }

    const session = await this.findSessionOrFail(dto.payoutSessionId);
    TellerPolicy.assertSessionOwnedByTeller(session.tellerId, teller.id);
    session.assertCanProcessTransaction();

    if (session.branchId !== remittance.receivingBranchId) {
      throw new ForbiddenException(
        'This remittance must be paid out at the designated receiving branch.',
      );
    }

    session.assertHasCashFor(new Decimal(remittance.amount).toNumber(), remittance.currency);

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const tellerCode =
      remittance.currency === 'FC'
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const transitCode =
      remittance.currency === 'FC'
        ? COA_CODES.REMITTANCE_TRANSIT_FC
        : COA_CODES.REMITTANCE_TRANSIT_USD;

    remittance.markPaid(session.id, teller.id);

    await this.dataSource.transaction(async (em) => {
      await this.repo.save(remittance, em);
      // DR Remittance Transit / CR Teller Cash
      await this.accountingService.postRemittancePayout(
        new Decimal(remittance.amount).toNumber(),
        remittance.currency,
        transitCode,
        tellerCode,
        session.branchId,
        teller.id,
        `Remittance payout — ref ${remittance.reference} to ${remittance.recipientName}`,
        em,
      );
      // Cash left the teller's drawer, paid to recipient
      session.recordCashMovement(
        TellerTxType.WITHDRAWAL,
        new Decimal(remittance.amount).toNumber(),
        remittance.currency,
      );
      await this.tellerRepo.saveSession(session, em);
    });

    return remittance;
  }

  // ── Cancel — sending teller returns cash to the original sender ───────────────

  async cancel(
    remittanceId: string,
    dto: CancelRemittanceDto,
    user: UserModel,
  ): Promise<RemittanceModel> {
    const remittance = await this.findOrFail(remittanceId);

    if (remittance.status !== RemittanceStatus.PENDING) {
      throw new BadRequestException(
        `Remittance is ${remittance.status.toLowerCase()} and cannot be cancelled.`,
      );
    }

    const session = await this.findSessionOrFail(dto.sessionId);
    session.assertCanProcessTransaction();

    const isSendingTeller =
      user.role === UserRole.TELLER &&
      session.tellerId === remittance.sendingTellerId &&
      session.branchId === remittance.sendingBranchId;

    const isManager =
      user.role === UserRole.BRANCH_MANAGER || user.role === UserRole.ADMIN;

    if (!isSendingTeller && !isManager) {
      throw new ForbiddenException(
        'Only the sending teller or a branch manager can cancel a remittance.',
      );
    }

    const coaAccounts = await this.getCoaAccountsOrFail(session.tellerId);
    const tellerCode =
      remittance.currency === 'FC'
        ? coaAccounts.fc_account_code
        : coaAccounts.usd_account_code;
    const transitCode =
      remittance.currency === 'FC'
        ? COA_CODES.REMITTANCE_TRANSIT_FC
        : COA_CODES.REMITTANCE_TRANSIT_USD;

    remittance.cancel(user.id, dto.reason);

    await this.dataSource.transaction(async (em) => {
      await this.repo.save(remittance, em);
      // DR Remittance Transit / CR Teller Cash (cash returns to the drawer)
      await this.accountingService.postRemittancePayout(
        new Decimal(remittance.amount).toNumber(),
        remittance.currency,
        transitCode,
        tellerCode,
        session.branchId,
        user.id,
        `Remittance cancelled — ref ${remittance.reference}${dto.reason ? ': ' + dto.reason : ''}`,
        em,
      );
      // Cash leaves the teller's drawer, returned to the original sender
      session.recordCashMovement(
        TellerTxType.WITHDRAWAL,
        new Decimal(remittance.amount).toNumber(),
        remittance.currency,
      );
      await this.tellerRepo.saveSession(session, em);
    });

    return remittance;
  }

  // ── Branch picker ────────────────────────────────────────────────────────────

  /**
   * Returns active branches a teller can send a remittance to.
   * Excludes the teller's own branch — you can't send to yourself.
   */
  async listReceivingBranches(
    user: UserModel,
  ): Promise<{ id: string; name: string; code: string }[]> {
    const all = await this.settingsService.findAllBranches();
    return all
      .filter((b) => b.is_active && b.id !== user.branchId)
      .map((b) => ({ id: b.id, name: b.name, code: b.code }));
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<RemittanceModel> {
    return this.findOrFail(id);
  }

  async findByReference(reference: string): Promise<RemittanceModel> {
    const remittance = await this.repo.findByReference(reference);
    if (!remittance)
      throw new NotFoundException(`Remittance ${reference} not found.`);
    return remittance;
  }

  /**
   * Remittances pending collection at the current user's branch.
   * Used by Teller B to see what they need to pay out.
   */
  async listPendingForMyBranch(
    user: UserModel,
    query?: GetRemittancesQueryDto,
  ): Promise<{ data: RemittanceModel[]; total: number }> {
    if (!user.branchId) return { data: [], total: 0 };
    return this.repo.findPendingByReceivingBranch(user.branchId, query);
  }

  /**
   * All remittances sent from the current user's branch.
   */
  async listSentFromMyBranch(
    user: UserModel,
    query?: GetRemittancesQueryDto,
  ): Promise<{ data: RemittanceModel[]; total: number }> {
    if (!user.branchId) return { data: [], total: 0 };
    return this.repo.findBySendingBranch(user.branchId, query);
  }

  async listAll(
    query?: GetRemittancesQueryDto,
  ): Promise<{ data: RemittanceModel[]; total: number }> {
    return this.repo.findAll(query);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findOrFail(id: string): Promise<RemittanceModel> {
    const remittance = await this.repo.findById(id);
    if (!remittance) throw new NotFoundException(`Remittance ${id} not found.`);
    return remittance;
  }

  private async findSessionOrFail(sessionId: string) {
    const session = await this.tellerRepo.findSessionById(sessionId);
    if (!session)
      throw new NotFoundException(`Teller session ${sessionId} not found.`);
    return session;
  }

  private async getCoaAccountsOrFail(tellerId: string) {
    const accounts = await this.tellerRepo.findCoaAccounts(tellerId);
    if (!accounts)
      throw new NotFoundException(
        `COA accounts not provisioned for teller ${tellerId}.`,
      );
    return accounts;
  }

}
