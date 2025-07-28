import logger from './logger';
import { callPluginsService, executeDataManipulation } from './plugins-service-api';

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
export function parseFunctionArguments(argsString: string): any {
  try {
    return JSON.parse(argsString);
  } catch (error) {
    throw new Error('Invalid function arguments JSON');
  }
}

// Helper function to create a standardized function result
export function createFunctionResult(functionCall: FunctionCall, result: any): FunctionResult {
  return {
    tool_call_id: functionCall.id,
    role: 'tool',
    type: 'function',
    name: functionCall.function.name,
    content: typeof result === 'string' ? result : JSON.stringify(result)
  };
}

// Helper function to find target integration by function name
function findTargetIntegration(toolsIntegrations: any[], functionName: string) {
  return toolsIntegrations.find(
    tool => tool.trigger.details.name === functionName
  );
}

// Handle streaming chat completion with function calling support
export async function handleStreamingChatCompletion(
  res: any,
  aiService: any,
  chatOptions: any,
  executeFunctionCallsHandler: Function,
  additionalArgs: any[] = []
) {
  let currentFunctionCalls: FunctionCall[] = [];
  let isCollectingFunctionCall = false;
  let currentFunctionCall: Partial<FunctionCall> = {};
  let functionCallBuffer = '';
  
  const sendSSE = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
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
        sendSSE({ type: 'chunk', content: delta.content });
      }
      
      // Check if we're done with the initial response
      if (chunk.choices[0]?.finish_reason === 'tool_calls' && currentFunctionCalls.length > 0) {
        // Execute all collected function calls
        const functionResults = await executeFunctionCallsHandler(
          currentFunctionCalls,
          sendSSE,
          ...additionalArgs
        );
        
        // Continue the conversation with function results
        sendSSE({ type: 'continuing_conversation' });
        
        // Create follow-up messages with function results
        const followUpMessages = [
          ...chatOptions.messages,
          { role: 'assistant', tool_calls: currentFunctionCalls },
          ...functionResults
        ];
        
        // Reset function calls for potential nested calls
        currentFunctionCalls = [];
        
        // Start a new streaming completion with the function results
        const followUpStream = await aiService.createChatCompletionStream({
          ...chatOptions,
          messages: followUpMessages
        });
        
        // Process the follow-up stream
        for await (const followUpChunk of followUpStream) {
          const followUpDelta = followUpChunk.choices[0]?.delta;
          
          if (followUpDelta?.content) {
            sendSSE({ type: 'followup_chunk', content: followUpDelta.content });
          }
          
          // Handle nested function calls if needed
          // This would be similar to the above function call handling
        }
      }
    }

    if (isCollectingFunctionCall) {
      currentFunctionCalls.push(currentFunctionCall as FunctionCall);
      const functionResults = await executeFunctionCallsHandler(
        currentFunctionCalls,
        sendSSE,
        ...additionalArgs
      );
      
      // Create follow-up messages with function results
      const followUpMessages = [
        ...chatOptions.messages,
        { role: 'assistant', tool_calls: currentFunctionCalls },
        ...functionResults
      ];
      
      // Start a new streaming completion with the function results
      const followUpStream = await aiService.createChatCompletionStream({
        ...chatOptions,
        messages: followUpMessages
      });
      
      // Process the follow-up stream
      for await (const followUpChunk of followUpStream) {
        const followUpDelta = followUpChunk.choices[0]?.delta;
        
        if (followUpDelta?.content) {
          sendSSE({ type: 'followup_chunk', content: followUpDelta.content });
        }
        
        // Handle nested function calls if needed
        // This would be similar to the above function call handling
      }
    }
    
    // End the response
    sendSSE({ type: 'done' });
    res.end();
    
  } catch (error) {
    logger.error('Error in streaming chat completion', error);
    sendSSE({ type: 'error', message: 'Error processing streaming chat completion' });
    res.end();
  }
}

// Handle non-streaming chat completion with function calling support
export async function handleNonStreamingChatCompletion(
  res: any,
  aiService: any,
  chatOptions: any,
  executeFunctionCallsHandler: Function,
  additionalArgs: any[] = []
) {
  try {
    // Get initial completion
    const completion = await aiService.createChatCompletion(chatOptions);
    const message = completion.choices[0].message;
    
    // Check for function calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Execute all function calls
      const functionResults = await executeFunctionCallsHandler(
        message.tool_calls,
        null, // No SSE for non-streaming
        ...additionalArgs
      );
      
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
      
      // Return the final result
      res.json({
        ...followUpCompletion,
        function_calls: message.tool_calls,
        function_results: functionResults
      });
    } else {
      // No function calls, return the initial completion
      res.json(completion);
    }
  } catch (error) {
    logger.error('Error in non-streaming chat completion', error);
    res.status(500).json({ message: 'Error processing chat completion' });
  }
}
