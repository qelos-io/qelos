import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';
import { 
  ICreateVectorStorageRequest, 
  IUploadContentRequest, 
  IClearStorageRequest, 
  IVectorStore 
} from '.';

export default class RagSDK extends BaseSDK {
  private relativePath = '/api/ai';

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  /**
   * Create a vector storage for RAG
   */
  createStorage(
    sourceId: string,
    data: ICreateVectorStorageRequest
  ): Promise<{
    success: boolean;
    message: string;
    vectorStore: IVectorStore;
  }> {
    return this.callJsonApi<any>(`${this.relativePath}/sources/${sourceId}/storage${this.getQueryParams({})}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  /**
   * Upload content to vector storage
   */
  uploadContent(
    sourceId: string,
    data: IUploadContentRequest
  ): Promise<{
    success: boolean;
    message: string;
    fileId: string;
    vectorStoreId: string;
  }> {
    return this.callJsonApi<any>(`${this.relativePath}/sources/${sourceId}/storage/upload${this.getQueryParams({})}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  /**
   * Clear files from vector storage
   */
  clearStorage(
    sourceId: string,
    data: IClearStorageRequest
  ): Promise<{
    success: boolean;
    message: string;
    clearedCount: number;
    vectorStoreId: string;
  }> {
    return this.callJsonApi<any>(`${this.relativePath}/sources/${sourceId}/storage/clear${this.getQueryParams({})}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}
