import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const mockCallPluginsService = mock.fn();
const mockCallContentService = mock.fn();
const mockEmitPlatformEvent = mock.fn();

mock.module('@qelos/api-kit', {
  namedExports: {
    service: (name: string) => {
      if (name === 'PLUGINS') return mockCallPluginsService;
      if (name === 'CONTENT') return mockCallContentService;
      return mock.fn();
    },
    emitPlatformEvent: mockEmitPlatformEvent,
    getRouter: mock.fn(() => ({
      get: mock.fn().mockReturnThis(),
      post: mock.fn().mockReturnThis(),
      put: mock.fn().mockReturnThis(),
      delete: mock.fn().mockReturnThis(),
    })),
  },
});

describe('provider-adapter', async () => {
  const ProviderAdapter = await import('../provider-adapter');

  beforeEach(() => {
    mockCallPluginsService.mock.resetCalls();
    mockCallContentService.mock.resetCalls();
    mockEmitPlatformEvent.mock.resetCalls();
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

  const baseCheckoutParams: any = {
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
    it('should return config from content service internal API', async () => {
      mockCallContentService.mock.mockImplementation(async () => ({
        data: {
          key: 'payments-configuration',
          metadata: {
            providerSourceId: 'src-1',
            providerKind: 'paddle',
          },
        },
      }));

      const config = await ProviderAdapter.getPaymentsConfiguration('tenant-1');
      assert.strictEqual(config.providerSourceId, 'src-1');
      assert.strictEqual(config.providerKind, 'paddle');

      const callArgs = mockCallContentService.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.url, '/internal-api/configurations/payments-configuration');
    });

    it('should normalize admin UI paymentSourceId and resolve providerKind from integration source', async () => {
      mockCallContentService.mock.mockImplementation(async () => ({
        data: {
          key: 'payments-configuration',
          metadata: {
            isEnabled: true,
            paymentSourceId: 'src-1',
          },
        },
      }));
      mockCallPluginsService.mock.mockImplementation(async () => ({
        data: { kind: 'paddle' },
      }));

      const config = await ProviderAdapter.getPaymentsConfiguration('tenant-1');
      assert.strictEqual(config.providerSourceId, 'src-1');
      assert.strictEqual(config.providerKind, 'paddle');
    });

    it('should throw PAYMENTS_NOT_CONFIGURED when config is missing', async () => {
      mockCallContentService.mock.mockImplementation(async () => ({ data: {} }));

      await assert.rejects(() => ProviderAdapter.getPaymentsConfiguration('tenant-1'), (e: any) => {
        assert.strictEqual(e.code, 'PAYMENTS_NOT_CONFIGURED');
        assert.match(e.message, /missing a payment provider integration source/);
        return true;
      });

      assert.strictEqual(mockEmitPlatformEvent.mock.callCount(), 1);
      const event = mockEmitPlatformEvent.mock.calls[0].arguments[0];
      assert.strictEqual(event.eventName, 'provider-call-failed');
      assert.strictEqual(event.source, 'payments:unknown');
      assert.strictEqual(event.metadata.operation, 'getPaymentsConfiguration');
      assert.strictEqual(event.metadata.code, 'PAYMENTS_NOT_CONFIGURED');
    });

    it('should throw PAYMENTS_NOT_CONFIGURED when content service returns 404', async () => {
      mockCallContentService.mock.mockImplementation(async () => {
        throw {
          response: {
            status: 404,
            data: { message: 'configuration not exists' },
          },
        };
      });

      await assert.rejects(() => ProviderAdapter.getPaymentsConfiguration('tenant-1'), (e: any) => {
        assert.strictEqual(e.code, 'PAYMENTS_NOT_CONFIGURED');
        assert.match(e.message, /payments-configuration/);
        return true;
      });
    });

    it('should throw when payments are disabled', async () => {
      mockCallContentService.mock.mockImplementation(async () => ({
        data: {
          metadata: {
            isEnabled: false,
            paymentSourceId: 'src-1',
            providerKind: 'paddle',
          },
        },
      }));

      await assert.rejects(() => ProviderAdapter.getPaymentsConfiguration('tenant-1'), (e: any) => {
        assert.strictEqual(e.code, 'PAYMENTS_NOT_CONFIGURED');
        assert.match(e.message, /disabled/);
        return true;
      });
    });

    it('should throw when providerSourceId is missing', async () => {
      mockCallContentService.mock.mockImplementation(async () => ({
        data: { metadata: { providerKind: 'paddle' } },
      }));

      await assert.rejects(() => ProviderAdapter.getPaymentsConfiguration('tenant-1'), (e: any) => {
        assert.strictEqual(e.code, 'PAYMENTS_NOT_CONFIGURED');
        return true;
      });
    });
  });

  describe('createCheckout', () => {
    describe('paddle', () => {
      it('should call plugins service with correct paddle params for monthly', async () => {
        mockCallPluginsService.mock.mockImplementation(async () => ({
          data: { data: { id: 'sub_ext', checkout: { url: 'https://checkout.paddle.com/xxx' } } },
        }));

        const result = await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paddle', baseCheckoutParams);

        assert.strictEqual(result.checkoutUrl, 'https://checkout.paddle.com/xxx');
        assert.strictEqual(result.externalSubscriptionId, 'sub_ext');

        const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
        assert.strictEqual(callArgs.method, 'POST');
        assert.strictEqual(callArgs.url, '/internal-api/integration-sources/src-1/trigger');
        assert.strictEqual(callArgs.data.operation, 'createSubscription');
        assert.deepStrictEqual(callArgs.data.payload.items, [{ price_id: 'pri-monthly', quantity: 1 }]);
      });

      it('should use yearly price ID for yearly billing', async () => {
        mockCallPluginsService.mock.mockImplementation(async () => ({ data: { data: { id: 'sub_ext' } } }));

        await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paddle', {
          ...baseCheckoutParams,
          billingCycle: 'yearly',
        });

        const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
        assert.deepStrictEqual(callArgs.data.payload.items, [{ price_id: 'pri-yearly', quantity: 1 }]);
      });

      it('should throw MISSING_EXTERNAL_PRICE_ID when price ID is not configured', async () => {
        const noPricePlan = { ...basePlan, externalIds: {} };

        await assert.rejects(() => ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paddle', {
          ...baseCheckoutParams,
          plan: noPricePlan,
        }), (e: any) => {
          assert.strictEqual(e.code, 'MISSING_EXTERNAL_PRICE_ID');
          return true;
        });

        assert.strictEqual(mockEmitPlatformEvent.mock.callCount(), 1);
        const event = mockEmitPlatformEvent.mock.calls[0].arguments[0];
        assert.strictEqual(event.eventName, 'checkout-failed');
        assert.strictEqual(event.source, 'payments:paddle');
        assert.strictEqual(event.metadata.code, 'MISSING_EXTERNAL_PRICE_ID');
      });

      it('should emit provider-call-failed when plugins trigger call rejects', async () => {
        const providerError = { code: 'PROVIDER_ERROR', message: 'Integration call failed', status: 502 };
        mockCallPluginsService.mock.mockImplementation(async () => {
          throw providerError;
        });

        await assert.rejects(() => ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paddle', baseCheckoutParams), (e: any) => {
          assert.strictEqual(e.code, 'PROVIDER_ERROR');
          return true;
        });

        assert.strictEqual(mockEmitPlatformEvent.mock.callCount(), 1);
        const event = mockEmitPlatformEvent.mock.calls[0].arguments[0];
        assert.strictEqual(event.eventName, 'provider-call-failed');
        assert.strictEqual(event.source, 'payments:paddle');
        assert.strictEqual(event.metadata.operation, 'createSubscription');
        assert.strictEqual(event.metadata.providerResponse.sourceId, 'src-1');
        assert.deepStrictEqual(event.metadata.providerResponse.payloadSummary, { keys: ['items', 'custom_data'] });
      });
    });

    describe('paypal', () => {
      it('should call plugins service with correct paypal params', async () => {
        mockCallPluginsService.mock.mockImplementation(async () => ({
          data: {
            id: 'sub_pp_1',
            links: [{ rel: 'approve', href: 'https://paypal.com/approve/xxx' }],
          },
        }));

        const result = await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paypal', baseCheckoutParams);

        assert.strictEqual(result.checkoutUrl, 'https://paypal.com/approve/xxx');
        assert.strictEqual(result.externalSubscriptionId, 'sub_pp_1');

        const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
        assert.strictEqual(callArgs.data.operation, 'createSubscription');
        assert.strictEqual(callArgs.data.payload.plan_id, 'paypal-plan-1');
        assert.strictEqual(callArgs.data.payload.application_context.return_url, 'https://example.com/success');
      });

      it('should throw MISSING_EXTERNAL_PRICE_ID when paypal product ID is missing', async () => {
        const noPricePlan = { ...basePlan, externalIds: {} };

        await assert.rejects(() => ProviderAdapter.createCheckout('tenant-1', 'src-1', 'paypal', {
          ...baseCheckoutParams,
          plan: noPricePlan,
        }), (e: any) => {
          assert.strictEqual(e.code, 'MISSING_EXTERNAL_PRICE_ID');
          return true;
        });
      });
    });

    describe('sumit', () => {
      it('should call plugins service with correct sumit params', async () => {
        mockCallPluginsService.mock.mockImplementation(async () => ({
          data: {
            PaymentUrl: 'https://sumit.co.il/pay/xxx',
            RecurringPaymentId: 123,
          },
        }));

        const result = await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'sumit', baseCheckoutParams);

        assert.strictEqual(result.checkoutUrl, 'https://sumit.co.il/pay/xxx');
        assert.strictEqual(result.externalSubscriptionId, '123');

        const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
        assert.strictEqual(callArgs.data.operation, 'createRecurringPayment');
        assert.strictEqual(callArgs.data.payload.Amount, 29);
        assert.strictEqual(callArgs.data.payload.RecurringInterval, 1);
      });

      it('should use 12 month interval for yearly billing', async () => {
        mockCallPluginsService.mock.mockImplementation(async () => ({ data: { RecurringPaymentId: 456 } }));

        await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'sumit', {
          ...baseCheckoutParams,
          billingCycle: 'yearly',
        });

        const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
        assert.strictEqual(callArgs.data.payload.RecurringInterval, 12);
      });
    });

    describe('dodopayments', () => {
      const dodoBasePlan = {
        ...basePlan,
        externalIds: {
          ...basePlan.externalIds,
          dodopayments: { monthlyPriceId: 'dodo-monthly-price', yearlyPriceId: 'dodo-yearly-price' },
        },
      };

      it('should call plugins service with createSubscription for monthly billing', async () => {
        mockCallPluginsService.mock.mockImplementation(async () => ({
          data: { payment_link: 'https://checkout.dodopayments.com/xxx', subscription_id: 'sub_dodo_1' },
        }));

        const result = await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'dodopayments', {
          ...baseCheckoutParams,
          plan: dodoBasePlan,
        });

        assert.strictEqual(result.checkoutUrl, 'https://checkout.dodopayments.com/xxx');
        assert.strictEqual(result.externalSubscriptionId, 'sub_dodo_1');

        const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
        assert.strictEqual(callArgs.data.operation, 'createSubscription');
        assert.strictEqual(callArgs.data.payload.product_id, 'dodo-monthly-price');
      });

      it('should use yearly price ID for yearly billing', async () => {
        mockCallPluginsService.mock.mockImplementation(async () => ({
          data: { payment_link: 'https://checkout.dodopayments.com/yyy', subscription_id: 'sub_dodo_2' },
        }));

        await ProviderAdapter.createCheckout('tenant-1', 'src-1', 'dodopayments', {
          ...baseCheckoutParams,
          plan: dodoBasePlan,
          billingCycle: 'yearly',
        });

        const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
        assert.strictEqual(callArgs.data.payload.product_id, 'dodo-yearly-price');
      });

      it('should throw MISSING_EXTERNAL_PRICE_ID when price ID is not configured', async () => {
        const noPricePlan = { ...basePlan, externalIds: {} };

        await assert.rejects(() => ProviderAdapter.createCheckout('tenant-1', 'src-1', 'dodopayments', {
          ...baseCheckoutParams,
          plan: noPricePlan,
        }), (e: any) => {
          assert.strictEqual(e.code, 'MISSING_EXTERNAL_PRICE_ID');
          return true;
        });
      });
    });

    it('should throw UNSUPPORTED_PROVIDER for unknown provider', async () => {
      await assert.rejects(() => ProviderAdapter.createCheckout('tenant-1', 'src-1', 'stripe', baseCheckoutParams), (e: any) => {
        assert.strictEqual(e.code, 'UNSUPPORTED_PROVIDER');
        return true;
      });
    });
  });

  describe('cancelProviderSubscription', () => {
    it('should call paddle cancel with correct params', async () => {
      mockCallPluginsService.mock.mockImplementation(async () => ({ data: { success: true } }));

      const result = await ProviderAdapter.cancelProviderSubscription(
        'tenant-1', 'src-1', 'paddle', 'sub_ext_1',
      );

      assert.strictEqual(result.success, true);

      const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.data.operation, 'cancelSubscription');
      assert.strictEqual(callArgs.data.payload.subscriptionId, 'sub_ext_1');
      assert.strictEqual(callArgs.data.payload.effective_from, 'next_billing_period');
    });

    it('should call dodopayments cancel with correct params', async () => {
      mockCallPluginsService.mock.mockImplementation(async () => ({ data: {} }));

      await ProviderAdapter.cancelProviderSubscription('tenant-1', 'src-1', 'dodopayments', 'sub_dodo_1');

      const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.data.operation, 'cancelSubscription');
      assert.strictEqual(callArgs.data.payload.subscription_id, 'sub_dodo_1');
    });

    it('should throw UNSUPPORTED_PROVIDER for unknown provider', async () => {
      await assert.rejects(() => ProviderAdapter.cancelProviderSubscription('tenant-1', 'src-1', 'stripe', 'sub-1'), (e: any) => {
        assert.strictEqual(e.code, 'UNSUPPORTED_PROVIDER');
        return true;
      });
    });
  });

  describe('getProviderSubscription', () => {
    it('should call dodopayments getSubscription with correct params', async () => {
      mockCallPluginsService.mock.mockImplementation(async () => ({
        data: { id: 'sub_dodo_1', status: 'active' },
      }));

      await ProviderAdapter.getProviderSubscription('tenant-1', 'src-1', 'dodopayments', 'sub_dodo_1');

      const callArgs = mockCallPluginsService.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.data.operation, 'getSubscription');
      assert.strictEqual(callArgs.data.payload.subscription_id, 'sub_dodo_1');
    });

    it('should throw UNSUPPORTED_PROVIDER for unsupported provider', async () => {
      await assert.rejects(
        () => ProviderAdapter.getProviderSubscription('tenant-1', 'src-1', 'paypal', 'sub-1'),
        (e: any) => {
          assert.strictEqual(e.code, 'UNSUPPORTED_PROVIDER');
          return true;
        },
      );
    });
  });
});
