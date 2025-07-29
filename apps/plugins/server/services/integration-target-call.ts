import path from 'node:path';
import fetch from 'node-fetch';
import { EmailTargetOperation, HttpTargetOperation, IEmailSource, IHttpSource, IntegrationSourceKind, IOpenAISource, IQelosSource, OpenAITargetOperation, OpenAITargetPayload, QelosTargetOperation } from '@qelos/global-types';
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
import { chatCompletion } from './ai-service';
import { sendEmail } from './email-service';

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
    console.log('fullPath', fullPath.toString());
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
      return createUser(source.tenant, { 
        username: payload.username,
        password: payload.password || details.password,
        roles: payload.roles || details.roles || ['user'],
        firstName: payload.firstName,
        lastName: payload.lastName,
       })
    } else if (operation === QelosTargetOperation.updateUser) {
      return updateUser(source.tenant, payload.userId || details.userId, {
        password: payload.password || details.password || undefined,
        roles: payload.roles || details.roles || undefined,
        firstName: payload.firstName || undefined,
        lastName: payload.lastName || undefined,
      })
    } else if (operation === QelosTargetOperation.setUserRoles) {
      return updateUser(source.tenant, payload.userId || details.userId, {
        roles: payload.roles || details.roles || undefined,
      })
    } else if (operation === QelosTargetOperation.setWorkspaceLabels) {
      logger.log('operation not supported yet.')
    } else if (operation === QelosTargetOperation.createBlueprintEntity) {
      return createBlueprintEntity(source.tenant, payload.blueprint || details.blueprint, payload.metadata || details.metadata)
    } else if (operation === QelosTargetOperation.updateBlueprintEntity) {
      return updateBlueprintEntity(source.tenant, payload.blueprint || details.blueprint, payload.metadata || details.metadata)
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
  }
}