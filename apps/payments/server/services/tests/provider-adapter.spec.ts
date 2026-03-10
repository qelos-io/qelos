import * as ProviderAdapter from '../provider-adapter';

const mockCallPluginsService = jest.fn();
const mockCallContentService = jest.fn();

jest.mock('@qelos/api-kit', () => ({
  service: (name: string) => {
    if (name === 'PLUGINS') return mockCallPluginsService;
    if (name === 'CONTENT') return mockCallContentService;
    return jest.fn();
  },
}));

describe('provider-adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const basePlan = {
    _id: 'plan-1',
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 290,
    currency: 'USD',
    externalIds: {
      paddle: { productId: 'prod-1', monthlyPriceId: 'pri-monthly', yearlyPriceId: 'pri-yearly' },
      paypal: { productId: 'paypal-plan-1' },
    },
  };

  const baseCheckoutParams: ProviderAdapter.CheckoutParams = {
    plan: basePlan,
    billingCycle: 'monthly',
    billableEntityType: 'user',
    billableEntityId: 'user-1',
    amount: 29,
    currency: 'USD',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  };

  describe('getPaymentsConfiguration', () => {
    it('should return config from content service', async () => {
      mockCallContentService.mockResolvedValue({
        data: {
          value: {
            providerSourceId: 'src-1',
            providerKind: 'paddle',
          },
        },
      });

      const config = await ProviderAdapter.getPaymentsConfiguration('tenant-1');
      expect(config.providerSourceId).toBe('src-1');
      expect(config.providerKind).toBe('paddle');
    });

    it('should throw PAYMENTS_NOT_CONFIGURED when config is missing', async () => {
      mockCallContentService.mockResolvedValue({ data: {} });

      try {
        await ProviderAdapter.getPaymentsConfiguration('tenant-1');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('PAYMENTS_NOT_CONFIGURED');
      }
    });

    it('should throw when providerSourceId is missing', async () => {
      mockCallContentService.mockResolvedValue({
        data: { value: { providerKind: 'paddle' } },
      });

      try {
        await ProviderAdapter.getPaymentsConfiguration('tenant-1');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('PAYMENTS_NOT_CONFIGURED');
      }
    });
  });

  describe('createCheckout', () => {
    describe('paddle', () => {
      it('should call plugins service with correct paddle params for monthly', async () => {
        mockCallPluginsService.mockResolvedValue({
          data: { data: { id: 'sub_ext', checkout: { url: 'https://checkout.paddle.com/xxx' } } },
        });

        const result = await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paddle', baseCheckoutParams);

        expect(result.checkoutUrl).toBe('https://checkout.paddle.com/xxx');
        expect(result.externalSubscriptionId).toBe('sub_ext');
        expect(mockCallPluginsService).toHaveBeenCalledWith(expect.objectContaining({
          method: 'POST',
          url: '/internal-api/integration-sources/src-1/trigger',
          data: expect.objectContaining({
            operation: 'createSubscription',
            payload: expect.objectContaining({
              items: [{ price_id: 'pri-monthly', quantity: 1 }],
            }),
          }),
        }));
      });

      it('should use yearly price ID for yearly billing', async () => {
        mockCallPluginsService.mockResolvedValue({ data: { data: { id: 'sub_ext' } } });

        await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paddle', {
          ...baseCheckoutParams,
          billingCycle: 'yearly',
        });

        expect(mockCallPluginsService).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({
            payload: expect.objectContaining({
              items: [{ price_id: 'pri-yearly', quantity: 1 }],
            }),
          }),
        }));
      });

      it('should throw MISSING_EXTERNAL_PRICE_ID when price ID is not configured', async () => {
        const noPricePlan = { ...basePlan, externalIds: {} };

        try {
          await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paddle', {
            ...baseCheckoutParams,
            plan: noPricePlan,
          });
          fail('should have thrown');
        } catch (e: any) {
          expect(e.code).toBe('MISSING_EXTERNAL_PRICE_ID');
        }
      });
    });

    describe('paypal', () => {
      it('should call plugins service with correct paypal params', async () => {
        mockCallPluginsService.mockResolvedValue({
          data: {
            id: 'sub_pp_1',
            links: [{ rel: 'approve', href: 'https://paypal.com/approve/xxx' }],
          },
        });

        const result = await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paypal', baseCheckoutParams);

        expect(result.checkoutUrl).toBe('https://paypal.com/approve/xxx');
        expect(result.externalSubscriptionId).toBe('sub_pp_1');
        expect(mockCallPluginsService).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({
            operation: 'createSubscription',
            payload: expect.objectContaining({
              plan_id: 'paypal-plan-1',
              application_context: expect.objectContaining({
                return_url: 'https://example.com/success',
                cancel_url: 'https://example.com/cancel',
              }),
            }),
          }),
        }));
      });

      it('should throw MISSING_EXTERNAL_PRICE_ID when paypal product ID is missing', async () => {
        const noPricePlan = { ...basePlan, externalIds: {} };

        try {
          await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paypal', {
            ...baseCheckoutParams,
            plan: noPricePlan,
          });
          fail('should have thrown');
        } catch (e: any) {
          expect(e.code).toBe('MISSING_EXTERNAL_PRICE_ID');
        }
      });
    });

    describe('sumit', () => {
      it('should call plugins service with correct sumit params', async () => {
        mockCallPluginsService.mockResolvedValue({
          data: {
            PaymentUrl: 'https://sumit.co.il/pay/xxx',
            RecurringPaymentId: 123,
          },
        });

        const result = await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'sumit', baseCheckoutParams);

        expect(result.checkoutUrl).toBe('https://sumit.co.il/pay/xxx');
        expect(result.externalSubscriptionId).toBe('123');
        expect(mockCallPluginsService).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({
            operation: 'createRecurringPayment',
            payload: expect.objectContaining({
              Amount: 29,
              Currency: 'USD',
              RecurringInterval: 1,
              RecurringIntervalType: 'month',
            }),
          }),
        }));
      });

      it('should use 12 month interval for yearly billing', async () => {
        mockCallPluginsService.mockResolvedValue({ data: { RecurringPaymentId: 456 } });

        await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'sumit', {
          ...baseCheckoutParams,
          billingCycle: 'yearly',
        });

        expect(mockCallPluginsService).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({
            payload: expect.objectContaining({
              RecurringInterval: 12,
            }),
          }),
        }));
      });
    });

    it('should throw UNSUPPORTED_PROVIDER for unknown provider', async () => {
      try {
        await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'stripe', baseCheckoutParams);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('UNSUPPORTED_PROVIDER');
      }
    });
  });

  describe('cancelProviderSubscription', () => {
    it('should call paddle cancel with correct params', async () => {
      mockCallPluginsService.mockResolvedValue({ data: { success: true } });

      const result = await ProviderAdapter.cancelProviderSubscription(
        'tenant-1', 'src-1', 'paddle', 'sub_ext_1',
      );

      expect(result.success).toBe(true);
      expect(mockCallPluginsService).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          operation: 'cancelSubscription',
          payload: expect.objectContaining({
            subscriptionId: 'sub_ext_1',
            effective_from: 'next_billing_period',
          }),
        }),
      }));
    });

    it('should throw UNSUPPORTED_PROVIDER for unknown provider', async () => {
      try {
        await ProviderAdapter.cancelProviderSubscription('tenant-1', 'src-1', 'stripe', 'sub-1');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('UNSUPPORTED_PROVIDER');
      }
    });
  });
});
