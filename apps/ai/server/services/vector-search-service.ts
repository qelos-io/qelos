import { redisUrl } from '../../config';
import logger from './logger';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RedisVectorStore } from '@langchain/redis';
import { Document } from 'langchain/document';
import { createClient } from 'redis';
import { pipeline } from '@xenova/transformers';

type AIAuthentication = {
  token: string;
};

// Interface for tool representation
export type Tool = { type: 'file_search', vector_store_ids: string[] } | {
  type: string;
  name?: string;
  description: string;
  parameters?: any;
  function: {
    name?: string;
    description: string;
  };
  handler?: (req: any, payload: any) => Promise<any>;
}

// Redis client singleton
let redisClient: any = null;

/**
 * Get or create Redis client
 */
async function getRedisClient() {
  if (!redisClient) {
    if (!redisUrl) {
      throw new Error('Redis URL is not configured');
    }
    
    redisClient = createClient({ 
      url: redisUrl,
      socket: {
        connectTimeout: 10000, // 10 second connection timeout
      }
    });
    
    redisClient.on('error', (err: any) => {
      logger.error('Redis Client Error', err);
    });
    
    // Add timeout to connection
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
      })
    ]);
  }
  
  return redisClient;
}

/**
 * Get embeddings model based on the specified type
 * @param embeddingType Type of embeddings to use ('openai' or 'local')
 * @returns Embeddings instance
 */
async function getEmbeddings(embeddingType: 'openai' | 'local' = 'openai', authentication: AIAuthentication): Promise<any> {
  if (embeddingType === 'local') {
    // Use local Xenova Transformers embeddings
    return {
      embedQuery: async (text: string): Promise<number[]> => {
        try {
          // Use the feature-extraction pipeline from @xenova/transformers
          const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
          const result = await extractor(text, { pooling: 'mean', normalize: true });
          // Convert to regular array for compatibility
          return Array.from(result.data);
        } catch (error) {
          logger.error('Error generating embeddings', error);
          throw error;
        }
      },
      embedDocuments: async (documents: string[]): Promise<number[][]> => {
        try {
          const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
          const results = await Promise.all(
            documents.map(async (doc) => {
              const result = await extractor(doc, { pooling: 'mean', normalize: true });
              return Array.from(result.data);
            })
          );
          return results;
        } catch (error) {
          logger.error('Error generating document embeddings', error);
          throw error;
        }
      }
    } as any;
  } else {
    // Use OpenAI embeddings
    return new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      apiKey: authentication.token,
    });
  }
}

/**
 * Create a RedisVectorStore instance
 * @param indexName Name of the Redis index
 * @param embeddingType Type of embeddings to use ('openai' or 'local')
 */
async function createVectorStore(indexName: string = 'tools_index', embeddingType: 'openai' | 'local' = 'openai', authentication: AIAuthentication) {
  try {
    // Create Redis client
    const client = await getRedisClient();
    
    // Get embeddings based on type
    const embeddings = await getEmbeddings(embeddingType, authentication);
    logger.log(`Using ${embeddingType} embeddings for vector store`);
    
    // Create vector store
    return new RedisVectorStore(embeddings, {
      redisClient: client,
      indexName: indexName,
      keyPrefix: 'tool:',
    });
  } catch (error) {
    logger.error('Error creating vector store', error);
    throw error;
  }
}

/**
 * Index tools in Redis vector store
 * @param tools List of tools to index
 * @param tenant Tenant ID
 * @param embeddingType Type of embeddings to use ('openai' or 'local')
 */
export async function indexTools(
  tools: Tool[], 
  tenant: string, 
  embeddingType: 'openai' | 'local' = 'openai',
  authentication: AIAuthentication
): Promise<void> {
  if (!tools || tools.length === 0 || !redisUrl) {
    return;
  }
  
  try {
    const indexName = `tools_index_${tenant}_${embeddingType}`;
    const vectorStore = await createVectorStore(indexName, embeddingType, authentication);
    
    // Convert tools to documents for indexing
    const documents = tools.map((tool) => {
      const toolText = `${tool.function.name}: ${tool.function.description}`;
      return new Document({
        pageContent: toolText,
        metadata: {
          toolId: tool.function.name,
          toolName: tool.function.name,
          toolDescription: tool.function.description,
          tenant: tenant,
          embeddingType: embeddingType,
          // Store the full tool object as JSON string
          toolObject: JSON.stringify(tool)
        },
      });
    });
    
    // Add documents to vector store
    await vectorStore.addDocuments(documents);
    logger.log(`Indexed ${documents.length} tools for tenant ${tenant} using ${embeddingType} embeddings`);
    
  } catch (error) {
    logger.error('Error indexing tools', error);
  }
}

