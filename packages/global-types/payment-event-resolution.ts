export type PaymentAdminSuggestion = {
  summary: string;
  action: string;
};

export type PaymentProviderPublicContext = {
  providerSourceId?: string;
  providerPublicAccountId?: string;
  providerEnvironment?: string;
};

export type PaymentResolutionContext = {
  providerKind?: string;
  operation?: string;
  code?: string;
  status?: number;
  message?: string;
  providerError?: Record<string, unknown> | null;
};

export type PaymentEventDocsContext = {
  providerKind?: string;
  eventName?: string;
  operation?: string;
  code?: string;
};

export const PAYMENTS_DOCS_BASE_URL = 'https://docs.qelos.io/payments';

const TROUBLESHOOTING_ERROR_CODES = new Set([
  'PAYMENTS_NOT_CONFIGURED',
  'ACTIVE_SUBSCRIPTION_EXISTS',
  'DYNAMIC_AMOUNT_NOT_SET',
  'DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION',
  'DYNAMIC_PLAN_UNSUPPORTED_PROVIDER',
  'MISSING_REDIRECT_URLS',
  'INVALID_CHECKOUT_AMOUNT',
  'INVALID_SUMIT_COMPANY_ID',
  'MISSING_SUMIT_CREDENTIALS',
  'UNSUPPORTED_SUMIT_CURRENCY',
  'INTEGRATION_SOURCE_NOT_FOUND',
  'MISSING_EXTERNAL_PRICE_ID',
  'PLAN_NOT_ACTIVE',
  'SUBSCRIPTION_NOT_PENDING',
  'INVALID_SIGNATURE',
  'WEBHOOK_SECRET_NOT_CONFIGURED',
  'TENANT_NOT_FOUND',
]);

function troubleshootingCodeAnchor(code: string) {
  return code.toLowerCase().replace(/_/g, '-');
}

function resolveProviderEventDocsUrl(providerKind: string, eventName?: string) {
  const provider = providerKind.toLowerCase();

  if (eventName === 'payment-method-save-failed') {
    return `${PAYMENTS_DOCS_BASE_URL}/events#failed-credit-card-capture-payment-method-save-failed`;
  }

  if (eventName === 'payment-failed' || eventName === 'webhook-processing-failed') {
    return `${PAYMENTS_DOCS_BASE_URL}/events#${provider}-troubleshooting`;
  }

  if (eventName === 'checkout-failed' || eventName === 'provider-call-failed') {
    switch (provider) {
      case 'sumit':
        return `${PAYMENTS_DOCS_BASE_URL}/events#checkout-initiation-failure-checkout-failed-or-provider-call-failed`;
      case 'paddle':
        return `${PAYMENTS_DOCS_BASE_URL}/events#checkout-validation-failure-checkout-failed`;
      case 'paypal':
        return `${PAYMENTS_DOCS_BASE_URL}/events#checkout-and-subscription-setup-failure-checkout-failed-or-provider-call-failed`;
      case 'dodopayments':
        return `${PAYMENTS_DOCS_BASE_URL}/events#checkout-failure-checkout-failed-or-provider-call-failed`;
      default:
        break;
    }
  }

  switch (provider) {
    case 'sumit':
      return `${PAYMENTS_DOCS_BASE_URL}/events#sumit-troubleshooting`;
    case 'paddle':
      return `${PAYMENTS_DOCS_BASE_URL}/events#paddle-troubleshooting`;
    case 'paypal':
      return `${PAYMENTS_DOCS_BASE_URL}/events#paypal-troubleshooting`;
    case 'dodopayments':
      return `${PAYMENTS_DOCS_BASE_URL}/events#dodopayments-troubleshooting`;
    default:
      return `${PAYMENTS_DOCS_BASE_URL}/troubleshooting`;
  }
}

export function resolvePaymentEventDocsUrl(context: PaymentEventDocsContext): string {
  const code = context.code?.toUpperCase();

  if (code && TROUBLESHOOTING_ERROR_CODES.has(code)) {
    return `${PAYMENTS_DOCS_BASE_URL}/troubleshooting#${troubleshootingCodeAnchor(code)}`;
  }

  if (context.providerKind) {
    return resolveProviderEventDocsUrl(context.providerKind, context.eventName);
  }

  return `${PAYMENTS_DOCS_BASE_URL}/troubleshooting`;
}

function pushUnique(suggestions: PaymentAdminSuggestion[], suggestion: PaymentAdminSuggestion) {
  if (suggestions.some((s) => s.summary === suggestion.summary)) {
    return;
  }
  suggestions.push(suggestion);
}

