import { TransactionModel, TransactionModelProps } from './transaction.model';
import { Currency, TransactionType } from './transaction.enums';

const baseProps = (): TransactionModelProps => ({
  id: 'abc-123',
  accountId: 'acc-1',
  branchId: 'branch-1',
  type: TransactionType.DEPOSIT,
  amount: 100,
  currency: Currency.USD,
  balanceAfter: 100,
  reference: 'TXN-20260320-AABBCC',
  description: undefined,
  performedBy: 'user-1',
  createdAt: new Date('2026-03-20T10:00:00Z'),
});

describe('TransactionModel', () => {
  describe('create()', () => {
    it('creates a model when amount is positive', () => {
      const tx = TransactionModel.create(baseProps());
      expect(tx).toBeInstanceOf(TransactionModel);
      expect(tx.amount).toBe(100);
    });

    it('throws when amount is zero', () => {
      expect(() => TransactionModel.create({ ...baseProps(), amount: 0 })).toThrow(
        'Transaction amount must be positive',
      );
    });

    it('throws when amount is negative', () => {
      expect(() => TransactionModel.create({ ...baseProps(), amount: -50 })).toThrow(
        'Transaction amount must be positive',
      );
    });

    it('assigns all props correctly', () => {
      const props = baseProps();
      const tx = TransactionModel.create(props);
      expect(tx.id).toBe(props.id);
      expect(tx.accountId).toBe(props.accountId);
      expect(tx.branchId).toBe(props.branchId);
      expect(tx.type).toBe(props.type);
      expect(tx.currency).toBe(props.currency);
      expect(tx.balanceAfter).toBe(props.balanceAfter);
      expect(tx.reference).toBe(props.reference);
      expect(tx.performedBy).toBe(props.performedBy);
      expect(tx.createdAt).toBe(props.createdAt);
    });
  });

  describe('isDebit()', () => {
    const debitTypes = [
      TransactionType.WITHDRAWAL,
      TransactionType.TRANSFER_OUT,
      TransactionType.FEE,
      TransactionType.PENALTY,
    ];

    const creditTypes = [
      TransactionType.DEPOSIT,
      TransactionType.TRANSFER_IN,
      TransactionType.LOAN_DISBURSEMENT,
      TransactionType.LOAN_REPAYMENT,
    ];

    debitTypes.forEach((type) => {
      it(`returns true for ${type}`, () => {
        const tx = TransactionModel.create({ ...baseProps(), type });
        expect(tx.isDebit()).toBe(true);
      });
    });

    creditTypes.forEach((type) => {
      it(`returns false for ${type}`, () => {
        const tx = TransactionModel.create({ ...baseProps(), type });
        expect(tx.isDebit()).toBe(false);
      });
    });
  });

  describe('isCredit()', () => {
    it('returns true for DEPOSIT', () => {
      const tx = TransactionModel.create({ ...baseProps(), type: TransactionType.DEPOSIT });
      expect(tx.isCredit()).toBe(true);
    });

    it('returns false for WITHDRAWAL', () => {
      const tx = TransactionModel.create({ ...baseProps(), type: TransactionType.WITHDRAWAL });
      expect(tx.isCredit()).toBe(false);
    });
  });
});
