import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BranchEntity } from '../settings/branch.entity';
import {
  ClientSequenceEntity,
  ReferenceSequenceEntity,
} from './sequence.entity';

export type ReferenceType = 'JE' | 'TLR' | 'RMT';

@Injectable()
export class SequenceService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generates the next sequential reference for a journal entry, teller
   * transaction, or remittance.
   *
   * Format: {TYPE}-{BRANCH_CODE}-{YYYYMMDD}-{NNNNN}
   * Example: JE-KGL-20260416-00001
   *
   * The sequence resets to 00001 each calendar day, per branch, per type.
   * Uses a pessimistic write lock to guarantee uniqueness under concurrent requests.
   */
  async nextReference(branchId: string, type: ReferenceType): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      let seq = await manager.findOne(ReferenceSequenceEntity, {
        where: { branch_id: branchId, type, date },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seq) {
        seq = manager.create(ReferenceSequenceEntity, {
          branch_id: branchId,
          type,
          date,
          last_seq: 0,
        });
      }

      seq.last_seq += 1;
      await manager.save(ReferenceSequenceEntity, seq);

      const branch = await manager.findOne(BranchEntity, {
        where: { id: branchId },
      });
      const branchCode = (branch?.code ?? 'UNK').toUpperCase();
      const dateFormatted = date.replace(/-/g, ''); // YYYYMMDD

      return `${type}-${branchCode}-${dateFormatted}-${String(seq.last_seq).padStart(5, '0')}`;
    });
  }

  /**
   * Generates the next global client number.
   *
   * Format: CL-{NNNNNNNN}
   * Example: CL-00000042
   *
   * Uses a pessimistic write lock to guarantee uniqueness under concurrent requests.
   */
  async nextClientNumber(): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      let seq = await manager.findOne(ClientSequenceEntity, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seq) {
        seq = manager.create(ClientSequenceEntity, { id: 1, last_seq: 0 });
      }

      seq.last_seq += 1;
      await manager.save(ClientSequenceEntity, seq);

      return `CL-${String(seq.last_seq).padStart(8, '0')}`;
    });
  }
}
