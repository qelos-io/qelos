import { IOpenAISource, OpenAITargetPayload } from "@qelos/global-types";
import logger from "../services/logger";
import { createAIService } from "../services/ai-service";
import { getSourceById } from "../services/source-service";
import { processGeneralChatCompletion } from "../services/system-agents/general-agent";
import { processPagesChatCompletion } from "../services/system-agents/pages-agent";
import { processIntegrationsChatCompletion } from "../services/system-agents/integrations-agent";

// System prompts are now imported from the service

/**
 * Middleware to get source by ID and verify permissions
 */
export async function getSourceToIntegrate(req, res, next) {
  try {
    const result = await getSourceById(req.headers.tenant, req.params.sourceId);
    
    if (result.error) {
      res.status(result.status || 500).json({ message: result.error }).end();
      return;
    }
    
    const { source, authentication } = result;

    // Store source and authentication in request
    req.source = source;
    req.sourceAuthentication = authentication;

    next();
  } catch (e: any) {
    logger.error('Failed to get source to integrate', e);
    res.status(500).json({ message: 'Could not get source to integrate' }).end();
    return;
  }
}

export async function chatCompletion(req, res) {
  await processGeneralChatCompletion(req, res);
}

export async function chatCompletionPages(req, res) {
  await processPagesChatCompletion(req, res);
}

export async function chatCompletionIntegrations(req, res) {
  await processIntegrationsChatCompletion(req, res);
}

export async function internalChatCompletion(req, res) {
  const { source, authentication, payload } = req.body as { source: IOpenAISource, authentication: any, payload: OpenAITargetPayload };
  const aiService = createAIService(source, authentication);
  try {
    const response = await aiService.createChatCompletion({
      messages: payload.messages,
      model: payload.model || source.metadata.defaultModel,
      temperature: payload.temperature || source.metadata.defaultTemperature,
      top_p: payload.top_p || source.metadata.defaultTopP,
      frequency_penalty: payload.frequency_penalty || source.metadata.defaultFrequencyPenalty,
      presence_penalty: payload.presence_penalty || source.metadata.defaultPresencePenalty,
      stream: false,
      max_tokens: payload.max_tokens || source.metadata.defaultMaxTokens,
      response_format: payload.response_format || source.metadata.defaultResponseFormat,
    })
    res.json(response).end();
  } catch {
    res.json({message: 'failed to execute chat completion'}).end();
  }
}
