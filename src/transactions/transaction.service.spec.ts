import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionService } from './transaction.service';
import { TransactionRepository } from './transaction.repository';
import { TransactionModel } from './transaction.model';
import { TransferModel } from './transfer.model';
import { Currency, TransactionType } from './transaction.enums';
import {
  DepositDto,
  ExternalTransferDto,
  InternalTransferDto,
  WithdrawalDto,
} from './transaction.dto';
import { AccountService } from '../accounts/account.service';
import { AccountModel } from '../accounts/account.model';
import {
  AccountStatus,
  AccountType,
  AccountCurrency,
} from '../accounts/account.enums';
import { AccountingService } from '../accounting/accounting.service';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const ACCOUNT_ID_2 = '550e8400-e29b-41d4-a716-446655440002';
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440003';
const USER_ID = '550e8400-e29b-41d4-a716-446655440004';

// ── Fakes ─────────────────────────────────────────────────────────────────────

const fakeDataSource = {
  transaction: async (cb: (em: unknown) => Promise<void>) => cb({}),
} as unknown as DataSource;

function makeStubRepo(): TransactionRepository {
  const transactions = new Map<string, TransactionModel>();
  const transfers = new Map<string, TransferModel>();

  return {
    save: async (tx: TransactionModel) => {
      transactions.set(tx.id, tx);
    },
    saveTransfer: async (transfer: TransferModel) => {
      transfers.set(transfer.id, transfer);
    },
    async getBalance(accountId: string): Promise<number> {
      let latest: TransactionModel | null = null;
      for (const tx of transactions.values()) {
        if (tx.accountId === accountId) {
          if (!latest || tx.createdAt.getTime() > latest.createdAt.getTime()) {
            latest = tx;
          }
        }
      }
      return latest ? latest.balanceAfter : 0;
    },
    async findById(id: string): Promise<TransactionModel | null> {
      return transactions.get(id) ?? null;
    },
    async findByAccountId(accountId: string): Promise<TransactionModel[]> {
      return Array.from(transactions.values())
        .filter((tx) => tx.accountId === accountId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async findAll(): Promise<TransactionModel[]> {
      return Array.from(transactions.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    },
    async findTransferByDebitId(
      debitTxId: string,
    ): Promise<TransferModel | null> {
      for (const t of transfers.values()) {
        if (t.debitTransactionId === debitTxId) return t;
      }
      return null;
    },
    setBalance: async () => {},
  } as unknown as TransactionRepository;
}

function makeActiveAccount(id: string): AccountModel {
  return new AccountModel({
    id,
    accountNumber: `50 001\\2 serie 433`,
    clientId: '00000000-0000-0000-0000-000000000001',
    branchId: BRANCH_ID,
    accountType: AccountType.SAVINGS,
    currency: AccountCurrency.USD,
    status: AccountStatus.ACTIVE,
    balance: 0,
    openedBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeAccountService(
  accountMap: Map<string, AccountModel> = new Map([
    [ACCOUNT_ID, makeActiveAccount(ACCOUNT_ID)],
    [ACCOUNT_ID_2, makeActiveAccount(ACCOUNT_ID_2)],
  ]),
): AccountService {
  const svc = new AccountService(null as any, null as any);
  Object.assign(svc, {
    findById: async (id: string) => {
      const acc = accountMap.get(id);
      if (!acc) throw new NotFoundException(`Account ${id} not found`);
      return acc;
    },
    recordBalance: jest.fn(),
  });
  return svc;
}

function makeAccountingService(): AccountingService & {
  postDeposit: jest.Mock;
  postWithdrawal: jest.Mock;
  postInternalTransfer: jest.Mock;
  postExternalTransfer: jest.Mock;
} {
  const svc = new AccountingService(null as any);
  const mock = {
    postDeposit: jest.fn(),
    postWithdrawal: jest.fn(),
    postInternalTransfer: jest.fn(),
    postExternalTransfer: jest.fn(),
  };
  Object.assign(svc, mock);
  return svc as any;
}

function makeService(
  repo?: TransactionRepository,
  accountSvc?: AccountService,
  accountingSvc?: AccountingService,
): {
  service: TransactionService;
  repo: TransactionRepository;
  accounting: ReturnType<typeof makeAccountingService>;
} {
  const r = repo ?? makeStubRepo();
  const a = accountSvc ?? makeAccountService();
  const ac = (accountingSvc as any) ?? makeAccountingService();
  const service = new TransactionService(r, a, ac, fakeDataSource);
  return { service, repo: r, accounting: ac };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransactionService', () => {
  let repo: TransactionRepository;
  let service: TransactionService;
  let accounting: ReturnType<typeof makeAccountingService>;

  beforeEach(() => {
    const result = makeService();
    repo = result.repo;
    service = result.service;
    accounting = result.accounting;
  });

  // ─── deposit ────────────────────────────────────────────────────────────────

  describe('deposit()', () => {
    const dto: DepositDto = {
      accountId: ACCOUNT_ID,
      branchId: BRANCH_ID,
      amount: 500,
      currency: Currency.USD,
      performedBy: USER_ID,
    };

    it('returns a DEPOSIT transaction', async () => {
      const tx = await service.deposit(dto);
      expect(tx).toBeInstanceOf(TransactionModel);
      expect(tx.type).toBe(TransactionType.DEPOSIT);
    });

    it('sets balanceAfter to amount when account starts at zero', async () => {
      const tx = await service.deposit(dto);
      expect(tx.balanceAfter).toBe(500);
    });

    it('accumulates balance across multiple deposits', async () => {
      await service.deposit(dto);
      const tx2 = await service.deposit({ ...dto, amount: 200 });
      expect(tx2.balanceAfter).toBe(700);
    });

    it('generates a reference matching TXN-YYYYMMDD-XXXXXX format', async () => {
      const tx = await service.deposit(dto);
      expect(tx.reference).toMatch(/^TXN-\d{8}-[0-9A-F]{6}$/);
    });

    it('stores the transaction so it can be retrieved', async () => {
      const tx = await service.deposit(dto);
      const found = await service.findById(tx.id);
      expect(found.id).toBe(tx.id);
    });

    it('sets description when provided', async () => {
      const tx = await service.deposit({
        ...dto,
        description: 'Salary credit',
      });
      expect(tx.description).toBe('Salary credit');
    });

    it('sets description to undefined when not provided', async () => {
      const tx = await service.deposit(dto);
      expect(tx.description).toBeUndefined();
    });

    it('throws BadRequestException when account is SUSPENDED', async () => {
      const suspendedAccount = makeActiveAccount(ACCOUNT_ID);
      Object.assign(suspendedAccount, { status: AccountStatus.SUSPENDED });
      const { service: svc } = makeService(
        undefined,
        makeAccountService(new Map([[ACCOUNT_ID, suspendedAccount]])),
      );
      await expect(svc.deposit(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when account is CLOSED', async () => {
      const closedAccount = makeActiveAccount(ACCOUNT_ID);
      Object.assign(closedAccount, { status: AccountStatus.CLOSED });
      const { service: svc } = makeService(
        undefined,
        makeAccountService(new Map([[ACCOUNT_ID, closedAccount]])),
      );
      await expect(svc.deposit(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── deposit — accounting integration ───────────────────────────────────────

  describe('deposit() — accounting integration', () => {
    const dto: DepositDto = {
      accountId: ACCOUNT_ID,
      branchId: BRANCH_ID,
      amount: 500,
      currency: Currency.USD,
      performedBy: USER_ID,
    };

    it('calls accountingService.postDeposit() with correct args', async () => {
      await service.deposit(dto);
      expect(accounting.postDeposit).toHaveBeenCalledWith(
        500,
        Currency.USD,
        BRANCH_ID,
        USER_ID,
        undefined,
        expect.anything(),
      );
    });

    it('does NOT call postDeposit when account status blocks the deposit', async () => {
      const suspendedAccount = makeActiveAccount(ACCOUNT_ID);
      Object.assign(suspendedAccount, { status: AccountStatus.SUSPENDED });
      const ac = makeAccountingService();
      const { service: svc } = makeService(
        undefined,
        makeAccountService(new Map([[ACCOUNT_ID, suspendedAccount]])),
        ac,
      );
      await expect(svc.deposit(dto)).rejects.toThrow();
      expect(ac.postDeposit).not.toHaveBeenCalled();
    });
  });

  // ─── withdraw ───────────────────────────────────────────────────────────────

  describe('withdraw()', () => {
    const dto: WithdrawalDto = {
      accountId: ACCOUNT_ID,
      branchId: BRANCH_ID,
      amount: 200,
      currency: Currency.USD,
      performedBy: USER_ID,
    };

    beforeEach(async () => {
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 500,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
    });

    it('returns a WITHDRAWAL transaction', async () => {
      const tx = await service.withdraw(dto);
      expect(tx.type).toBe(TransactionType.WITHDRAWAL);
    });

    it('deducts amount from balance', async () => {
      const tx = await service.withdraw(dto);
      expect(tx.balanceAfter).toBe(300);
    });

    it('allows withdrawal of exact balance', async () => {
      const tx = await service.withdraw({ ...dto, amount: 500 });
      expect(tx.balanceAfter).toBe(0);
    });

    it('throws BadRequestException when amount exceeds balance', async () => {
      await expect(service.withdraw({ ...dto, amount: 600 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when account has no balance', async () => {
      const emptyDto: WithdrawalDto = { ...dto, accountId: ACCOUNT_ID_2 };
      await expect(service.withdraw(emptyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not update balance when withdrawal fails', async () => {
      await expect(
        service.withdraw({ ...dto, amount: 9999 }),
      ).rejects.toThrow();
      const balance = await repo.getBalance(ACCOUNT_ID);
      expect(balance).toBe(500);
    });

    it('calls assertSignaturePolicy for BUSINESS accounts (no-op currently)', async () => {
      const tx = await service.withdraw({ ...dto, accountType: 'BUSINESS' });
      expect(tx.type).toBe(TransactionType.WITHDRAWAL);
    });
  });

  // ─── withdraw — accounting integration ──────────────────────────────────────

  describe('withdraw() — accounting integration', () => {
    beforeEach(async () => {
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 500,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
    });

    it('calls accountingService.postWithdrawal() with correct args', async () => {
      await service.withdraw({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 200,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      expect(accounting.postWithdrawal).toHaveBeenCalledWith(
        200,
        Currency.USD,
        BRANCH_ID,
        USER_ID,
        undefined,
        expect.anything(),
      );
    });

    it('does NOT call postWithdrawal when insufficient balance', async () => {
      const ac = makeAccountingService();
      const { service: svc } = makeService(repo, undefined, ac);
      await expect(
        svc.withdraw({
          accountId: ACCOUNT_ID,
          branchId: BRANCH_ID,
          amount: 9999,
          currency: Currency.USD,
          performedBy: USER_ID,
        }),
      ).rejects.toThrow();
      expect(ac.postWithdrawal).not.toHaveBeenCalled();
    });
  });

  // ─── internalTransfer ───────────────────────────────────────────────────────

  describe('internalTransfer()', () => {
    const dto: InternalTransferDto = {
      sourceAccountId: ACCOUNT_ID,
      destinationAccountId: ACCOUNT_ID_2,
      branchId: BRANCH_ID,
      amount: 300,
      currency: Currency.USD,
      performedBy: USER_ID,
    };

    beforeEach(async () => {
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 1000,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
    });

    it('returns debit, credit, and transfer objects', async () => {
      const result = await service.internalTransfer(dto);
      expect(result.debit).toBeInstanceOf(TransactionModel);
      expect(result.credit).toBeInstanceOf(TransactionModel);
      expect(result.transfer).toBeInstanceOf(TransferModel);
    });

    it('debit transaction is TRANSFER_OUT', async () => {
      const { debit } = await service.internalTransfer(dto);
      expect(debit.type).toBe(TransactionType.TRANSFER_OUT);
    });

    it('credit transaction is TRANSFER_IN', async () => {
      const { credit } = await service.internalTransfer(dto);
      expect(credit.type).toBe(TransactionType.TRANSFER_IN);
    });

    it('deducts from source account', async () => {
      const { debit } = await service.internalTransfer(dto);
      expect(debit.balanceAfter).toBe(700);
    });

    it('credits destination account', async () => {
      const { credit } = await service.internalTransfer(dto);
      expect(credit.balanceAfter).toBe(300);
    });

    it('transfer is marked as internal with zero fee', async () => {
      const { transfer } = await service.internalTransfer(dto);
      expect(transfer.isInternal).toBe(true);
      expect(transfer.feeAmount).toBe(0);
    });

    it('links debit and credit transactions in the transfer record', async () => {
      const { debit, credit, transfer } = await service.internalTransfer(dto);
      expect(transfer.debitTransactionId).toBe(debit.id);
      expect(transfer.creditTransactionId).toBe(credit.id);
    });

    it('throws BadRequestException when source has insufficient balance', async () => {
      await expect(
        service.internalTransfer({ ...dto, amount: 2000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('saves both transactions so they appear in history', async () => {
      const { debit, credit } = await service.internalTransfer(dto);
      const sourceHistory = await service.findByAccount(ACCOUNT_ID);
      const destHistory = await service.findByAccount(ACCOUNT_ID_2);
      expect(sourceHistory.some((t) => t.id === debit.id)).toBe(true);
      expect(destHistory.some((t) => t.id === credit.id)).toBe(true);
    });

    it('calls accountingService.postInternalTransfer() once', async () => {
      await service.internalTransfer(dto);
      expect(accounting.postInternalTransfer).toHaveBeenCalledTimes(1);
    });
  });

  // ─── externalTransfer ───────────────────────────────────────────────────────

  describe('externalTransfer()', () => {
    const dto: ExternalTransferDto = {
      sourceAccountId: ACCOUNT_ID,
      branchId: BRANCH_ID,
      amount: 1000,
      currency: Currency.USD,
      recipientName: 'Jane Doe',
      performedBy: USER_ID,
    };

    beforeEach(async () => {
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 2000,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
    });

    it('returns debit, fee, and transfer objects', async () => {
      const result = await service.externalTransfer(dto);
      expect(result.debit).toBeInstanceOf(TransactionModel);
      expect(result.fee).toBeInstanceOf(TransactionModel);
      expect(result.transfer).toBeInstanceOf(TransferModel);
    });

    it('debit transaction is TRANSFER_OUT', async () => {
      const { debit } = await service.externalTransfer(dto);
      expect(debit.type).toBe(TransactionType.TRANSFER_OUT);
    });

    it('fee transaction is FEE', async () => {
      const { fee } = await service.externalTransfer(dto);
      expect(fee.type).toBe(TransactionType.FEE);
    });

    it('calculates 1% fee correctly', async () => {
      const { fee } = await service.externalTransfer(dto);
      expect(fee.amount).toBe(10); // 1% of 1000
    });

    it('deducts principal + fee from balance', async () => {
      const { fee } = await service.externalTransfer(dto);
      expect(fee.balanceAfter).toBe(990); // 2000 - 1000 - 10
    });

    it('transfer is marked as external (not internal)', async () => {
      const { transfer } = await service.externalTransfer(dto);
      expect(transfer.isInternal).toBe(false);
    });

    it('transfer has no credit transaction id', async () => {
      const { transfer } = await service.externalTransfer(dto);
      expect(transfer.creditTransactionId).toBeUndefined();
    });

    it('stores recipient name on the transfer record', async () => {
      const { transfer } = await service.externalTransfer(dto);
      expect(transfer.recipientName).toBe('Jane Doe');
    });

    it('stores fee amount on the transfer record', async () => {
      const { transfer } = await service.externalTransfer(dto);
      expect(transfer.feeAmount).toBe(10);
    });

    it('stores optional claimReference when provided', async () => {
      const { transfer } = await service.externalTransfer({
        ...dto,
        claimReference: 'CLAIM-001',
      });
      expect(transfer.claimReference).toBe('CLAIM-001');
    });

    it('throws BadRequestException when balance is insufficient for amount + fee', async () => {
      await expect(
        service.externalTransfer({ ...dto, amount: 1990 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rounds fee to 4 decimal places', async () => {
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 1000,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      const { fee } = await service.externalTransfer({ ...dto, amount: 333 });
      expect(fee.amount).toBe(3.33);
    });

    it('calls accountingService.postExternalTransfer() with amount and feeAmount', async () => {
      await service.externalTransfer(dto);
      expect(accounting.postExternalTransfer).toHaveBeenCalledWith(
        1000,
        10,
        Currency.USD,
        BRANCH_ID,
        USER_ID,
        undefined,
        expect.anything(),
      );
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns the transaction when it exists', async () => {
      const tx = await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 100,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      const found = await service.findById(tx.id);
      expect(found.id).toBe(tx.id);
    });

    it('throws NotFoundException when id does not exist', async () => {
      await expect(
        service.findById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findByAccount ──────────────────────────────────────────────────────────

  describe('findByAccount()', () => {
    it('returns only transactions for the given account', async () => {
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 100,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      await service.deposit({
        accountId: ACCOUNT_ID_2,
        branchId: BRANCH_ID,
        amount: 200,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      const history = await service.findByAccount(ACCOUNT_ID);
      expect(history).toHaveLength(1);
      expect(history[0].accountId).toBe(ACCOUNT_ID);
    });

    it('returns transactions sorted newest first', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 100,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      jest.setSystemTime(new Date('2026-01-01T10:01:00Z'));
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 200,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      jest.useRealTimers();
      const history = await service.findByAccount(ACCOUNT_ID);
      expect(history[0].amount).toBe(200);
      expect(history[1].amount).toBe(100);
    });

    it('returns empty array when account has no transactions', async () => {
      const history = await service.findByAccount(ACCOUNT_ID);
      expect(history).toHaveLength(0);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns all transactions across all accounts', async () => {
      await service.deposit({
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 100,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      await service.deposit({
        accountId: ACCOUNT_ID_2,
        branchId: BRANCH_ID,
        amount: 200,
        currency: Currency.USD,
        performedBy: USER_ID,
      });
      const all = await service.findAll();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when there are no transactions', async () => {
      const all = await service.findAll();
      expect(all).toHaveLength(0);
    });
  });
});
