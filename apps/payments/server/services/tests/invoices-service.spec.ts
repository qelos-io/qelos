import * as InvoicesService from '../invoices-service';
import Invoice from '../../models/invoice';

jest.mock('../../models/invoice');

const MockInvoice = Invoice as any;

describe('invoices-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    MockInvoice.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    MockInvoice.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockInvoice.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockInvoice.mockImplementation((data) => ({
      ...data,
      _id: 'inv-1',
      save: jest.fn().mockResolvedValue({ _id: 'inv-1', ...data }),
    }));
  }

  describe('listInvoices', () => {
    it('should query invoices with tenant only when no filters', async () => {
      await InvoicesService.listInvoices('tenant-1');
      expect(MockInvoice.find).toHaveBeenCalledWith({ tenant: 'tenant-1' });
    });

    it('should pass billableEntityType filter', async () => {
      await InvoicesService.listInvoices('tenant-1', { billableEntityType: 'user' });
      expect(MockInvoice.find).toHaveBeenCalledWith({
        tenant: 'tenant-1',
        billableEntityType: 'user',
      });
    });

    it('should pass billableEntityId filter', async () => {
      await InvoicesService.listInvoices('tenant-1', { billableEntityId: 'user-1' });
      expect(MockInvoice.find).toHaveBeenCalledWith({
        tenant: 'tenant-1',
        billableEntityId: 'user-1',
      });
    });

    it('should pass status filter', async () => {
      await InvoicesService.listInvoices('tenant-1', { status: 'paid' });
      expect(MockInvoice.find).toHaveBeenCalledWith({
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
      expect(MockInvoice.find).toHaveBeenCalledWith({
        tenant: 'tenant-1',
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        status: 'paid',
      });
    });
  });

  describe('getInvoiceById', () => {
    it('should throw INVOICE_NOT_FOUND when invoice does not exist', async () => {
      try {
        await InvoicesService.getInvoiceById('tenant-1', 'nonexistent');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVOICE_NOT_FOUND');
      }
    });

    it('should return invoice when found', async () => {
      const mockInvoice = { _id: 'inv-1', tenant: 'tenant-1', amount: 29 };
      MockInvoice.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockInvoice),
        }),
      });

      const result = await InvoicesService.getInvoiceById('tenant-1', 'inv-1');
      expect(result).toEqual(mockInvoice);
      expect(MockInvoice.findOne).toHaveBeenCalledWith({ _id: 'inv-1', tenant: 'tenant-1' });
    });
  });

  describe('listByEntity', () => {
    it('should query by tenant, entity type, and entity id', async () => {
      await InvoicesService.listByEntity('tenant-1', 'user', 'user-1');
      expect(MockInvoice.find).toHaveBeenCalledWith({
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

      expect(result).toBeDefined();
      expect(result._id).toBe('inv-1');
      expect(MockInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: 'tenant-1',
          billableEntityType: 'user',
          billableEntityId: 'user-1',
          amount: 29,
          currency: 'USD',
          status: 'pending',
          items: [],
        }),
      );
    });

    it('should accept custom currency and status', async () => {
      await InvoicesService.createInvoice('tenant-1', {
        billableEntityType: 'workspace',
        billableEntityId: 'ws-1',
        amount: 100,
        currency: 'EUR',
        status: 'paid',
      });

      expect(MockInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'EUR',
          status: 'paid',
        }),
      );
    });

    it('should store subscription and provider details', async () => {
      await InvoicesService.createInvoice('tenant-1', {
        subscriptionId: 'sub-1',
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        amount: 29,
        externalInvoiceId: 'ext-inv-1',
        providerKind: 'paddle',
        invoiceUrl: 'https://paddle.com/invoice/123',
      });

      expect(MockInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub-1',
          externalInvoiceId: 'ext-inv-1',
          providerKind: 'paddle',
          invoiceUrl: 'https://paddle.com/invoice/123',
        }),
      );
    });

    it('should store line items', async () => {
      const items = [
        { description: 'Pro subscription', amount: 29, quantity: 1 },
      ];

      await InvoicesService.createInvoice('tenant-1', {
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        amount: 29,
        items,
      });

      expect(MockInvoice).toHaveBeenCalledWith(
        expect.objectContaining({ items }),
      );
    });

    it('should store period and payment dates', async () => {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 86400000);

      await InvoicesService.createInvoice('tenant-1', {
        billableEntityType: 'user',
        billableEntityId: 'user-1',
        amount: 29,
        paidAt: now,
        periodStart: now,
        periodEnd: nextMonth,
      });

      expect(MockInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAt: now,
          periodStart: now,
          periodEnd: nextMonth,
        }),
      );
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should throw INVOICE_NOT_FOUND when invoice does not exist', async () => {
      try {
        await InvoicesService.updateInvoiceStatus('tenant-1', 'nonexistent', 'paid');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVOICE_NOT_FOUND');
      }
    });

    it('should update invoice status', async () => {
      const mockInvoice = { _id: 'inv-1', status: 'paid' };
      MockInvoice.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockInvoice),
        }),
      });

      const result = await InvoicesService.updateInvoiceStatus('tenant-1', 'inv-1', 'paid');
      expect(result.status).toBe('paid');
      expect(MockInvoice.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'inv-1', tenant: 'tenant-1' },
        { $set: { status: 'paid' } },
        { new: true },
      );
    });

    it('should merge additional updates', async () => {
      const now = new Date();
      const mockInvoice = { _id: 'inv-1', status: 'paid', paidAt: now };
      MockInvoice.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockInvoice),
        }),
      });

      await InvoicesService.updateInvoiceStatus('tenant-1', 'inv-1', 'paid', { paidAt: now });

      expect(MockInvoice.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'inv-1', tenant: 'tenant-1' },
        { $set: { status: 'paid', paidAt: now } },
        { new: true },
      );
    });
  });
});
