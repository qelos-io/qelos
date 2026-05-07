import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';
import ChatSDK from './chat';
import ThreadsSDK from './threads';
import {
  IAgent,
  IAgentChatOptions,
  IChatCompletionResponse,
  ISSEStreamProcessor,
  IMessage
} from '.';

export default class AgentsSDK extends BaseSDK {
  private relativePath = '/api/ai/agents';

  constructor(
    options: QelosSDKOptions,
    private chatSdk: ChatSDK,
    private threadsSdk: ThreadsSDK
  ) {
    super(options);
  }

  /**
   * List available AI agents
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
   * Get a specific agent by ID
   */
  get(agentId: string): Promise<IAgent> {
    return this.callJsonApi<IAgent>(`${this.relativePath}/${agentId}${this.getQueryParams({})}`);
  }

  /**
   * Send a single message to an agent and get the completion response.
   * No thread is persisted — use `chatInThread` to maintain conversation continuity.
   */
  chat(
    agentId: string,
    message: string,
    options: IAgentChatOptions = {}
  ): Promise<IChatCompletionResponse> {
    return this.chatSdk.chat(agentId, this.buildChatOptions(message, options));
  }

  /**
   * Stream a response from an agent for a single message.
   * Returns an iterable of parsed SSE chunks.
   */
  async streamChat(
    agentId: string,
    message: string,
    options: IAgentChatOptions = {}
  ): Promise<ISSEStreamProcessor> {
    const stream = await this.chatSdk.stream(agentId, this.buildChatOptions(message, options));
    return this.chatSdk.parseSSEStream(stream);
  }

  /**
   * Continue a conversation in an existing thread by sending a new user message.
   */
  chatInThread(
    agentId: string,
    threadId: string,
    message: string,
    options: IAgentChatOptions = {}
  ): Promise<IChatCompletionResponse> {
    return this.chatSdk.chatInThread(agentId, threadId, this.buildChatOptions(message, options));
  }

  /**
   * Stream a response from an agent within an existing thread.
   * Returns an iterable of parsed SSE chunks.
   */
  async streamChatInThread(
    agentId: string,
    threadId: string,
    message: string,
    options: IAgentChatOptions = {}
  ): Promise<ISSEStreamProcessor> {
    const stream = await this.chatSdk.streamInThread(
      agentId,
      threadId,
      this.buildChatOptions(message, options)
    );
    return this.chatSdk.parseSSEStream(stream);
  }

  private buildChatOptions(message: string, options: IAgentChatOptions) {
    const { history, ...rest } = options;
    const messages: IMessage[] = [
      ...(history || []),
      { role: 'user', content: message }
    ];
    return { ...rest, messages };
  }
}
