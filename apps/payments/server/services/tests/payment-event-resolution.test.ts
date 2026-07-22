import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildPaymentAdminSuggestions,
  buildPaymentEventDescription,
  extractSumitProviderError,
  resolvePaymentProviderPublicContext,
} from '@qelos/global-types';

describe('payment-event-resolution', () => {
  it('extractSumitProviderError keeps user-facing Sumit messages', () => {
    const result = extractSumitProviderError({
      Status: 'Error',
      UserErrorMessage: 'Invalid API key',
      TechnicalErrorDetails: 'Auth failed',
      Credentials: { APIKey: 'secret', CompanyID: 123 },
    });

    assert.deepStrictEqual(result, {
      Status: 'Error',
      UserErrorMessage: 'Invalid API key',
      TechnicalErrorDetails: 'Auth failed',
    });
  });

  it('buildPaymentAdminSuggestions maps Sumit credential failures', () => {
    const suggestions = buildPaymentAdminSuggestions({
      providerKind: 'sumit',
      operation: 'beginCheckoutRedirect',
      code: 'INTEGRATION_TARGET_FAILED',
      status: 401,
      message: 'Sumit API request failed with status 401',
      providerError: {
        UserErrorMessage: 'Invalid API key',
      },
    });

    assert.ok(suggestions.some((item) => item.summary.includes('Verify Sumit API credentials')));
    assert.ok(suggestions.some((item) => item.action.includes('Integrations → Sumit')));
  });

  it('buildPaymentAdminSuggestions maps dynamic amount issues', () => {
    const suggestions = buildPaymentAdminSuggestions({
      code: 'DYNAMIC_AMOUNT_NOT_SET',
    });

    assert.strictEqual(suggestions.length, 1);
    assert.match(suggestions[0].action, /dynamicAmount/);
  });

  it('buildPaymentEventDescription appends Sumit user message', () => {
    const description = buildPaymentEventDescription(
      'Provider call failed: beginCheckoutRedirect',
      { UserErrorMessage: 'Invalid API key' },
    );

    assert.strictEqual(description, 'Provider call failed: beginCheckoutRedirect: Invalid API key');
  });

  it('resolvePaymentProviderPublicContext maps provider public account identifiers', () => {
    assert.deepStrictEqual(
      resolvePaymentProviderPublicContext('sumit', { companyId: '476778618' }, 'source-1'),
      {
        providerSourceId: 'source-1',
        providerPublicAccountId: '476778618',
      },
    );

    assert.deepStrictEqual(
      resolvePaymentProviderPublicContext('paypal', { clientId: 'paypal-client', environment: 'sandbox' }, 'source-2'),
      {
        providerSourceId: 'source-2',
        providerPublicAccountId: 'paypal-client',
        providerEnvironment: 'sandbox',
      },
    );

    assert.deepStrictEqual(
      resolvePaymentProviderPublicContext('paddle', { environment: 'live' }, 'source-3'),
      {
        providerSourceId: 'source-3',
        providerEnvironment: 'live',
      },
    );
  });
});