/**
 * Find similar tools using Redis vector search
 * @param userQuery User query text
 * @param tenant Tenant ID
 * @param allTools All available tools (fallback)
 * @param maxTools Maximum number of tools to return
 * @param embeddingType Type of embeddings to use ('openai' or 'local')
 * @param authentication Authentication details
 */
export async function findSimilarTools({
  userQuery,
  tenant,
  allTools,
  maxTools = 15,
  embeddingType = 'local',
  authentication
}: {
  userQuery: string;
  tenant: string;
  allTools: Tool[];
  maxTools?: number;
  embeddingType?: 'openai' | 'local';
  authentication: AIAuthentication;
}): Promise<Tool[]> {
  if (allTools.length <= maxTools) {
    return allTools;
  }
  // If no query or Redis URL, return all tools
  if (!userQuery || !redisUrl) {
    return allTools.slice(0, maxTools);
  }
  
  try {
    const indexName = `tools_index_${tenant}_${embeddingType}`;
    
    // Add timeout wrapper for vector operations
    const vectorOperations = async () => {
      const vectorStore = await createVectorStore(indexName, embeddingType, authentication);
      
      // First, ensure tools are indexed
      await indexTools(allTools, tenant, embeddingType, authentication);
      
      // Search for similar tools
      return await vectorStore.similaritySearch(userQuery, maxTools);
    };
    
    // Execute with 30-second timeout
    const results = await Promise.race([
      vectorOperations(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Vector search timeout')), 30000);
      })
    ]) as any[];
    
    // Convert results back to Tool objects
    const relevantTools = results
      .filter(result => result.metadata.toolObject) // Ensure we have tool data
      .map(result => {
        try {
          return JSON.parse(result.metadata.toolObject as string) as Tool;
        } catch (e) {
          logger.error('Error parsing tool object from Redis', e);
          return null;
        }
      })
      .filter(Boolean) as Tool[];
    
    // If we found relevant tools, return them
    if (relevantTools.length > 0) {
      return relevantTools.map(t => ({
        ...t,
        handler: allTools.find(tool => tool.name === t.function.name)?.handler
      }));
    }
    
    // Fallback to all tools if no results
    return allTools.slice(0, maxTools);
    
  } catch (error) {
    logger.error('Error finding similar tools', error);
    return allTools.slice(0, maxTools); // Fallback to all tools
  }
}

/**
 * Helper for agents to select relevant tools based on the latest user message
 * and optional source details (embedding type, max tools).
 */
export async function getRelevantToolsForAgent({
  tenant,
  safeUserMessages,
  sourceDetails,
  sourceAuthentication,
  allTools,
  defaultMaxTools = 8,
}: {
  tenant: string;
  safeUserMessages: any[];
  sourceDetails: any;
  sourceAuthentication: AIAuthentication;
  allTools: Tool[];
  defaultMaxTools?: number;
}): Promise<Tool[]> {
  // Build context from recent conversation history
  // Filter out tool/function messages and take last 3 conversational messages
  // This helps when the user says "continue", "do it", etc.
  const conversationalMessages = safeUserMessages.filter(msg => {
    // Only include user and assistant messages with actual text content
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return false;
    }
    // Skip messages that are tool calls or function results
    if (msg.tool_calls || msg.function_call || msg.tool_call_id) {
      return false;
    }
    const content = typeof msg.content === 'string' ? msg.content : '';
    return content.trim().length > 0;
  });
  
  const recentMessages = conversationalMessages.slice(-3);
  const contextParts = recentMessages.map(msg => msg.content);
  const contextQuery = contextParts.join(' ');

  const embeddingType = sourceDetails?.embeddingType || 'local';
  const maxTools = Number(sourceDetails?.maxTools || defaultMaxTools);

  if (allTools.length <= maxTools) {
    return allTools;
  }

  return findSimilarTools({
    userQuery: contextQuery || 'general',
    tenant,
    allTools,
    maxTools,
    embeddingType,
    authentication: sourceAuthentication,
  });
}
