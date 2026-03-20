import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity, TransferEntity } from './transaction.entity';
import { TransactionMapper } from './transaction.mapper';
import { TransactionModel } from './transaction.model';
import { TransferModel } from './transfer.model';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
    @InjectRepository(TransferEntity)
    private readonly transferRepo: Repository<TransferEntity>,
  ) {}

  async save(tx: TransactionModel): Promise<void> {
    await this.repo.save(TransactionMapper.toRecord(tx));
  }

  async saveTransfer(transfer: TransferModel): Promise<void> {
    await this.transferRepo.save(TransactionMapper.transferToRecord(transfer));
  }

  // Balance is encoded in balance_after on the latest transaction row.
  // No separate accounts table yet.
  async getBalance(accountId: string): Promise<number> {
    const latest = await this.repo.findOne({
      where: { account_id: accountId },
      order: { created_at: 'DESC' },
    });
    return latest ? Number(latest.balance_after) : 0;
  }

  // No-op: balance_after is persisted with each transaction row.
  async setBalance(_accountId: string, _newBalance: number): Promise<void> {}

  async findById(id: string): Promise<TransactionModel | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? TransactionMapper.toDomain(entity) : null;
  }

  async findByAccountId(accountId: string): Promise<TransactionModel[]> {
    const entities = await this.repo.find({
      where: { account_id: accountId },
      order: { created_at: 'DESC' },
    });
    return entities.map(TransactionMapper.toDomain);
  }

  async findTransferByDebitId(debitTxId: string): Promise<TransferModel | null> {
    const entity = await this.transferRepo.findOne({
      where: { debit_transaction_id: debitTxId },
    });
    return entity ? TransactionMapper.transferToDomain(entity) : null;
  }

  async findAll(): Promise<TransactionModel[]> {
    const entities = await this.repo.find({ order: { created_at: 'DESC' } });
    return entities.map(TransactionMapper.toDomain);
  }
}
