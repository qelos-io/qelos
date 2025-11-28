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
import { emitFunctionExecutionErrorEvent } from "./platform-events";

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
  tenant: string,
  bypassAdmin?: boolean,
): Promise<any> {
  const { isBlueprint, operation, blueprintIdentifier } = isBlueprintOperation(functionName);
  
  if (!isBlueprint) {
    throw new Error(`Not a blueprint operation: ${functionName}`);
  }
  
  // Get user and tenant from request
  const user = req.headers.user;
  
  switch (operation) {
    case 'create':
      return createBlueprintEntityForUser(tenant, user, blueprintIdentifier, {metadata: args}, bypassAdmin);
    
    case 'get':
      return getBlueprintEntityForUser(tenant, user, blueprintIdentifier, args.identifier, bypassAdmin);
    
    case 'update':
      // Extract id from args and use the rest as payload
      const { identifier, ...updatePayload } = args;
      return updateBlueprintEntityForUser(tenant, user, blueprintIdentifier, { identifier, metadata: updatePayload }, bypassAdmin);
    
    case 'delete':
      return deleteBlueprintEntityForUser(tenant, user, blueprintIdentifier, args.identifier, bypassAdmin);
    
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
      return getBlueprintEntitiesForUser(tenant, user, blueprintIdentifier, query, bypassAdmin);
    
    default:
      throw new Error(`Unknown blueprint operation: ${operation}`);
  }
}

const HEARTBEAT_INTERVAL_MS = 1000;
const FUNCTION_CALL_TIMEOUT_MS = 300000; // 5 minutes timeout for individual function calls
const NESTED_AGENT_TIMEOUT_MS = 600000; // 10 minutes timeout for nested agent calls

