import { Response } from 'express'
import { Thread } from '../models/thread'
import mongoose from 'mongoose'
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { getIntegration, getSourceAuthentication } from '../services/plugins-service-api';
import { verifyUserPermissions } from '../services/source-service';
import { QelosTriggerOperation } from '@qelos/global-types';
import logger from '../services/logger';
import { emitPlatformEvent } from '@qelos/api-kit';
import { OpenAI } from 'openai';
import { IntegrationSourceKind } from '@qelos/global-types';
import { VectorStoreService } from '../services/vector-store-service';
import { VectorStoreScope } from '../models/vector-store';

/**
 * Create a new thread
 * Only requires integration ID from route params
 */
export const createThread = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!mongoose.Types.ObjectId.isValid(req.body.integration)) {
      return res.status(400).json({ error: 'Valid integration ID is required' })
    }

    const integration = await getIntegration(req.headers.tenant, req.body.integration)
    if (!integration || !integration.active) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    if (integration.trigger.operation !== QelosTriggerOperation.chatCompletion) {
      return res.status(400).json({ error: 'Integration trigger operation must be chatCompletion' }).end();
    }

    const { error, status } = verifyUserPermissions(req.user, integration.trigger.details) || {};
    if (error) {
      res.status(status || 403).json({ message: error }).end();
      return;
    }

    const thread = new Thread({
      integration: integration._id,
      user: req.user._id,
      workspace: req.workspace?._id,
      messages: []
    })

    if (integration.trigger.details?.vectorStore) {
      // Create vector store using the new vector store service
      try {
        // Get the vector store source (target source)
        // Handle both string ID and object with _id
        const sourceId = typeof integration.target.source === 'string' 
          ? integration.target.source 
          : (integration.target.source as any)._id || integration.target.source;
        
        const sourceData = await getSourceAuthentication(req.headers.tenant, sourceId);
        
        if (!sourceData || !sourceData.authentication) {
          logger.error('Failed to get target source for vector store creation');
          return res.status(400).json({ error: 'Failed to get target source for vector store' });
        }

        // Check if the target source kind is OpenAI
        if (integration.kind[1] !== IntegrationSourceKind.OpenAI) {
          logger.info(`Skipping vector store creation: target source kind is ${integration.kind[1]}, not openai`);
        } else {
          // Create OpenAI client
          const openai = new OpenAI({
            apiKey: sourceData.authentication.token,
            organization: sourceData.metadata?.organizationId,
            baseURL: sourceData.metadata?.apiUrl,
            timeout: 120000,
          });

          // Create vector store service
          const vectorStoreService = new VectorStoreService(openai);

          // Determine scope and configuration
          const scope: VectorStoreScope = integration.trigger.details.vectorStoreScope || 'thread';
          const config = {
            expirationAfterDays: integration.trigger.details.vectorStoreExpirationDays || 30,
            hardcodedIds: integration.trigger.details.vectorStoreHardcodedIds || []
          };

          // Determine subject ID based on scope
          let subjectId: string | undefined;
          if (scope === 'thread') {
            subjectId = (thread._id as mongoose.Types.ObjectId).toString();
          } else if (scope === 'user') {
            subjectId = (req.user._id as mongoose.Types.ObjectId).toString();
          } else if (scope === 'workspace' && req.workspace) {
            subjectId = req.workspace._id;
          }
          // For tenant scope, subjectId remains undefined

          // Create or get vector store
          const vectorStore = await vectorStoreService.getOrCreateVectorStore(
            req.headers.tenant,
            integration._id.toString(),
            scope,
            subjectId,
            config
          );

          logger.info(`Vector store ${vectorStore.externalId} created/retrieved for ${scope} ${subjectId || 'tenant'}`);
        }
      } catch (error: any) {
        logger.error('Error creating vector store:', error);
        // Continue without vector store but log the error
        emitPlatformEvent({
          kind: 'ai',
          eventName: 'vector_store_creation_failed',
          source: 'ai_service',
          user: req.user?._id,
          metadata: {
            thread: thread._id,
            integration: integration._id,
            error: error.message,
            workspace: req.user?.workspace
          },
          tenant: req.headers.tenant,
          description: 'Vector store creation failed'
        }).catch(() => { });
      }
    }

    await thread.save()

    emitPlatformEvent({
      kind: 'threads',
      eventName: 'create',
      source: 'ai',
      user: req.user?._id,
      metadata: {
        thread: thread._id,
        integration: integration._id,
        workspace: req.user?.workspace
      },
      tenant: req.headers.tenant,
      description: 'Thread created'
    }).catch(() => { });

    return res.status(201).json(thread.toObject()).end();
  } catch (error) {
    logger.error('Error creating thread:', error)
    return res.status(500).json({ error: 'Failed to create thread' })
  }
}

/**
 * Get all threads for the current user
 */
