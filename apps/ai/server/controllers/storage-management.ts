import { Request, Response } from 'express';
import { IOpenAISource, OpenAIUploadStoragePayload, OpenAIClearStoragePayload } from '@qelos/global-types';
import { createVectorStorageService, getOrCreateIntegrationVectorStore } from '../services/vector-storage-service';
import { VectorStore } from '../models/vector-store';

// Extend Request type to include source and sourceAuthentication
declare global {
  namespace Express {
    interface Request {
      source?: IOpenAISource;
      sourceAuthentication?: any;
      integrationId?: string;
    }
  }
}

export async function uploadContentToStorage(req: Request, res: Response) {
  try {
    const source = req.source as IOpenAISource;
    const integrationId = req.body.integrationId || req.integrationId;
    const providedVectorStoreId = req.body.vectorStoreId;
    const body = req.body as OpenAIUploadStoragePayload & { integrationId?: string };

    if (!body.content) {
      return res.status(400).json({ error: 'Content is required' }).end();
    }

    // Ensure content is a string, convert object to JSON if needed
    let contentToUpload: string;
    if (typeof body.content === 'string') {
      contentToUpload = body.content;
    } else if (typeof body.content === 'object' && body.content !== null) {
      // Convert object to JSON document
      contentToUpload = JSON.stringify(body.content, null, 2);
    } else {
      return res.status(400).json({ 
        error: 'Content must be a string or object',
        received: typeof body.content
      });
    }

    if (!integrationId) {
      return res.status(400).json({ error: 'Integration ID is required' });
    }

    // Use provided vector store ID or get/create one for this integration
    let vectorStoreId: string;
    if (providedVectorStoreId) {
      vectorStoreId = providedVectorStoreId;
    } else {
      vectorStoreId = await getOrCreateIntegrationVectorStore(
        req.headers.tenant as string,
        integrationId,
        source
      );
    }

    // Create vector storage service with the vector store
    const storageService = createVectorStorageService(source, vectorStoreId);
    
    // Upload content to vector store
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultFileName = typeof body.content === 'object' 
      ? `data-${timestamp}.json` 
      : `content-${timestamp}.txt`;
    
    const result = await storageService.uploadContent({
      content: contentToUpload,
      fileName: body.fileName || defaultFileName,
      metadata: body.metadata,
    });
    
    res.json({
      success: true,
      message: 'Content uploaded successfully',
      fileId: result.fileId,
      vectorStoreId,
    }).end();
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to upload content',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function clearStorageFiles(req: Request, res: Response) {
  try {
    const source = req.source as IOpenAISource;
    const integrationId = req.body.integrationId || req.integrationId;
    const providedVectorStoreId = req.body.vectorStoreId;
    const body = req.body as OpenAIClearStoragePayload & { integrationId?: string };

    if (!integrationId) {
      return res.status(400).json({ error: 'Integration ID is required' });
    }

    // Use provided vector store ID or get/create one for this integration
    let vectorStoreId: string;
    if (providedVectorStoreId) {
      vectorStoreId = providedVectorStoreId;
    } else {
      vectorStoreId = await getOrCreateIntegrationVectorStore(
        req.headers.tenant as string,
        integrationId,
        source
      );
    }

    // Create vector storage service with the vector store
    const storageService = createVectorStorageService(source, vectorStoreId);
    
    // Clear files from vector store
    const result = await storageService.clearFiles({
      fileIds: body.fileIds,
    });
    
    res.json({
      success: true,
      message: 'Files cleared successfully',
      clearedCount: result.clearedCount,
      vectorStoreId,
    }).end();
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear files',
      details: error instanceof Error ? error.message : String(error)
    }).end();
  }
}

export async function getVectorStores(req: Request, res: Response) {
  try {
    const { scope, subjectId, subjectModel, agent } = req.query;

    const dbQuery: any = {
      tenant: req.headers.tenant,
    };
    if (scope) {
      dbQuery.scope = scope;
    }
    if (subjectId) {
      dbQuery.subjectId = subjectId;
    }
    if (subjectModel) {
      dbQuery.subjectModel = subjectModel
    }
    if (agent) {
      dbQuery.agent = agent;
    }

    const stores = await VectorStore.find(dbQuery).lean().exec();
    
    res.json(stores).end();
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get vector store',
      details: error instanceof Error ? error.message : String(error)
    }).end();
  }
}
