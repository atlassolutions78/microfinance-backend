import { BadRequestException } from '@nestjs/common';
import { TransactionPolicy } from './transaction.policy';

describe('TransactionPolicy', () => {
  describe('assertSufficientBalance()', () => {
    it('does not throw when balance equals amount', () => {
      expect(() =>
        TransactionPolicy.assertSufficientBalance(100, 100, 'acc-1'),
      ).not.toThrow();
    });

    it('does not throw when balance exceeds amount', () => {
      expect(() =>
        TransactionPolicy.assertSufficientBalance(500, 100, 'acc-1'),
      ).not.toThrow();
    });

    it('throws BadRequestException when balance is less than amount', () => {
      expect(() =>
        TransactionPolicy.assertSufficientBalance(50, 100, 'acc-1'),
      ).toThrow(BadRequestException);
    });

    it('includes the account id in the error message', () => {
      expect(() =>
        TransactionPolicy.assertSufficientBalance(50, 100, 'acc-xyz'),
      ).toThrow('acc-xyz');
    });

    it('includes available and requested amounts in the error message', () => {
      expect(() =>
        TransactionPolicy.assertSufficientBalance(50, 100, 'acc-1'),
      ).toThrow('50');
    });

    it('throws when balance is zero', () => {
      expect(() =>
        TransactionPolicy.assertSufficientBalance(0, 0.01, 'acc-1'),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertAccountActive()', () => {
    it('is a no-op and does not throw', () => {
      expect(() =>
        TransactionPolicy.assertAccountActive('acc-1'),
      ).not.toThrow();
    });
  });

  describe('assertSignaturePolicy()', () => {
    it('is a no-op and does not throw for BUSINESS accounts', () => {
      expect(() =>
        TransactionPolicy.assertSignaturePolicy('BUSINESS', 'acc-1'),
      ).not.toThrow();
    });
  });
});