function startHeartbeat(
  sendSSE?: ChatCompletionService.SSEHandler,
  eventPrefix: string = '',
  tenant?: string,
  userId?: string,
  functionName?: string
) {
  if (!sendSSE) {
    return () => {};
  }

  let heartbeatCount = 0;
  const maxHeartbeats = Math.floor(NESTED_AGENT_TIMEOUT_MS / HEARTBEAT_INTERVAL_MS); // Max heartbeats before timeout

  // Send an initial ping so the client knows the agent is still working
  sendSSE({ type: `${eventPrefix}heartbeat` });

  const intervalId = setInterval(() => {
    try {
      heartbeatCount++;
      sendSSE({ type: `${eventPrefix}heartbeat` });
      
      // Log warning if heartbeat has been running for a long time
      if (heartbeatCount % 60 === 0) { // Every minute
        const minutes = Math.floor(heartbeatCount * HEARTBEAT_INTERVAL_MS / 60000);
        logger.warn(`Heartbeat has been running for ${minutes} minutes - possible stuck function execution`);
      }
      
      // Force stop if we've exceeded the maximum heartbeats (safety net)
      if (heartbeatCount >= maxHeartbeats) {
        logger.error(`Heartbeat exceeded maximum count (${maxHeartbeats}) - forcing stop to prevent infinite heartbeat`);
        clearInterval(intervalId);
        
        // Emit platform event for heartbeat timeout
        if (tenant && functionName) {
          const timeoutError = new Error(`Function ${functionName} exceeded heartbeat timeout after ${maxHeartbeats} heartbeats`);
          timeoutError.name = 'HeartbeatTimeoutError';
          emitFunctionExecutionErrorEvent({
            tenant,
            userId,
            functionName,
            functionCallId: 'heartbeat_timeout',
            error: timeoutError,
            context: {
              heartbeatCount,
              maxHeartbeats,
              timeoutMs: NESTED_AGENT_TIMEOUT_MS
            }
          });
        }
        
        sendSSE({ 
          type: `${eventPrefix}error`, 
          message: 'Function execution exceeded maximum time limit',
          isTimeout: true,
          errorType: 'HeartbeatTimeout'
        });
      }
    } catch (error) {
      logger.warn('Failed to send heartbeat event', error);
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(intervalId);
}

// Helper function to execute a single function call with timeout
async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, functionName: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      const duration = Date.now() - startTime;
      const timeoutError = new Error(`Function ${functionName} timed out after ${duration}ms (limit: ${timeoutMs}ms)`);
      timeoutError.name = 'TimeoutError';
      reject(timeoutError);
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// Helper function to execute multiple function calls
export async function executeFunctionCalls(
  req: any,
  functionCalls: ChatCompletionService.FunctionCall[],
  toolsIntegrations: any[],
  tenant: string,
  sendSSE?: ChatCompletionService.SSEHandler,
  eventPrefix: string = '',
  bypassAdmin?: boolean,
): Promise<any[]> {
  const functionResults: any[] = [];
  let stopHeartbeat: (() => void) | null = null;

  if (sendSSE && functionCalls.length > 0) {
    sendSSE({ 
      type: `${eventPrefix}function_calls_detected`, 
      functionCalls 
    });
  }
  
  try {
    for (const functionCall of functionCalls) {
      // Start heartbeat for each function call to keep connection alive during long operations
      stopHeartbeat = startHeartbeat(sendSSE, eventPrefix, tenant, req.user?._id?.toString(), functionCall.function.name);
      
      let targetIntegration: any = null;
      
      try {
        targetIntegration = findTargetIntegration(toolsIntegrations, functionCall.function.name);
        if (targetIntegration) {
          if (sendSSE) {
            sendSSE({ 
              type: `${eventPrefix}function_executing`, 
              functionCall 
            });
          }

          // Parse all JSON objects from the function arguments
          // Add timeout protection for argument parsing to prevent infinite loops
          let results: any[] = [];
          let argsArray: any[] = [];
          
          try {
            // Convert generator to array with timeout protection
            const argsIterator = ChatCompletionService.parseFunctionArguments(functionCall.function.arguments);
            const parseTimeout = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Argument parsing timeout')), 10000); // 10 second timeout
            });
            
            const parsePromise = new Promise<any[]>((resolve) => {
              const args: any[] = [];
              let iterationCount = 0;
              
              const processNextArg = () => {
                try {
                  const { value, done } = argsIterator.next();
                  if (done) {
                    resolve(args);
                    return;
                  }
                  
                  args.push(value);
                  iterationCount++;
                  
                  // Safety checks
                  if (args.length > 10) {
                    logger.warn('Too many arguments parsed, limiting to first 10', { 
                      functionName: functionCall.function.name,
                      argumentsLength: functionCall.function.arguments.length 
                    });
                    resolve(args);
                    return;
                  }
                  
                  if (iterationCount > 100) {
                    logger.error('Infinite loop detected in argument parsing', {
                      functionName: functionCall.function.name,
                      iterationCount
                    });
                    resolve(args);
                    return;
                  }
                  
                  // Use setImmediate to yield control and prevent blocking
                  setImmediate(processNextArg);
                } catch (error) {
                  logger.error('Error in argument parsing iteration', {
                    functionName: functionCall.function.name,
                    error: error instanceof Error ? error.message : error,
                    iterationCount
                  });
                  resolve(args);
                }
              };
              
              processNextArg();
            });
            
            argsArray = await Promise.race([parsePromise, parseTimeout]) as any[];
          } catch (parseError) {
            logger.error('Failed to parse function arguments', {
              functionName: functionCall.function.name,
              arguments: functionCall.function.arguments.substring(0, 200),
              error: parseError instanceof Error ? parseError.message : parseError
            });
            // Fallback: try simple JSON parse
            try {
              argsArray = [JSON.parse(functionCall.function.arguments)];
            } catch (fallbackError) {
              throw new Error(`Failed to parse function arguments: ${parseError instanceof Error ? parseError.message : parseError}`);
            }
          }
          
          // Process each parsed argument
          for (let args of argsArray) {
            let result: any;
            
            try {
              // Apply data manipulation if configured
              if (targetIntegration.dataManipulation) {
                args = (await executeDataManipulation(tenant, {arguments: args, user: req.user, workspace: req.user?.workspace}, targetIntegration.dataManipulation)).arguments;
              }
              
              // Check if this is a blueprint operation
              const { isBlueprint } = isBlueprintOperation(functionCall.function.name);
              
              // Execute the integration or blueprint operation with timeout
              const executionPromise = isBlueprint
                ? executeBlueprintOperation(req, functionCall.function.name, args, tenant, bypassAdmin)
                : targetIntegration.handler
                  ? targetIntegration.handler(req, args)
                  : triggerIntegrationSource(tenant, targetIntegration.target.source, {
                      payload: args,
                      operation: targetIntegration.target.operation,
                      details: targetIntegration.target.details
                    });
              
              // Use longer timeout for nested agent calls (functions that call other agents)
              const isNestedAgentCall = functionCall.function.name.includes('Agent');
              const timeoutMs = isNestedAgentCall ? NESTED_AGENT_TIMEOUT_MS : FUNCTION_CALL_TIMEOUT_MS;
              
              result = await executeWithTimeout(
                executionPromise,
                timeoutMs,
                functionCall.function.name
              );
              
              // Add to results array
              results.push(result);
            } catch (argError) {
              logger.error(`Error executing function call argument for ${functionCall.function.name}:`, argError);
              
              // Emit platform event for function execution error
              emitFunctionExecutionErrorEvent({
                tenant,
                userId: req.user?._id?.toString(),
                integrationId: targetIntegration._id,
                functionName: functionCall.function.name,
                functionCallId: functionCall.id,
                error: argError,
                context: {
                  arguments: args,
                  targetIntegration: targetIntegration.name || targetIntegration._id
                }
              });
              
              // Add error to results
              results.push({
                error: argError instanceof Error ? argError.message : 'Function execution failed'
              });
            }
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
          const errorMessage = `Function ${functionCall.function.name} not found`;
          logger.warn(errorMessage);
          
          // Emit platform event for function not found
          emitFunctionExecutionErrorEvent({
            tenant,
            userId: req.user?._id?.toString(),
            functionName: functionCall.function.name,
            functionCallId: functionCall.id,
            error: new Error(errorMessage),
            context: {
              availableFunctions: toolsIntegrations.map(t => t.trigger?.details?.name || t.name).filter(Boolean)
            }
          });
          
          functionResults.push(ChatCompletionService.createFunctionResult(functionCall, [{
            error: errorMessage
          }]));
        }
      } catch (error) {
        logger.error(`Error executing function call ${functionCall.function.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Invalid function arguments';
        
        // Emit platform event for function execution error
        emitFunctionExecutionErrorEvent({
          tenant,
          userId: req.user?._id?.toString(),
          integrationId: targetIntegration?._id,
          functionName: functionCall.function.name,
          functionCallId: functionCall.id,
          error,
          context: {
            arguments: functionCall.function.arguments
          }
        });
        
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
      } finally {
        // Stop heartbeat after each function call completes
        if (stopHeartbeat) {
          stopHeartbeat();
          stopHeartbeat = null;
        }
      }
    }
  } catch (globalError) {
    logger.error('Global error in executeFunctionCalls:', globalError);
    
    // Emit platform event for global execution error
    emitFunctionExecutionErrorEvent({
      tenant,
      userId: req.user?._id?.toString(),
      functionName: 'multiple_functions',
      functionCallId: 'global_error',
      error: globalError,
      context: {
        functionCallsCount: functionCalls.length,
        functionNames: functionCalls.map(fc => fc.function.name)
      }
    });
    
    // Send SSE event for global error
    if (sendSSE) {
      sendSSE({ 
        type: `${eventPrefix}error`, 
        error: globalError instanceof Error ? globalError.message : 'Global error during function execution'
      });
    }
  } finally {
    // Ensure heartbeat is stopped if still running
    if (stopHeartbeat) {
      stopHeartbeat();
    }
  }
  
  return functionResults;
}
