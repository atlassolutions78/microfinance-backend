import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  ChartAccountType,
  JournalLineSide,
  JournalOperationType,
} from './accounting.enums';

@Entity('chart_of_accounts')
export class ChartOfAccountsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({
    type: 'enum',
    enum: ChartAccountType,
    enumName: 'accounting_account_type_enum',
  })
  type: ChartAccountType;

  @Column({
    type: 'enum',
    enum: ['USD', 'FC'],
    enumName: 'transactions_currency_enum',
  })
  currency: string;

  @Column({ type: 'uuid', name: 'branch_id' })
  branch_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => JournalLineEntity, (line) => line.chartAccount)
  lines: JournalLineEntity[];
}

@Entity('journal_entries')
export class JournalEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: JournalOperationType,
    enumName: 'journal_operation_type_enum',
    name: 'operation_type',
  })
  operation_type: JournalOperationType;

  @Column({ type: 'uuid', name: 'branch_id' })
  branch_id: string;

  @Column({ type: 'uuid', name: 'performed_by' })
  performed_by: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'related_reference' })
  related_reference: string | null;

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

  @Column({
    type: 'enum',
    enum: JournalLineSide,
    enumName: 'journal_line_side_enum',
  })
  side: JournalLineSide;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  amount: string; // PostgreSQL returns numeric as string

  @Column({
    type: 'enum',
    enum: ['USD', 'FC'],
    enumName: 'transactions_currency_enum',
  })
  currency: string;

  @ManyToOne(() => JournalEntryEntity, (entry) => entry.lines)
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry: JournalEntryEntity;

  @ManyToOne(() => ChartOfAccountsEntity, (coa) => coa.lines)
  @JoinColumn({ name: 'account_id' })
  chartAccount: ChartOfAccountsEntity;
}
