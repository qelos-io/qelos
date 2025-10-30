import * as ChatCompletionService from "./chat-completion-service";
import { executeDataManipulation, triggerIntegrationSource } from "./plugins-service-api";
import logger from "./logger";
import {
  createBlueprintEntityForUser,
  updateBlueprintEntityForUser,
  deleteBlueprintEntityForUser,
  getBlueprintEntityForUser,
  getBlueprintEntitiesForUser
} from "./users-no-code-service";

// Helper function to find target integration by function name
export function findTargetIntegration(toolsIntegrations: any[], functionName: string) {
  // First check if it's a regular integration
  const integration = toolsIntegrations.find(
    tool => (tool.trigger?.details?.name || tool.name || tool.function?.name) === functionName
  );
  
  if (integration) {
    return integration;
  }
  
  // If not found, check if it's a blueprint operation
  const { isBlueprint, operation, blueprintIdentifier } = isBlueprintOperation(functionName);
  
  if (isBlueprint) {
    // Create a virtual integration for blueprint operations
    return {
      // This is a virtual integration that doesn't exist in the database
      // but provides the necessary structure for the execution flow
      _id: `virtual_blueprint_${blueprintIdentifier}_${operation}`,
      name: functionName,
      description: `Blueprint ${operation} operation for ${blueprintIdentifier}`,
      trigger: {
        details: {
          name: functionName,
          description: `Blueprint ${operation} operation for ${blueprintIdentifier}`
        }
      },
      // No data manipulation for blueprint operations
      dataManipulation: null,
      // Mark as virtual so we know it's not a real integration
      isVirtualBlueprintIntegration: true
    };
  }
  
  // Not found
  return null;
}

const blueprintOperations = ['create', 'get', 'update', 'delete', 'list'];

// Helper function to check if a function name is a blueprint operation
export function isBlueprintOperation(functionName: string): { isBlueprint: boolean, operation: string, blueprintIdentifier: string } {
  for (const operation of blueprintOperations) {
    if (functionName.startsWith(`${operation}_`)) {
      const blueprintIdentifier = functionName.substring(operation.length + 1);
      return { isBlueprint: true, operation, blueprintIdentifier };
    }
  }
  
  return { isBlueprint: false, operation: '', blueprintIdentifier: '' };
}

// Helper function to execute blueprint operations
async function executeBlueprintOperation(
  req: any,
  functionName: string,
  args: any,
  tenant: string
): Promise<any> {
  const { isBlueprint, operation, blueprintIdentifier } = isBlueprintOperation(functionName);
  
  if (!isBlueprint) {
    throw new Error(`Not a blueprint operation: ${functionName}`);
  }
  
  // Get user and tenant from request
  const user = req.headers.user;
  
  switch (operation) {
    case 'create':
      return createBlueprintEntityForUser(tenant, user, blueprintIdentifier, {metadata: args});
    
    case 'get':
      return getBlueprintEntityForUser(tenant, user, blueprintIdentifier, args.identifier);
    
    case 'update':
      // Extract id from args and use the rest as payload
      const { id, ...updatePayload } = args;
      return updateBlueprintEntityForUser(tenant, user, blueprintIdentifier, { identifier: id, metadata: updatePayload });
    
    case 'delete':
      return deleteBlueprintEntityForUser(tenant, user, blueprintIdentifier, args.identifier);
    
    case 'list':
      // Use query if provided, otherwise empty object
      const query = args?.query || {};
      if (query.createdFrom) {
        query[`metadata.created[$gte]`] = new Date(query.createdFrom).toJSON();
      }
      if (query.createdTo) {
        query[`metadata.created[$lte]`] = new Date(query.createdTo).toJSON();
      }
      if (query.updatedFrom) {
        query[`metadata.updated[$gte]`] = new Date(query.updatedFrom).toJSON();
      }
      if (query.updatedTo) {
        query[`metadata.updated[$lte]`] = new Date(query.updatedTo).toJSON();
      }
      return getBlueprintEntitiesForUser(tenant, user, blueprintIdentifier, query);
    
    default:
      throw new Error(`Unknown blueprint operation: ${operation}`);
  }
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
            args = (await executeDataManipulation(tenant, {arguments: args, user: req.user, workspace: req.user?.workspace}, targetIntegration.dataManipulation)).arguments;
          }
          
          // Check if this is a blueprint operation
          const { isBlueprint } = isBlueprintOperation(functionCall.function.name);
          
          // Execute the integration or blueprint operation
          if (isBlueprint) {
            // Handle blueprint operation
            result = await executeBlueprintOperation(req, functionCall.function.name, args, tenant);
          } else if (targetIntegration.handler) {
            // Use custom handler if available
            result = await targetIntegration.handler(req, args);
          } else {
            // Default to triggering integration source
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
