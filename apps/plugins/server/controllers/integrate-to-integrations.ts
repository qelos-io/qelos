import Integration from "../models/integration";
import { getEncryptedSourceAuthentication } from "../services/source-authentication-service";
import { IntegrationSourceKind, OpenAITargetOperation } from "@qelos/global-types";
import { createAIService } from "../services/ai-service";
import logger from "../services/logger";
import { executeDataManipulation } from "../services/data-manipulation-service";
import { callIntegrationTarget } from "../services/integration-target-call";
import * as ChatCompletionService from "../services/chat-completion-service";

// Using parseFunctionArguments from ChatCompletionService

// Helper function to find target integration by function name
function findTargetIntegration(toolsIntegrations: any[], functionName: string) {
  return toolsIntegrations.find(
    tool => tool.trigger.details.name === functionName
  );
}

// Using createFunctionResult from ChatCompletionService

// Helper function to execute a single function call
async function executeFunctionCall(
  functionCall: any,
  toolsIntegrations: any[],
  tenant: string
): Promise<any> {
  const targetIntegration = findTargetIntegration(toolsIntegrations, functionCall.function.name);
  
  if (!targetIntegration) {
    return ChatCompletionService.createFunctionResult(functionCall, {
      error: `Function ${functionCall.function.name} not found`
    });
  }

  try {
    const parsedArgs = ChatCompletionService.parseFunctionArguments(functionCall.function.arguments);
    const args = await executeDataManipulation(tenant, parsedArgs, targetIntegration.dataManipulation);
    const result = await callIntegrationTarget(tenant, args, targetIntegration.target);

    return ChatCompletionService.createFunctionResult(functionCall, result);
  } catch (error) {
    return ChatCompletionService.createFunctionResult(functionCall, {
      error: 'Function execution failed'
    });
  }
}

// Helper function to execute multiple function calls
async function executeFunctionCalls(
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

        const parsedArgs = ChatCompletionService.parseFunctionArguments(functionCall.function.arguments);
        const args = await executeDataManipulation(tenant, parsedArgs, targetIntegration.dataManipulation);
        const result = await callIntegrationTarget(tenant, args, targetIntegration.target);

        const functionResult = ChatCompletionService.createFunctionResult(functionCall, result);
        functionResults.push(functionResult);
        
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
      functionResults.push(ChatCompletionService.createFunctionResult(functionCall, {
        error: 'Invalid function arguments'
      }));
    }
  }
  
  return functionResults;
}

export function forceTriggerIntegrationKind(kinds: IntegrationSourceKind[], operations?: string[]) {
  return (req, res, next) => {
    req.integrationTriggerKinds = kinds;
    req.integrationTriggerOperations = operations;
    next();
  }
} 

export async function getIntegrationToIntegrate(req, res, next) {
  try {
    const query = {
      _id: req.params.integrationId, 
      tenant: req.headers.tenant,
      'kind.0': { $in: req.integrationTriggerKinds },
      // ...(req.integrationTriggerOperations ? { 'trigger.operation': { $in: req.integrationTriggerOperations } } : {}),
    };
    const integration = await Integration
      .findOne(query)
      .populate('trigger.source')
      .populate('target.source')
      .lean()
      .exec();

    if (!integration) {
      res.status(404).json({ message: 'integration not found' }).end();
      return;
    }

    req.integration = integration;

    const { roles, workspaceRoles, workspaceLabels } = integration.trigger.details || {};

    if (roles && roles?.length > 0) {
      if (!roles.some(role => req.user.roles.includes(role))) {
        res.status(403).json({ message: 'user does not have required roles' }).end();
        return;
      }
    }

    if (workspaceRoles && workspaceRoles?.length > 0) {
      if (!workspaceRoles.some(role => req.user.workspaceRoles.includes(role))) {
        res.status(403).json({ message: 'user does not have required workspace roles' }).end();
        return;
      }
    }

    if (workspaceLabels && workspaceLabels?.length > 0) {
      if (!workspaceLabels.some(label => req.user.workspaceLabels.includes(label))) {
        res.status(403).json({ message: 'workspace does not have required labels' }).end();
        return;
      }
    }

    req.integrationSourceTargetAuthentication = await getEncryptedSourceAuthentication(req.headers.tenant, (integration.target.source as any).kind as IntegrationSourceKind, (integration.target.source as any).authentication);

    next();
  } catch (e: any) { // Typed error for better access to message
    res.status(500).json({ message: 'Could not get integration' }).end();
  }
}