function sumitCredentialsSuggestions(
  suggestions: PaymentAdminSuggestion[],
  message?: string,
  providerError?: Record<string, unknown> | null,
) {
  const combined = [
    message,
    providerError?.UserErrorMessage,
    providerError?.TechnicalErrorDetails,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    combined.includes('credential')
    || combined.includes('apikey')
    || combined.includes('api key')
    || combined.includes('companyid')
    || combined.includes('company id')
    || combined.includes('unauthorized')
    || combined.includes('authentication')
  ) {
    pushUnique(suggestions, {
      summary: 'Verify Sumit API credentials',
      action: 'Open Admin → Integrations → Sumit, confirm Company ID matches https://app.sumit.co.il/developers/keys/ and re-save a freshly generated API key.',
    });
  }
}

export function sanitizeProviderErrorBody(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[_-]/g, '').toLowerCase();
    if (
      normalized === 'credentials'
      || normalized === 'apikey'
      || normalized === 'companyid'
      || normalized === 'singleusetoken'
      || normalized === 'cardnumber'
      || normalized === 'creditcardnumber'
      || normalized === 'cvv'
      || normalized === 'cvc'
      || normalized === 'password'
      || normalized === 'secret'
    ) {
      continue;
    }
    sanitized[key] = nestedValue;
  }
  return sanitized;
}

export function extractSumitProviderError(responseBody: unknown): Record<string, unknown> | null {
  const sanitized = sanitizeProviderErrorBody(responseBody);
  if (!sanitized) {
    return null;
  }

  if (sanitized.providerError && typeof sanitized.providerError === 'object') {
    return sanitizeProviderErrorBody(sanitized.providerError);
  }

  if (
    sanitized.UserErrorMessage
    || sanitized.TechnicalErrorDetails
    || sanitized.Status
  ) {
    return sanitized;
  }

  if (sanitized.Data && typeof sanitized.Data === 'object') {
    return sanitizeProviderErrorBody(sanitized.Data);
  }

  return sanitized;
}

export function resolvePaymentProviderPublicContext(
  providerKind: string | undefined,
  metadata?: Record<string, unknown> | null,
  providerSourceId?: string,
): PaymentProviderPublicContext {
  const context: PaymentProviderPublicContext = {};

  if (providerSourceId) {
    context.providerSourceId = providerSourceId;
  }

  if (!providerKind || !metadata) {
    return context;
  }

  switch (providerKind) {
    case 'sumit':
      if (metadata.companyId != null && metadata.companyId !== '') {
        context.providerPublicAccountId = String(metadata.companyId);
      }
      break;
    case 'paypal':
      if (typeof metadata.clientId === 'string' && metadata.clientId) {
        context.providerPublicAccountId = metadata.clientId;
      }
      if (typeof metadata.environment === 'string' && metadata.environment) {
        context.providerEnvironment = metadata.environment;
      }
      break;
    case 'paddle':
      if (typeof metadata.environment === 'string' && metadata.environment) {
        context.providerEnvironment = metadata.environment;
      }
      break;
    case 'dodopayments':
      if (typeof metadata.environment === 'string' && metadata.environment) {
        context.providerEnvironment = metadata.environment;
      }
      break;
    default:
      break;
  }

  return context;
}

export function appendPaymentProviderContext<T extends Record<string, unknown>>(
  metadata: T,
  providerContext?: PaymentProviderPublicContext,
): T & Partial<PaymentProviderPublicContext> {
  if (!providerContext) {
    return metadata;
  }

  return {
    ...metadata,
    ...(providerContext.providerSourceId ? { providerSourceId: providerContext.providerSourceId } : {}),
    ...(providerContext.providerPublicAccountId ? { providerPublicAccountId: providerContext.providerPublicAccountId } : {}),
    ...(providerContext.providerEnvironment ? { providerEnvironment: providerContext.providerEnvironment } : {}),
  };
}

