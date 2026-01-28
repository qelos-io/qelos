import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';
import ThreadsSDK from './ai/threads';
import ChatSDK from './ai/chat';
import RAGSDK from './ai/rag';
import {
  IMessage,
  IMessageSummary,
  IThread,
  IChatCompletionOptions,
  ISSEStreamProcessor,
  IChatCompletionResponse,
  ICreateThreadRequest,
  ICreateVectorStorageRequest,
  IUploadContentRequest,
  IClearStorageRequest,
  IVectorStore
} from './ai/types';

// Re-export types for backward compatibility
export {
  IMessage,
  IMessageSummary,
  IThread,
  IChatCompletionOptions,
  ISSEStreamProcessor,
  IChatCompletionResponse,
  ICreateThreadRequest,
  ICreateVectorStorageRequest,
  IUploadContentRequest,
  IClearStorageRequest,
  IVectorStore
};

/**
 * Qelos AI SDK - Main SDK class with three sub-SDKs
 * 
 * This class provides access to AI functionality through three sub-SDKs:
 * - `threads`: Thread CRUD operations for managing conversation threads
 * - `chat`: Chat completion operations (streaming and non-streaming)
 * - `rag`: Vector storage management for Retrieval-Augmented Generation
 * 
 * @example
 * ```typescript
 * const sdk = new QelosSDK({
 *   appUrl: 'https://your-qelos-instance.com',
 *   fetch: globalThis.fetch,
 *   accessToken: 'your-token'
 * });
 * 
 * // Create a thread
 * const thread = await sdk.ai.threads.create({ integration: 'id' });
 * 
 * // Stream chat
 * const stream = await sdk.ai.chat.stream('id', { messages: [...] });
 * for await (const chunk of sdk.ai.chat.parseSSEStream(stream)) {
 *   console.log(chunk);
 * }
 * 
 * // Upload RAG content
 * await sdk.ai.rag.uploadContent('sourceId', { content: '...' });
 * ```
 */
// Main AI SDK with sub-SDKs
export default class QlAI extends BaseSDK {
  /**
   * Threads sub-SDK for managing conversation threads
   */
  public threads: ThreadsSDK;
  
  /**
   * Chat sub-SDK for chat completion operations
   */
  public chat: ChatSDK;
  
  /**
   * RAG sub-SDK for vector storage management
   */
  public rag: RAGSDK;

  /**
   * Initialize the AI SDK with sub-SDKs
   * 
   * @param options - SDK configuration options
   */
  constructor(options: QelosSDKOptions) {
    super(options);
    this.threads = new ThreadsSDK(options);
    this.chat = new ChatSDK(options);
    this.rag = new RAGSDK(options);
  }

  // Legacy methods for backward compatibility
  
  /**
   * @deprecated Use sdk.threads.create() instead
   */
  createThread(data: ICreateThreadRequest): Promise<IThread> {
    return this.threads.create(data);
  }

  /**
   * @deprecated Use sdk.threads.getOne() instead
   */
  getThread(threadId: string): Promise<IThread> {
    return this.threads.getOne(threadId);
  }

  /**
   * @deprecated Use sdk.threads.list() instead
   */
  listThreads(options?: {
    integration?: string;
    limit?: number;
    page?: number;
    sort?: string;
    user?: string;
    workspace?: string;
    [key: string]: string | number;
  }): Promise<IThread[]> {
    return this.threads.list(options);
  }

  /**
   * @deprecated Use sdk.threads.delete() instead
   */
  deleteThread(threadId: string): Promise<{ success: boolean }> {
    return this.threads.delete(threadId);
  }

  /**
   * @deprecated Use sdk.chat.chat() instead
   */
  chatCompletion(
    integrationId: string,
    options: IChatCompletionOptions
  ): Promise<IChatCompletionResponse> {
    return this.chat.chat(integrationId, options);
  }

  /**
   * @deprecated Use sdk.chat.chatInThread() instead
   */
  chatCompletionInThread(
    integrationId: string,
    threadId: string,
    options: IChatCompletionOptions
  ): Promise<IChatCompletionResponse> {
    return this.chat.chatInThread(integrationId, threadId, options);
  }

  /**
   * @deprecated Use sdk.chat.stream() instead
   */
  async streamChat(
    integrationId: string,
    options: IChatCompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    return this.chat.stream(integrationId, options);
  }

  /**
   * @deprecated Use sdk.chat.streamInThread() instead
   */
  async streamChatInThread(
    integrationId: string,
    threadId: string,
    options: IChatCompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    return this.chat.streamInThread(integrationId, threadId, options);
  }

  /**
   * @deprecated Use sdk.chat.parseSSEStream() instead
   */
  parseSSEStream(stream: ReadableStream<Uint8Array>): ISSEStreamProcessor {
    return this.chat.parseSSEStream(stream);
  }
}
