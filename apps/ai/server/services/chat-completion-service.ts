import logger from './logger';

const MAX_AUTO_CONTINUE_STEPS = 3;

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
export function* parseFunctionArguments(argsString: string): Generator<any> {
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
                const remainingGenerator = parseFunctionArguments(nextJsonStr);
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
      onNewMessage
    );
    
    // End the response
    sendSSE({ type: 'done' });
    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    logger.error('Error in streaming chat completion', error);
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
) {
  let currentFunctionCalls: FunctionCall[] = [];
  let isCollectingFunctionCall = false;
  let currentFunctionCall: Partial<FunctionCall> = {};
  let functionCallBuffer = '';
  let hasContent = false;
  let assistantLastContent = '';

  const stream = await aiService.createChatCompletionStream(chatOptions);
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    
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
    } else if (delta?.content) {
      // Regular content chunk
      hasContent = true;
      assistantLastContent += delta.content;
      sendSSE({ 
        type: isFollowUp ? 'followup_chunk' : 'chunk', 
        content: delta.content 
      });
    }
    
    // Check if we're done with the response and have function calls to execute
    if (chunk.choices[0]?.finish_reason === 'tool_calls' && currentFunctionCalls.length > 0) {
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
        await processStreamingCompletion(
          res,
          aiService,
          { ...chatOptions, messages: followUpMessages },
          executeFunctionCallsHandler,
          sendSSE,
          additionalArgs,
          true, // isFollowUp
          onNewMessage,
          autoContinueCount,
        );
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
    if (chunk.choices[0]?.finish_reason === 'length' && autoContinueCount < MAX_AUTO_CONTINUE_STEPS) {
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
      );
      
      // Return after processing the recursive call
      return;
    }
  }

  if (onNewMessage && hasContent && assistantLastContent) {
    onNewMessage({
      type: 'assistant_last_content',
      content: assistantLastContent
    });
    assistantLastContent = '';
  }

  // Handle any remaining incomplete function call
  if (isCollectingFunctionCall && currentFunctionCall.id) {
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
        autoContinueCount,
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
) {
  try {
    // Get initial completion
    const completion = await aiService.createChatCompletion(chatOptions);
    const message = completion.choices[0].message;
    
    // Check for function calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      if (onNewMessage) {
        onNewMessage({
          type: 'function_calls_detected',
          functionCalls: message.tool_calls
        });
      }
      // Execute all function calls
      const functionResults = await executeFunctionCallsHandler(
        message.tool_calls,
        null, // No SSE for non-streaming
        ...additionalArgs
      );
      
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
      const followUpCompletion = await aiService.createChatCompletion({
        ...chatOptions,
        messages: followUpMessages
      });
      
      if (onNewMessage) {
        onNewMessage({
          type: 'assistant_last_content',
          content: followUpCompletion.choices[0].message.content
        });
      }
      
      // Return the final result
      return {  
        ...followUpCompletion,
        function_calls: message.tool_calls,
        function_results: functionResults
      };
    } else {
      if (onNewMessage) {
        onNewMessage({
          type: 'assistant_last_content',
          content: completion.choices[0].message.content
        });
      }
      // No function calls, return the initial completion
      return completion;
    }
  } catch (error) {
    logger.error('Error in non-streaming chat completion', error);
    throw error;
  }
}
