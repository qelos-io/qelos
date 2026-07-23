import fetch from 'node-fetch';
import httpAgent from './http-agent.js';

export const SUMIT_API_BASE = 'https://api.sumit.co.il';

export const SUMIT_STATUS_CHECK_ENDPOINT = '/billing/payments/list/';

export type SumitCredentials = {
  CompanyID: number;
  APIKey: string;
};

export function parseSumitCompanyId(companyId: string | number): number {
  const parsed = typeof companyId === 'number'
    ? companyId
    : Number(String(companyId).trim());

  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    const error: any = new Error(`Invalid Sumit Company ID: ${companyId}`);
    error.status = 400;
    error.code = 'INVALID_SUMIT_COMPANY_ID';
    throw error;
  }

  return parsed;
}

export function currencyToSumitCode(currency: string | number): 0 | 1 | 2 {
  const normalized = String(currency).toUpperCase();
  if (normalized === 'ILS' || normalized === '0') return 0;
  if (normalized === 'USD' || normalized === '1') return 1;
  if (normalized === 'EUR' || normalized === '2') return 2;
  const error: any = new Error(`Unsupported Sumit currency: ${currency}`);
  error.status = 400;
  error.code = 'UNSUPPORTED_SUMIT_CURRENCY';
  throw error;
}

function isFailedSumitStatus(status: unknown) {
  if (status === 'Error' || status === 'Failed') return true;
  if (typeof status === 'number') return status !== 0;
  if (typeof status === 'string' && /^\d+$/.test(status)) return Number(status) !== 0;
  return false;
}

export function parseSumitResponse(responseBody: any) {
  if (!responseBody || typeof responseBody !== 'object') {
    return responseBody;
  }

  if (isFailedSumitStatus(responseBody.Status)) {
    const error: any = new Error(
      responseBody.UserErrorMessage
      || responseBody.TechnicalErrorDetails
      || 'Sumit API request failed',
    );
    error.status = 400;
    error.responseBody = responseBody;
    throw error;
  }

  const data = responseBody.Data && typeof responseBody.Data === 'object'
    ? responseBody.Data
    : responseBody;

  return {
    ...responseBody,
    ...data,
    Data: data,
  };
}

function withCredentials(payload: Record<string, any>, credentials: SumitCredentials) {
  const { Credentials: _credentials, ...rest } = payload;
  return { ...rest, Credentials: credentials };
}

export function buildSumitCreateCustomerBody(payload: Record<string, any>, credentials: SumitCredentials) {
  if (payload.Details) {
    return withCredentials(payload, credentials);
  }

  return withCredentials({
    Details: {
      Name: payload.Name,
      EmailAddress: payload.EmailAddress,
      Phone: payload.Phone,
      ExternalIdentifier: payload.ExternalIdentifier,
      SearchMode: payload.SearchMode ?? 0,
    },
    ResponseLanguage: payload.ResponseLanguage,
  }, credentials);
}

export function buildSumitSetPaymentDetailsBody(payload: Record<string, any>, credentials: SumitCredentials) {
  if (payload.Customer) {
    return withCredentials(payload, credentials);
  }

  const customer = payload.CustomerID != null
    ? { ID: payload.CustomerID, SearchMode: 1 }
    : {
      ExternalIdentifier: payload.ExternalIdentifier,
      SearchMode: payload.SearchMode ?? 2,
      Name: payload.Name || payload.ExternalIdentifier || 'Customer',
    };

  return withCredentials({
    Customer: customer,
    PaymentMethod: payload.PaymentMethod,
    SingleUseToken: payload.SingleUseToken,
  }, credentials);
}

export function buildSumitRecurringChargeBody(payload: Record<string, any>, credentials: SumitCredentials) {
  if (payload.Customer && payload.Items) {
    return withCredentials(payload, credentials);
  }

  if (!payload.SingleUseToken) {
    const error: any = new Error(
      'Sumit recurring charge requires Customer/Items or a SingleUseToken with Amount/Currency/Description',
    );
    error.status = 400;
    throw error;
  }

  const durationMonths = payload.RecurringIntervalType === 'month'
    ? Number(payload.RecurringInterval || 1)
    : 1;

  return withCredentials({
    Customer: payload.Customer || {
      ExternalIdentifier: payload.ExternalIdentifier,
      SearchMode: payload.SearchMode ?? 2,
      Name: payload.Name || payload.ExternalIdentifier || 'Customer',
      EmailAddress: payload.EmailAddress,
    },
    SingleUseToken: payload.SingleUseToken,
    Items: [{
      Item: {
        Name: payload.Description || 'Subscription',
        Description: payload.Description,
        Duration_Months: durationMonths,
      },
      Quantity: 1,
      UnitPrice: payload.Amount,
      Currency: currencyToSumitCode(payload.Currency),
      Duration_Months: durationMonths,
      Recurrence: payload.Recurrence ?? 0,
    }],
    VATIncluded: payload.VATIncluded ?? true,
    OnlyDocument: payload.OnlyDocument ?? false,
  }, credentials);
}

