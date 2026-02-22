import { Thread } from '../models/thread';
import logger from './logger';
import OpenAI from 'openai';
import mongoose from 'mongoose';

interface ContainerInfo {
  id: string;
  object: string;
  created_at: number;
  status: string;
  expires_after: {
    anchor: string;
    minutes: number;
  };
  last_active_at: number;
  memory_limit: string;
  name: string;
}

export class CodeInterpreterService {
  private openai: OpenAI;

  constructor(openaiClient: OpenAI) {
    this.openai = openaiClient;
  }

  /**
   * Get or create a code interpreter container for a thread
   */
  async getOrCreateContainer(thread: mongoose.Document & any): Promise<string> {
    try {
      // Check if existing container is valid
      if (thread.codeInterpreterContainerId && thread.codeInterpreterContainerExpiresAt) {
        const isValid = await this.validateContainer(thread.codeInterpreterContainerId);
        if (isValid) {
          logger.info('Using existing code interpreter container', { 
            threadId: thread._id, 
            containerId: thread.codeInterpreterContainerId 
          });
          return thread.codeInterpreterContainerId;
        } else {
          logger.info('Existing container expired or invalid, creating new one', { 
            threadId: thread._id, 
            oldContainerId: thread.codeInterpreterContainerId 
          });
        }
      }

      // Create new container
      const container = await this.createContainer();
      
      // Update thread with container info
      thread.codeInterpreterContainerId = container.id;
      thread.codeInterpreterContainerExpiresAt = new Date(Date.now() + (container.expires_after.minutes * 60 * 1000));
      await thread.save();

      logger.info('Created new code interpreter container', { 
        threadId: thread._id, 
        containerId: container.id,
        expiresAt: thread.codeInterpreterContainerExpiresAt 
      });

      return container.id;
    } catch (error) {
      logger.error('Failed to get or create code interpreter container', { threadId: thread._id, error });
      throw error;
    }
  }

  /**
   * Validate if a container is still active and usable
   */
  private async validateContainer(containerId: string): Promise<boolean> {
    try {
      const container = await this.openai.containers.retrieve(containerId) as ContainerInfo;
      
      // Check if container is running and not expired
      if (container.status !== 'running') {
        return false;
      }

      // Check expiration based on last_active_at and expires_after
      const expirationTime = new Date(container.last_active_at * 1000);
      expirationTime.setMinutes(expirationTime.getMinutes() + container.expires_after.minutes);
      
      return new Date() < expirationTime;
    } catch (error) {
      logger.warn('Failed to validate container', { containerId, error });
      return false;
    }
  }

  /**
   * Create a new code interpreter container
   */
  private async createContainer(): Promise<ContainerInfo> {
    try {
      const container = await this.openai.containers.create({
        name: `Code Interpreter ${new Date().toISOString()}`,
        memory_limit: '4g' as const,
      });

      logger.info('Created new OpenAI container', { containerId: container.id });
      return container as ContainerInfo;
    } catch (error) {
      logger.error('Failed to create OpenAI container', { error });
      throw error;
    }
  }

  /**
   * Clean up expired containers (optional maintenance method)
   */
  async cleanupExpiredContainers(): Promise<void> {
    try {
      const expiredThreads = await Thread.find({
        codeInterpreterContainerId: { $exists: true },
        codeInterpreterContainerExpiresAt: { $lt: new Date() }
      });

      for (const thread of expiredThreads) {
        try {
          if (thread.codeInterpreterContainerId) {
            await this.openai.containers.delete(thread.codeInterpreterContainerId);
            logger.info('Deleted expired container', { 
              threadId: thread._id, 
              containerId: thread.codeInterpreterContainerId 
            });
          }
        } catch (error) {
          logger.warn('Failed to delete expired container', { 
            threadId: thread._id, 
            containerId: thread.codeInterpreterContainerId, 
            error 
          });
        }

        // Clear container references from thread
        thread.codeInterpreterContainerId = undefined;
        thread.codeInterpreterContainerExpiresAt = undefined;
        await thread.save();
      }

      logger.info('Cleaned up expired containers', { count: expiredThreads.length });
    } catch (error) {
      logger.error('Failed to cleanup expired containers', { error });
    }
  }
}
