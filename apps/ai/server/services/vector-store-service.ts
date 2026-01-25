import { OpenAI } from 'openai';
import { VectorStore, IVectorStore, VectorStoreScope } from '../models/vector-store';
import mongoose from 'mongoose';
import logger from './logger';
import { Thread } from '../models/thread';

export interface VectorStoreConfig {
  scope: VectorStoreScope;
  expirationAfterDays?: number;
  hardcodedIds?: string[];
}

export class VectorStoreService {
  private openai: OpenAI;

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  /**
   * Get or create a vector store based on scope and configuration
   */
  async getOrCreateVectorStore(
    tenant: string,
    agentId: string,
    scope: VectorStoreScope,
    subjectId?: string,
    config?: Partial<VectorStoreConfig>
  ): Promise<IVectorStore> {   
    // Convert subjectId to ObjectId if provided
    const subjectObjectId = subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined;
    
    // First, try to find existing vector store
    let existingStore;
    try {
      existingStore = await VectorStore.findOne({
        tenant,
        agent: new mongoose.Types.ObjectId(agentId),
        scope,
        subjectId: subjectObjectId
      });
    } catch (error: any) {
      logger.error('Error finding vector store:', {
        error: error.message,
        tenant,
        agentId,
        scope,
        subjectId,
        subjectObjectId
      });
      throw error;
    }

    if (existingStore) {
      // Check if the store is still valid in OpenAI
      try {
        await this.openai.vectorStores.retrieve(existingStore.externalId);
        return existingStore;
      } catch (error) {
        logger.warn(`Vector store ${existingStore.externalId} no longer exists in OpenAI, creating new one`);
      }
    }

    // Create new vector store
    return await this.createVectorStore(tenant, agentId, scope, subjectId, config);
  }

  /**
   * Create a new vector store
   */
  private async createVectorStore(
    tenant: string,
    agentId: string,
    scope: VectorStoreScope,
    subjectId?: string,
    config?: Partial<VectorStoreConfig>
  ): Promise<IVectorStore> {
    const storeName = this.generateStoreName(tenant, scope, subjectId);
    
    const createParams: OpenAI.VectorStores.VectorStoreCreateParams = {
      name: storeName
    };

    // Add expiration if specified (only if expirationAfterDays is provided)
    if (config?.expirationAfterDays && config.expirationAfterDays > 0) {
      createParams.expires_after = {
        anchor: 'last_active_at',
        days: config.expirationAfterDays
      };
    }

    const openaiStore = await this.openai.vectorStores.create(createParams);

    const vectorStore = new VectorStore({
      scope,
      subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined,
      tenant,
      agent: new mongoose.Types.ObjectId(agentId),
      externalId: openaiStore.id,
      expirationAfterDays: config?.expirationAfterDays,
      hardcodedIds: config?.hardcodedIds || []
    });

    let savedVectorStore;
    try {
      savedVectorStore = await vectorStore.save();
    } catch (error: any) {
      logger.error('Error saving vector store:', {
        error: error.message,
        tenant,
        agentId,
        scope,
        subjectId,
        vectorStoreData: vectorStore.toObject()
      });
      throw error;
    }
    
    logger.info(`Created vector store ${openaiStore.id} for ${scope} ${subjectId || 'tenant'} in tenant ${tenant}`);

    return savedVectorStore;
  }

  /**
   * Get all vector store IDs to use for a thread (including hardcoded ones)
   */
  async getVectorStoreIdsForThread(
    threadId: string,
    agentId: string,
    tenant: string
  ): Promise<string[]> {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const stores: string[] = [];
    
    // Run all vector store queries in parallel for better performance
    const [
      threadStore,
      userStore,
      workspaceStore,
      tenantStore,
      allStores
    ] = await Promise.all([
      // Check for thread-scoped store
      VectorStore.findOne({
        tenant,
        agent: new mongoose.Types.ObjectId(agentId),
        scope: 'thread',
        subjectId: new mongoose.Types.ObjectId(threadId)
      }),
      
      // Check for user-scoped store
      VectorStore.findOne({
        tenant,
        agent: new mongoose.Types.ObjectId(agentId),
        scope: 'user',
        subjectId: new mongoose.Types.ObjectId(thread.user.toString())
      }),
      
      // Check for workspace-scoped store
      thread.workspace ? VectorStore.findOne({
        tenant,
        agent: new mongoose.Types.ObjectId(agentId),
        scope: 'workspace',
        subjectId: new mongoose.Types.ObjectId(thread.workspace.toString())
      }) : Promise.resolve(null),
      
      // Check for tenant-scoped store
      VectorStore.findOne({
        tenant,
        agent: new mongoose.Types.ObjectId(agentId),
        scope: 'tenant',
        subjectId: { $exists: false }
      }),
      
      // Get all stores for hardcoded IDs
      VectorStore.find({
        tenant,
        agent: new mongoose.Types.ObjectId(agentId),
        $or: [
          { scope: 'thread', subjectId: new mongoose.Types.ObjectId(threadId) },
          { scope: 'user', subjectId: new mongoose.Types.ObjectId(thread.user.toString()) },
          { scope: 'workspace', subjectId: thread.workspace ? new mongoose.Types.ObjectId(thread.workspace.toString()) : { $exists: false } },
          { scope: 'tenant', subjectId: { $exists: false } }
        ]
      })
    ]);

    // Collect store IDs from the parallel query results
    if (threadStore) {
      stores.push(threadStore.externalId);
    }
    
    if (userStore) {
      stores.push(userStore.externalId);
    }
    
    if (workspaceStore) {
      stores.push(workspaceStore.externalId);
    }
    
    if (tenantStore) {
      stores.push(tenantStore.externalId);
    }

    // Add hardcoded IDs from any matching stores
    allStores.forEach(store => {
      if (store.hardcodedIds && store.hardcodedIds.length > 0) {
        stores.push(...store.hardcodedIds);
      }
    });

    // Remove duplicates
    return [...new Set(stores)];
  }

  /**
   * Generate a descriptive name for the vector store
   */
  private generateStoreName(tenant: string, scope: VectorStoreScope, subjectId?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    switch (scope) {
      case 'thread':
        return `Thread Vector Store - ${subjectId} - ${timestamp}`;
      case 'user':
        return `User Vector Store - ${subjectId} - ${timestamp}`;
      case 'workspace':
        return `Workspace Vector Store - ${subjectId} - ${timestamp}`;
      case 'tenant':
        return `Tenant Vector Store - ${tenant} - ${timestamp}`;
      default:
        return `Vector Store - ${timestamp}`;
    }
  }
}
