import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';
import { 
  IChatCompletionOptions, 
  IChatCompletionResponse, 
  ISSEStreamProcessor 
} from '.';

export default class ChatSDK extends BaseSDK {
  private relativePath = '/api/ai';

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  /**
   * Create a chat completion without a thread
   */
  chat(
    integrationId: string,
    options: IChatCompletionOptions
  ): Promise<IChatCompletionResponse> {
    const queryParams = this.getQueryParams(options.queryParams || {});
    return this.callJsonApi<IChatCompletionResponse>(`${this.relativePath}/${integrationId}/chat-completion${queryParams}`, {
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
    const queryParams = this.getQueryParams(options.queryParams || {});
    return this.callJsonApi<IChatCompletionResponse>(
      `${this.relativePath}/${integrationId}/chat-completion/${threadId}${queryParams}`,
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
  async stream(
    integrationId: string,
    options: IChatCompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const queryParams = this.getQueryParams({ ...options.queryParams, stream: true });
    const response = await this.callApi(`${this.relativePath}/${integrationId}/chat-completion${queryParams}`, {
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
  async streamInThread(
    integrationId: string,
    threadId: string,
    options: IChatCompletionOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const queryParams = this.getQueryParams({ ...options.queryParams, stream: true });
    const response = await this.callApi(
      `${this.relativePath}/${integrationId}/chat-completion/${threadId}${queryParams}`,
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
   * Helper method to parse Server-Sent Events stream
   */
  parseSSEStream(stream: ReadableStream<Uint8Array>): ISSEStreamProcessor {
    const processStream = async (onData: (data: any) => void | boolean): Promise<void> => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || ""; // Keep incomplete line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              
              try {
                const parsed = JSON.parse(data);
                const shouldContinue = onData(parsed);
                if (shouldContinue === false) {
                  return;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    };

    const processor = {
      async *[Symbol.asyncIterator]() {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";        
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || ""; // Keep incomplete line

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  return;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  yield parsed;
                } catch (e) {
                  //
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },
      
      processManually: processStream
    };
    
    return processor as ISSEStreamProcessor;
  }
}
