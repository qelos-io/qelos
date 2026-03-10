import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const saveMock = mock.fn(async function (this: any) { return this; });

const findMock = mock.fn(() => ({
  sort: mock.fn(() => ({
    lean: mock.fn(() => ({
      exec: mock.fn(async () => []),
    })),
  })),
}));

const findOneMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));

const findOneAndUpdateMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));

function InvoiceConstructor(data: any) {
  return { ...data, _id: data._id || 'inv-1', save: saveMock.bind({ ...data, _id: data._id || 'inv-1' }) };
}
Object.assign(InvoiceConstructor, { find: findMock, findOne: findOneMock, findOneAndUpdate: findOneAndUpdateMock });

mock.module('../../models/invoice', { defaultExport: InvoiceConstructor });

describe('invoices-service', async () => {
  const InvoicesService = await import('../invoices-service');

  beforeEach(() => {
    findMock.mock.resetCalls();
    findOneMock.mock.resetCalls();
    findOneAndUpdateMock.mock.resetCalls();
    saveMock.mock.resetCalls();

    findOneMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));

    findOneAndUpdateMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));
  });

  describe('listInvoices', () => {
    it('should query invoices with tenant only when no filters', async () => {
      await InvoicesService.listInvoices('tenant-1');
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], { tenant: 'tenant-1' });
    });

    it('should pass billableEntityType filter', async () => {
      await InvoicesService.listInvoices('tenant-1', { billableEntityType: 'user' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'user',
      });
    });

    it('should pass billableEntityId filter', async () => {
      await InvoicesService.listInvoices('tenant-1', { billableEntityId: 'user-1' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityId: 'user-1',
      });
    });

    it('should pass status filter', async () => {
      await InvoicesService.listInvoices('tenant-1', { status: 'paid' });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        status: 'paid',
      });
    });

    it('should combine multiple filters', async () => {
      await InvoicesService.listInvoices('tenant-1', {
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        status: 'paid',
      });
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        status: 'paid',
      });
    });
  });

  describe('getInvoiceById', () => {
    it('should throw INVOICE_NOT_FOUND when invoice does not exist', async () => {
      await assert.rejects(() => InvoicesService.getInvoiceById('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'INVOICE_NOT_FOUND');
        return true;
      });
    });

    it('should return invoice when found', async () => {
      const mockInvoice = { _id: 'inv-1', tenant: 'tenant-1', amount: 29 };
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockInvoice),
        })),
      }));

      const result = await InvoicesService.getInvoiceById('tenant-1', 'inv-1');
      assert.deepStrictEqual(result, mockInvoice);
      assert.deepStrictEqual(findOneMock.mock.calls[0].arguments[0], { _id: 'inv-1', tenant: 'tenant-1' });
    });
  });

  describe('listByEntity', () => {
    it('should query by tenant, entity type, and entity id', async () => {
      await InvoicesService.listByEntity('tenant-1', 'user', 'user-1');
      assert.deepStrictEqual(findMock.mock.calls[0].arguments[0], {
        tenant: 'tenant-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
      });
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with required fields', async () => {
      const result = await InvoicesService.createInvoice('tenant-1', {
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        amount: 29,
      });

      assert.ok(result);
      assert.strictEqual(result._id, 'inv-1');
      assert.strictEqual(result.currency, 'USD');
      assert.strictEqual(result.status, 'pending');
    });

    it('should accept custom currency and status', async () => {
      const result = await InvoicesService.createInvoice('tenant-1', {
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        amount: 100,
        currency: 'EUR',
        status: 'paid',
      });

      assert.strictEqual(result.currency, 'EUR');
      assert.strictEqual(result.status, 'paid');
    });

    it('should store subscription and provider details', async () => {
      const result = await InvoicesService.createInvoice('tenant-1', {
        subscriptionId: 'sub-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        amount: 29,
        externalInvoiceId: 'ext-inv-1',
        providerKind: 'paddle',
        invoiceUrl: 'https://paddle.com/invoice/123',
      });

      assert.strictEqual(result.subscriptionId, 'sub-1');
      assert.strictEqual(result.externalInvoiceId, 'ext-inv-1');
      assert.strictEqual(result.providerKind, 'paddle');
    });

    it('should store line items', async () => {
      const items = [{ description: 'Pro subscription', amount: 29, quantity: 1 }];
      const result = await InvoicesService.createInvoice('tenant-1', {
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        amount: 29,
        items,
      });

      assert.deepStrictEqual(result.items, items);
    });

    it('should store period and payment dates', async () => {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 86400000);

      const result = await InvoicesService.createInvoice('tenant-1', {
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        amount: 29,
        paidAt: now,
        periodStart: now,
        periodEnd: nextMonth,
      });

      assert.strictEqual(result.paidAt, now);
      assert.strictEqual(result.periodStart, now);
      assert.strictEqual(result.periodEnd, nextMonth);
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should throw INVOICE_NOT_FOUND when invoice does not exist', async () => {
      await assert.rejects(() => InvoicesService.updateInvoiceStatus('tenant-1', 'nonexistent', 'paid'), (e: any) => {
        assert.strictEqual(e.code, 'INVOICE_NOT_FOUND');
        return true;
      });
    });

    it('should update invoice status', async () => {
      const mockInvoice = { _id: 'inv-1', status: 'paid' };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockInvoice),
        })),
      }));

      const result = await InvoicesService.updateInvoiceStatus('tenant-1', 'inv-1', 'paid');
      assert.strictEqual(result.status, 'paid');
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[0], { _id: 'inv-1', tenant: 'tenant-1' });
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { status: 'paid' } });
    });

    it('should merge additional updates', async () => {
      const now = new Date();
      const mockInvoice = { _id: 'inv-1', status: 'paid', paidAt: now };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => mockInvoice),
        })),
      }));

      await InvoicesService.updateInvoiceStatus('tenant-1', 'inv-1', 'paid', { paidAt: now });
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $set: { status: 'paid', paidAt: now } });
    });
  });
});
