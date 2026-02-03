import logger from './logger';
import { emitAIProviderErrorEvent } from './platform-events';

// Define constants
const MAX_AUTO_CONTINUE_STEPS = 10;

// Define types for function calls
export interface FunctionCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface FunctionResult {
  tool_call_id: string;
  role: string;
  type: string;
  name: string;
  content: string;
}

export type SSEHandler = (data: any) => void;

// Helper function to safely parse JSON
export function* parseFunctionArguments(argsString: string, depth: number = 0): Generator<any> {
  // Prevent infinite recursion in argument parsing
  const MAX_PARSE_DEPTH = 10;
  const currentDepth = depth;
  
  if (currentDepth > MAX_PARSE_DEPTH) {
    logger.error('Maximum parsing depth exceeded', { argsString: argsString.substring(0, 100), depth: currentDepth });
    throw new Error('Maximum parsing depth exceeded');
  }
  
  try {
    // First try to parse as a single JSON object
    yield JSON.parse(argsString);
    return;
  } catch (error: any) {
    // If single parse fails, try to find multiple JSON objects
    try {
      // Check if we have a position error that can help us split the string
      const errorMessage = error.message || '';
      const positionMatch = errorMessage.match(/position (\d+)/);
      
      if (positionMatch && positionMatch[1]) {
        const errorPosition = parseInt(positionMatch[1], 10);
        
        // Find the end of the first complete JSON object
        let endPos = errorPosition;
        while (endPos > 0 && argsString[endPos] !== '}') {
          endPos--;
        }
        
        if (endPos > 0) {
          // Parse the first object
          const firstJsonStr = argsString.substring(0, endPos + 1);
          try {
            yield JSON.parse(firstJsonStr);
          } catch (firstObjError) {
            logger.log(`Failed to parse first JSON object: ${firstJsonStr}`, firstObjError);
          }
          
          // Parse the remaining string recursively
          const remainingStr = argsString.substring(endPos + 1);
          if (remainingStr.trim()) {
            try {
              // Find the start of the next JSON object
              let nextStart = 0;
              while (nextStart < remainingStr.length && remainingStr[nextStart] !== '{') {
                nextStart++;
              }
              
              if (nextStart < remainingStr.length) {
                const nextJsonStr = remainingStr.substring(nextStart);
                // Use the generator recursively to parse remaining objects
                const remainingGenerator = parseFunctionArguments(nextJsonStr, currentDepth + 1);
                let result = remainingGenerator.next();
                while (!result.done) {
                  yield result.value;
                  result = remainingGenerator.next();
                }
              }
            } catch (remainingError) {
              logger.log(`Failed to parse remaining JSON: ${remainingStr}`, remainingError);
            }
          }
          
          return;
        }
      }
      
      // Fallback to character-by-character parsing if position-based approach fails
      let pos = 0;
      let depth = 0;
      let startPos = -1;
      
      while (pos < argsString.length) {
        const char = argsString[pos];
        
        if (char === '{' && depth === 0) {
          startPos = pos;
          depth++;
        } else if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          
          // We found a complete JSON object
          if (depth === 0 && startPos !== -1) {
            const jsonStr = argsString.substring(startPos, pos + 1);
            try {
              yield JSON.parse(jsonStr);
            } catch (innerError) {
              logger.log(`Failed to parse JSON object: ${jsonStr}`, innerError);
            }
            startPos = -1;
          }
        }
        
        pos++;
      }
      
      // If we didn't find any valid JSON objects, throw an error
      if (startPos === -1 && pos === argsString.length) {
        throw new Error('No valid JSON objects found');
      }
      
      return;
    } catch (multiError) {
      logger.error('Invalid function arguments JSON', argsString);
      throw new Error('Invalid function arguments JSON');
    }
  }
}

// Helper function to create a standardized function result
export function createFunctionResult(functionCall: FunctionCall, result: any[] | string): FunctionResult {
  return {
    tool_call_id: functionCall.id,
    role: 'tool',
    type: 'function',
    name: functionCall.function.name,
    content: typeof result === 'string' ? result : result.map((res) => JSON.stringify(res)).join('\n')
  };
}

