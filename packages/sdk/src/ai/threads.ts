import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';
import { IThread, ICreateThreadRequest } from '../ai';

export default class ThreadsSDK extends BaseSDK {
  private relativePath = '/api/ai';

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  /**
   * Create a new thread
   */
  create(data: ICreateThreadRequest): Promise<IThread> {
    return this.callJsonApi<IThread>(this.relativePath + '/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  /**
   * Get a specific thread by ID
   */
  getOne(threadId: string): Promise<IThread> {
    return this.callJsonApi<IThread>(`${this.relativePath}/threads/${threadId}${this.getQueryParams({})}`);
  }

  /**
   * List threads with optional filters
   */
  list(options?: {
    integration?: string;
    limit?: number;
    page?: number;
    sort?: string;
    user?: string;
    workspace?: string;
    [key: string]: string | number;
  }): Promise<IThread[]> {
    const queryParams = this.getQueryParams(options);
    return this.callJsonApi<IThread[]>(
      `${this.relativePath}/threads${queryParams}`
    );
  }

  /**
   * Delete a thread
   */
  delete(threadId: string): Promise<{ success: boolean }> {
    return this.callJsonApi<{ success: boolean }>(`${this.relativePath}/threads/${threadId}${this.getQueryParams({})}`, {
      method: 'DELETE'
    });
  }
}
