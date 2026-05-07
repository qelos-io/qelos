import { Response } from 'express';
import mongoose from 'mongoose';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { IIntegration, QelosTriggerOperation } from '@qelos/global-types';
import {
  calPublicPluginsService,
  getIntegration,
  getSourceAuthentication,
} from '../services/plugins-service-api';
import { verifyUserPermissions } from '../services/source-service';
import { Thread } from '../models/thread';
import { chatCompletion } from './chat-completion';
import logger from '../services/logger';
import {
  agentPayloadToTarget,
  agentPayloadToTrigger,
  IAgentPayload,
  integrationToAgent,
  isAgentIntegration,
} from './agent-integration-mapping';

export const listAgents = async (req: RequestWithUser, res: Response) => {
  try {
    const queryParts: string[] = [`trigger.operation=${QelosTriggerOperation.chatCompletion}`];
    if (typeof req.query.active === 'string') {
      queryParts.push(`active=${req.query.active}`);
    }
    if (req.query.kind) {
      queryParts.push(`kind=${req.query.kind}`);
    }

    const integrations: IIntegration[] = await calPublicPluginsService(
      `/api/integrations?${queryParts.join('&')}`,
      { tenant: req.headers.tenant as string, user: req.headers.user },
      { method: 'GET' },
    );

    const agents = (integrations || [])
      .filter((i) => i.trigger?.operation === QelosTriggerOperation.chatCompletion)
      .map(integrationToAgent);

    return res.json(agents).end();
  } catch (error: unknown) {
    logger.error('Error listing agents:', error);
    return res.status(500).json({ message: 'Failed to list agents' }).end();
  }
};

export const getAgent = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid agent ID is required' }).end();
    }

    const integration: IIntegration = await calPublicPluginsService(
      `/api/integrations/${id}`,
      { tenant: req.headers.tenant as string, user: req.headers.user },
      { method: 'GET' },
    );

    if (!integration) {
      return res.status(404).json({ message: 'Agent not found' }).end();
    }
    if (!isAgentIntegration(integration)) {
      return res.status(404).json({ message: 'Agent not found' }).end();
    }

    return res.json(integrationToAgent(integration)).end();
  } catch (error: unknown) {
    logger.error('Error getting agent:', error);
    const status = (error as { response?: { status?: number } })?.response?.status || 500;
    return res.status(status).json({ message: 'Failed to get agent' }).end();
  }
};

export const createAgent = async (req: RequestWithUser, res: Response) => {
  try {
    const payload: IAgentPayload = req.body || {};

    if (!payload.name) {
      return res.status(400).json({ message: 'name is required' }).end();
    }
    if (!payload.triggerSource || !payload.targetSource) {
      return res.status(400).json({ message: 'triggerSource and targetSource are required' }).end();
    }

    const integration: Partial<IIntegration> = {
      active: payload.active !== false,
      trigger: agentPayloadToTrigger(payload),
      target: agentPayloadToTarget(payload),
      dataManipulation: [],
    };

    const created: IIntegration = await calPublicPluginsService(
      `/api/integrations`,
      { tenant: req.headers.tenant as string, user: req.headers.user },
      { method: 'POST', data: integration },
    );

    return res.status(201).json(integrationToAgent(created)).end();
  } catch (error: unknown) {
    logger.error('Error creating agent:', error);
    const status = (error as { response?: { status?: number; data?: { message?: string } } })?.response?.status || 500;
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create agent';
    return res.status(status).json({ message }).end();
  }
};

export const updateAgent = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid agent ID is required' }).end();
    }

    const existing: IIntegration = await calPublicPluginsService(
      `/api/integrations/${id}`,
      { tenant: req.headers.tenant as string, user: req.headers.user },
      { method: 'GET' },
    );

    if (!existing || !isAgentIntegration(existing)) {
      return res.status(404).json({ message: 'Agent not found' }).end();
    }

    const payload: IAgentPayload = req.body || {};
    const updates: Partial<IIntegration> = {
      trigger: agentPayloadToTrigger(payload, existing.trigger),
      target: agentPayloadToTarget(payload, existing.target),
    };
    if (payload.active !== undefined) {
      updates.active = payload.active;
    }

    const updated: IIntegration = await calPublicPluginsService(
      `/api/integrations/${id}`,
      { tenant: req.headers.tenant as string, user: req.headers.user },
      { method: 'PUT', data: updates },
    );

    return res.json(integrationToAgent(updated)).end();
  } catch (error: unknown) {
    logger.error('Error updating agent:', error);
    const status = (error as { response?: { status?: number } })?.response?.status || 500;
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update agent';
    return res.status(status).json({ message }).end();
  }
};