// Handle streaming chat completion with function calling support
export async function handleStreamingChatCompletion(
  res: any,
  aiService: any,
  chatOptions: any,
  executeFunctionCallsHandler: Function,
  additionalArgs: any[] = [],
  onNewMessage?: Function,
  context?: {
    tenant?: string;
    userId?: string;
    integrationId?: string;
    integrationName?: string;
    workspaceId?: string;
  }
) {
  const sendSSE = (data: any) => {
    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    } catch (writeError) {
      logger.error('Failed to write SSE data', writeError);
    }
  };

  try {
    await processStreamingCompletion(
      res,
      aiService,
      chatOptions,
      executeFunctionCallsHandler,
      sendSSE,
      additionalArgs,
      false, // isFollowUp
      onNewMessage,
      0, // autoContinueCount
      context
    );
    
    // End the response
    sendSSE({ type: 'done' });
    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    logger.error('Error in streaming chat completion', error);
    
    // Emit platform event for streaming errors
    if (context?.tenant && error) {
      emitAIProviderErrorEvent({
        tenant: context.tenant,
        userId: context.userId,
        provider: aiService.source?.kind || 'unknown',
        sourceId: aiService.source?._id,
        stream: true,
        model: chatOptions.model,
        error,
        context: {
          integrationId: context.integrationId,
          integrationName: context.integrationName,
          workspaceId: context.workspaceId,
        }
      });
    }
    
    sendSSE({ 
      type: 'error', 
      message: error instanceof Error ? error.message : 'Error processing streaming chat completion',
      stack: process.env.NODE_ENV === 'production' ? undefined : (error instanceof Error ? error.stack : undefined)
    });
    if (!res.writableEnded) {
      res.end();
    }
  }
}

