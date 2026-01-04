import path from 'node:path';
import fetch from 'node-fetch';
import { CloudflareTargetOperation, EmailTargetOperation, HttpTargetOperation, ICloudflareSource, IEmailSource, IHttpSource, IntegrationSourceKind, IOpenAISource, IQelosSource, ISumitSource, OpenAITargetOperation, OpenAITargetPayload, QelosTargetOperation, SumitTargetOperation, AWSTargetOperation, IAWSSource } from '@qelos/global-types';
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
import Cloudflare from 'cloudflare';
import { cacheManager } from './cache-manager';
import { LambdaClient, InvokeCommand, GetFunctionCommand, ListFunctionsCommand, CreateFunctionCommand, UpdateFunctionConfigurationCommand, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda';

type TriggerResponseConfig = {
  source?: string;
  kind?: string;
  eventName?: string;
  description?: string;
  metadata?: Record<string, any>;
};

function mergeTriggerResponses(
  detailsTriggerResponse?: TriggerResponseConfig,
  payloadTriggerResponse?: TriggerResponseConfig,
): TriggerResponseConfig | undefined {
  if (!detailsTriggerResponse && !payloadTriggerResponse) {
    return undefined;
  }

  const merged: TriggerResponseConfig = {
    ...(detailsTriggerResponse || {}),
    ...(payloadTriggerResponse || {}),
  };

  merged.metadata = {
    ...(detailsTriggerResponse?.metadata || {}),
    ...(payloadTriggerResponse?.metadata || {}),
  };

  return merged;
}

function emitTriggerResponseEvent(
  tenant: string,
  triggerResponse?: TriggerResponseConfig,
  extraMetadata?: Record<string, any>,
) {
  if (!triggerResponse?.source || !triggerResponse?.kind || !triggerResponse?.eventName) {
    return;
  }

  const event = new PlatformEvent({
    tenant,
    source: triggerResponse.source,
    kind: triggerResponse.kind,
    eventName: triggerResponse.eventName,
    description: triggerResponse.description,
    metadata: {
      ...(triggerResponse.metadata || {}),
      ...(extraMetadata || {}),
    },
  });

  event.save().then(savedEvent => emitPlatformEvent(savedEvent)).catch(() => {});
}

async function handleHttpTarget(
  integrationTarget: IIntegrationEntity,
  source: IHttpSource,
  authentication: { securedHeaders?: Record<string, string> } = {},
  payload: HttpTargetPayload = {}) {
  const operation = integrationTarget.operation as HttpTargetOperation;
  if (operation === HttpTargetOperation.makeRequest) {
    const details: HttpTargetPayload = integrationTarget.details || {};
    const metadata: {
      method: string,
      baseUrl: string,
      headers: Record<string, string>,
      query: Record<string, string>
    } = source.metadata;

    const fetchData: Required<HttpTargetPayload> = {
      method: payload.method || details.method || metadata.method,
      url: payload.url || details.url || '/',
      headers: {
        'Content-Type': 'application/json',
        ...(metadata.headers || {}),
        ...(authentication.securedHeaders || {}),
        ...(details.headers || {}),
        ...(payload.headers || {}),
      },
      body: {
        ...(details.body || {}),
        ...(payload.body || {}),
      },
      query: {
        ...(metadata.query || {}),
        ...(details.query || {}),
        ...(payload.query || {}),
      },
      triggerResponse: {
        ...(details.triggerResponse || {}),
        ...(payload.triggerResponse || {}),
        metadata: {
          ...(details.triggerResponse?.metadata || {}),
          ...(payload.triggerResponse?.metadata || {}),
        }
      }
    };
    const fullPath = new URL(path.join(metadata.baseUrl, fetchData.url));
    Object.entries(fetchData.query).forEach(([key, value]) => {
      fullPath.searchParams.append(key, value);
    });
    const res = await fetch(fullPath.toString(), {
      method: fetchData.method,
      body: fetchData.method === 'GET' ? undefined : JSON.stringify(fetchData.body),
      agent: httpAgent,
      headers: fetchData.headers,
    });
    const resBody = await res.json();
    const triggerResponse = fetchData.triggerResponse;
    if (triggerResponse.source && triggerResponse.kind && triggerResponse.eventName) {
      const event = new PlatformEvent({
        tenant: source.tenant,
        source: triggerResponse.source,
        kind: triggerResponse.kind,
        eventName: triggerResponse.eventName,
        description: triggerResponse.description,
        metadata: {
          ...triggerResponse.metadata,
          requestUrl: fullPath.toString(),
          status: res.status,
          body: resBody,
        },
      });
      event.save().then(event => emitPlatformEvent(event)).catch(() => {});
    }
    return {
      status: res.status,
      headers: res.headers,
      body: resBody,
    };
  }
}

async function handleOpenAiTarget(integrationTarget: IIntegrationEntity,
  source: IOpenAISource,
  authentication: { token?: string } = {},
  payload: OpenAITargetPayload = {
    messages: []
  }) {
  const operation = integrationTarget.operation as keyof typeof OpenAITargetOperation;

  if (operation === OpenAITargetOperation.chatCompletion) {

    const response = await chatCompletion(source.tenant, {
      authentication,
      source,
      payload,
    })
    const triggerResponse = payload.triggerResponse;
    if (!payload.stream && triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
      const event = new PlatformEvent({
        tenant: source.tenant,
        source: triggerResponse.source,
        kind: triggerResponse.kind,
        eventName: triggerResponse.eventName,
        description: triggerResponse.description,
        metadata: {
          ...triggerResponse.metadata,
          body: response,
        },
      });
      event.save().then(event => emitPlatformEvent(event)).catch(() => {});
    }
    return response;
  }
}

async function handleQelosTarget(integrationTarget: IIntegrationEntity,
  source: IQelosSource,
  _authentication: any = {},
  payload: any = {}) {
    const operation = integrationTarget.operation as QelosTargetOperation;
    const details = integrationTarget.details || {};
    const triggerResponse = mergeTriggerResponses(
      details.triggerResponse as TriggerResponseConfig,
      payload.triggerResponse as TriggerResponseConfig,
    );
    const emitQelosTriggerResponse = (metadata?: Record<string, any>) => {
      emitTriggerResponseEvent(source.tenant, triggerResponse, {
        operation,
        ...(metadata || {}),
      });
    };

    if (operation === QelosTargetOperation.webhook) {
      const event = new PlatformEvent({
        tenant: source.tenant,
        source: details.source,
        kind: details.kind,
        eventName: details.eventName,
        description: details.description,
        metadata: {
          ...payload,
        },
      });
      await event.save();
      emitPlatformEvent(event);
    } else if (operation === QelosTargetOperation.createUser) {
      const result = await createUser(source.tenant, {
        username: payload.username,
        password: payload.password || details.password,
        roles: payload.roles || details.roles || ['user'],
        firstName: payload.firstName,
        lastName: payload.lastName,
       })
      emitQelosTriggerResponse({ result });
      return result;
    } else if (operation === QelosTargetOperation.updateUser) {
      const result = await updateUser(source.tenant, payload.userId || details.userId, {
        password: payload.password || details.password || undefined,
        roles: payload.roles || details.roles || undefined,
        firstName: payload.firstName || undefined,
        lastName: payload.lastName || undefined,
      })
      emitQelosTriggerResponse({ result });
      return result;
    } else if (operation === QelosTargetOperation.setUserRoles) {
      const result = await updateUser(source.tenant, payload.userId || details.userId, {
        roles: payload.roles || details.roles || undefined,
      })
      emitQelosTriggerResponse({ result });
      return result;
    } else if (operation === QelosTargetOperation.setWorkspaceLabels) {
      logger.log('operation not supported yet.')
    } else if (operation === QelosTargetOperation.createBlueprintEntity) {
      const result = await createBlueprintEntity(
        source.tenant,
        payload.blueprint || details.blueprint,
        payload.metadata || details.metadata,
      );
      emitQelosTriggerResponse({ result });
      return result;
    } else if (operation === QelosTargetOperation.updateBlueprintEntity) {
      const result = await updateBlueprintEntity(
        source.tenant,
        payload.blueprint || details.blueprint,
        payload.metadata || details.metadata,
      );
      emitQelosTriggerResponse({ result });
      return result;
    } else if (operation === QelosTargetOperation.chatCompletion) {
      const result = await chatCompletionForUserByIntegration(source.tenant, source.user, {
        integrationId: payload.integrationId,
        threadId: payload.threadId,
        messages: payload.messages,
      })
      emitQelosTriggerResponse({
        result,
        integrationId: payload.integrationId,
        threadId: payload.threadId,
      });
      return result;
    } else {
      logger.log('operation not supported yet.')
    }
}


/**
 * Handle email target operations
 *
 * @param integrationTarget Integration target entity
 * @param source Email source configuration
 * @param authentication Authentication details
 * @param payload Optional payload with data for the email
 * @returns Promise with operation result
 */
async function handleEmailTarget(
  integrationTarget: IIntegrationEntity,
  source: IEmailSource,
  authentication: Record<string, any>,
  payload?: Record<string, any>
): Promise<any> {
  logger.log('Handling email target', { operation: integrationTarget.operation });

  if (integrationTarget.operation === EmailTargetOperation.sendEmail) {
    // Extract email details from target details or payload
    const to = payload?.to || integrationTarget.details?.to;
    const subject = payload?.subject || integrationTarget.details?.subject;
    const body = payload?.body || integrationTarget.details?.body;
    const cc = payload?.cc || integrationTarget.details?.cc;
    const bcc = payload?.bcc || integrationTarget.details?.bcc;

    // Validate required fields
    if (!to) {
      throw new Error('Email recipient (to) is required');
    }

    if (!subject) {
      throw new Error('Email subject is required');
    }

    if (!body) {
      throw new Error('Email body is required');
    }

    // Send the email
    const result = await sendEmail(
      source,
      authentication as { password: string },
      to,
      subject,
      body,
      cc,
      bcc
    );

    const triggerResponse = payload?.triggerResponse;
    if (!payload?.stream && triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
      const event = new PlatformEvent({
        tenant: source.tenant,
        source: triggerResponse.source,
        kind: triggerResponse.kind,
        eventName: triggerResponse.eventName,
        description: triggerResponse.description,
        metadata: {
          ...triggerResponse.metadata,
          result,
        },
      });
      event.save().then(event => emitPlatformEvent(event)).catch(() => {});
    }

    return result;
  }

  throw new Error(`Unsupported email operation: ${integrationTarget.operation}`);
}

async function handleSumitTarget(
  integrationTarget: IIntegrationEntity,
  source: ISumitSource,
  authentication: { apiKey?: string } = {},
  payload: any = {}
) {
  const operation = integrationTarget.operation as SumitTargetOperation;
  logger.log('Handling Sumit target', { operation });

  const { apiKey } = authentication;
  const { companyId } = source.metadata;
  const baseUrl = 'https://app.sumit.co.il/api/';

  if (!apiKey || !companyId) {
    throw new Error('Missing API key or Company ID for Sumit integration');
  }

  const credentials = {
    CompanyID: companyId,
    APIKey: apiKey,
  };

  let endpoint = '';
  let method = 'POST';
  let body: any = { ...payload, Credentials: credentials };

  switch (operation) {
    case SumitTargetOperation.createCustomer:
      endpoint = '/v1/customers/add';
      break;
    case SumitTargetOperation.setPaymentDetails:
      endpoint = '/v1/customers/update-payment-method';
      break;
    // ... (add cases for other operations from the swagger file)
    default:
      throw new Error(`Unsupported Sumit operation: ${operation}`);
  }

  const url = new URL(endpoint, baseUrl).toString();

  const headers = {
    'Content-Type': 'application/json',
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

async function handleAwsTarget(
  integrationTarget: IIntegrationEntity,
  source: IAWSSource,
  authentication: { secretAccessKey?: string } = {},
  payload: any = {}
) {
  const operation = integrationTarget.operation as keyof typeof AWSTargetOperation;

  const { secretAccessKey } = authentication;
  const { region, accessKeyId } = source.metadata;

  if (!secretAccessKey) {
    throw new Error('Missing secret access key for AWS integration');
  }

  if (!region) {
    throw new Error('Missing region for AWS integration');
  }

  if (!accessKeyId) {
    throw new Error('Missing access key ID for AWS integration');
  }

  const details = integrationTarget.details || {};
  
  // Initialize AWS Lambda client
  const lambda = new LambdaClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  // Cache key prefix for this account
  const cacheKeyPrefix = `aws:${source.tenant}:${accessKeyId}:${region}:`;

  try {
    switch (operation) {
      case AWSTargetOperation.callFunction: {
        const functionName = payload.name || details.name;
        
        if (!functionName) {
          throw new Error('Function name is required for AWS Lambda calls');
        }

        // Prepare the invocation parameters
        const invokeParams = {
          FunctionName: functionName,
          Payload: JSON.stringify({
            ...(payload.body || details.body || {}),
          }),
          ...(payload.invocationType || details.invocationType ? { 
            InvocationType: payload.invocationType || details.invocationType 
          } : {}),
          ...(payload.logType || details.logType ? { 
            LogType: payload.logType || details.logType 
          } : {}),
        };

        const command = new InvokeCommand(invokeParams);
        const response = await lambda.send(command);
        
        let responseBody;
        if (response.Payload) {
          const payloadStr = response.Payload.toString();
          try {
            responseBody = JSON.parse(payloadStr);
          } catch {
            responseBody = payloadStr;
          }
        }

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName,
              statusCode: response.StatusCode,
              logResult: response.LogResult,
              executedVersion: response.ExecutedVersion,
              body: responseBody,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return {
          statusCode: response.StatusCode,
          logResult: response.LogResult,
          executedVersion: response.ExecutedVersion,
          body: responseBody,
        };
      }

      case AWSTargetOperation.getFunction: {
        const functionName = payload.name || details.name;
        
        if (!functionName) {
          throw new Error('Function name is required to get AWS Lambda function');
        }

        // Use cacheManager.wrap to handle caching automatically
        const cacheKey = `${cacheKeyPrefix}function:${functionName}`;
        const functionData = await cacheManager.wrap(
          cacheKey,
          async () => {
            // Fetch from AWS API
            const command = new GetFunctionCommand({ FunctionName: functionName });
            const result = await lambda.send(command);
            return JSON.stringify(result);
          },
          { ttl: 1800 } // Cache for 30 minutes (1800 seconds)
        );
        
        // Parse the cached data
        const parsedData = JSON.parse(functionData);

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName,
              operation: 'getFunction',
              result: parsedData,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return parsedData;
      }

      case AWSTargetOperation.listFunctions: {
        // Use cacheManager.wrap to handle caching automatically
        const cacheKey = `${cacheKeyPrefix}functions:list`;
        const functionsList = await cacheManager.wrap(
          cacheKey,
          async () => {
            // Fetch from AWS API
            const command = new ListFunctionsCommand({});
            const result = await lambda.send(command);
            logger.log('Fetched AWS Lambda functions list from API', { count: result.Functions?.length || 0 });
            return JSON.stringify(result);
          },
          { ttl: 600 } // Cache for 10 minutes (600 seconds)
        );
        
        // Parse the cached data
        const parsedList = JSON.parse(functionsList);

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              operation: 'listFunctions',
              result: parsedList,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return parsedList;
      }

      case AWSTargetOperation.createFunction: {
        const { name, runtime, handler, role, code, description, timeout, memorySize, ...otherParams } = { ...details, ...payload };
        
        if (!name) {
          throw new Error('Function name is required to create AWS Lambda function');
        }

        if (!runtime) {
          throw new Error('Runtime is required to create AWS Lambda function');
        }

        if (!handler) {
          throw new Error('Handler is required to create AWS Lambda function');
        }

        if (!role) {
          throw new Error('Role ARN is required to create AWS Lambda function');
        }

        if (!code) {
          throw new Error('Function code is required to create AWS Lambda function');
        }

        const createParams = {
          FunctionName: name,
          Runtime: runtime,
          Handler: handler,
          Role: role,
          Code: code,
          ...(description && { Description: description }),
          ...(timeout && { Timeout: timeout }),
          ...(memorySize && { MemorySize: memorySize }),
          ...otherParams,
        };

        const command = new CreateFunctionCommand(createParams);
        const result = await lambda.send(command);

        // Clear relevant caches
        await cacheManager.setItem(`${cacheKeyPrefix}functions:list`, '', { ttl: 1 });

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName: name,
              operation: 'createFunction',
              result: result,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return result;
      }

      case AWSTargetOperation.updateFunction: {
        const { name, runtime, handler, role, code, description, timeout, memorySize, ...otherParams } = { ...details, ...payload };
        
        if (!name) {
          throw new Error('Function name is required to update AWS Lambda function');
        }

        // Update function configuration if needed
        if (runtime || handler || role || description || timeout || memorySize || Object.keys(otherParams).length > 0) {
          const updateConfigParams = {
            FunctionName: name,
            ...(runtime && { Runtime: runtime }),
            ...(handler && { Handler: handler }),
            ...(role && { Role: role }),
            ...(description && { Description: description }),
            ...(timeout && { Timeout: timeout }),
            ...(memorySize && { MemorySize: memorySize }),
            ...otherParams,
          };

          const configCommand = new UpdateFunctionConfigurationCommand(updateConfigParams);
          await lambda.send(configCommand);
        }

        // Update function code if provided
        if (code) {
          const updateCodeParams = {
            FunctionName: name,
            ...code,
          };

          const codeCommand = new UpdateFunctionCodeCommand(updateCodeParams);
          await lambda.send(codeCommand);
        }

        // Clear relevant caches
        await cacheManager.setItem(`${cacheKeyPrefix}functions:list`, '', { ttl: 1 });
        await cacheManager.setItem(`${cacheKeyPrefix}function:${name}`, '', { ttl: 1 });

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName: name,
              operation: 'updateFunction',
              result: { success: true, message: 'Function updated successfully' },
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return { success: true, message: 'Function updated successfully' };
      }

      default:
        throw new Error(`Unsupported AWS operation: ${operation}`);
    }
  } catch (error) {
    logger.error('Error in AWS operation', error);
    throw error;
  }
}


async function handleCloudflareTarget(
  integrationTarget: IIntegrationEntity,
  source: ICloudflareSource,
  authentication: { apiToken?: string } = {},
  payload: any = {}
) {
  const operation = integrationTarget.operation as keyof typeof CloudflareTargetOperation;

  const { apiToken } = authentication;
  const { accountId, workersDevSubdomain } = source.metadata;

  if (!apiToken) {
    throw new Error('Missing API token for Cloudflare integration');
  }

  if (!accountId) {
    throw new Error('Missing account ID for Cloudflare integration');
  }

  const details = integrationTarget.details || {};
  
  // Initialize Cloudflare client
  const cf = new Cloudflare({
    apiToken: apiToken,
  });

  // Cache key prefix for this account
  const cacheKeyPrefix = `cloudflare:${source.tenant}:${accountId}:`;

  try {
    switch (operation) {
      case CloudflareTargetOperation.callFunction: {
        const functionName = payload.name || details.name;
        
        if (!functionName) {
          throw new Error('Function name is required for Cloudflare function calls');
        }

        const functionUrl = `https://${accountId}.${workersDevSubdomain}.workers.dev/${functionName}`;
        
        // Prepare the request body
        const requestBody = {
          ...(payload.body || details.body || {}),
        };

        const headers = {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          ...(payload.headers || details.headers || {}),
        };

        const response = await fetch(functionUrl, {
          method: payload.method || details.method || 'POST',
          headers,
          body: JSON.stringify(requestBody),
          agent: httpAgent,
        });

        // Handle response - Cloudflare Workers might return various content types
        let responseBody;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }

        if (!response.ok) {
          throw new Error(`Cloudflare function request failed with status ${response.status}: ${responseBody}`);
        }

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName,
              requestUrl: functionUrl,
              status: response.status,
              body: responseBody,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return {
          status: response.status,
          headers: response.headers,
          body: responseBody,
        };
      }

      case CloudflareTargetOperation.getFunction: {
        const functionName = payload.name || details.name;
        
        if (!functionName) {
          throw new Error('Function name is required to get Cloudflare function');
        }

        // Use cacheManager.wrap to handle caching automatically
        const cacheKey = `${cacheKeyPrefix}function:${functionName}`;
        const functionData = await cacheManager.wrap(
          cacheKey,
          async () => {
            // Fetch from Cloudflare API
            const result = await cf.workers.scripts.get(accountId, functionName);
            logger.log('Fetched Cloudflare function data from API', { functionName });
            return JSON.stringify(result);
          },
          { ttl: 1800 } // Cache for 30 minutes (1800 seconds)
        );
        
        // Parse the cached data
        const parsedData = JSON.parse(functionData);

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName,
              operation: 'getFunction',
              result: parsedData,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return parsedData;
      }

      case CloudflareTargetOperation.listFunctions: {
        // Use cacheManager.wrap to handle caching automatically
        const cacheKey = `${cacheKeyPrefix}functions:list`;
        const functionsList = await cacheManager.wrap(
          cacheKey,
          async () => {
            // Fetch from Cloudflare API
            const result = await cf.workers.scripts.list({ account_id: accountId });
            logger.log('Fetched Cloudflare functions list from API', { count: (result as any)?.length || 0 });
            return JSON.stringify(result);
          },
          { ttl: 600 } // Cache for 10 minutes (600 seconds)
        );
        
        // Parse the cached data
        const parsedList = JSON.parse(functionsList);

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              operation: 'listFunctions',
              result: parsedList,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return parsedList;
      }

      case CloudflareTargetOperation.createFunction: {
        const { name, runtime = 'compatibility', content, bindings, ...otherParams } = { ...details, ...payload };
        
        if (!name) {
          throw new Error('Function name is required to create Cloudflare function');
        }

        if (!content) {
          throw new Error('Function content is required to create Cloudflare function');
        }

        // Create the script using Cloudflare SDK
        const scriptParams = {
          ...(runtime && { runtime }),
          ...(bindings && { bindings }),
          ...otherParams,
        };

        // First, create the script metadata
        await cf.workers.scripts.update(accountId, name, scriptParams);

        const createResult = { success: true, script_name: name };

        // Then upload the content
        const formData = new FormData();
        const metadata = {
          bindings: bindings || [],
          main_module: 'main.js',
        };
        
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('main.js', new Blob([content], { type: 'application/javascript+module' }));

        const uploadResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${name}/submissions/metadata`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
          body: formData,
          agent: httpAgent,
        });

        const uploadBody = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadBody.success) {
          throw new Error(`Failed to upload Cloudflare function content: ${JSON.stringify(uploadBody.errors || uploadBody)}`);
        }

        // Clear relevant caches
        await cacheManager.setItem(`${cacheKeyPrefix}functions:list`, '', { ttl: 1 });

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName: name,
              operation: 'createFunction',
              result: createResult,
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return createResult;
      }

      case CloudflareTargetOperation.updateFunction: {
        const { name, content, bindings, ...otherParams } = { ...details, ...payload };
        
        if (!name) {
          throw new Error('Function name is required to update Cloudflare function');
        }

        // Update script metadata if needed
        if (Object.keys(otherParams).length > 0 || bindings) {
          const updateParams = {
            ...(bindings && { bindings }),
            ...otherParams,
          };

          await cf.workers.scripts.update(accountId, name, updateParams);
        }

        // Update content if provided
        if (content) {
          const formData = new FormData();
          const metadata = {
            bindings: bindings || details.bindings || [],
            main_module: 'main.js',
          };
          
          formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          formData.append('main.js', new Blob([content], { type: 'application/javascript+module' }));

          const uploadResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${name}/submissions/metadata`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
            },
            body: formData,
            agent: httpAgent,
          });

          const uploadBody = await uploadResponse.json();

          if (!uploadResponse.ok || !uploadBody.success) {
            throw new Error(`Failed to update Cloudflare function content: ${JSON.stringify(uploadBody.errors || uploadBody)}`);
          }
        }

        // Clear relevant caches
        await cacheManager.setItem(`${cacheKeyPrefix}functions:list`, '', { ttl: 1 });
        await cacheManager.setItem(`${cacheKeyPrefix}function:${name}`, '', { ttl: 1 });

        // Handle trigger response if configured
        const triggerResponse = mergeTriggerResponses(
          details.triggerResponse as TriggerResponseConfig,
          payload.triggerResponse as TriggerResponseConfig,
        );

        if (triggerResponse?.source && triggerResponse?.kind && triggerResponse?.eventName) {
          const event = new PlatformEvent({
            tenant: source.tenant,
            source: triggerResponse.source,
            kind: triggerResponse.kind,
            eventName: triggerResponse.eventName,
            description: triggerResponse.description,
            metadata: {
              ...triggerResponse.metadata,
              functionName: name,
              operation: 'updateFunction',
              result: { success: true, message: 'Function updated successfully' },
            },
          });
          event.save().then(event => emitPlatformEvent(event)).catch(() => {});
        }

        return { success: true, message: 'Function updated successfully' };
      }

      default:
        throw new Error(`Unsupported Cloudflare operation: ${operation}`);
    }
  } catch (error) {
    logger.error('Error in Cloudflare operation', error);
    throw error;
  }
}


