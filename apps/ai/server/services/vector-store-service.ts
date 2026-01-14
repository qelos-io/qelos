import { VectorStore, IVectorStore, VectorStoreScope } from '../models/vector-store';
import { Thread } from '../models/thread';
import OpenAI from 'openai';
import logger from './logger';

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
    // First, try to find existing vector store
    const existingStore = await VectorStore.findOne({
      tenant,
      agent: agentId,
      scope,
      subjectId: subjectId || undefined
    });

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

    // Determine subject model for reference
    let subjectModel: string | undefined;
    if (scope === 'thread') subjectModel = 'Thread';
    else if (scope === 'user') subjectModel = 'User';
    else if (scope === 'workspace') subjectModel = 'Workspace';

    const vectorStore = new VectorStore({
      scope,
      subjectId: subjectId || undefined,
      subjectModel,
      tenant,
      agent: agentId,
      externalId: openaiStore.id,
      expirationAfterDays: config?.expirationAfterDays,
      hardcodedIds: config?.hardcodedIds || []
    });

    await vectorStore.save();
    logger.info(`Created vector store ${openaiStore.id} for ${scope} ${subjectId || 'tenant'} in tenant ${tenant}`);

    return vectorStore;
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
    
    // Check for thread-scoped store
    const threadStore = await VectorStore.findOne({
      tenant,
      agent: agentId,
      scope: 'thread',
      subjectId: threadId
    });
    if (threadStore) {
      stores.push(threadStore.externalId);
    }

    // Check for user-scoped store
    const userStore = await VectorStore.findOne({
      tenant,
      agent: agentId,
      scope: 'user',
      subjectId: thread.user.toString()
    });
    if (userStore) {
      stores.push(userStore.externalId);
    }

    // Check for workspace-scoped store
    if (thread.workspace) {
      const workspaceStore = await VectorStore.findOne({
        tenant,
        agent: agentId,
        scope: 'workspace',
        subjectId: thread.workspace.toString()
      });
      if (workspaceStore) {
        stores.push(workspaceStore.externalId);
      }
    }

    // Check for tenant-scoped store
    const tenantStore = await VectorStore.findOne({
      tenant,
      agent: agentId,
      scope: 'tenant',
      subjectId: { $exists: false }
    });
    if (tenantStore) {
      stores.push(tenantStore.externalId);
    }

    // Add hardcoded IDs from any matching stores
    const allStores = await VectorStore.find({
      tenant,
      agent: agentId,
      $or: [
        { scope: 'thread', subjectId: threadId },
        { scope: 'user', subjectId: thread.user.toString() },
        { scope: 'workspace', subjectId: thread.workspace?.toString() },
        { scope: 'tenant', subjectId: { $exists: false } }
      ]
    });

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
