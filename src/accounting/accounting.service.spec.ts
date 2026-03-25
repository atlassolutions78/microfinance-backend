import { NotFoundException } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingRepository } from './accounting.repository';
import {
  ChartOfAccountsEntity,
  JournalEntryEntity,
  JournalLineEntity,
} from './accounting.entity';
import { COA_CODES, ChartAccountType } from './accounting.enums';

const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID   = '550e8400-e29b-41d4-a716-446655440002';

// ── In-memory stub repository ─────────────────────────────────────────────────

type SavedEntry = { entry: JournalEntryEntity; lines: JournalLineEntity[] };

function makeStubCoa(code: string): ChartOfAccountsEntity {
  const e = new ChartOfAccountsEntity();
  e.id = `coa-${code}`;
  e.code = code;
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
    coaMap.set(code, makeStubCoa(code));
  }

  const repo = {
    findChartAccount: async (code: string) => {
      const entity = coaMap.get(code);
      if (!entity)
        throw new NotFoundException(`Chart account not found: ${code}`);
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
  return saved[entryIndex].lines.filter((l) => Number(l.debit) > 0);
}

function creditLines(saved: SavedEntry[], entryIndex = 0) {
  return saved[entryIndex].lines.filter((l) => Number(l.credit) > 0);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AccountingService', () => {
  // ── postDeposit ─────────────────────────────────────────────────────────────
  describe('postDeposit()', () => {
    it('creates one journal entry', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(
        500, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(saved).toHaveLength(1);
    });

    it('reference matches JE-YYYYMMDD-XXXXXX format', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(
        500, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(saved[0].entry.reference).toMatch(/^JE-\d{8}-[0-9A-F]{6}$/);
    });

    it('creates exactly 2 lines', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(
        500, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(saved[0].lines).toHaveLength(2);
    });

    it('debit line uses the teller account', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(
        500, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(debitLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.TELLER_USD}`,
      );
    });

    it('credit line uses the customer savings account', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(
        500, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.CUSTOMER_SAVINGS_USD}`,
      );
    });

    it('both lines carry the correct amount and currency', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(
        500, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(Number(debitLines(saved)[0].debit)).toBe(500);
      expect(Number(creditLines(saved)[0].credit)).toBe(500);
      expect(saved[0].lines.every((l) => l.currency === 'USD')).toBe(true);
    });

    it('entry is balanced', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postDeposit(
        1000, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      const debits  = saved[0].lines.reduce((s, l) => s + Number(l.debit), 0);
      const credits = saved[0].lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(debits).toBe(credits);
    });

    it('throws when teller account code is not found', async () => {
      const { repo } = makeStubRepo([COA_CODES.CUSTOMER_SAVINGS_USD]);
      const svc = new AccountingService(repo);
      await expect(
        svc.postDeposit(
          500, 'USD',
          COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
          BRANCH_ID, USER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── postWithdrawal ───────────────────────────────────────────────────────────
  describe('postWithdrawal()', () => {
    it('debit line uses customer savings account', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postWithdrawal(
        200, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(debitLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.CUSTOMER_SAVINGS_USD}`,
      );
    });

    it('credit line uses teller account', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postWithdrawal(
        200, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.TELLER_USD}`,
      );
    });

    it('entry is balanced', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postWithdrawal(
        300, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.CUSTOMER_SAVINGS_USD,
        BRANCH_ID, USER_ID,
      );
      const debits  = saved[0].lines.reduce((s, l) => s + Number(l.debit), 0);
      const credits = saved[0].lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(debits).toBe(credits);
    });
  });

  // ── postLoanRepaymentFromSavings ─────────────────────────────────────────────
  describe('postLoanRepaymentFromSavings()', () => {
    it('creates 3 lines for principal + interest (no penalty)', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postLoanRepaymentFromSavings(
        100, 10, 0, 'USD',
        COA_CODES.CUSTOMER_SAVINGS_USD, COA_CODES.LOANS_ORDINARY_USD,
        COA_CODES.INTEREST_ORDINARY_LOAN_USD,  COA_CODES.PENALTY_INCOME_USD,
        BRANCH_ID, USER_ID,
      );
      expect(saved[0].lines).toHaveLength(3);
    });

    it('creates 4 lines when penalty > 0', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postLoanRepaymentFromSavings(
        75, 5, 20, 'USD',
        COA_CODES.CUSTOMER_SAVINGS_USD, COA_CODES.LOANS_ORDINARY_USD,
        COA_CODES.INTEREST_ORDINARY_LOAN_USD,  COA_CODES.PENALTY_INCOME_USD,
        BRANCH_ID, USER_ID,
      );
      expect(saved[0].lines).toHaveLength(4);
    });

    it('entry is balanced with penalty', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postLoanRepaymentFromSavings(
        75, 5, 20, 'USD',
        COA_CODES.CUSTOMER_SAVINGS_USD, COA_CODES.LOANS_ORDINARY_USD,
        COA_CODES.INTEREST_ORDINARY_LOAN_USD,  COA_CODES.PENALTY_INCOME_USD,
        BRANCH_ID, USER_ID,
      );
      const debits  = saved[0].lines.reduce((s, l) => s + Number(l.debit), 0);
      const credits = saved[0].lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(debits).toBe(credits);
    });
  });

  // ── postVaultToTeller ────────────────────────────────────────────────────────
  describe('postVaultToTeller()', () => {
    it('creates one balanced entry', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      await svc.postVaultToTeller(
        2000, 'USD',
        COA_CODES.TELLER_USD, COA_CODES.VAULT_MAIN_USD,
        BRANCH_ID, USER_ID,
      );
      expect(saved).toHaveLength(1);
      const debits  = saved[0].lines.reduce((s, l) => s + Number(l.debit), 0);
      const credits = saved[0].lines.reduce((s, l) => s + Number(l.credit), 0);
      expect(debits).toBe(credits);
    });
  });

  // ── postReversal ─────────────────────────────────────────────────────────────
  describe('postReversal()', () => {
    it('flips debit and credit of original lines', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      const originalLines = [
        { accountCode: COA_CODES.TELLER_USD,          debit: 300, credit: 0,   currency: 'USD' },
        { accountCode: COA_CODES.CUSTOMER_SAVINGS_USD, debit: 0,   credit: 300, currency: 'USD' },
      ];
      await svc.postReversal(originalLines, 'JE-2026-022', BRANCH_ID, USER_ID);
      expect(Number(debitLines(saved)[0].debit)).toBe(300);
      expect(Number(creditLines(saved)[0].credit)).toBe(300);
      expect(debitLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.CUSTOMER_SAVINGS_USD}`,
      );
      expect(creditLines(saved)[0].account_id).toBe(
        `coa-${COA_CODES.TELLER_USD}`,
      );
    });

    it('sets reversal_of on the saved entry', async () => {
      const { repo, saved } = makeStubRepo();
      const svc = new AccountingService(repo);
      const originalLines = [
        { accountCode: COA_CODES.TELLER_USD,          debit: 300, credit: 0,   currency: 'USD' },
        { accountCode: COA_CODES.CUSTOMER_SAVINGS_USD, debit: 0,   credit: 300, currency: 'USD' },
      ];
      await svc.postReversal(originalLines, 'JE-2026-022', BRANCH_ID, USER_ID);
      expect(saved[0].entry.reversal_of).toBe('JE-2026-022');
    });
  });
});
