import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { TransactionModel } from './transaction.model';
import { TransferModel } from './transfer.model';
import { Currency, TransactionType } from './transaction.enums';
import {
  DepositDto,
  ExternalTransferDto,
  InternalTransferDto,
  WithdrawalDto,
} from './transaction.dto';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440003';
const USER_ID = '550e8400-e29b-41d4-a716-446655440004';
const TX_ID = '550e8400-e29b-41d4-a716-446655440010';

function makeTx(overrides: Partial<TransactionModel> = {}): TransactionModel {
  return {
    id: TX_ID,
    accountId: ACCOUNT_ID,
    branchId: BRANCH_ID,
    type: TransactionType.DEPOSIT,
    amount: 100,
    currency: Currency.USD,
    balanceAfter: 100,
    reference: 'TXN-20260320-AABBCC',
    description: undefined,
    performedBy: USER_ID,
    createdAt: new Date(),
    isDebit: () => false,
    isCredit: () => true,
    ...overrides,
  } as TransactionModel;
}

function makeTransfer(overrides: Partial<TransferModel> = {}): TransferModel {
  return {
    id: '550e8400-e29b-41d4-a716-446655440020',
    debitTransactionId: TX_ID,
    creditTransactionId: undefined,
    isInternal: false,
    recipientName: undefined,
    feeAmount: 0,
    claimReference: undefined,
    ...overrides,
  } as TransferModel;
}

describe('TransactionController', () => {
  let controller: TransactionController;
  let service: jest.Mocked<TransactionService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<TransactionService> = {
      deposit: jest.fn(),
      withdraw: jest.fn(),
      internalTransfer: jest.fn(),
      externalTransfer: jest.fn(),
      findAll: jest.fn(),
      findByAccount: jest.fn(),
      findById: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [{ provide: TransactionService, useValue: mockService }],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get(TransactionService);
  });

  describe('deposit()', () => {
    it('calls service.deposit and returns the result', async () => {
      const dto: DepositDto = {
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 500,
        currency: Currency.USD,
        performedBy: USER_ID,
      };
      const tx = makeTx();
      service.deposit.mockResolvedValue(tx);

      const result = await controller.deposit(dto);

      expect(service.deposit).toHaveBeenCalledWith(dto);
      expect(result).toBe(tx);
    });
  });

  describe('withdraw()', () => {
    it('calls service.withdraw and returns the result', async () => {
      const dto: WithdrawalDto = {
        accountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 200,
        currency: Currency.USD,
        performedBy: USER_ID,
      };
      const tx = makeTx({ type: TransactionType.WITHDRAWAL });
      service.withdraw.mockResolvedValue(tx);

      const result = await controller.withdraw(dto);

      expect(service.withdraw).toHaveBeenCalledWith(dto);
      expect(result).toBe(tx);
    });
  });

  describe('internalTransfer()', () => {
    it('calls service.internalTransfer and returns the result', async () => {
      const dto: InternalTransferDto = {
        sourceAccountId: ACCOUNT_ID,
        destinationAccountId: '550e8400-e29b-41d4-a716-446655440002',
        branchId: BRANCH_ID,
        amount: 300,
        currency: Currency.USD,
        performedBy: USER_ID,
      };
      const payload = {
        debit: makeTx({ type: TransactionType.TRANSFER_OUT }),
        credit: makeTx({ type: TransactionType.TRANSFER_IN }),
        transfer: makeTransfer({ isInternal: true }),
      };
      service.internalTransfer.mockResolvedValue(payload);

      const result = await controller.internalTransfer(dto);

      expect(service.internalTransfer).toHaveBeenCalledWith(dto);
      expect(result).toBe(payload);
    });
  });

  describe('externalTransfer()', () => {
    it('calls service.externalTransfer and returns the result', async () => {
      const dto: ExternalTransferDto = {
        sourceAccountId: ACCOUNT_ID,
        branchId: BRANCH_ID,
        amount: 1000,
        currency: Currency.USD,
        recipientName: 'Jane Doe',
        performedBy: USER_ID,
      };
      const payload = {
        debit: makeTx({ type: TransactionType.TRANSFER_OUT }),
        fee: makeTx({ type: TransactionType.FEE, amount: 10 }),
        transfer: makeTransfer({ isInternal: false, feeAmount: 10 }),
      };
      service.externalTransfer.mockResolvedValue(payload);

      const result = await controller.externalTransfer(dto);

      expect(service.externalTransfer).toHaveBeenCalledWith(dto);
      expect(result).toBe(payload);
    });
  });

  describe('findAll()', () => {
    it('calls service.findAll and returns the result', async () => {
      const txs = [makeTx(), makeTx({ id: 'other-id' })];
      service.findAll.mockResolvedValue(txs);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBe(txs);
    });
  });

  describe('findByAccount()', () => {
    it('calls service.findByAccount with the account id and returns the result', async () => {
      const txs = [makeTx()];
      service.findByAccount.mockResolvedValue(txs);

      const result = await controller.findByAccount(ACCOUNT_ID);

      expect(service.findByAccount).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(result).toBe(txs);
    });
  });

  describe('findOne()', () => {
    it('calls service.findById with the id and returns the result', async () => {
      const tx = makeTx();
      service.findById.mockResolvedValue(tx);

      const result = await controller.findOne(TX_ID);

      expect(service.findById).toHaveBeenCalledWith(TX_ID);
      expect(result).toBe(tx);
    });
  });
});