export const deleteAgent = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid agent ID is required' }).end();
    }

    const existing: IIntegration = await calPublicPluginsService(
      `/api/integrations/${id}`,
      { tenant: req.headers.tenant as string, user: req.headers.user },
      { method: 'GET' },
    );

    if (!existing || !isAgentIntegration(existing)) {
      return res.status(404).json({ message: 'Agent not found' }).end();
    }

    await calPublicPluginsService(
      `/api/integrations/${id}`,
      { tenant: req.headers.tenant as string, user: req.headers.user },
      { method: 'DELETE' },
    );

    return res.json({ success: true, message: 'Agent deleted' }).end();
  } catch (error: unknown) {
    logger.error('Error deleting agent:', error);
    const status = (error as { response?: { status?: number } })?.response?.status || 500;
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete agent';
    return res.status(status).json({ message }).end();
  }
};

/**
 * Direct agent chat. Loads the agent integration, creates (or reuses) a thread,
 * then delegates to the existing chatCompletion controller.
 *
 * - POST -> JSON response (non-streaming)
 * - GET  -> SSE response (streaming); user message must be provided via query string
 *           (`message=...` or JSON-encoded `messages=...`) since EventSource has no body.
 */
export const agentChat = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid agent ID is required' }).end();
    }

    const integration = await getIntegration(req.headers.tenant, id, true);
    if (!integration || !integration.active || !isAgentIntegration(integration)) {
      return res.status(404).json({ message: 'Agent not found' }).end();
    }

    const { error, status } = verifyUserPermissions(req.user, integration.trigger.details) || {};
    if (error) {
      return res.status(status || 403).json({ message: error }).end();
    }

    const isSSE = req.method === 'GET';
    const body = isSSE ? {} : req.body || {};

    let messages = Array.isArray(body.messages) ? body.messages : [];
    if (isSSE) {
      if (typeof req.query.messages === 'string') {
        try {
          const parsed = JSON.parse(req.query.messages as string);
          if (Array.isArray(parsed)) messages = parsed;
        } catch {
          // ignore parse errors, fall through to message handling
        }
      }
      if (messages.length === 0 && typeof req.query.message === 'string') {
        messages = [{ role: 'user', content: req.query.message }];
      }
    }

    if (messages.length === 0) {
      return res.status(400).json({ message: 'messages are required' }).end();
    }

    let thread = null;
    const threadIdParam = (isSSE ? req.query.threadId : body.threadId) as string | undefined;
    if (threadIdParam && mongoose.Types.ObjectId.isValid(threadIdParam)) {
      const filters: Record<string, unknown> = {
        _id: threadIdParam,
        user: req.user._id,
        integration: integration._id,
      };
      if (req.workspace) filters.workspace = req.workspace._id;
      thread = await Thread.findOne(filters).exec();
      if (!thread) {
        return res.status(404).json({ message: 'thread not found' }).end();
      }
    } else {
      thread = new Thread({
        integration: integration._id,
        user: req.user._id,
        workspace: req.workspace?._id,
        messages: [],
      });
      await thread.save();
    }

    const source = integration.target.source as { _id?: string } | string;
    const sourceId = typeof source === 'string' ? source : source?._id || source;
    const sourceData = await getSourceAuthentication(req.headers.tenant, sourceId);

    req.integration = integration;
    req.source = source;
    req.thread = thread;
    req.integrationSourceTargetAuthentication = sourceData?.authentication;
    req.body = {
      ...body,
      messages,
    };

    if (isSSE && !req.headers.accept?.includes('text/event-stream')) {
      req.headers.accept = 'text/event-stream';
    }

    return chatCompletion(req, res);
  } catch (error: unknown) {
    logger.error('Error in agent chat:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to chat with agent' }).end();
    }
  }
};
