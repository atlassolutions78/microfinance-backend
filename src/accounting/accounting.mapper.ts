import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import {
  ChartAccountType,
  JournalLineSide,
  JournalOperationType,
} from './accounting.enums';

export interface ChartOfAccountsRecord {
  id: string;
  code: string;
  name: string;
  type: ChartAccountType;
  currency: string;
  branchId: string;
  isActive: boolean;
}

export interface JournalEntryRecord {
  id: string;
  reference: string;
  operationType: JournalOperationType;
  branchId: string;
  performedBy: string;
  performedByName: string;
  description?: string;
  relatedReference?: string;
  createdAt: Date;
  lines: JournalLineRecord[];
}

export interface JournalLineRecord {
  id: string;
  journalEntryId: string;
  accountId: string;
  side: JournalLineSide;
  amount: number;
  currency: string;
}

export interface JournalEntryGroupRecord {
  entry: JournalEntryRecord;
  related: JournalEntryRecord[];
}

export class AccountingMapper {
  static coaToDomain(entity: ChartOfAccountsEntity): ChartOfAccountsRecord {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type,
      currency: entity.currency,
      branchId: entity.branch_id,
      isActive: entity.is_active,
    };
  }

  static entryToDomain(
    entity: JournalEntryEntity,
    performedByName?: string,
  ): JournalEntryRecord {
    return {
      id: entity.id,
      reference: entity.reference,
      operationType: entity.operation_type,
      branchId: entity.branch_id,
      performedBy: entity.performed_by,
      performedByName: performedByName ?? entity.performed_by,
      description: entity.description ?? undefined,
      relatedReference: entity.related_reference ?? undefined,
      createdAt: entity.created_at,
      lines: (entity.lines ?? []).map(AccountingMapper.lineToDomain),
    };
  }

  static lineToDomain(entity: JournalLineEntity): JournalLineRecord {
    return {
      id: entity.id,
      journalEntryId: entity.journal_entry_id,
      accountId: entity.account_id,
      side: entity.side,
      amount: Number(entity.amount),
      currency: entity.currency,
    };
  }
}
