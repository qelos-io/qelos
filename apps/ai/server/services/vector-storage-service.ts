import { IOpenAISource } from '@qelos/global-types';
import { OpenAI } from 'openai';
import logger from './logger';
import { Readable } from 'node:stream';

export interface VectorStorageService {
  uploadContent(params: {
    content: string;
    fileName?: string;
    metadata?: any;
  }): Promise<{ fileId: string }>;
  clearFiles(params: { fileIds?: string[] }): Promise<{ clearedCount: number }>;
}

export class OpenAIVectorStorageService implements VectorStorageService {
  private openai: OpenAI;
  private vectorStoreId: string;

  constructor(source: IOpenAISource, vectorStoreId?: string) {
    this.openai = new OpenAI({
      apiKey: source.authentication.token,
      organization: source.metadata?.organizationId,
      baseURL: source.metadata?.apiUrl,
    });
    this.vectorStoreId = vectorStoreId || 'vs_default'; // Use provided or default vector store
  }

  async uploadContent(params: {
    content: string;
    fileName?: string;
    metadata?: any;
  }): Promise<{ fileId: string }> {
    try {
      // Create a buffer from the content
      const contentBuffer = Buffer.from(params.content, 'utf8');
      
      // Create a readable stream with filename metadata
      const stream = Readable.from([contentBuffer]);
      // Add filename as a property to the stream object
      (stream as any).filename = params.fileName || 'content.txt';
      
      // Upload the file using OpenAI SDK
      const uploadedFile = await this.openai.files.create({
        file: stream as any,
        purpose: 'assistants',
      });

      // Add the file to the vector store
      await this.openai.vectorStores.files.create(this.vectorStoreId, {
        file_id: uploadedFile.id,
      });

      return { fileId: uploadedFile.id };
    } catch (error) {
      throw error;
    }
  }

  async clearFiles(params: { fileIds?: string[] }): Promise<{ clearedCount: number }> {
    try {
      if (params.fileIds && params.fileIds.length > 0) {
        // Clear specific files
        let clearedCount = 0;
        for (const fileId of params.fileIds) {
          try {
            await this.openai.vectorStores.files.delete(this.vectorStoreId, fileId);
            clearedCount++;
          } catch (error) {
            logger.warn(`Failed to delete file ${fileId} from vector store:`, error);
          }
        }
        return { clearedCount };
      } else {
        // Clear all files from vector store
        const list = await this.openai.vectorStores.files.list(this.vectorStoreId);
        const files = list.data;
        
        let clearedCount = 0;
        for (const file of files) {
          try {
            await this.openai.vectorStores.files.delete(this.vectorStoreId, file.id);
            clearedCount++;
          } catch (error) {
            logger.warn(`Failed to delete file ${file.id} from vector store:`, error);
          }
        }
        return { clearedCount };
      }
    } catch (error) {
      logger.error('Error clearing files from OpenAI vector store:', error);
      throw error;
    }
  }
}

// Factory function to create the appropriate service based on source kind
export function createVectorStorageService(
  source: IOpenAISource,
  vectorStoreId?: string
): VectorStorageService {
  // Currently only OpenAI is supported
  // Future: Add support for other providers like Anthropic, etc.
  return new OpenAIVectorStorageService(source, vectorStoreId);
}

// Helper function to get or create a vector store for an integration
export async function getOrCreateIntegrationVectorStore(
  tenant: string,
  integrationId: string,
  source: IOpenAISource
): Promise<string> {
  const openai = new OpenAI({
    apiKey: source.authentication.token,
    organization: source.metadata?.organizationId,
    baseURL: source.metadata?.apiUrl,
  });

  // For now, create a new vector store with a consistent name
  // In the future, we could cache this or store it elsewhere
  const vectorStoreName = `Integration-${integrationId}-${tenant}`;
  
  try {
    // Try to find existing vector store by name
    const list = await openai.vectorStores.list({
      order: 'desc',
      limit: 100,
      after: undefined
    });
    
    const existingStore = list.data.find(store => store.name === vectorStoreName);
    
    if (existingStore) {
      return existingStore.id;
    }
  } catch (error) {
    logger.warn('Failed to list existing vector stores, creating new one');
  }

  // Create new vector store for the integration
  const vectorStore = await openai.vectorStores.create({
    name: vectorStoreName,
    expires_after: {
      anchor: 'last_active_at',
      days: 30,
    },
  });

  return vectorStore.id;
}
