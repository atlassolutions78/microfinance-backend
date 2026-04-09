import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  AccountTxType,
  Currency,
  DenominationType,
  TellerSessionStatus,
  TellerTxType,
} from './teller.enums';

/**
 * Maps a branch to its dedicated vault and teller-aggregate COA entries.
 * One row per branch. Created lazily on the first teller session request
 * for that branch.
 *
 * Code scheme (XX = branch_seq, zero-padded to 2 digits):
 *   5702XX01  branch vault FC
 *   5702XX02  branch vault USD
 *   5703XX00  branch teller aggregate FC  (parent of all teller FC accounts)
 *   5703XX50  branch teller aggregate USD (parent of all teller USD accounts)
 */
@Entity('branch_coa_accounts')
export class BranchCoaAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', type: 'uuid', unique: true })
  branch_id: string;

  /** Sequential branch number (1-99) used to derive COA codes. */
  @Column({ name: 'branch_seq', type: 'integer' })
  branch_seq: number;

  @Column({ name: 'vault_fc_code', type: 'varchar', length: 20 })
  vault_fc_code: string;

  @Column({ name: 'vault_usd_code', type: 'varchar', length: 20 })
  vault_usd_code: string;

  /** Branch-level teller aggregate FC (parent of individual teller FC accounts). */
  @Column({ name: 'teller_fc_code', type: 'varchar', length: 20 })
  teller_fc_code: string;

  /** Branch-level teller aggregate USD (parent of individual teller USD accounts). */
  @Column({ name: 'teller_usd_code', type: 'varchar', length: 20 })
  teller_usd_code: string;

  @Column({ name: 'vault_fc_coa_id', type: 'uuid' })
  vault_fc_coa_id: string;

  @Column({ name: 'vault_usd_coa_id', type: 'uuid' })
  vault_usd_coa_id: string;

  @Column({ name: 'teller_fc_coa_id', type: 'uuid' })
  teller_fc_coa_id: string;

  @Column({ name: 'teller_usd_coa_id', type: 'uuid' })
  teller_usd_coa_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}

/**
 * Maps a teller (user) to their individual FC and USD COA entries.
 * One row per teller. Created lazily on the teller's first session request.
 *
 * Code scheme (XX = branch_seq, NN = teller_seq within branch):
 *   5703XXNN    teller FC   (NN = 01–49)
 *   5703XX(NN+50) teller USD (NN+50 = 51–99)
 */
@Entity('teller_coa_accounts')
export class TellerCoaAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'teller_id', type: 'uuid', unique: true })
  teller_id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branch_id: string;

  @Column({ name: 'fc_account_code', type: 'varchar', length: 20 })
  fc_account_code: string;

  @Column({ name: 'usd_account_code', type: 'varchar', length: 20 })
  usd_account_code: string;

  @Column({ name: 'fc_coa_id', type: 'uuid' })
  fc_coa_id: string;

  @Column({ name: 'usd_coa_id', type: 'uuid' })
  usd_coa_id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}

@Entity('teller_sessions')
export class TellerSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'teller_id', type: 'uuid' })
  teller_id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branch_id: string;

  /** Business date: YYYY-MM-DD. One session per teller per day. */
  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: TellerSessionStatus,
    enumName: 'teller_session_status_enum',
    default: TellerSessionStatus.REQUESTED,
  })
  status: TellerSessionStatus;

  // ── Float request ──────────────────────────────────────────────────────────

  @Column({
    name: 'requested_amount_fc',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  requested_amount_fc: number;

  @Column({
    name: 'requested_amount_usd',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  requested_amount_usd: number;

  // ── Approved by manager ────────────────────────────────────────────────────

  @Column({
    name: 'approved_amount_fc',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  approved_amount_fc: number;

  @Column({
    name: 'approved_amount_usd',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  approved_amount_usd: number;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  // ── Running cash position ──────────────────────────────────────────────────

  @Column({
    name: 'opening_cash_fc',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  opening_cash_fc: number;

  @Column({
    name: 'opening_cash_usd',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  opening_cash_usd: number;

  @Column({
    name: 'cash_in_fc',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  cash_in_fc: number;

  @Column({
    name: 'cash_in_usd',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  cash_in_usd: number;

  @Column({
    name: 'cash_out_fc',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  cash_out_fc: number;

  @Column({
    name: 'cash_out_usd',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  cash_out_usd: number;

  // ── EOD declared by teller ─────────────────────────────────────────────────

  @Column({
    name: 'declared_closing_cash_fc',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  declared_closing_cash_fc: number | null;

  @Column({
    name: 'declared_closing_cash_usd',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  declared_closing_cash_usd: number | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submitted_at: Date | null;

  // ── Reconciliation ─────────────────────────────────────────────────────────

  @Column({ name: 'reconciled_by', type: 'uuid', nullable: true })
  reconciled_by: string | null;

  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
  reconciled_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

@Entity('teller_transactions')
export class TellerTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  session_id: string;

  @Column({
    type: 'enum',
    enum: TellerTxType,
    enumName: 'teller_tx_type_enum',
  })
  type: TellerTxType;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ name: 'account_id', type: 'uuid' })
  account_id: string;

  /** Reference of the corresponding account transaction row. */
  @Column({ type: 'text' })
  reference: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}

// ── Client account transaction ledger ────────────────────────────────────────

@Entity('client_transactions')
export class ClientTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  account_id: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branch_id: string;

  @Column({
    type: 'enum',
    enum: AccountTxType,
    enumName: 'transactions_type_enum',
  })
  type: AccountTxType;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
    enumName: 'transactions_currency_enum',
  })
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

/**
 * One row per denomination per currency per event (float approval or EOD declaration).
 * The subtotal column (denomination × quantity) is stored for query convenience.
 */
@Entity('session_denominations')
export class SessionDenominationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  session_id: string;

  @Column({
    type: 'enum',
    enum: DenominationType,
    enumName: 'denomination_type_enum',
  })
  type: DenominationType;

  @Column({
    type: 'enum',
    enum: Currency,
    enumName: 'transactions_currency_enum',
  })
  currency: Currency;

  /** Face value of the note/coin (e.g. 5000 for a 5,000 FC note). */
  @Column({ type: 'integer' })
  denomination: number;

  /** Number of notes/coins of this denomination. */
  @Column({ type: 'integer' })
  quantity: number;

  /** denomination × quantity — stored for reporting convenience. */
  @Column({ type: 'numeric', precision: 18, scale: 4 })
  subtotal: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
