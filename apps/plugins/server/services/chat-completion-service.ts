import { AIService } from "./ai-service";
import logger from "./logger";
import { IntegrationSourceKind } from "@qelos/global-types";

/**
 * Interface for function call structure
 */
export interface FunctionCall {
  id: string;
  index?: number;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Interface for SSE handler function
 */
export type SSEHandler = (data: any) => void;

/**
 * Helper function to parse function arguments safely
 */
export function parseFunctionArguments(argumentsString: string): any {
  if (!argumentsString) return {};
  
  try {
    return JSON.parse(argumentsString);
  } catch (e) {
    return argumentsString || {};
  }
}

/**
 * Helper function to create function result object
 */
export function createFunctionResult(functionCall: any, content: any): any {
  return {
    tool_call_id: functionCall.id,
    role: 'tool',
    name: functionCall.function.name,
    content: JSON.stringify(content)
  };
}

/**
 * Sets up SSE response headers
 */
export function setupSSEHeaders(res: any): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Prevents Nginx from buffering the response
}

/**
 * Creates an SSE handler function
 */
export function createSSEHandler(res: any): SSEHandler {
  return (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
}

/**
 * Process OpenAI stream chunks and handle function calls
 */
export async function processOpenAIStream(
  stream: any,
  sendSSE: SSEHandler,
  executeFunctionCallsHandler: (functionCalls: FunctionCall[], ...args: any[]) => Promise<any[]>,
  chatOptions: any,
  handlerArgs: any[] = []
): Promise<{
  fullContent: string;
  functionCalls: FunctionCall[];
  functionResults: any[];
}> {
  let fullContent = '';
  let functionCalls: FunctionCall[] = [];
  let functionResults: any[] = [];
  
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      
      // Check for function calls
      const toolCalls = chunk.choices[0]?.delta?.tool_calls;
      if (toolCalls && Array.isArray(toolCalls)) {
        for (const toolCall of toolCalls) {
          if (toolCall.function) {
            // Find existing function call by ID or index (streaming chunks may only have index)
            let existingCall = functionCalls.find(fc => 
              (toolCall.id && fc.id === toolCall.id) || 
              (toolCall.index !== undefined && fc.index === toolCall.index)
            );
            
            if (!existingCall) {
              // Create new function call entry for this unique ID/index
              const newCall: FunctionCall = {
                id: toolCall.id || `call_${toolCall.index}`,
                index: toolCall.index,
                type: 'function',
                function: {
                  name: toolCall.function.name || '',
                  arguments: toolCall.function.arguments || ''
                }
              };
              functionCalls.push(newCall);
            } else {
              // Update existing call - set function name if provided (usually only in first chunk)
              if (toolCall.function.name && !existingCall.function.name) {
                existingCall.function.name = toolCall.function.name;
              }
              // Append arguments (streamed in subsequent chunks)
              if (toolCall.function.arguments) {
                existingCall.function.arguments += toolCall.function.arguments;
              }
            }
          }
        }
      }
      
      sendSSE({
        type: 'chunk',
        content,
        fullContent,
        functionCalls,
        chunk: chunk
      });
    }

    // Process function calls if any
    if (functionCalls.length > 0) {
      functionResults = await executeFunctionCallsHandler(
        functionCalls,
        ...handlerArgs
      );
    }

    return { fullContent, functionCalls, functionResults };
  } catch (error) {
    logger.error('Error processing OpenAI stream:', error);
    sendSSE({ type: 'error', message: 'Error processing AI chat completion' });
    throw error;
  }
}

/**
 * Process Claude AI stream chunks
 */
export async function processClaudeAIStream(
  stream: any,
  sendSSE: SSEHandler
): Promise<string> {
  let fullContent = '';
  
  try {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text') {
        const content = chunk.delta.text || '';
        fullContent += content;
        
        sendSSE({
          type: 'chunk',
          content,
          fullContent,
          chunk: chunk
        });
      }
    }
    
    return fullContent;
  } catch (error) {
    logger.error('Error processing Claude AI stream:', error);
    sendSSE({ type: 'error', message: 'Error processing AI chat completion' });
    throw error;
  }
}

/**
 * Handle follow-up conversation with function results
 */
export async function handleFollowUpConversation(
  aiService: AIService,
  chatOptions: any,
  fullContent: string,
  functionCalls: FunctionCall[],
  functionResults: any[],
  sendSSE?: SSEHandler
): Promise<any> {
  const followUpMessages = [
    ...chatOptions.messages,
    {
      role: 'assistant',
      content: fullContent,
      tool_calls: functionCalls
    },
    ...functionResults
  ];
  
  const followUpOptions = {
    ...chatOptions,
    messages: followUpMessages,
    stream: !!sendSSE
  };
  
  if (sendSSE) {
    sendSSE({ type: 'continuing_conversation', functionResults });
    
    // Get follow-up stream from AI
    const followUpStream = await aiService.streamChatCompletion(followUpOptions);
    return followUpStream;
  } else {
    // Get follow-up response from AI
    const followUpResponse = await aiService.chatCompletion(followUpOptions);
    return followUpResponse;
  }
}