export async function callIntegrationTarget(tenant: string, payload: any, integrationTarget: IIntegrationEntity) {
  // load integration source data
  const source = await IntegrationSource.findOne({ tenant, _id: integrationTarget.source }).lean().exec();
  if (!source) {
    return;
  }
  const authentication = await getEncryptedSourceAuthentication(tenant, source.kind, source.authentication);

  if (source.kind === IntegrationSourceKind.Http) {
    return handleHttpTarget(integrationTarget, source as IHttpSource, authentication || {}, payload)
  } else if (source.kind === IntegrationSourceKind.OpenAI) {
    return handleOpenAiTarget(integrationTarget, source as IOpenAISource, authentication || {}, payload);
  } else if (source.kind === IntegrationSourceKind.Qelos) {
    return handleQelosTarget(integrationTarget, source as IQelosSource, authentication || {}, payload);
  } else if (source.kind === IntegrationSourceKind.Email) {
    return handleEmailTarget(integrationTarget, source as IEmailSource, authentication || {}, payload);
  } else if (source.kind === IntegrationSourceKind.Sumit) {
    return handleSumitTarget(integrationTarget, source as ISumitSource, authentication || {}, payload);
  } else if (source.kind === IntegrationSourceKind.AWS) {
    return handleAwsTarget(integrationTarget, source as IAWSSource, authentication || {}, payload);
  } else if (source.kind === IntegrationSourceKind.Cloudflare) {
    return handleCloudflareTarget(integrationTarget, source as ICloudflareSource, authentication || {}, payload);
  }
}
