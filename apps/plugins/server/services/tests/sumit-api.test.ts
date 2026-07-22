import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildSumitBeginRedirectBody,
  buildSumitRecurringCancelBody,
  buildSumitRecurringChargeBody,
  buildSumitSetPaymentDetailsBody,
  currencyToSumitCode,
  parseSumitResponse,
} from '../sumit-api.js';

const credentials = { CompanyID: 12345678, APIKey: 'test-key' };

describe('sumit-api', () => {
  it('currencyToSumitCode maps supported currencies', () => {
    assert.strictEqual(currencyToSumitCode('ILS'), 0);
    assert.strictEqual(currencyToSumitCode('USD'), 1);
    assert.strictEqual(currencyToSumitCode('EUR'), 2);
  });

  it('parseSumitResponse unwraps Data on success', () => {
    const result = parseSumitResponse({
      Status: 'Success',
      Data: {
        RedirectURL: 'https://pay.sumit.co.il/abc',
      },
    });

    assert.strictEqual(result.RedirectURL, 'https://pay.sumit.co.il/abc');
  });

  it('parseSumitResponse throws on error status', () => {
    assert.throws(
      () => parseSumitResponse({
        Status: 'Error',
        UserErrorMessage: 'Invalid amount',
      }),
      (err: any) => {
        assert.match(err.message, /Invalid amount/);
        assert.strictEqual(err.status, 400);
        return true;
      },
    );
  });

  it('buildSumitRecurringChargeBody maps legacy payload with SingleUseToken', () => {
    const body = buildSumitRecurringChargeBody({
      Amount: 29,
      Currency: 'ILS',
      Description: 'Pro Plan',
      RecurringInterval: 1,
      RecurringIntervalType: 'month',
      ExternalIdentifier: 'user:abc',
      Name: 'Test User',
      SingleUseToken: 'token-123',
    }, credentials);

    assert.strictEqual(body.Credentials.CompanyID, 12345678);
    assert.strictEqual(body.SingleUseToken, 'token-123');
    assert.strictEqual(body.Items[0].UnitPrice, 29);
    assert.strictEqual(body.Items[0].Currency, 0);
    assert.strictEqual(body.Items[0].Duration_Months, 1);
  });

  it('buildSumitBeginRedirectBody maps checkout payload', () => {
    const body = buildSumitBeginRedirectBody({
      Customer: {
        ExternalIdentifier: 'user:1',
        SearchMode: 2,
        Name: 'User One',
      },
      Items: [{
        Item: { Name: 'Pro', Description: 'Pro' },
        Quantity: 1,
        UnitPrice: 49,
        Currency: 'USD',
      }],
      RedirectURL: 'https://example.com/success',
      CancelRedirectURL: 'https://example.com/cancel',
      ExternalIdentifier: '{"tenant":"tenant-1"}',
    }, credentials);

    assert.strictEqual(body.Items[0].Currency, 1);
    assert.strictEqual(body.RedirectURL, 'https://example.com/success');
  });

  it('buildSumitSetPaymentDetailsBody maps CustomerID payload', () => {
    const body = buildSumitSetPaymentDetailsBody({
      CustomerID: 99,
      SingleUseToken: 'token-123',
    }, credentials);

    assert.deepStrictEqual(body.Customer, { ID: 99, SearchMode: 1 });
    assert.strictEqual(body.SingleUseToken, 'token-123');
  });

  it('buildSumitRecurringCancelBody maps RecurringPaymentId', () => {
    const body = buildSumitRecurringCancelBody({
      RecurringPaymentId: 456,
      ExternalIdentifier: 'user:1',
    }, credentials);

    assert.strictEqual(body.RecurringCustomerItemID, 456);
    assert.strictEqual(body.Customer.SearchMode, 2);
  });
});