/**
 * Handle streaming chat completion with proper error handling
 */
export async function handleStreamingChatCompletion(
  req: any,
  res: any,
  aiService: AIService,
  chatOptions: any,
  sourceKind: IntegrationSourceKind,
  executeFunctionCallsHandler: (functionCalls: FunctionCall[], ...args: any[]) => Promise<any[]>,
  handlerArgs: any[] = []
): Promise<void> {
  try {
    // Setup SSE
    setupSSEHeaders(res);
    const sendSSE = createSSEHandler(res);
    
    // Send initial event to establish connection
    sendSSE({ type: 'connection_established' });
    
    // Get the stream from the AI service
    const stream = await aiService.streamChatCompletion(chatOptions);
    
    // Handle different AI service providers
    if (sourceKind === IntegrationSourceKind.OpenAI) {
      // For OpenAI
      const { fullContent, functionCalls, functionResults } = await processOpenAIStream(
        stream,
        sendSSE,
        executeFunctionCallsHandler,
        chatOptions,
        handlerArgs
      );
      
      // Continue conversation with function results if needed
      if (functionResults.length > 0) {
        const followUpStream = await handleFollowUpConversation(
          aiService,
          chatOptions,
          fullContent,
          functionCalls,
          functionResults,
          sendSSE
        );
        
        // Process follow-up stream
        let followUpContent = '';
        let followUpFunctionCalls: FunctionCall[] = [];
        
        for await (const chunk of followUpStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          followUpContent += content;
          
          // Check for function calls in follow-up response
          const toolCalls = chunk.choices[0]?.delta?.tool_calls;
          if (toolCalls && Array.isArray(toolCalls)) {
            for (const toolCall of toolCalls) {
              if (toolCall.function) {
                // Find existing function call by ID or index
                let existingCall = followUpFunctionCalls.find(fc => 
                  (toolCall.id && fc.id === toolCall.id) || 
                  (toolCall.index !== undefined && fc.index === toolCall.index)
                );
                
                if (!existingCall) {
                  // Create new function call entry
                  const newCall: FunctionCall = {
                    id: toolCall.id || `call_${toolCall.index}`,
                    index: toolCall.index,
                    type: 'function',
                    function: {
                      name: toolCall.function.name || '',
                      arguments: toolCall.function.arguments || ''
                    }
                  };
                  followUpFunctionCalls.push(newCall);
                } else {
                  // Update existing call
                  if (toolCall.function.name && !existingCall.function.name) {
                    existingCall.function.name = toolCall.function.name;
                  }
                  if (toolCall.function.arguments) {
                    existingCall.function.arguments += toolCall.function.arguments;
                  }
                }
              }
            }
          }
          
          sendSSE({
            type: 'followup_chunk',
            content,
            fullContent: followUpContent,
            functionCalls: followUpFunctionCalls,
            chunk: chunk
          });
        }
        
        // Process follow-up function calls if any
        if (followUpFunctionCalls.length > 0) {
          const followUpFunctionResults = await executeFunctionCallsHandler(
            followUpFunctionCalls,
            ...handlerArgs
          );
          
          if (followUpFunctionResults.length > 0) {
            followUpContent += '\n\n[Follow-up function calls executed]';
          }
        }
      }
      
      // Send completion event
      sendSSE({ type: 'done', content: fullContent });
    } else if (sourceKind === IntegrationSourceKind.ClaudeAi) {
      // For Claude AI
      const fullContent = await processClaudeAIStream(stream, sendSSE);
      
      // Send completion event
      sendSSE({ type: 'done', content: fullContent });
    }
    
    // End the response
    res.end();
  } catch (error) {
    logger.error('Error in handleStreamingChatCompletion:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
    res.end();
  }
}

/**
 * Handle non-streaming chat completion with proper error handling
 */
export async function handleNonStreamingChatCompletion(
  res: any,
  aiService: AIService,
  chatOptions: any,
  executeFunctionCallsHandler: (functionCalls: FunctionCall[], ...args: any[]) => Promise<any[]>,
  handlerArgs: any[] = []
): Promise<void> {
  try {
    // Non-streaming response
    const response = await aiService.chatCompletion(chatOptions);
    
    // Check if there are function calls in the response
    if (response.choices?.[0]?.message?.tool_calls?.length > 0) {
      const functionCalls = response.choices[0].message.tool_calls;
      const functionResults = await executeFunctionCallsHandler(
        functionCalls,
        ...handlerArgs
      );
      
      // Continue conversation with function results
      if (functionResults.length > 0) {
        const followUpMessages = [
          ...chatOptions.messages,
          response.choices[0].message,
          ...functionResults
        ];
        
        const followUpOptions = {
          ...chatOptions,
          messages: followUpMessages
        };
        
        // Get follow-up response from AI
        const followUpResponse = await aiService.chatCompletion(followUpOptions);
        res.json(followUpResponse).end();
      } else {
        res.json(response).end();
      }
    } else {
      res.json(response).end();
    }
  } catch (error) {
    logger.error('Error in handleNonStreamingChatCompletion:', error);
    res.status(500).json({ message: 'Error processing AI chat completion' }).end();
  }
}
