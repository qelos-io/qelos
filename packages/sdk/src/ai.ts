import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';

export interface IMessage {
  role: string;
  content: string;
  timestamp?: Date;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
  function_call?: any;
  message_id?: string;
}

export interface IMessageSummary {
  fromIndex: number;
  toIndex: number;
  summary: string;
}

export interface IThread {
  _id?: string;
  integration: string;
  title?: string;
  messages: IMessage[];
  messageSummaries: IMessageSummary[];
  created?: Date;
  updated?: Date;
  user?: string;
  workspace?: string;
}

export interface IChatCompletionOptions {
  messages: IMessage[];
  model?: string;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  max_tokens?: number;
  response_format?: any;
  context?: Record<string, any>;
  stream?: boolean;
}

export interface ISSEStreamProcessor extends AsyncIterable<any> {
  processManually(onData: (data: any) => void | boolean): Promise<void>;
}

export interface IChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: IMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ICreateThreadRequest {
  integration: string;
  title?: string;
}

export default class QlAI extends BaseSDK {
  private relativePath = '/api/ai';
  constructor(options: QelosSDKOptions) {
    super(options);
  }

  // Thread CRUD Operations

  /**
   * Create a new thread
   */
  createThread(data: ICreateThreadRequest): Promise<IThread> {
    return this.callJsonApi<IThread>(this.relativePath + '/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  /**
   * Get a specific thread by ID
   */
  getThread(threadId: string): Promise<IThread> {
    return this.callJsonApi<IThread>(`${this.relativePath}/threads/${threadId}${this.getQueryParams({})}`);
  }

  /**
   * List threads with optional filters
   */
  listThreads(options?: {
    integration?: string;
    limit?: number;
    page?: number;
    sort?: string;
    user?: string;
    workspace?: string;
    [key: string]: string | number;
  }): Promise<{ threads: IThread[]; total: number; page: number; limit: number }> {
    const queryParams = this.getQueryParams(options);
    return this.callJsonApi<{ threads: IThread[]; total: number; page: number; limit: number }>(
      `${this.relativePath}/threads${queryParams}`
    );
  }

  /**
   * Delete a thread
   */
  deleteThread(threadId: string): Promise<{ success: boolean }> {
    return this.callJsonApi<{ success: boolean }>(`${this.relativePath}/threads/${threadId}${this.getQueryParams({})}`, {
      method: 'DELETE'
    });
  }

  // Chat Completion Operations

  /**
   * Create a chat completion without a thread
   */
  chat(
    integrationId: string,
    options: IChatCompletionOptions
  ): Promise<IChatCompletionResponse> {
    return this.callJsonApi<IChatCompletionResponse>(`${this.relativePath}/${integrationId}/chat-completion${this.getQueryParams({})}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(options)
    });
  }

  /**
   * Create a chat completion with a thread
   */
  chatInThread(
    integrationId: string,
    threadId: string,
    options: IChatCompletionOptions
  ): Promise<IChatCompletionResponse> {
    return this.callJsonApi<IChatCompletionResponse>(
      `${this.relativePath}/${integrationId}/chat-completion/${threadId}${this.getQueryParams({})}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(options)
      }
    );
  }

  /**
   * Create a streaming chat completion without a thread
   * Returns a ReadableStream for Server-Sent Events
   */
  async streamChat(
    integrationId: string,
    options: IChatCompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.callApi(`${this.relativePath}/${integrationId}/chat-completion${this.getQueryParams({ stream: true })}`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'accept': 'text/event-stream'
      },
      body: JSON.stringify({ ...options, stream: true })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.body!;
  }

  /**
   * Create a streaming chat completion with a thread
   * Returns a ReadableStream for Server-Sent Events
   */
  async streamChatInThread(
    integrationId: string,
    threadId: string,
    options: IChatCompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.callApi(
      `${this.relativePath}/${integrationId}/chat-completion/${threadId}${this.getQueryParams({ stream: true })}`,
      {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'accept': 'text/event-stream'
        },
        body: JSON.stringify({ ...options, stream: true })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.body!;
  }

  /**
   * Helper method to parse Server-Sent Events stream with proper buffering
   * Handles incomplete lines across multiple stream chunks
   */
  parseSSEStream(stream: ReadableStream<Uint8Array>): ISSEStreamProcessor {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    const processStream = async (onData: (data: any) => void | boolean): Promise<void> => {
      let buffer = "";
      let done = false;
      let finished = false;
      
      try {
        while (!done && !finished) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split(/\r?\n/);
            // Keep the last line in buffer if it's incomplete
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              if (!line.trim() || !line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6);
              if (!jsonStr) continue;
              
              // Handle special SSE termination signals
              if (jsonStr === '[DONE]') {
                finished = true;
                break;
              }
              
              try {
                const data = JSON.parse(jsonStr);
                const shouldContinue = onData(data);
                if (shouldContinue === false) {
                  finished = true;
                  break;
                }
              } catch (e) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }
        }
        
        // Process any remaining data in buffer
        if (!finished && buffer.trim() && buffer.startsWith("data: ")) {
          const jsonStr = buffer.slice(6);
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const data = JSON.parse(jsonStr);
              onData(data);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    };

    const processor = {
      async *[Symbol.asyncIterator]() {
        const dataQueue: any[] = [];
        let streamFinished = false;
        let resolveNext: ((value: IteratorResult<any>) => void) | null = null;
        
        // Start processing stream in background
        processStream((data) => {
          dataQueue.push(data);
          if (resolveNext) {
            const resolve = resolveNext;
            resolveNext = null;
            resolve({ value: dataQueue.shift(), done: false });
          }
          return true; // Continue processing
        }).then(() => {
          streamFinished = true;
          if (resolveNext) {
            resolveNext({ value: undefined, done: true });
          }
        });
        
        while (true) {
          if (dataQueue.length > 0) {
            yield dataQueue.shift();
          } else if (streamFinished) {
            break;
          } else {
            // Wait for next data
            await new Promise<IteratorResult<any>>((resolve) => {
              resolveNext = resolve;
            });
          }
        }
      },
      
      processManually: processStream
    };
    
    return processor as ISSEStreamProcessor;
  }
}
