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
  nameEn: string | null;
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
  postedByName: string | null;
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
  accountCode?: string;
  accountName?: string;
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

// ── General Ledger ────────────────────────────────────────────────────────────

export interface GeneralLedgerLineRecord {
  journalEntryId: string;
  reference: string;
  date: Date;
  description: string | null;
  debit: number;
  credit: number;
  currency: string;
  /** Running balance in account's normal direction (positive = healthy). */
  runningBalance: number;
}

export interface GeneralLedgerAccountRecord {
  accountId: string;
  code: string;
  name: string;
  type: ChartAccountType;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  lines: GeneralLedgerLineRecord[];
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

export interface BalanceSheetLineRecord {
  accountId: string;
  code: string;
  name: string;
  balance: number;
}

export interface BalanceSheetSectionRecord {
  type: ChartAccountType;
  accounts: BalanceSheetLineRecord[];
  total: number;
}

export interface BalanceSheetRecord {
  asOf: Date;
  assets: BalanceSheetSectionRecord;
  liabilities: BalanceSheetSectionRecord;
  equity: BalanceSheetSectionRecord;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

// ── Income Statement ──────────────────────────────────────────────────────────

export interface IncomeStatementLineRecord {
  accountId: string;
  code: string;
  name: string;
  amount: number;
}

export interface IncomeStatementRecord {
  from: Date;
  to: Date;
  income: { accounts: IncomeStatementLineRecord[]; total: number };
  expenses: { accounts: IncomeStatementLineRecord[]; total: number };
  netProfit: number;
}

export class AccountingMapper {
  static coaToDomain(entity: ChartOfAccountsEntity): ChartOfAccountsRecord {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      nameEn: entity.name_en,
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
    postedByName?: string | null,
  ): JournalEntryRecord {
    return {
      id: entity.id,
      reference: entity.reference,
      branchId: entity.branch_id,
      status: entity.status,
      reversalOf: entity.reversal_of,
      postedBy: entity.posted_by,
      postedByName: postedByName ?? null,
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
      accountCode: entity.chartAccount?.code,
      accountName: entity.chartAccount?.name,
      clientAccountId: entity.client_account_id,
      debit: Number(entity.debit),
      credit: Number(entity.credit),
      currency: entity.currency,
      description: entity.description,
    };
  }
}