export function buildSumitBeginRedirectBody(payload: Record<string, any>, credentials: SumitCredentials) {
  const body = payload.Customer && payload.Items
    ? { ...payload }
    : {
      Customer: payload.Customer || {
        ExternalIdentifier: payload.ExternalIdentifier,
        SearchMode: payload.SearchMode ?? 2,
        Name: payload.Name || payload.ExternalIdentifier || 'Customer',
        EmailAddress: payload.EmailAddress,
      },
      Items: payload.Items || [{
        Item: {
          Name: payload.Description || 'Subscription',
          Description: payload.Description,
        },
        Quantity: payload.Quantity ?? 1,
        UnitPrice: payload.Amount,
        Currency: payload.Currency != null ? currencyToSumitCode(payload.Currency) : undefined,
      }],
      RedirectURL: payload.RedirectURL,
      CancelRedirectURL: payload.CancelRedirectURL,
      ExternalIdentifier: payload.ExternalIdentifier,
      VATIncluded: payload.VATIncluded ?? true,
      DocumentDescription: payload.DocumentDescription,
      PreventSavingPaymentMethod: payload.PreventSavingPaymentMethod,
    };

  if (body.Items) {
    body.Items = body.Items.map((item: any) => ({
      ...item,
      Currency: item.Currency != null && typeof item.Currency === 'string'
        ? currencyToSumitCode(item.Currency)
        : item.Currency,
    }));
  }

  return withCredentials(body, credentials);
}

export function buildSumitRecurringCancelBody(payload: Record<string, any>, credentials: SumitCredentials) {
  if (payload.Customer && payload.RecurringCustomerItemID != null) {
    return withCredentials(payload, credentials);
  }

  const recurringCustomerItemId = payload.RecurringCustomerItemID ?? payload.RecurringPaymentId;
  if (recurringCustomerItemId == null) {
    const error: any = new Error('RecurringCustomerItemID or RecurringPaymentId is required for Sumit cancel');
    error.status = 400;
    throw error;
  }

  const customer = payload.Customer
    || (payload.CustomerID != null ? { ID: payload.CustomerID, SearchMode: 1 } : {
      ExternalIdentifier: payload.ExternalIdentifier,
      SearchMode: payload.SearchMode ?? 2,
      Name: payload.Name || payload.ExternalIdentifier || 'Customer',
    });

  return withCredentials({
    Customer: customer,
    RecurringCustomerItemID: Number(recurringCustomerItemId),
  }, credentials);
}

export const SUMIT_OPERATION_ENDPOINTS: Record<string, string> = {
  createCustomer: '/accounting/customers/create/',
  setPaymentDetails: '/billing/paymentmethods/setforcustomer/',
  createRecurringPayment: '/billing/recurring/charge/',
  beginCheckoutRedirect: '/billing/payments/beginredirect/',
  deleteRecurringPayment: '/billing/recurring/cancel/',
};

export function buildSumitRequestBody(
  operation: string,
  payload: Record<string, any>,
  credentials: SumitCredentials,
) {
  switch (operation) {
    case 'createCustomer':
      return buildSumitCreateCustomerBody(payload, credentials);
    case 'setPaymentDetails':
      return buildSumitSetPaymentDetailsBody(payload, credentials);
    case 'createRecurringPayment':
      return buildSumitRecurringChargeBody(payload, credentials);
    case 'beginCheckoutRedirect':
      return buildSumitBeginRedirectBody(payload, credentials);
    case 'deleteRecurringPayment':
      return buildSumitRecurringCancelBody(payload, credentials);
    default:
      return withCredentials(payload, credentials);
  }
}

export async function checkSumitStatus(params: {
  companyId: string | number;
  apiKey: string;
}): Promise<{ companyId: number; paymentCount?: number }> {
  const credentials: SumitCredentials = {
    CompanyID: parseSumitCompanyId(params.companyId),
    APIKey: params.apiKey,
  };

  const url = new URL(SUMIT_STATUS_CHECK_ENDPOINT, SUMIT_API_BASE).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Credentials: credentials,
      PageSize: 1,
      PageNumber: 1,
    }),
    agent: httpAgent,
  });

  let responseBody: any = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const error: any = new Error(
      `Sumit API request failed with status ${response.status}: ${JSON.stringify(responseBody)}`,
    );
    error.status = response.status;
    error.responseBody = responseBody;
    throw error;
  }

  const parsed = parseSumitResponse(responseBody);
  const payments = Array.isArray(parsed.Payments)
    ? parsed.Payments
    : Array.isArray(parsed.Data?.Payments)
      ? parsed.Data.Payments
      : undefined;

  return {
    companyId: credentials.CompanyID,
    ...(payments ? { paymentCount: payments.length } : {}),
  };
}
