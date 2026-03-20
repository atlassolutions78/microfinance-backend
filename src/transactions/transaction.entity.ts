import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Currency, TransactionType } from './transaction.enums';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  account_id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branch_id: string;

  @Column({ type: 'enum', enum: TransactionType, enumName: 'transactions_type_enum' })
  type: TransactionType;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  amount: number;

  @Column({ type: 'enum', enum: Currency, enumName: 'transactions_currency_enum' })
  currency: Currency;

  @Column({ name: 'balance_after', type: 'numeric', precision: 18, scale: 4 })
  balance_after: number;

  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'performed_by', type: 'uuid' })
  performed_by: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}

@Entity('transfers')
export class TransferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'debit_transaction_id', type: 'uuid' })
  debit_transaction_id: string;

  @Column({ name: 'credit_transaction_id', type: 'uuid', nullable: true })
  credit_transaction_id: string | null;

  @Column({ name: 'is_internal' })
  is_internal: boolean;

  @Column({ name: 'recipient_name', type: 'text', nullable: true })
  recipient_name: string | null;

  @Column({ name: 'fee_amount', type: 'numeric', precision: 18, scale: 4 })
  fee_amount: number;

  @Column({ name: 'claim_reference', type: 'text', nullable: true })
  claim_reference: string | null;
}

// Keep aliases so mapper imports are unchanged
export type TransactionRecord = TransactionEntity;
export type TransferRecord = TransferEntity;
