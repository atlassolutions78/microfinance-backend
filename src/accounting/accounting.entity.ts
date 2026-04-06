import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChartAccountType, JournalEntryStatus } from './accounting.enums';

@Entity('chart_of_accounts')
export class ChartOfAccountsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'parent_id', nullable: true })
  parent_id: string | null;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', name: 'name_en', nullable: true })
  name_en: string | null;

  @Column({
    type: 'enum',
    enum: ChartAccountType,
    enumName: 'accounting_account_type_enum',
  })
  type: ChartAccountType;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid', name: 'created_by' })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => ChartOfAccountsEntity, (coa) => coa.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: ChartOfAccountsEntity | null;

  @OneToMany(() => ChartOfAccountsEntity, (coa) => coa.parent)
  children: ChartOfAccountsEntity[];

  @OneToMany(() => JournalLineEntity, (line) => line.chartAccount)
  lines: JournalLineEntity[];
}

@Entity('journal_entries')
export class JournalEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({ type: 'uuid', name: 'branch_id' })
  branch_id: string;

  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    enumName: 'journal_entry_status_enum',
    default: JournalEntryStatus.POSTED,
  })
  status: JournalEntryStatus;

  @Column({ type: 'uuid', name: 'reversal_of', nullable: true })
  reversal_of: string | null;

  @Column({ type: 'uuid', name: 'posted_by', nullable: true })
  posted_by: string | null;

  @Column({ type: 'timestamptz', name: 'posted_at', nullable: true })
  posted_at: Date | null;

  @Column({ type: 'uuid', name: 'transaction_id', nullable: true })
  transaction_id: string | null;

  @Column({ type: 'uuid', name: 'created_by' })
  created_by: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @OneToMany(() => JournalLineEntity, (line) => line.journalEntry, {
    cascade: true,
  })
  lines: JournalLineEntity[];
}

@Entity('journal_lines')
export class JournalLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'journal_entry_id' })
  journal_entry_id: string;

  @Column({ type: 'uuid', name: 'account_id' })
  account_id: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
  debit: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
  credit: string;

  @Column({
    type: 'enum',
    enum: ['USD', 'FC'],
    enumName: 'transactions_currency_enum',
  })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => JournalEntryEntity, (entry) => entry.lines)
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry: JournalEntryEntity;

  @ManyToOne(() => ChartOfAccountsEntity, (coa) => coa.lines)
  @JoinColumn({ name: 'account_id' })
  chartAccount: ChartOfAccountsEntity;
}
