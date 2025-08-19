import * as ChatCompletionService from "./chat-completion-service";
import { executeDataManipulation, triggerIntegrationSource } from "./plugins-service-api";
import logger from "./logger";

// Helper function to find target integration by function name
export function findTargetIntegration(toolsIntegrations: any[], functionName: string) {
  return toolsIntegrations.find(
    tool => (tool.trigger?.details?.name || tool.name) === functionName
  );
}

// Helper function to execute multiple function calls
export async function executeFunctionCalls(
  req: any,
  functionCalls: ChatCompletionService.FunctionCall[],
  toolsIntegrations: any[],
  tenant: string,
  sendSSE?: ChatCompletionService.SSEHandler,
  eventPrefix: string = ''
): Promise<any[]> {
  const functionResults: any[] = [];
  
  if (sendSSE && functionCalls.length > 0) {
    sendSSE({ 
      type: `${eventPrefix}function_calls_detected`, 
      functionCalls 
    });
  }
  
  for (const functionCall of functionCalls) {
    try {
      const targetIntegration = findTargetIntegration(toolsIntegrations, functionCall.function.name);
      if (targetIntegration) {
        if (sendSSE) {
          sendSSE({ 
            type: `${eventPrefix}function_executing`, 
            functionCall 
          });
        }

        // Parse all JSON objects from the function arguments
        const argsIterator = ChatCompletionService.parseFunctionArguments(functionCall.function.arguments);
        let results: any[] = [];
        
        // Process each JSON object from the arguments
        for (let args of argsIterator) {
          let result: any;
          
          // Apply data manipulation if configured
          if (targetIntegration.dataManipulation) {
            args = await executeDataManipulation(tenant, args, targetIntegration.dataManipulation);
          }
          
          // Execute the integration
          if (targetIntegration.handler) {
            result = await targetIntegration.handler(req, args);
          } else {
            result = await triggerIntegrationSource(tenant, targetIntegration.target.source, {
              payload: args,
              operation: targetIntegration.target.operation,
              details: targetIntegration.target.details
            });
          }
          
          // Add to results array
          results.push(result);
        }

        const functionResult = ChatCompletionService.createFunctionResult(functionCall, results);
        functionResults.push(functionResult);
        
        if (sendSSE) {
          sendSSE({ 
            type: `${eventPrefix}function_executed`, 
            functionCall, 
            result: results,
          });
        }
      } else {
        functionResults.push(ChatCompletionService.createFunctionResult(functionCall, [{
          error: `Function ${functionCall.function.name} not found`
        }]));
      }
    } catch (error) {
      logger.error('error', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid function arguments';
      const functionResult = ChatCompletionService.createFunctionResult(functionCall, [{
        error: errorMessage
      }]);
      
      functionResults.push(functionResult);
      
      // Send SSE event for function execution failure
      if (sendSSE) {
        sendSSE({ 
          type: `${eventPrefix}function_failed`, 
          functionCall, 
          error: errorMessage
        });
      }
    }
  }
  
  return functionResults;
}
