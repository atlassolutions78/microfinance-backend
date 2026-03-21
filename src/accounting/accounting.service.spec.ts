import { NotFoundException } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingRepository } from './accounting.repository';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import {
  COA_CODES,
  ChartAccountType,
  JournalLineSide,
  JournalOperationType,
} from './accounting.enums';

const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';

// ── In-memory stub repository ─────────────────────────────────────────────────

type SavedEntry = { entry: JournalEntryEntity; lines: JournalLineEntity[] };

function makeStubCoa(code: string, currency = 'USD'): ChartOfAccountsEntity {
  const e = new ChartOfAccountsEntity();
  e.id = `coa-${code}-${currency}`;
  e.code = code;
  e.currency = currency;
  e.branch_id = BRANCH_ID;
  e.name = code;
  e.type = ChartAccountType.ASSET;
  e.is_active = true;
  return e;
}

function makeStubRepo(knownCodes: string[] = Object.values(COA_CODES)): {
  repo: AccountingRepository;
  saved: SavedEntry[];
} {
  const saved: SavedEntry[] = [];
  const coaMap = new Map<string, ChartOfAccountsEntity>();
  for (const code of knownCodes) {
    for (const currency of ['USD', 'FC']) {
      coaMap.set(`${code}:${currency}`, makeStubCoa(code, currency));
    }
  }

  const repo = {
    findChartAccount: async (
      code: string,
      _branchId: string,
      currency: string,
    ) => {
      const entity = coaMap.get(`${code}:${currency}`);
      if (!entity)
        throw new NotFoundException(
          `Chart account not found: ${code}/${currency}`,
        );
      return entity;
    },
    saveEntry: async (
      entry: JournalEntryEntity,
      lines: JournalLineEntity[],
    ) => {
      saved.push({ entry, lines });
    },
    findAll: async () => [],
    findById: async () => null,
    findChartAccounts: async () => [],
  } as unknown as AccountingRepository;

  return { repo, saved };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function debitLines(saved: SavedEntry[], entryIndex = 0) {
  return saved[entryIndex].lines.filter(
    (l) => l.side === JournalLineSide.DEBIT,
  );
}

function creditLines(saved: SavedEntry[], entryIndex = 0) {
  return saved[entryIndex].lines.filter(
    (l) => l.side === JournalLineSide.CREDIT,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AccountingService', () => {
  // ── postDeposit ─────────────────────────────────────────────────────────────
  describe('postDeposit()', () => {
    it('creates one journal entry with operationType=DEPOSIT', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(500, 'USD', BRANCH_ID, USER_ID);
      expect(saved).toHaveLength(1);
      expect(saved[0].entry.operation_type).toBe(JournalOperationType.DEPOSIT);
    });

    it('reference matches JE-YYYYMMDD-XXXXXX format', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(500, 'USD', BRANCH_ID, USER_ID);
      expect(saved[0].entry.reference).toMatch(/^JE-\d{8}-[0-9A-F]{6}$/);
    });

    it('creates exactly 2 lines', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(500, 'USD', BRANCH_ID, USER_ID);
      expect(saved[0].lines).toHaveLength(2);
    });

    it('DEBIT line uses CASH account', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(500, 'USD', BRANCH_ID, USER_ID);
      expect(debitLines(saved)[0].account_id).toBe(`coa-${COA_CODES.CASH}-USD`);
    });

    it('CREDIT line uses MEMBER_DEPOSITS account', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(500, 'USD', BRANCH_ID, USER_ID);
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.MEMBER_DEPOSITS}-USD`,
      );
    });

    it('both lines carry the correct amount and currency', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(500, 'USD', BRANCH_ID, USER_ID);
      expect(Number(debitLines(saved)[0].amount)).toBe(500);
      expect(Number(creditLines(saved)[0].amount)).toBe(500);
      expect(saved[0].lines.every((l) => l.currency === 'USD')).toBe(true);
    });

    it('entry is balanced', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(1000, 'USD', BRANCH_ID, USER_ID);
      const debits = debitLines(saved).reduce(
        (s, l) => s + Number(l.amount),
        0,
      );
      const credits = creditLines(saved).reduce(
        (s, l) => s + Number(l.amount),
        0,
      );
      expect(debits).toBe(credits);
    });

    it('throws if CASH chart account not found for branch', async () => {
      const { repo } = makeStubRepo(['MEMBER_DEPOSITS']); // CASH missing
      const svc = new AccountingService(repo);
      await expect(
        svc.postDeposit(500, 'USD', BRANCH_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── postWithdrawal ───────────────────────────────────────────────────────────
  describe('postWithdrawal()', () => {
    it('DEBIT line uses MEMBER_DEPOSITS', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postWithdrawal(200, 'USD', BRANCH_ID, USER_ID);
      expect(debitLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.MEMBER_DEPOSITS}-USD`,
      );
    });

    it('CREDIT line uses CASH', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postWithdrawal(200, 'USD', BRANCH_ID, USER_ID);
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.CASH}-USD`,
      );
    });

    it('entry is balanced', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postWithdrawal(300, 'USD', BRANCH_ID, USER_ID);
      const debits = debitLines(saved).reduce(
        (s, l) => s + Number(l.amount),
        0,
      );
      const credits = creditLines(saved).reduce(
        (s, l) => s + Number(l.amount),
        0,
      );
      expect(debits).toBe(credits);
    });
  });

  // ── postInternalTransfer ─────────────────────────────────────────────────────
  describe('postInternalTransfer()', () => {
    it('DEBIT line uses MEMBER_DEPOSITS', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postInternalTransfer(100, 'USD', BRANCH_ID, USER_ID);
      expect(debitLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.MEMBER_DEPOSITS}-USD`,
      );
    });

    it('CREDIT line uses MEMBER_DEPOSITS', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postInternalTransfer(100, 'USD', BRANCH_ID, USER_ID);
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.MEMBER_DEPOSITS}-USD`,
      );
    });

    it('entry is balanced', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postInternalTransfer(150, 'USD', BRANCH_ID, USER_ID);
      const debits = debitLines(saved).reduce(
        (s, l) => s + Number(l.amount),
        0,
      );
      const credits = creditLines(saved).reduce(
        (s, l) => s + Number(l.amount),
        0,
      );
      expect(debits).toBe(credits);
    });
  });

  // ── postExternalTransfer ─────────────────────────────────────────────────────
  describe('postExternalTransfer()', () => {
    it('creates 2 journal entries (one TRANSFER, one FEE_PENALTY)', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postExternalTransfer(1000, 10, 'USD', BRANCH_ID, USER_ID);
      expect(saved).toHaveLength(2);
      expect(saved[0].entry.operation_type).toBe(JournalOperationType.TRANSFER);
      expect(saved[1].entry.operation_type).toBe(
        JournalOperationType.FEE_PENALTY,
      );
    });

    it('transfer entry: DEBIT MEMBER_DEPOSITS, CREDIT CASH', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postExternalTransfer(1000, 10, 'USD', BRANCH_ID, USER_ID);
      expect(debitLines(saved, 0)[0].account_id).toBe(
        `coa-${COA_CODES.MEMBER_DEPOSITS}-USD`,
      );
      expect(creditLines(saved, 0)[0].account_id).toBe(
        `coa-${COA_CODES.CASH}-USD`,
      );
    });

    it('fee entry: DEBIT CASH, CREDIT FEE_INCOME', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postExternalTransfer(1000, 10, 'USD', BRANCH_ID, USER_ID);
      expect(debitLines(saved, 1)[0].account_id).toBe(
        `coa-${COA_CODES.CASH}-USD`,
      );
      expect(creditLines(saved, 1)[0].account_id).toBe(
        `coa-${COA_CODES.FEE_INCOME}-USD`,
      );
    });

    it('both entries are individually balanced', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postExternalTransfer(1000, 10, 'USD', BRANCH_ID, USER_ID);
      for (const s of saved) {
        const debits = s.lines
          .filter((l) => l.side === JournalLineSide.DEBIT)
          .reduce((a, l) => a + Number(l.amount), 0);
        const credits = s.lines
          .filter((l) => l.side === JournalLineSide.CREDIT)
          .reduce((a, l) => a + Number(l.amount), 0);
        expect(debits).toBe(credits);
      }
    });

    it('skips fee entry when feeAmount is 0', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postExternalTransfer(1000, 0, 'USD', BRANCH_ID, USER_ID);
      expect(saved).toHaveLength(1);
    });
  });

  // ── postFeePenalty ───────────────────────────────────────────────────────────
  describe('postFeePenalty()', () => {
    it('CREDIT uses FEE_INCOME when isPenalty=false', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postFeePenalty(50, false, 'USD', BRANCH_ID, USER_ID);
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.FEE_INCOME}-USD`,
      );
    });

    it('CREDIT uses PENALTY_INCOME when isPenalty=true', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postFeePenalty(50, true, 'USD', BRANCH_ID, USER_ID);
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.PENALTY_INCOME}-USD`,
      );
    });
  });
});
