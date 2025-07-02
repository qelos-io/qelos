import IntegrationSource from "../models/integration-source";
import { getEncryptedSourceAuthentication } from "../services/source-authentication-service";
import { IntegrationSourceKind } from "@qelos/global-types";
import { createAIService } from "../services/ai-service";
import { AIMessageTemplates } from "../services/ai-message-templates";
import { AIResponseParser } from "../services/ai-response-parser";
import logger from "../services/logger";
import { editorsFunctionCallings } from "../services/function-callings";
import * as ChatCompletionService from "../services/chat-completion-service";

// Using parseFunctionArguments from ChatCompletionService

// Using createFunctionResult from ChatCompletionService

// Using FunctionCall interface from ChatCompletionService

// Helper function to execute function calls specific to this controller
async function executeFunctionCalls(
  functionCalls: ChatCompletionService.FunctionCall[],
  req: any,
  sendSSE?: ChatCompletionService.SSEHandler,
  eventPrefix: string = ''
): Promise<any[]> {
  const functionResults = [];
  
  if (sendSSE && functionCalls.length > 0) {
    sendSSE({ 
      type: `${eventPrefix}function_calls_detected`, 
      functionCalls 
    });
  }
  
  for (const functionCall of functionCalls) {
    try {
      const functionName = functionCall.function.name;
      const functionHandler = editorsFunctionCallings[functionName];
      
      if (functionHandler && typeof functionHandler.handler === 'function') {
        if (sendSSE) {
          sendSSE({ 
            type: `${eventPrefix}function_executing`, 
            functionCall 
          });
        }

        const parsedArgs = ChatCompletionService.parseFunctionArguments(functionCall.function.arguments);
        const result = await functionHandler.handler(req, parsedArgs);

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
          error: `Function ${functionName} not found or has no handler`
        }));
      }
    } catch (error) {
      logger.error(`Error executing function call:`, error);
      functionResults.push(ChatCompletionService.createFunctionResult(functionCall, {
        error: 'Function execution failed'
      }));
    }
  }
  
  return functionResults;
}

export async function getIntegrationSource(req, res, next) {
  try {
    const source = await IntegrationSource
      .findOne({ _id: req.params.sourceId, tenant: req.headers.tenant })
      .lean()
      .exec();

    if (!source) {
      res.status(404).end();
      return;
    }

    req.integrationSource = source;
    req.integrationSourceAuthentication = await getEncryptedSourceAuthentication(req.headers.tenant, source.kind, source.authentication);

    next();
  } catch (e: any) { // Typed error for better access to message
    logger.error("Error in getIntegrationSource:", e.message, e); // Use your logger
    res.status(500).json({ message: 'Could not get integration source' }).end();
  }
}

export async function validateChatSources(req, res, next) {
  // Allow both OpenAI and ClaudeAi
  if (req.integrationSource.kind !== IntegrationSourceKind.OpenAI &&
    req.integrationSource.kind !== IntegrationSourceKind.ClaudeAi) {
    res.status(400).json({ message: 'Integration source kind must be OpenAI or ClaudeAI' }).end();
    return;
  }
  next();
}

export async function chatCompletion(req, res) {
  try {
    const aiService = createAIService(req.integrationSource.kind, req.integrationSourceAuthentication);
    const { model = 'gpt-4o', messages, temperature = 0.7, top_p = 0.9, frequency_penalty = 0.2, presence_penalty = 0.2, stream = false } = req.body;
    const useSSE = stream === true || req.query.stream === 'true';

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ message: 'messages array is required and must not be empty' });
      return;
    }

    // Prepare tools for function calling
    const tools = Object.values(editorsFunctionCallings).map(data => ({
      type: data.type,
      function: {
        name: data.name,
        description: data.description,
        parameters: data.parameters
      }
    }));

    // Prepare chat options
    const chatOptions = {
      model,
      messages,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      stream: useSSE,
      tools
    };

    if (useSSE) {
      // Use the shared streaming chat completion handler
      await ChatCompletionService.handleStreamingChatCompletion(
        req,
        res,
        aiService,
        chatOptions,
        req.integrationSource.kind,
        executeFunctionCalls,
        [req]
      );
    } else {
      // Use the shared non-streaming chat completion handler
      await ChatCompletionService.handleNonStreamingChatCompletion(
        res,
        aiService,
        chatOptions,
        executeFunctionCalls,
        [req]
      );
    }
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };
    logger.error('Error processing AI chat completion', error);
    res.status(500).json({ 
      message: errorObj.message || 'Error processing AI chat completion',
      error: errorObj.response?.data || error
    }).end();
  }
}

