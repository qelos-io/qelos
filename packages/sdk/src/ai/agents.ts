import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';
import ChatSDK from './chat';
import {
  IAgent,
  IAgentChatOptions,
  IChatCompletionResponse,
  ICreateAgentRequest,
  IMessage,
  ISSEStreamProcessor,
  IUpdateAgentRequest,
} from '.';

export default class AgentsSDK extends BaseSDK {
  private relativePath = '/api/ai/agents';

  constructor(
    options: QelosSDKOptions,
    private chatSdk: ChatSDK,
  ) {
    super(options);
  }

  /**
   * List available AI agents for the current tenant
   */
  list(query?: {
    active?: boolean;
    kind?: string;
    limit?: number;
    page?: number;
    sort?: string;
    [key: string]: string | number | boolean;
  }): Promise<IAgent[]> {
    return this.callJsonApi<IAgent[]>(`${this.relativePath}${this.getQueryParams(query)}`);
  }

  /**
   * Get a specific agent by ID (model, tools, system prompt, etc.)
   */
  get(agentId: string): Promise<IAgent> {
    return this.callJsonApi<IAgent>(`${this.relativePath}/${agentId}${this.getQueryParams({})}`);
  }

  /**
   * Create a new agent (chat-completion integration)
   */
  create(data: ICreateAgentRequest): Promise<IAgent> {
    return this.callJsonApi<IAgent>(`${this.relativePath}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  /**
   * Update agent configuration
   */
  update(agentId: string, data: IUpdateAgentRequest): Promise<IAgent> {
    return this.callJsonApi<IAgent>(`${this.relativePath}/${agentId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an agent
   */
  remove(agentId: string): Promise<{ success: boolean; message?: string }> {
    return this.callJsonApi<{ success: boolean; message?: string }>(`${this.relativePath}/${agentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Send messages to an agent (non-streaming). The service creates a thread unless `threadId` is passed.
   */
  chat(
    agentId: string,
    message: string,
    options: IAgentChatOptions = {},
  ): Promise<IChatCompletionResponse> {
    const { history, threadId, ...rest } = options;
    const messages: IMessage[] = [...(history || []), { role: 'user', content: message }];
    return this.callJsonApi<IChatCompletionResponse>(`${this.relativePath}/${agentId}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...rest,
        messages,
        ...(threadId ? { threadId } : {}),
      }),
    });
  }

  /**
   * Stream a response via GET + SSE (`/api/ai/agents/:id/chat`).
   */
  async streamChat(
    agentId: string,
    message: string,
    options: IAgentChatOptions = {},
  ): Promise<ISSEStreamProcessor> {
    const stream = await this.openAgentChatStream(agentId, message, options);
    return this.chatSdk.parseSSEStream(stream);
  }

  /**
   * Continue in an existing thread (non-streaming)
   */
  chatInThread(
    agentId: string,
    threadId: string,
    message: string,
    options: IAgentChatOptions = {},
  ): Promise<IChatCompletionResponse> {
    return this.chat(agentId, message, { ...options, threadId });
  }

  /**
   * Stream within an existing thread (GET + SSE)
   */
  async streamChatInThread(
    agentId: string,
    threadId: string,
    message: string,
    options: IAgentChatOptions = {},
  ): Promise<ISSEStreamProcessor> {
    const stream = await this.openAgentChatStream(agentId, message, { ...options, threadId });
    return this.chatSdk.parseSSEStream(stream);
  }

  private async openAgentChatStream(
    agentId: string,
    message: string,
    options: IAgentChatOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    const { history, threadId, queryParams } = options;
    const messages: IMessage[] = [...(history || []), { role: 'user', content: message }];
    const params = new URLSearchParams();
    params.set('messages', JSON.stringify(messages));
    if (threadId) {
      params.set('threadId', threadId);
    }
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
    }
    const q = params.toString();
    const response = await this.callApi(`${this.relativePath}/${agentId}/chat?${q}`, {
      method: 'GET',
      headers: {
        accept: 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body for agent chat stream');
    }

    return response.body;
  }
}
