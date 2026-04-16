import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import {
  BranchCoaAccountEntity,
  SessionDenominationEntity,
  TellerCoaAccountEntity,
  TellerSessionEntity,
  TellerTransactionEntity,
  ClientTransactionEntity,
} from './teller.entity';
import {
  SessionDenominationRecord,
  TellerMapper,
  TellerTransactionRecord,
} from './teller.mapper';
import { TellerSessionModel } from './teller-session.model';
import { AccountTxModel } from './account-tx.model';
import { TellerSessionStatus } from './teller.enums';

@Injectable()
export class TellerRepository {
  constructor(
    @InjectRepository(TellerSessionEntity)
    private readonly sessions: Repository<TellerSessionEntity>,
    @InjectRepository(TellerTransactionEntity)
    private readonly txs: Repository<TellerTransactionEntity>,
    @InjectRepository(TellerCoaAccountEntity)
    private readonly coaAccounts: Repository<TellerCoaAccountEntity>,
    @InjectRepository(BranchCoaAccountEntity)
    private readonly branchCoaAccounts: Repository<BranchCoaAccountEntity>,
    @InjectRepository(ClientTransactionEntity)
    private readonly accountTxs: Repository<ClientTransactionEntity>,
    @InjectRepository(SessionDenominationEntity)
    private readonly denominations: Repository<SessionDenominationEntity>,
  ) {}

  // ── Sessions ─────────────────────────────────────────────────────────────────

  async saveSession(
    model: TellerSessionModel,
    em?: EntityManager,
  ): Promise<void> {
    const repo = em ? em.getRepository(TellerSessionEntity) : this.sessions;
    await repo.save(TellerMapper.sessionToEntity(model));
  }

  async findSessionById(id: string): Promise<TellerSessionModel | null> {
    const e = await this.sessions.findOne({ where: { id } });
    return e ? TellerMapper.sessionToDomain(e) : null;
  }

  async findSessionByTellerAndDate(
    tellerId: string,
    date: string,
  ): Promise<TellerSessionModel | null> {
    const e = await this.sessions.findOne({
      where: { teller_id: tellerId, date },
    });
    return e ? TellerMapper.sessionToDomain(e) : null;
  }