// Process a streaming completion with recursive function calling support
async function processStreamingCompletion(
  res: any,
  aiService: any,
  chatOptions: any,
  executeFunctionCallsHandler: Function,
  sendSSE: Function,
  additionalArgs: any[] = [],
  isFollowUp: boolean = false,
  onNewMessage?: Function,
  autoContinueCount: number = 0,
  context?: {
    tenant?: string;
    userId?: string;
    integrationId?: string;
    integrationName?: string;
    workspaceId?: string;
  }
) {
  let currentFunctionCalls: FunctionCall[] = [];
  let isCollectingFunctionCall = false;
  let currentFunctionCall: Partial<FunctionCall> = {};
  let functionCallBuffer = '';
  let hasContent = false;
  let assistantLastContent = '';
  let receivedFullContent = false;
  let savedFullContent = false;

  const stream = await aiService.createChatCompletionStream(chatOptions);
  
  for await (const chunk of stream) {
    // Debug: Log the first few chunks to understand the format
    if (process.env.NODE_ENV !== 'production') {
      if (!global._debugCount) global._debugCount = 0;
      if (global._debugCount < 3) {
        global._debugCount++;
      }
    }
    
    // Handle the standardized Chat Completions API format
    let delta;
    let content;
    
    if (chunk.choices) {
      // Standard Chat Completions API format (after normalization)
      delta = chunk.choices[0]?.delta;
      content = delta?.content || '';
    } else {
      // Unknown format, log for debugging
      continue;
    }
    
    // Check for function calls in the delta
    if (delta?.tool_calls && delta.tool_calls.length > 0) {
      const toolCall = delta.tool_calls[0];
      
      // Start of a new function call
      if (toolCall.id && !currentFunctionCall.id) {
        isCollectingFunctionCall = true;
        currentFunctionCall = {
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolCall.function?.name || '',
            arguments: ''
          }
        };
      }
      
      // Accumulate function arguments
      if (isCollectingFunctionCall && toolCall.function?.arguments) {
        functionCallBuffer += toolCall.function.arguments;
        currentFunctionCall.function!.arguments = functionCallBuffer;
      }
      
      // Complete function name if provided
      if (isCollectingFunctionCall && toolCall.function?.name) {
        currentFunctionCall.function!.name = toolCall.function.name;
      }
      
      // Check if function call is complete
      if (isCollectingFunctionCall && 
          currentFunctionCall.id && 
          currentFunctionCall.function?.name && 
          chunk.choices[0]?.finish_reason === 'tool_calls') {
        
        // Add to list of function calls
        currentFunctionCalls.push(currentFunctionCall as FunctionCall);
        
        // Reset for next function call
        isCollectingFunctionCall = false;
        currentFunctionCall = {};
        functionCallBuffer = '';
      }
    } else if (content) {
      // Regular content chunk
      hasContent = true;
      // When the provider sends a full_content chunk (entire message), replace accumulated
      // content instead of appending to avoid duplicating the message in the DB
      const isFullContent = (chunk as any).completion_type === 'full_content';
      if (isFullContent) {
        assistantLastContent = content;
        receivedFullContent = true; // Set flag to prevent further accumulation
        // Immediately save the full content to the thread
        if (onNewMessage) {
          onNewMessage({
            type: 'assistant_last_content',
            content: content
          });
          savedFullContent = true;
        }
      } else if (!receivedFullContent) {
        // Only accumulate if we haven't received the full content yet
        assistantLastContent += content;
      }
      sendSSE({ 
        type: isFullContent ? 'full_content' : (isFollowUp ? 'followup_chunk' : 'chunk'), 
        content: content 
      });
    }
    
    // Check if we're done with the response and have function calls to execute
    // Handle the standardized Chat Completions API format
    const finishReason = chunk.choices?.[0]?.finish_reason;
    
    if (finishReason === 'tool_calls' && currentFunctionCalls.length > 0) {
      // Check if we've reached the maximum auto-continue steps
      if (autoContinueCount >= MAX_AUTO_CONTINUE_STEPS) {
        sendSSE({
          type: 'error',
          message: `Maximum function call iterations reached (${MAX_AUTO_CONTINUE_STEPS}). Please try again with a more specific request.`
        });
        return;
      }
      
      // Send appropriate event based on whether this is a follow-up or initial call
      sendSSE({ 
        type: isFollowUp ? 'followup_function_calls_detected' : 'function_calls_detected' 
      });

      if (onNewMessage) {
        onNewMessage({
          type: 'function_calls_detected',
          functionCalls: currentFunctionCalls
        });
      }
      
      try {
        // Execute all collected function calls
        const functionResults = await executeFunctionCallsHandler(
          currentFunctionCalls,
          sendSSE,
          ...additionalArgs
        );

        if (onNewMessage) {
          onNewMessage({
            type: 'function_calls_executed',
            functionResults: functionResults
          });
        }
        
        // Continue the conversation with function results
        sendSSE({ 
          type: isFollowUp ? 'followup_continuing_conversation' : 'continuing_conversation' 
        });
        
        // Create follow-up messages with function results
        const followUpMessages = [
          ...chatOptions.messages,
          { role: 'assistant', tool_calls: currentFunctionCalls },
          ...functionResults
        ];

        // Recursively process the next completion with updated messages
        // Add timeout protection for recursive calls
        await Promise.race([
          processStreamingCompletion(
            res,
            aiService,
            { ...chatOptions, messages: followUpMessages },
            executeFunctionCallsHandler,
            sendSSE,
            additionalArgs,
            true, // isFollowUp
            onNewMessage,
            autoContinueCount + 1, // Increment the counter
            context
          ),
          new Promise((_, reject) => {
            setTimeout(() => {
              const timeoutError = new Error('Recursive chat completion timeout after 2 minutes');
              // Emit platform event for timeout
              if (context?.tenant) {
                emitAIProviderErrorEvent({
                  tenant: context.tenant,
                  userId: context.userId,
                  provider: aiService.source?.kind || 'unknown',
                  sourceId: aiService.source?._id,
                  stream: true,
                  model: chatOptions.model,
                  error: timeoutError,
                  context: {
                    integrationId: context.integrationId,
                    integrationName: context.integrationName,
                    workspaceId: context.workspaceId,
                    stage: 'recursive_completion'
                  }
                });
              }
              reject(timeoutError);
            }, 120000); // 2 minute timeout
          })
        ]);
      } catch (functionError) {
        logger.error('Error executing function calls in streaming completion', functionError);
        const isTimeout = functionError instanceof Error && functionError.name === 'TimeoutError';
        sendSSE({ 
          type: 'error', 
          message: functionError instanceof Error ? functionError.message : 'Error executing function calls',
          functionCalls: currentFunctionCalls,
          isTimeout,
          errorType: functionError instanceof Error ? functionError.name : 'UnknownError'
        });
        // Don't throw - let the stream end gracefully
      }
      
      // Return after processing the recursive call
      return;
    }

    // Auto-continue if OpenAI stops due to length limits
    if (chunk.choices && chunk.choices[0]?.finish_reason === 'length') {
      if (autoContinueCount < MAX_AUTO_CONTINUE_STEPS) {
        // Create a new user message to continue the conversation
        const continueMessage = {
          role: 'user',
          content: 'Continue',
        };

        // Recursively process the next completion with the new message
        await processStreamingCompletion(
          res,
          aiService,
          { ...chatOptions, messages: [...chatOptions.messages, continueMessage] },
          executeFunctionCallsHandler,
          sendSSE,
          additionalArgs,
          true, // isFollowUp
          onNewMessage,
          autoContinueCount + 1,
          context
        );
        
        // Return after processing the recursive call
        return;
      }
    }
    
    // Check if stream is complete
    if (chunk.choices?.[0]?.finish_reason) {
      // Stream is complete, break the loop
      break;
    }
  }

  if (onNewMessage && hasContent && assistantLastContent && !savedFullContent) {
    onNewMessage({
      type: 'assistant_last_content',
      content: assistantLastContent
    });
    assistantLastContent = '';
  }

  // Handle any remaining incomplete function call
  if (isCollectingFunctionCall && currentFunctionCall.id) {
    // Check if we've reached the maximum auto-continue steps
    if (autoContinueCount >= MAX_AUTO_CONTINUE_STEPS) {
      sendSSE({
        type: 'error',
        message: `Maximum function call iterations reached (${MAX_AUTO_CONTINUE_STEPS}). Please try again with a more specific request.`
      });
      return;
    }
    
    currentFunctionCalls.push(currentFunctionCall as FunctionCall);

    if (onNewMessage) {
      onNewMessage({
        type: 'function_calls_detected',
        functionCalls: currentFunctionCalls
      });
    }
    
    // Send appropriate event based on whether this is a follow-up or initial call
    sendSSE({ 
      type: isFollowUp ? 'followup_function_calls_detected' : 'function_calls_detected' 
    });
    
    try {
      const functionResults = await executeFunctionCallsHandler(
        currentFunctionCalls,
        sendSSE,
        ...additionalArgs
      );

      if (onNewMessage) {
        onNewMessage({
          type: 'function_calls_executed',
          functionResults: functionResults
        });
      }
      
      // Continue the conversation with function results
      sendSSE({ 
        type: isFollowUp ? 'followup_continuing_conversation' : 'continuing_conversation' 
      });
      
      // Create follow-up messages with function results
      const followUpMessages = [
        ...chatOptions.messages,
        { role: 'assistant', tool_calls: currentFunctionCalls },
        ...functionResults
      ];
      
      // Recursively process the next completion with updated messages
      await processStreamingCompletion(
        res,
        aiService,
        { ...chatOptions, messages: followUpMessages },
        executeFunctionCallsHandler,
        sendSSE,
        additionalArgs,
        true, // isFollowUp
        onNewMessage,
        autoContinueCount + 1, // Increment the counter
        context
      );
    } catch (functionError) {
      logger.error('Error executing incomplete function calls in streaming completion', functionError);
      const isTimeout = functionError instanceof Error && functionError.name === 'TimeoutError';
      sendSSE({ 
        type: 'error', 
        message: functionError instanceof Error ? functionError.message : 'Error executing function calls',
        functionCalls: currentFunctionCalls,
        isTimeout,
        errorType: functionError instanceof Error ? functionError.name : 'UnknownError'
      });
      // Don't throw - let the stream end gracefully
    }
  }
  
  // If we reached here, we either have content or no function calls to process
  return;
}