export async function noCodeMicroFrontendsCompletion(req, res) {
  try {
    const aiService = createAIService(req.integrationSource.kind, req.integrationSourceAuthentication);
    const { model = 'gpt-4o', prompt, existingStructure, existingRequirements } = req.body;

    if (!prompt) {
      res.status(400).json({ message: 'missing prompt' });
      return;
    }

    const isPartialUpdate = existingStructure !== undefined && existingRequirements !== undefined;
    const messages = AIMessageTemplates.getNoCodeMicroFrontendsMessages({
      prompt, existingStructure, existingRequirements
    });

    const stream = await aiService.streamChatCompletion({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      tools: Object.values(editorsFunctionCallings).map(data => ({
        type: data.type,
        function: {
          name: data.name,
          description: data.description,
          parameters: data.parameters
        }
      }))
    });

    // Pass the 'kind' to AIResponseParser
    const parsedContent = await AIResponseParser.parseStreamedResponse(
      stream,
      req.integrationSource.kind, // Pass the kind
      { isPartialUpdate, existingStructure, existingRequirements }
    );

    // Check if AIResponseParser returned an error structure
    if (parsedContent && parsedContent.error) {
      logger.error("[Controller] AIResponseParser returned an error:", parsedContent);
      return res.status(500).json({
        message: 'Failed to parse AI response from stream',
        details: parsedContent
      });
    }

    return res.json(parsedContent).end();
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing AI chat completion',
      error: errorObj.response?.data || error
    });
  }
}

export async function noCodeBlueprintsCompletion(req, res) {
  try {
    const aiService = createAIService(req.integrationSource.kind, req.integrationSourceAuthentication);
    const { model = 'gpt-4o', prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ message: 'missing prompt' });
      return;
    }

    const messages = [
      AIMessageTemplates.getNoCodeBlueprintsSystemMessage(),
      { role: 'user', content: `what blueprints do i need to have in my database according to the described app:\n${prompt}.` }
    ];

    // Get the list of blueprints
    const blueprintsListAiResponse = await aiService.chatCompletion({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2

    });

    // Use the unified 'responseContent' from AIService
    const blueprintsList = blueprintsListAiResponse.responseContent || '';


    const blueprintDescriptions = blueprintsList.split('\n').filter(line => line.trim()).map(line => line.trim());
    if (blueprintDescriptions.length === 0) {

    logger.log(blueprintsList);


      return res.json([]).end();
    }

    const blueprints = await Promise.all(blueprintDescriptions.map(async (blueprintDescription) => {
      const blueprintMessages = AIMessageTemplates.getBlueprintGenerationMessages(blueprintDescription);
      let contentToParse = '{}';
      try {
        // Request JSON for individual blueprint generation
        const individualBlueprintAiResponse = await aiService.chatCompletion({
          model,
          messages: blueprintMessages,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.2,
          stream: false,
          response_format: { type: "json_object" } // Request JSON from AIService
        });

        // Use the unified 'responseContent'
        contentToParse = individualBlueprintAiResponse.responseContent || '{}';

        const jsonMatch = contentToParse.match(/```json\s*([\s\S]*?)\s*```/s);
        if (jsonMatch && jsonMatch[1]) {
          contentToParse = jsonMatch[1].trim();
        }

        return JSON.parse(contentToParse);
      } catch (e: any) { // Typed error
        logger.error('Error parsing blueprint JSON:', e.message, { description: blueprintDescription, contentAttempted: contentToParse, originalError: e });
        return null;
      }
    }));

    const validBlueprints = blueprints.filter(blueprint => blueprint !== null);
    return res.json(validBlueprints).end();

  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing AI chat completion',
      error: errorObj.response?.data || error
    });
  }
}

export async function noCodeIntegrationsCompletion(req, res) {
  try {
    const aiService = createAIService(req.integrationSource.kind, req.integrationSourceAuthentication);
    const { model = 'gpt-4o', prompt, trigger, target, kind = [] } = req.body;

    if (!(prompt && trigger && target && Array.isArray(kind) && kind.length === 2)) {
      res.status(400).json({ message: 'missing required data or invalid kind format' });
      return;
    }

    const messages = AIMessageTemplates.getNoCodeIntegrationsMessages({
      prompt,
      trigger,
      target,
      kind
    });

    const aiServiceResponse = await aiService.chatCompletion({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2
    });

    // Sending the augmented response
    return res.json(aiServiceResponse).end();

  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing AI chat completion',
      error: errorObj.response?.data || error
    });
  }
}