  async findSessionsByBranch(
    branchId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: TellerSessionModel[]; total: number }> {
    const [entities, total] = await this.sessions.findAndCount({
      where: { branch_id: branchId },
      order: { date: 'DESC', created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: entities.map((e) => TellerMapper.sessionToDomain(e)),
      total,
    };
  }

  async findSessionsByTeller(
    tellerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: TellerSessionModel[]; total: number }> {
    const [entities, total] = await this.sessions.findAndCount({
      where: { teller_id: tellerId },
      order: { date: 'DESC', created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: entities.map((e) => TellerMapper.sessionToDomain(e)),
      total,
    };
  }

  async findPendingReconciliationByBranch(
    branchId: string,
  ): Promise<TellerSessionModel[]> {
    const entities = await this.sessions.find({
      where: {
        branch_id: branchId,
        status: TellerSessionStatus.PENDING_RECONCILIATION,
      },
      order: { date: 'ASC' },
    });
    return entities.map((e) => TellerMapper.sessionToDomain(e));
  }

  // ── Teller transactions ───────────────────────────────────────────────────────

  async saveTx(tx: TellerTransactionEntity, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(TellerTransactionEntity) : this.txs;
    await repo.save(tx);
  }

  async findTxsBySession(
    sessionId: string,
  ): Promise<TellerTransactionRecord[]> {
    const rows = await this.txs.manager.query<
      Array<{
        id: string;
        session_id: string;
        type: string;
        amount: string;
        currency: string;
        account_id: string;
        reference: string;
        description: string | null;
        created_at: Date;
        account_number: string | null;
        balance_after: string | null;
        client_name: string | null;
      }>
    >(
      `
      SELECT
        tt.id, tt.session_id, tt.type, tt.amount, tt.currency,
        tt.account_id, tt.reference, tt.description, tt.created_at,
        a.account_number,
        ct.balance_after,
        COALESCE(
          ip.first_name || ' ' || ip.last_name,
          op.organization_name
        ) AS client_name
      FROM teller_transactions tt
      LEFT JOIN accounts a
             ON a.id = tt.account_id
      LEFT JOIN client_transactions ct
             ON ct.reference = tt.reference
            AND ct.account_id = tt.account_id
      LEFT JOIN individual_profiles ip
             ON ip.client_id = a.client_id
      LEFT JOIN organization_profiles op
             ON op.client_id = a.client_id
      WHERE tt.session_id = $1
      ORDER BY tt.created_at ASC
      `,
      [sessionId],
    );

    return rows.map((r) => {
      const entity = this.txs.create({
        id: r.id,
        session_id: r.session_id,
        type: r.type as any,
        amount: r.amount as any,
        currency: r.currency,
        account_id: r.account_id,
        reference: r.reference,
        description: r.description,
        created_at: r.created_at,
      });
      return TellerMapper.txToRecord(
        entity,
        r.account_number,
        r.client_name,
        r.balance_after !== null ? new Decimal(r.balance_after).toFixed(2) : null,
      );
    });
  }

  // ── Branch COA account mapping ────────────────────────────────────────────────

  async findBranchCoaAccounts(
    branchId: string,
  ): Promise<BranchCoaAccountEntity | null> {
    return this.branchCoaAccounts.findOne({ where: { branch_id: branchId } });
  }

  async saveBranchCoaAccounts(
    entity: BranchCoaAccountEntity,
    em?: EntityManager,
  ): Promise<BranchCoaAccountEntity> {
    const repo = em
      ? em.getRepository(BranchCoaAccountEntity)
      : this.branchCoaAccounts;
    return repo.save(entity);
  }

  // ── Teller COA account mapping ────────────────────────────────────────────────

  async findCoaAccounts(
    tellerId: string,
  ): Promise<TellerCoaAccountEntity | null> {
    return this.coaAccounts.findOne({ where: { teller_id: tellerId } });
  }

  async saveCoaAccounts(
    entity: TellerCoaAccountEntity,
    em?: EntityManager,
  ): Promise<TellerCoaAccountEntity> {
    const repo = em
      ? em.getRepository(TellerCoaAccountEntity)
      : this.coaAccounts;
    return repo.save(entity);
  }

  // ── Account transaction ledger ────────────────────────────────────────────────

  // ── Session denominations ─────────────────────────────────────────────────────

  async saveDenominations(
    entities: SessionDenominationEntity[],
    em?: EntityManager,
  ): Promise<void> {
    if (entities.length === 0) return;
    const repo = em
      ? em.getRepository(SessionDenominationEntity)
      : this.denominations;
    await repo.save(entities);
  }

  async findDenominationsBySession(
    sessionId: string,
  ): Promise<SessionDenominationRecord[]> {
    const entities = await this.denominations.find({
      where: { session_id: sessionId },
      order: { type: 'ASC', currency: 'ASC', denomination: 'ASC' },
    });
    return entities.map(TellerMapper.denominationToRecord);
  }

  async saveAccountTx(tx: AccountTxModel, em?: EntityManager): Promise<void> {
    const repo = em
      ? em.getRepository(ClientTransactionEntity)
      : this.accountTxs;
    await repo.save({
      id: tx.id,
      account_id: tx.accountId,
      branch_id: tx.branchId,
      type: tx.type,
      amount: new Decimal(tx.amount).toDecimalPlaces(4).toNumber(),
      currency: tx.currency,
      balance_after: new Decimal(tx.balanceAfter).toDecimalPlaces(4).toNumber(),
      reference: tx.reference,
      description: tx.description ?? null,
      performed_by: tx.performedBy,
      created_at: tx.createdAt,
    });
  }
}
