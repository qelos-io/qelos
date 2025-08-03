import { Response } from 'express'
import { Thread } from '../models/thread'
import mongoose from 'mongoose'
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { getIntegration } from '../services/plugins-service-api';
import { verifyUserPermissions } from '../services/source-service';
import { QelosTriggerOperation } from '@qelos/global-types';
import logger from '../services/logger';

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
    if (!integration) {
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
      workspace: req.user.workspace,
      messages: []
    })

    await thread.save()
    
    return res.status(201).json(thread).end();
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
    const { integration } = req.query
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const filter: any = { user: req.user._id };

    if (req.workspace) {
      filter.workspace = req.workspace._id;
    }

    if (integration) {
      filter.integration = integration;
    }
    
    const threads = await Thread.find(filter).sort({ updated: -1 }).lean().exec();
    
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
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const { threadId } = req.params
    
    if (!threadId || !mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ error: 'Valid thread ID is required' })
    }
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const filters: any = {
      _id: threadId,
      user: req.user._id // Ensure user can only access their own threads
    };

    if (req.workspace) {
      filters.workspace = req.workspace._id;
    }
    
    const thread = await Thread.findOne(filters).lean().exec();
    
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
  try {
    const { threadId } = req.params
    
    if (!threadId || !mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ error: 'Valid thread ID is required' })
    }
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const filters: any = {
      _id: threadId,
      user: req.user._id // Ensure user can only delete their own threads
    };

    if (req.workspace) {
      filters.workspace = req.workspace._id;
    }
    
    const thread = await Thread.findOneAndDelete(filters).lean().exec();
    
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' }).end();
    }
    
    return res.json({ message: 'Thread deleted successfully' }).end();
  } catch (error) {
    logger.error('Error deleting thread:', error)
    return res.status(500).json({ error: 'Failed to delete thread' }).end();
  }
}
