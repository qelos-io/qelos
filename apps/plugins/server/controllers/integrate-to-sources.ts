import IntegrationSource from "../models/integration-source";
import { getEncryptedSourceAuthentication } from "../services/source-authentication-service";
import { IntegrationSourceKind } from "@qelos/global-types";
import { createAIService } from "../services/ai-service";
import { AIMessageTemplates } from "../services/ai-message-templates";
import { AIResponseParser } from "../services/ai-response-parser";

export async function getIntegrationSource(req, res, next) {
  try {
    const source = await IntegrationSource
      .findOne({ _id: req.params.sourceId, tenant: req.headers.tenant })
      .lean()
      .exec()

    if (!source) {
      res.status(404).end();
      return;
    }

    req.integrationSource = source;
    req.integrationSourceAuthentication = await getEncryptedSourceAuthentication(req.headers.tenant, source.kind, source.authentication);

    next();
  } catch {
    res.status(500).json({ message: 'could not get integration source' }).end();
  }
}

export async function validateChatSources(req, res, next) {
  if (req.integrationSource.kind !== IntegrationSourceKind.OpenAI) {
    res.status(400).json({ message: 'integration source is not openai' }).end();
    return;
  }

  next();
}

export async function chatCompletion(req, res) {
  try {
    const aiService = createAIService(req.integrationSource.kind, req.integrationSourceAuthentication);

    const { model = 'gpt-4o', messages, temperature = 0.7, top_p = 0.9, frequency_penalty = 0.2, presence_penalty = 0.2 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        message: 'messages array is required and must not be empty'
      });
    }

    const response = await aiService.chatCompletion({
      model,
      messages,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty
    });

    return res.json(response).end();
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing AI chat completion',
      error: errorObj.response?.data || error
    });
  }
}

export async function noCodeMicroFrontendsCompletion(req, res) {
  try {
    const aiService = createAIService(req.integrationSource.kind, req.integrationSourceAuthentication);

    const { model = 'gpt-4o', prompt, existingStructure, existingRequirements } = req.body;

    if (!prompt) {
      res.status(400).json({
        message: 'missing prompt'
      }).end();
      return;
    }
    
    // Determine if we should only return structure and requirements or the full schema
    const isPartialUpdate = existingStructure !== undefined && existingRequirements !== undefined;
    
    // Get the messages from the template service
    const messages = AIMessageTemplates.getNoCodeMicroFrontendsMessages({
      prompt,
      existingStructure,
      existingRequirements
    });

    // Use streaming to ensure we get the complete response
    const stream = await aiService.streamChatCompletion({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
      max_tokens: 4000, // Ensure we get a complete response
      response_format: { type: 'json_object' }
      // Note: OpenAI API currently only supports basic json_object type
      // The detailed schema is defined in the system prompt and our JSON schema constants
    });

    // Parse the streamed response using our response parser
    const parsedContent = await AIResponseParser.parseStreamedResponse(stream, {
      isPartialUpdate,
      existingStructure,
      existingRequirements
    });
    
    // The AIResponseParser has already handled all the parsing logic
    // and returned the appropriate response based on isPartialUpdate
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
      res.status(400).json({
        message: 'missing prompt'
      }).end();
      return;
    }

    // Create messages for the blueprint list request
    const messages = [
      AIMessageTemplates.getNoCodeBlueprintsSystemMessage(),
      {
        role: 'user',
        content: `what blueprints do i need to have in my database according to the described app:
${prompt}.`
      }
    ];

    // Get the list of blueprints
    const blueprintsListRes = await aiService.chatCompletion({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2
    });

    const blueprintsList = blueprintsListRes.choices[0].message.content || '';

    console.log(blueprintsList);

    const blueprints = await Promise.all(blueprintsList.split('\n').filter(line => line.trim()).map(async (blueprintDescription) => {
      // Get the blueprint generation messages from the template service
      const blueprintMessages = AIMessageTemplates.getBlueprintGenerationMessages(blueprintDescription);

      // Generate the blueprint using the AI service
      const response = await aiService.chatCompletion({
        model,
        messages: blueprintMessages,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
        stream: false,
        response_format: { type: "json_object" }
      });
      
      // Parse the response using the response parser
      try {
        return JSON.parse(response.choices[0].message.content || '{}');
      } catch (e) {
        console.error('Error parsing blueprint JSON:', e);
        return null;
      }
    }));
    
    // Filter out any null results
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

    if (!(prompt && trigger && target && kind?.length === 2)) {
      res.status(400).json({
        message: 'missing required data'
      }).end();
      return;
    }
    
    // Get the messages from the template service
    const messages = AIMessageTemplates.getNoCodeIntegrationsMessages({
      prompt,
      trigger,
      target,
      kind
    });

    const response = await aiService.chatCompletion({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2
    });

    return res.json(response).end();
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing AI chat completion',
      error: errorObj.response?.data || error
    });
  }
}