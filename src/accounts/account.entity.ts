import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountType, AccountCurrency, AccountStatus } from './account.enums';

@Entity('accounts')
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_number', unique: true, type: 'text' })
  account_number: string;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branch_id: string;

  @Column({ name: 'account_type', type: 'enum', enum: AccountType })
  account_type: AccountType;

  @Column({ name: 'currency', type: 'enum', enum: AccountCurrency })
  currency: AccountCurrency;

  @Column({
    name: 'status',
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING,
  })
  status: AccountStatus;

  /**
   * PostgreSQL returns numeric columns as strings — the mapper casts to Number.
   */
  @Column({
    name: 'balance',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  balance: string;

  @Column({ name: 'opened_by', type: 'uuid' })
  opened_by: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

/**
 * Tracks the last issued sequence number per account type.
 * Used to generate collision-free account numbers under concurrent requests.
 */
@Entity('account_sequences')
export class AccountSequenceEntity {
  @PrimaryColumn({ name: 'type', type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ name: 'last_seq', type: 'integer', default: 0 })
  last_seq: number;
}