// Handle non-streaming chat completion with function calling support
export async function handleNonStreamingChatCompletion(
  aiService: any,
  chatOptions: any,
  executeFunctionCallsHandler: Function,
  additionalArgs: any[] = [],
  onNewMessage?: Function,
  context?: {
    tenant?: string;
    userId?: string;
    integrationId?: string;
    integrationName?: string;
    workspaceId?: string;
  }
) {
  try {
    // Get initial completion
    // Add timeout protection for initial AI call
    const completion = await Promise.race([
      aiService.createChatCompletion(chatOptions),
      new Promise((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error('Initial chat completion timeout after 2 minutes');
          // Emit platform event for timeout
          if (context?.tenant) {
            emitAIProviderErrorEvent({
              tenant: context.tenant,
              userId: context.userId,
              provider: aiService.source?.kind || 'unknown',
              sourceId: aiService.source?._id,
              stream: false,
              model: chatOptions.model,
              error: timeoutError,
              context: {
                integrationId: context.integrationId,
                integrationName: context.integrationName,
                workspaceId: context.workspaceId,
              }
            });
          }
          reject(timeoutError);
        }, 120000); // 2 minute timeout
      })
    ]);
    
    // Handle the standardized Chat Completions API format
    const message = completion.choices[0].message;
    const content = message.content || '';
    
    // Check for function calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      if (onNewMessage) {
        onNewMessage({
          type: 'function_calls_detected',
          functionCalls: message.tool_calls
        });
      }
      // Execute all function calls
      // Add timeout protection for function execution in non-streaming mode
      const functionResults = await Promise.race([
        executeFunctionCallsHandler(
          message.tool_calls,
          null, // No SSE for non-streaming
          ...additionalArgs
        ),
        new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error('Function execution timeout after 10 minutes');
            // Emit platform event for function execution timeout
            if (context?.tenant) {
              emitAIProviderErrorEvent({
                tenant: context.tenant,
                userId: context.userId,
                provider: aiService.source?.kind || 'unknown',
                sourceId: aiService.source?._id,
                stream: false,
                model: chatOptions.model,
                error: timeoutError,
                context: {
                  integrationId: context.integrationId,
                  integrationName: context.integrationName,
                  workspaceId: context.workspaceId,
                  stage: 'function_execution'
                }
              });
            }
            reject(timeoutError);
          }, 600000); // 10 minute timeout (same as NESTED_AGENT_TIMEOUT_MS)
        })
      ]);
      
      if (onNewMessage) {
        onNewMessage({
          type: 'function_calls_executed',
          functionResults: functionResults
        });
      }
      
      // Create follow-up messages with function results
      const followUpMessages = [
        ...chatOptions.messages,
        message,
        ...functionResults
      ];
      
      // Get final completion with function results
      // Add timeout protection for follow-up completion
      const followUpCompletion = await Promise.race([
        aiService.createChatCompletion({
          ...chatOptions,
          messages: followUpMessages
        }),
        new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error('Follow-up chat completion timeout after 2 minutes');
            // Emit platform event for timeout
            if (context?.tenant) {
              emitAIProviderErrorEvent({
                tenant: context.tenant,
                userId: context.userId,
                provider: aiService.source?.kind || 'unknown',
                sourceId: aiService.source?._id,
                stream: false,
                model: chatOptions.model,
                error: timeoutError,
                context: {
                  integrationId: context.integrationId,
                  integrationName: context.integrationName,
                  workspaceId: context.workspaceId,
                  stage: 'follow_up_completion'
                }
              });
            }
            reject(timeoutError);
          }, 120000); // 2 minute timeout
        })
      ]);
      
      // Handle both API formats for follow-up completion
      let finalContent;
      if (followUpCompletion.choices) {
        // Chat Completions API format
        finalContent = followUpCompletion.choices[0].message.content;
      } else if (followUpCompletion.output) {
        // Responses API format
        const outputItem = followUpCompletion.output.find(item => item.type === 'message');
        finalContent = outputItem?.content?.[0]?.text || '';
      } else {
        finalContent = '';
      }
      
      if (onNewMessage) {
        onNewMessage({
          type: 'assistant_last_content',
          content: finalContent
        });
      }
      
      // Return the final result
      return {  
        ...followUpCompletion,
        function_calls: message.tool_calls,
        function_results: functionResults
      };
    } else {
      // Handle the standardized content
      const content = completion.choices[0].message.content || '';
      
      if (onNewMessage) {
        onNewMessage({
          type: 'assistant_last_content',
          content
        });
      }
      // No function calls, return the initial completion
      return completion;
    }
  } catch (error) {
    logger.error('Error in non-streaming chat completion', error);
    
    // Emit platform event for general errors
    if (context?.tenant && error) {
      emitAIProviderErrorEvent({
        tenant: context.tenant,
        userId: context.userId,
        provider: aiService.source?.kind || 'unknown',
        sourceId: aiService.source?._id,
        stream: false,
        model: chatOptions.model,
        error,
        context: {
          integrationId: context.integrationId,
          integrationName: context.integrationName,
          workspaceId: context.workspaceId,
        }
      });
    }
    
    throw error;
  }
}

export async function generateThreadTitle({aiService, model, messages, tryAgain, loggingContext}: {aiService: any, model: string, messages: any[], tryAgain?: boolean, loggingContext?: any}): Promise<string> {
  const result = await aiService.createChatCompletion({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a title generator for another existing conversation with AI. ' +
        'you will get a conversation messages and you need to generate a title for it. ' +
        'make shorter title as possible. try hard not to over 4-5 words.' +
        'If the messages are not clear enough, add a asterisk (*) to the beginning of the title, so we will run it again after few more messages. ' +
        'return the data in this schema: { title: string }',
        response_format: { type: 'json_object' },
      },
      {
        role: 'user',
        content: 'give me the title for this conversation: ' + JSON.stringify(messages.filter(({role}) => role === 'user').slice(0, tryAgain ? 6 : 3))
      }
    ],
    loggingContext,
  });
  const { title } = JSON.parse(result.choices[0].message.content);

  return title;
}