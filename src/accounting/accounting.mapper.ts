import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import { ChartAccountType, JournalEntryStatus } from './accounting.enums';

export interface ChartOfAccountsRecord {
  id: string;
  code: string;
  name: string;
  type: ChartAccountType;
  parentId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface JournalEntryRecord {
  id: string;
  reference: string;
  branchId: string;
  status: JournalEntryStatus;
  reversalOf: string | null;
  postedBy: string | null;
  postedAt: Date | null;
  transactionId: string | null;
  createdBy: string;
  createdByName: string;
  description?: string;
  createdAt: Date;
  lines: JournalLineRecord[];
}

export interface JournalLineRecord {
  id: string;
  journalEntryId: string;
  accountId: string;
  clientAccountId: string | null;
  debit: number;
  credit: number;
  currency: string;
  description: string | null;
}

export interface JournalEntryGroupRecord {
  entry: JournalEntryRecord;
  reversals: JournalEntryRecord[];
}

export class AccountingMapper {
  static coaToDomain(entity: ChartOfAccountsEntity): ChartOfAccountsRecord {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type,
      parentId: entity.parent_id,
      isActive: entity.is_active,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
    };
  }

  static entryToDomain(
    entity: JournalEntryEntity,
    createdByName?: string,
  ): JournalEntryRecord {
    return {
      id: entity.id,
      reference: entity.reference,
      branchId: entity.branch_id,
      status: entity.status,
      reversalOf: entity.reversal_of,
      postedBy: entity.posted_by,
      postedAt: entity.posted_at,
      transactionId: entity.transaction_id,
      createdBy: entity.created_by,
      createdByName: createdByName ?? entity.created_by,
      description: entity.description ?? undefined,
      createdAt: entity.created_at,
      lines: (entity.lines ?? []).map(AccountingMapper.lineToDomain),
    };
  }

  static lineToDomain(entity: JournalLineEntity): JournalLineRecord {
    return {
      id: entity.id,
      journalEntryId: entity.journal_entry_id,
      accountId: entity.account_id,
      clientAccountId: entity.client_account_id,
      debit: Number(entity.debit),
      credit: Number(entity.credit),
      currency: entity.currency,
      description: entity.description,
    };
  }
}
