import { FunctionCall } from "./chat-completion-service";
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

        let args = ChatCompletionService.parseFunctionArguments(functionCall.function.arguments);
        let result: any;
        if (targetIntegration.dataManipulation) {
          args = await executeDataManipulation(tenant, args, targetIntegration.dataManipulation);
        }
        if (targetIntegration.handler) {
          result = await targetIntegration.handler(req, args);
          const functionResult = ChatCompletionService.createFunctionResult(functionCall, result);
          functionResults.push(functionResult);
        } else {
          result = await triggerIntegrationSource(tenant, targetIntegration.target.source, {
            payload: args,
            operation: targetIntegration.target.operation,
            details: targetIntegration.target.details
          });

          const functionResult = ChatCompletionService.createFunctionResult(functionCall, result);
          functionResults.push(functionResult);
        }
        
        if (sendSSE) {
          sendSSE({ 
            type: `${eventPrefix}function_executed`, 
            functionCall, 
            result 
          });
        }
      } else {
        functionResults.push(ChatCompletionService.createFunctionResult(functionCall, {
          error: `Function ${functionCall.function.name} not found`
        }));
      }
    } catch (error) {
      logger.error('error', error);
      functionResults.push(ChatCompletionService.createFunctionResult(functionCall, {
        error: 'Invalid function arguments'
      }));
    }
  }
  
  return functionResults;
}
