import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RemittanceStatus } from './remittance.enums';
import { Currency } from '../teller/teller.enums';

@Entity('remittances')
export class RemittanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable reference given to the sender: RMT-YYYYMMDD-XXXXXX */
  @Column({ type: 'text', unique: true })
  reference: string;

  // ── Sending side ─────────────────────────────────────────────────────────────

  @Column({ name: 'sending_session_id', type: 'uuid' })
  sending_session_id: string;

  @Column({ name: 'sending_teller_id', type: 'uuid' })
  sending_teller_id: string;

  @Column({ name: 'sending_branch_id', type: 'uuid' })
  sending_branch_id: string;

  @Column({ name: 'receiving_branch_id', type: 'uuid' })
  receiving_branch_id: string;

  // ── Amount ───────────────────────────────────────────────────────────────────

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
    enumName: 'transactions_currency_enum',
  })
  currency: Currency;

  // ── Recipient info ───────────────────────────────────────────────────────────

  @Column({ name: 'recipient_name', type: 'text' })
  recipient_name: string;

  @Column({ name: 'recipient_id_number', type: 'text' })
  recipient_id_number: string;

  @Column({ name: 'recipient_phone', type: 'text', nullable: true })
  recipient_phone: string | null;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: RemittanceStatus,
    enumName: 'remittance_status_enum',
    default: RemittanceStatus.PENDING,
  })
  status: RemittanceStatus;

  // ── Payout (Leg 2) ───────────────────────────────────────────────────────────

  @Column({ name: 'payout_session_id', type: 'uuid', nullable: true })
  payout_session_id: string | null;

  @Column({ name: 'payout_teller_id', type: 'uuid', nullable: true })
  payout_teller_id: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paid_at: Date | null;

  // ── Cancellation ─────────────────────────────────────────────────────────────

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelled_by: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelled_at: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellation_reason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