export const getThreads = async (req: RequestWithUser, res: Response) => {
  try {
    const { integration, sort, limit } = req.query

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const filter: any = {};
    const bypassAdmin = typeof req.body?.bypassAdmin !== 'undefined' ? !!req.body?.bypassAdmin : req.query.bypassAdmin === 'true';

    if (req.user.isPrivileged && !bypassAdmin) {
      if (req.query.user) {
        filter.user = req.query.user;
      }
      if (req.query.workspace) {
        filter.workspace = req.query.workspace;
      }
    } else {
      filter.user = req.user._id;
      if (req.workspace) {
        filter.workspace = req.workspace._id;
      }
    }

    if (integration) {
      filter.integration = integration;
    }

    const options: any  = {}
    if (limit) {
      options.limit = Number(limit || 50)
    }
    const threads = await Thread.find(filter).select('-messages -vectorStoreExternalId').sort(sort || '-updated').lean().exec();

    return res.json(threads).end();
  } catch (error) {
    logger.error('Error fetching threads:', error)
    return res.status(500).json({ error: 'Failed to fetch threads' }).end();
  }
}

/**
 * Get a single thread by ID
 */
export const getThread = async (req: RequestWithUser, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const bypassAdmin = typeof req.body?.bypassAdmin !== 'undefined' ? !!req.body?.bypassAdmin : req.query.bypassAdmin === 'true';

  try {
    const { threadId } = req.params

    if (!threadId || !mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ error: 'Valid thread ID is required' })
    }

    const filters: any = {
      _id: threadId,
      user: req.user._id // Ensure user can only access their own threads
    };

    if (req.workspace) {
      filters.workspace = req.workspace._id;
    }

    if (req.user.isPrivileged && !bypassAdmin) {
      // Admin can access any thread
      delete filters.user;
      delete filters.workspace;
    }

    const thread = await Thread.findOne(filters).select('-vectorStoreExternalId').lean().exec();

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' }).end();
    }

    return res.json(thread).end();
  } catch (error) {
    logger.error('Error fetching thread:', error)
    return res.status(500).json({ error: 'Failed to fetch thread' }).end();
  }
}

/**
 * Delete a thread
 */
export const deleteThread = async (req: RequestWithUser, res: Response) => {
  const bypassAdmin = typeof req.body?.bypassAdmin !== 'undefined' ? !!req.body?.bypassAdmin : req.query.bypassAdmin === 'true';

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const { threadId } = req.params

    if (!threadId || !mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ error: 'Valid thread ID is required' })
    }

    const filters: any = {
      _id: threadId,
      user: req.user._id // Ensure user can only delete their own threads
    };

    if (req.workspace) {
      filters.workspace = req.workspace._id;
    }

    if (req.user.isPrivileged && !bypassAdmin) {
      // Admin can delete any thread
      delete filters.user;
      delete filters.workspace;
    }

    const thread = await Thread.findOneAndDelete(filters).select('-vectorStoreExternalId').lean().exec();

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' }).end();
    }

    // Delete vector store if it exists for this specific thread
    try {
      // Get the integration to check if vector store is enabled
      const integration = await getIntegration(req.headers.tenant, thread.integration.toString());
      
      if (integration && integration.trigger.details?.vectorStore) {
        // Get source authentication for OpenAI
        // Handle both string ID and object with _id
        const sourceId = typeof integration.target.source === 'string' 
          ? integration.target.source 
          : (integration.target.source as any)._id || integration.target.source;
        
        const sourceData = await getSourceAuthentication(req.headers.tenant, sourceId);
        
        if (sourceData && sourceData.authentication && integration.kind[1] === IntegrationSourceKind.OpenAI) {
          const openai = new OpenAI({
            apiKey: sourceData.authentication.token,
            organization: sourceData.metadata?.organizationId,
            baseURL: sourceData.metadata?.apiUrl,
          });

          // Find and delete the thread-scoped vector store
          const VectorStore = (await import('../models/vector-store')).VectorStore;
          const threadVectorStore = await VectorStore.findOne({
            tenant: req.headers.tenant,
            agent: integration._id,
            scope: 'thread',
            subjectId: thread._id.toString()
          });

          if (threadVectorStore) {
            // Delete from OpenAI first
            try {
              await openai.vectorStores.delete(threadVectorStore.externalId);
              logger.info(`Deleted OpenAI vector store ${threadVectorStore.externalId} for thread ${thread._id}`);
            } catch (error) {
              logger.warn(`Failed to delete OpenAI vector store ${threadVectorStore.externalId}:`, error);
              // Continue with database deletion even if OpenAI deletion fails
            }

            // Delete from database
            await VectorStore.deleteOne({ _id: threadVectorStore._id });
            logger.info(`Deleted vector store record ${threadVectorStore._id} for thread ${thread._id}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error deleting vector store for thread:', error);
      // Don't fail the thread deletion if vector store cleanup fails
    }

    emitPlatformEvent({
      kind: 'threads',
      eventName: 'delete',
      source: 'ai',
      user: req.user?._id,
      metadata: {
        thread: thread._id,
        integration: thread.integration,
        workspace: req.user?.workspace
      },
      tenant: req.headers.tenant,
      description: 'Thread deleted'
    }).catch(() => { });

    return res.json({ message: 'Thread deleted successfully' }).end();
  } catch (error) {
    logger.error('Error deleting thread:', error)
    return res.status(500).json({ error: 'Failed to delete thread' }).end();
  }
}