export async function chatCompletion(req, res) {
  const { integration } = req;
  const { source } = integration.target;
  const { messages } = req.body;
  const useSSE = req.query.stream === 'true';

  let aiService;

  try {
    aiService = createAIService(integration.kind[1], req.integrationSourceTargetAuthentication);
    
  } catch (e: any) {
    res.status(500).json({ message: 'Could not get integration' }).end();
    return;
  }

  // Prepare the messages array
  const initialMessages = [
    ...(source.metadata?.initialMessages || []), 
    ...(integration.target?.details?.pre_messages || []), 
  ];

  const safeUserMessages = messages
    .filter(msg => msg && msg.role !== 'system')
    .map(msg => ({ role: msg.role, content: msg.content }));

  // Common options for both streaming and non-streaming requests 
  let options;
  let toolsIntegrations;
  
  try {
    [options, toolsIntegrations] = await Promise.all([
      executeDataManipulation(integration.tenant, {
        user: req.user,
        messages: safeUserMessages,
      }, integration.dataManipulation),
      Integration.find({
        tenant: integration.tenant,
        'kind.0': integration.target.source.kind,
        'trigger.operation': OpenAITargetOperation.functionCalling,
        $or: [
          { 'trigger.details.allowedIntegrationIds': integration._id },
          { 'trigger.details.allowedIntegrationIds': '*' },
          { 'trigger.details.allowedIntegrationIds': { $size: 0 } },
        ],
        'trigger.details.blockedIntegrationIds': { $ne: integration._id },
      }).lean().exec()
    ]);
  } catch (e: any) {
    logger.error('Failed to calculate prompt or load tools integrations', e);
    res.status(500).json({ message: 'Could not calculate prompt or load tools integrations' }).end();
    return;
  }

  const tools = toolsIntegrations.map(tool => ({
    type: 'function',
    description: tool.trigger.details.description,
    parameters: tool.trigger.details.parameters,
    function: {
      name: tool.trigger.details.name,
      description: tool.trigger.details.description,
      parameters: tool.trigger.details.parameters,
    }
  }));

  try {
    const chatOptions = {
      model: options.model || integration.target.details.model || source.metadata.defaultModel,
      temperature: options.temperature || integration.target.details.temperature,
      top_p: options.top_p || integration.target.details.top_p,
      frequency_penalty: options.frequency_penalty || integration.target.details.frequency_penalty,
      presence_penalty: options.presence_penalty || integration.target.details.presence_penalty,
      stop: options.stop || integration.target.details.stop,
      messages: initialMessages.concat(options.messages).map(msg => typeof msg === 'string' ? { role: 'user', content: msg } : msg),
      response_format: options.response_format || integration.target.details.response_format,
      tools,
    };

    // Custom function to execute function calls for this controller
    const executeFunctionCallsHandler = async (
      functionCalls: ChatCompletionService.FunctionCall[],
      ...args: any[]
    ) => {
      return executeFunctionCalls(
        functionCalls,
        toolsIntegrations,
        integration.tenant,
        args[0] // sendSSE if provided
      );
    };

    if (useSSE) {
      // Use the shared streaming chat completion handler
      await ChatCompletionService.handleStreamingChatCompletion(
        req,
        res,
        aiService,
        chatOptions,
        integration.kind[1],
        executeFunctionCallsHandler,
        []
      );
    } else {
      // Use the shared non-streaming chat completion handler
      await ChatCompletionService.handleNonStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCallsHandler,
        []
      );
    }
  } catch (error) {
    logger.error('Error processing AI chat completion', error);
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Error processing AI chat completion' })}\n\n`);
      res.end();
    } else {
      // Regular error response
      res.status(500).json({ message: 'Error processing AI chat completion' }).end();
    }
  }
}