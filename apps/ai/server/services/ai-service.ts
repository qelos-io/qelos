import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import logger from './logger';

// Define interfaces for better type safety
interface AIServiceOptions {
  model: string;
  messages: any[];
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  max_tokens?: number;
  tools?: any[];
  response_format?: any;
  stream?: boolean;
}

interface AIServiceSource {
  kind: string;
  tenant: string;
  metadata: {
    apiKey?: string;
    apiUrl?: string;
    defaultModel?: string;
    organizationId?: string;
  };
}

interface AIServiceAuthentication {
  token?: string;
}

export function createAIService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  // Determine which AI provider to use based on source.kind
  switch (source.kind) {
    case 'openai':
      return createOpenAIService(source, authentication);
    case 'anthropic':
      return createAnthropicService(source, authentication);
    // Add more providers as needed
    default:
      throw new Error(`Unsupported AI provider: ${source.kind}`);
  }
}

function createOpenAIService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  // Get API key from authentication or source metadata
  const apiKey = authentication.token;
  const organizationId = source.metadata.organizationId;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  // Create OpenAI client instance
  const openai = new OpenAI({
    apiKey: apiKey,
    organization: organizationId,
    baseURL: source.metadata.apiUrl, // Will use default if not provided
  });
  
  return {
    async createChatCompletion(options: AIServiceOptions) {
      try {
        const response = await openai.chat.completions.create({
          model: options.model || source.metadata.defaultModel || 'gpt-4.1',
          messages: options.messages,
          temperature: options.temperature,
          top_p: options.top_p,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty,
          stop: options.stop,
          max_tokens: options.max_tokens,
          tools: options.tools,
          response_format: options.response_format,
          stream: false
        });
        
        return response;
      } catch (error: any) {
        logger.error('Error creating chat completion', error);
        throw error;
      }
    },
    
    async createChatCompletionStream(options: AIServiceOptions) {
      try {
        const stream = await openai.chat.completions.create({
          model: options.model || source.metadata.defaultModel || 'gpt-4',
          messages: options.messages,
          temperature: options.temperature,
          top_p: options.top_p,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty,
          stop: options.stop,
          max_tokens: options.max_tokens,
          tools: options.tools,
          response_format: options.response_format,
          stream: true
        });
        
        return stream;
      } catch (error: any) {
        logger.error('Error creating chat completion stream', error);
        throw error;
      }
    }
  };
}

function createAnthropicService(source: AIServiceSource, authentication: AIServiceAuthentication) {
  // Get API key from authentication or source metadata
  const apiKey = authentication.token;
  
  if (!apiKey) {
    throw new Error('Anthropic API key is required');
  }
  
  // Create Anthropic client instance
  const anthropic = new Anthropic({
    apiKey,
    baseURL: source.metadata.apiUrl, // Will use default if not provided
  });
  
  return {
    async createChatCompletion(options: AIServiceOptions) {
      try {
        // Transform OpenAI format to Anthropic format if needed
        const messages = transformMessagesToAnthropicSDK(options.messages);
        
        const response = await anthropic.messages.create({
          model: options.model || source.metadata.defaultModel || 'claude-3-opus-20240229',
          messages,
          temperature: options.temperature,
          top_p: options.top_p,
          max_tokens: options.max_tokens || 4000,
          stream: false
        });
        
        // Transform Anthropic response to OpenAI format for consistency
        return transformAnthropicResponseToOpenAI(response);
      } catch (error: any) {
        logger.error('Error creating chat completion with Anthropic', error);
        throw error;
      }
    },
    
    async createChatCompletionStream(options: AIServiceOptions) {
      try {
        // Transform OpenAI format to Anthropic format if needed
        const messages = transformMessagesToAnthropicSDK(options.messages);
        
        const stream = await anthropic.messages.create({
          model: options.model || source.metadata.defaultModel || 'claude-3-opus-20240229',
          messages,
          temperature: options.temperature,
          top_p: options.top_p,
          max_tokens: options.max_tokens || 4000,
          stream: true
        });
        
        return createAnthropicSDKStreamGenerator(stream);
      } catch (error: any) {
        logger.error('Error creating chat completion stream with Anthropic', error);
        throw error;
      }
    }
  };
}

// Helper function to transform OpenAI message format to Anthropic SDK format
function transformMessagesToAnthropicSDK(messages: any[]) {
  return messages.map(msg => {
    // The SDK handles system messages properly, so we can just pass them through
    // Just ensure the content is a string if it's not already
    return {
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    };
  });
}

// Helper function to transform Anthropic response to OpenAI format
function transformAnthropicResponseToOpenAI(response: any) {
  return {
    id: response.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: response.content[0].text
        },
        finish_reason: response.stop_reason
      }
    ],
    usage: response.usage
  };
}

// Create an async generator for Anthropic streaming responses (for direct API calls)
async function* createAnthropicStreamGenerator(stream: any) {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let contentBuffer = '';
  
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    
    // Process complete events from the buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          
          // Transform Anthropic event to OpenAI format
          if (data.type === 'content_block_delta' && data.delta.type === 'text') {
            contentBuffer += data.delta.text;
            
            // Create OpenAI-like delta format
            const openAIFormat = {
              id: data.message_id,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: data.model,
              choices: [
                {
                  index: 0,
                  delta: {
                    content: data.delta.text
                  },
                  finish_reason: null
                }
              ]
            };
            
            yield openAIFormat;
          } else if (data.type === 'message_stop') {
            // Final chunk with finish reason
            const openAIFormat = {
              id: data.message_id,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: data.model,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: 'stop'
                }
              ]
            };
            
            yield openAIFormat;
          }
        } catch (error) {
          logger.error('Error parsing Anthropic stream chunk', error);
          // Continue processing other chunks
        }
      }
    }
  }
}

// Create an async generator for Anthropic SDK streaming responses
async function* createAnthropicSDKStreamGenerator(stream: any) {
  for await (const chunk of stream) {
    // The SDK already handles parsing the stream chunks
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text') {
      // Create OpenAI-like delta format for consistency
      const openAIFormat = {
        id: chunk.message.id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: chunk.message.model,
        choices: [
          {
            index: 0,
            delta: {
              content: chunk.delta.text
            },
            finish_reason: null
          }
        ]
      };
      
      yield openAIFormat;
    } else if (chunk.type === 'message_stop') {
      // Final chunk with finish reason
      const openAIFormat = {
        id: chunk.message.id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: chunk.message.model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }
        ]
      };
      
      yield openAIFormat;
    }
  }
}
