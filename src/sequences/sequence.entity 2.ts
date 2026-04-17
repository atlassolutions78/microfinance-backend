import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Tracks the last issued sequence number per branch, reference type, and date.
 * One row per (branch_id, type, date) triple — created on first use each day.
 *
 * Used to generate human-readable references like JE-KGL-20260416-00001.
 */
@Entity('reference_sequences')
export class ReferenceSequenceEntity {
  @PrimaryColumn({ type: 'uuid', name: 'branch_id' })
  branch_id: string;

  /** Reference type prefix: JE, TLR, or RMT */
  @PrimaryColumn({ type: 'varchar', length: 10 })
  type: string;

  /** Business date: YYYY-MM-DD. Sequence resets to 0 each new day. */
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ type: 'integer', default: 0 })
  last_seq: number;
}

/**
 * Single-row table that tracks the global client number sequence.
 * Always has exactly one row (id = 1).
 */
@Entity('client_sequences')
export class ClientSequenceEntity {
  @PrimaryColumn({ type: 'integer' })
  id: number; // Always 1

  @Column({ type: 'integer', default: 0 })
  last_seq: number;
}
