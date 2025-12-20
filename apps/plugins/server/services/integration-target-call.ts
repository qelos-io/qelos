
import path from 'node:path';
import fetch from 'node-fetch';
import { EmailTargetOperation, HttpTargetOperation, IEmailSource, IHttpSource, IntegrationSourceKind, IOpenAISource, IQelosSource, ISumitSource, OpenAITargetOperation, OpenAITargetPayload, QelosTargetOperation, SumitTargetOperation } from '@qelos/global-types';
import { IIntegrationEntity } from '../models/integration';
import IntegrationSource from '../models/integration-source';
import { getEncryptedSourceAuthentication } from './source-authentication-service';
import httpAgent from './http-agent';
import { emitPlatformEvent } from './hook-events';
import PlatformEvent from '../models/event';
import { createUser, updateUser } from './users';
import logger from '../services/logger';
import { createBlueprintEntity, updateBlueprintEntity } from './no-code-service';
import { HttpTargetPayload } from '@qelos/global-types';
import { chatCompletion, chatCompletionForUserByIntegration } from './ai-service';
import { sendEmail } from './email-service';

// ... (existing code)

async function handleSumitTarget(
  integrationTarget: IIntegrationEntity,
  source: ISumitSource,
  authentication: { apiKey?: string } = {},
  payload: any = {}
) {
  const operation = integrationTarget.operation as SumitTargetOperation;
  logger.log('Handling Sumit target', { operation });

  const { apiKey } = authentication;
  const { baseUrl } = source.metadata;

  if (!apiKey || !baseUrl) {
    throw new Error('Missing API key or base URL for Sumit integration');
  }

  // NOTE: The endpoint paths and request/response formats are placeholders
  // and will need to be updated with the correct values from the Sumit API documentation.
  let endpoint = '';
  let method = 'POST';
  let body: any = payload;

  switch (operation) {
    case SumitTargetOperation.createCustomer:
      endpoint = '/customers';
      break;
    case SumitTargetOperation.setPaymentDetails:
      endpoint = `/customers/${payload.customerId}/payment-methods`;
      body = { token: payload.paymentMethodToken };
      break;
    // ... (add cases for other operations)
    default:
      throw new Error(`Unsupported Sumit operation: ${operation}`);
  }

  const url = new URL(endpoint, baseUrl).toString();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
      agent: httpAgent,
    });

    const responseBody = await response.json();

    if (!response.ok) {
      throw new Error(`Sumit API request failed with status ${response.status}: ${JSON.stringify(responseBody)}`);
    }

    return responseBody;
  } catch (error) {
    logger.error('Error calling Sumit API', error);
    throw error;
  }
}
// ... (existing code)
