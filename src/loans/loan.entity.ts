import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  LoanCurrency,
  LoanDocumentType,
  LoanStatus,
  LoanType,
  ReminderChannel,
  ReminderStatus,
  RepaymentStatus,
} from './loan.enums';

// ---------------------------------------------------------------------------
// Loan
// ---------------------------------------------------------------------------

@Entity('loans')
export class LoanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_number', type: 'text', unique: true })
  loan_number: string;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  account_id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branch_id: string;

  @Column({ name: 'type', type: 'enum', enum: LoanType })
  type: LoanType;

  @Column({ name: 'currency', type: 'enum', enum: LoanCurrency })
  currency: LoanCurrency;

  /** Requested principal amount */
  @Column({ name: 'principal_amount', type: 'numeric', precision: 18, scale: 2 })
  principal_amount: string;

  /** Remaining principal after payments; starts at 0, set to principalAmount on disbursement */
  @Column({ name: 'outstanding_balance', type: 'numeric', precision: 18, scale: 2, default: 0 })
  outstanding_balance: string;

  /** Monthly interest rate as a decimal, e.g. 0.025 = 2.5 % per month */
  @Column({ name: 'interest_rate', type: 'numeric', precision: 8, scale: 6 })
  interest_rate: string;

  @Column({ name: 'term_months', type: 'integer' })
  term_months: number;

  @Column({ name: 'purpose', type: 'text', nullable: true })
  purpose: string | null;

  @Column({ name: 'status', type: 'enum', enum: LoanStatus, default: LoanStatus.PENDING })
  status: LoanStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejection_reason: string | null;

  /** User who submitted the application */
  @Column({ name: 'applied_by', type: 'uuid' })
  applied_by: string;

  /** Officer who approved or rejected */
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ name: 'disbursed_at', type: 'timestamptz', nullable: true })
  disbursed_at: Date | null;

  @Column({ name: 'disbursed_by', type: 'uuid', nullable: true })
  disbursed_by: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closed_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

// ---------------------------------------------------------------------------
// Loan sequence (per-year counter for human-readable loan numbers)
// ---------------------------------------------------------------------------

@Entity('loan_sequences')
export class LoanSequenceEntity {
  @PrimaryColumn({ name: 'year', type: 'integer' })
  year: number;

  @Column({ name: 'last_seq', type: 'integer', default: 0 })
  last_seq: number;
}

// ---------------------------------------------------------------------------
// Repayment schedule
// ---------------------------------------------------------------------------

@Entity('loan_repayment_schedules')
export class RepaymentScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loan_id: string;

  @Column({ name: 'installment_number', type: 'integer' })
  installment_number: number;

  @Column({ name: 'due_date', type: 'date' })
  due_date: string; // returned as 'YYYY-MM-DD' string from PostgreSQL

  @Column({ name: 'principal_amount', type: 'numeric', precision: 18, scale: 2 })
  principal_amount: string;

  @Column({ name: 'interest_amount', type: 'numeric', precision: 18, scale: 2 })
  interest_amount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2 })
  total_amount: string;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  paid_amount: string;

  @Column({ name: 'status', type: 'enum', enum: RepaymentStatus, default: RepaymentStatus.PENDING })
  status: RepaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paid_at: Date | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminder_sent_at: Date | null;
}

// ---------------------------------------------------------------------------
// Loan payment (receipt per recorded payment)
// ---------------------------------------------------------------------------

@Entity('loan_payments')
export class LoanPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loan_id: string;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  schedule_id: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transaction_id: string | null;

  @Column({ name: 'amount', type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ name: 'currency', type: 'enum', enum: LoanCurrency })
  currency: LoanCurrency;

  @Column({ name: 'payment_date', type: 'timestamptz' })
  payment_date: Date;

  @Column({ name: 'recorded_by', type: 'uuid' })
  recorded_by: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Loan penalty
// ---------------------------------------------------------------------------

@Entity('loan_penalties')
export class LoanPenaltyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loan_id: string;

  @Column({ name: 'schedule_id', type: 'uuid' })
  schedule_id: string;

  @Column({ name: 'penalty_rate', type: 'numeric', precision: 5, scale: 4 })
  penalty_rate: string;

  @Column({ name: 'penalty_amount', type: 'numeric', precision: 18, scale: 2 })
  penalty_amount: string;

  @Column({ name: 'applied_at', type: 'timestamptz' })
  applied_at: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Loan reminder (audit trail of overdue notifications)
// ---------------------------------------------------------------------------

@Entity('loan_reminders')
export class LoanReminderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loan_id: string;

  @Column({ name: 'schedule_id', type: 'uuid' })
  schedule_id: string;

  @Column({ name: 'channel', type: 'enum', enum: ReminderChannel })
  channel: ReminderChannel;

  @Column({ name: 'status', type: 'enum', enum: ReminderStatus })
  status: ReminderStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sent_at: Date;
}

// ---------------------------------------------------------------------------
// Loan document
// ---------------------------------------------------------------------------

@Entity('loan_documents')
export class LoanDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loan_id: string;

  @Column({ name: 'document_type', type: 'enum', enum: LoanDocumentType })
  document_type: LoanDocumentType;

  @Column({ name: 'file_name', type: 'text' })
  file_name: string;

  @Column({ name: 'file_url', type: 'text' })
  file_url: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploaded_by: string;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploaded_at: Date;
}

