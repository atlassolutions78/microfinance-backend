import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
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

  async findSessionsByBranch(branchId: string): Promise<TellerSessionModel[]> {
    const entities = await this.sessions.find({
      where: { branch_id: branchId },
      order: { date: 'DESC', created_at: 'DESC' },
    });
    return entities.map((e) => TellerMapper.sessionToDomain(e));
  }

  async findSessionsByTeller(tellerId: string): Promise<TellerSessionModel[]> {
    const entities = await this.sessions.find({
      where: { teller_id: tellerId },
      order: { date: 'DESC', created_at: 'DESC' },
    });
    return entities.map((e) => TellerMapper.sessionToDomain(e));
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
    const entities = await this.txs.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
    });
    return entities.map((e) => TellerMapper.txToRecord(e));
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
      amount: tx.amount,
      currency: tx.currency,
      balance_after: tx.balanceAfter,
      reference: tx.reference,
      description: tx.description ?? null,
      performed_by: tx.performedBy,
      created_at: tx.createdAt,
    });
  }
}