export function buildPaymentAdminSuggestions(context: PaymentResolutionContext): PaymentAdminSuggestion[] {
  const suggestions: PaymentAdminSuggestion[] = [];
  const code = context.code?.toUpperCase();
  const message = context.message?.toLowerCase() || '';
  const providerError = context.providerError;

  if (code === 'PAYMENTS_NOT_CONFIGURED') {
    pushUnique(suggestions, {
      summary: 'Configure payments for this tenant',
      action: 'Open Admin → Pricing Plans → Configuration, enable payments, and select a payment provider integration source.',
    });
  }

  if (code === 'ACTIVE_SUBSCRIPTION_EXISTS') {
    pushUnique(suggestions, {
      summary: 'Cancel the existing subscription before checkout',
      action: 'The billable entity already has an active or trialing subscription. Cancel it with sdk.payments.cancelSubscription(existingSubscriptionId), or pass reset: true on checkout to cancel automatically and start a new subscription.',
    });
  }

  if (code === 'DYNAMIC_AMOUNT_NOT_SET') {
    pushUnique(suggestions, {
      summary: 'Set the subscription amount before checkout',
      action: 'This plan is dynamic-priced. An admin must set dynamicAmount on the pending subscription before the user can pay.',
    });
  }

  if (code === 'DYNAMIC_PLAN_REQUIRES_SUBSCRIPTION' || code === 'DYNAMIC_PLAN_UNSUPPORTED_PROVIDER') {
    pushUnique(suggestions, {
      summary: 'Use the dynamic-plan checkout flow',
      action: 'Create a pending subscription first, set dynamicAmount (admin), then call checkout with subscriptionId. Dynamic plans require Sumit.',
    });
  }

  if (code === 'MISSING_REDIRECT_URLS') {
    pushUnique(suggestions, {
      summary: 'Configure checkout redirect URLs',
      action: 'Add successUrl and cancelUrl in Admin → Pricing Plans → Configuration, or pass them in the checkout request.',
    });
  }

  if (code === 'INVALID_CHECKOUT_AMOUNT') {
    pushUnique(suggestions, {
      summary: 'Set a positive checkout amount',
      action: 'For dynamic plans, an admin must set dynamicAmount on the pending subscription before checkout. Static plans need a non-zero monthly/yearly price.',
    });
  }

  if (code === 'INVALID_SUMIT_COMPANY_ID' || code === 'MISSING_SUMIT_CREDENTIALS') {
    pushUnique(suggestions, {
      summary: 'Fix Sumit Company ID',
      action: 'Open Admin → Integrations → Sumit and enter the numeric Company ID from https://app.sumit.co.il/developers/keys/.',
    });
  }

  if (code === 'UNSUPPORTED_SUMIT_CURRENCY') {
    pushUnique(suggestions, {
      summary: 'Use a Sumit-supported plan currency',
      action: 'Change the plan currency to ILS, USD, or EUR. Sumit does not support other currencies.',
    });
  }

  if (code === 'INTEGRATION_SOURCE_NOT_FOUND') {
    pushUnique(suggestions, {
      summary: 'Reconnect the payment provider',
      action: 'The configured paymentSourceId no longer exists. Re-select the Sumit integration in Admin → Pricing Plans → Configuration.',
    });
  }

  if (context.providerKind === 'sumit') {
    sumitCredentialsSuggestions(suggestions, context.message, providerError);

    if (context.operation === 'beginCheckoutRedirect') {
      pushUnique(suggestions, {
        summary: 'Confirm Sumit hosted checkout is enabled',
        action: 'In the Sumit account, verify redirect/hosted checkout is enabled for the merchant and that the API key has billing permissions.',
      });
    }

    if (message.includes('unsupported sumit currency')) {
      pushUnique(suggestions, {
        summary: 'Use a Sumit-supported plan currency',
        action: 'Set the plan currency to ILS, USD, or EUR before retrying checkout.',
      });
    }

    if (message.includes('missing api key or company id')) {
      pushUnique(suggestions, {
        summary: 'Complete the Sumit integration credentials',
        action: 'Open Admin → Integrations → Sumit and save both Company ID and API key.',
      });
    }
  }

  if (
    context.status === 401
    || context.status === 403
    || message.includes('401')
    || message.includes('403')
  ) {
    pushUnique(suggestions, {
      summary: 'Payment provider rejected the credentials',
      action: 'Regenerate the provider API key/secret in the provider dashboard and update the integration source in Admin → Integrations.',
    });
  }

  if (
    code === 'INTEGRATION_TARGET_FAILED'
    && suggestions.length === 0
    && context.providerKind === 'sumit'
  ) {
    pushUnique(suggestions, {
      summary: 'Review Sumit account configuration',
      action: 'Verify Company ID and API key in Admin → Integrations → Sumit, then retry checkout. If it still fails, check Sumit developer logs for the rejected beginredirect request.',
    });
  }

  return suggestions;
}

export function buildPaymentEventDescription(
  baseDescription: string,
  providerError?: Record<string, unknown> | null,
): string {
  const userMessage = providerError?.UserErrorMessage;
  if (typeof userMessage === 'string' && userMessage.trim()) {
    return `${baseDescription}: ${userMessage.trim()}`;
  }
  return baseDescription;
}
