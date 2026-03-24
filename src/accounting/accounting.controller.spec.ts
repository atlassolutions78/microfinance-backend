import { NotFoundException } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeService(
  overrides: Partial<AccountingService> = {},
): AccountingService {
  const svc = new AccountingService(null as any);
  Object.assign(svc, overrides);
  return svc;
}

describe('AccountingController', () => {
  describe('findChartAccounts()', () => {
    it('calls service.findChartAccounts() and returns result', async () => {
      const accounts = [{ id: '1', code: '1101' }] as any[];
      const svc = makeService({ findChartAccounts: async () => accounts });
      const ctrl = new AccountingController(svc);
      const result = await ctrl.findChartAccounts();
      expect(result).toBe(accounts);
    });
  });

  describe('findEntries()', () => {
    it('calls service.findEntries() and returns result', async () => {
      const entries = [{ id: 'e1', reference: 'JE-20260321-AABBCC' }] as any[];
      const svc = makeService({ findEntries: async () => entries });
      const ctrl = new AccountingController(svc);
      const result = await ctrl.findEntries();
      expect(result).toBe(entries);
    });

    it('calls findGroupedEntries when grouped=true', async () => {
      const grouped = [{ entry: { id: 'e1' }, reversals: [] }] as any[];
      const svc = makeService({ findGroupedEntries: async () => grouped });
      const ctrl = new AccountingController(svc);
      const result = await ctrl.findEntries(BRANCH_ID, 'true');
      expect(result).toBe(grouped);
    });
  });

  describe('findEntry()', () => {
    it('returns entry when found', async () => {
      const entry = {
        id: 'e1',
        reference: 'JE-20260321-AABBCC',
        lines: [],
      } as any;
      const svc = makeService({ findEntryById: async () => entry });
      const ctrl = new AccountingController(svc);
      const result = await ctrl.findEntry('e1');
      expect(result).toBe(entry);
    });

    it('throws NotFoundException when service returns null', async () => {
      const svc = makeService({ findEntryById: async () => null });
      const ctrl = new AccountingController(svc);
      await expect(ctrl.findEntry('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
