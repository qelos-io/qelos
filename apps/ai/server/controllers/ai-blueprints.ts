import { AIMessageTemplates } from "../services/ai-message-templates";
import { createAIService } from "../services/ai-service";
import { createBlueprint } from "../services/no-code-service";

export async function createBlueprintUsingAI(req, res) {
  const tenant = req.headers.tenant;

  if (!req.body.prompt) {
    res.status(400).json({ message: 'Missing prompt' }).end();
    return;
  }

  const aiService = createAIService(req.source, req.sourceAuthentication);

  const response = await aiService.createChatCompletion({ 
    model: req.source.metadata.defaultModel || 'gpt-4o',
    messages: [
      AIMessageTemplates.getNoCodeBlueprintsSystemMessage(),
      {
        role: 'user',
        content: `describe the list of blueprints (db models) for the following app idea: ${req.body.prompt}`
      }
    ],
    stream: false
  });


  const blueprintsDescriptions = response.choices[0].message.content.split('\n');


  const suggestedBlueprints = await Promise.all(blueprintsDescriptions.map(async (blueprintDescription) => {
    const blueprintResponse = await aiService.createChatCompletion({
      model: req.source.metadata.defaultModel || 'gpt-4o',
      messages: AIMessageTemplates.getBlueprintGenerationMessages(blueprintDescription, response.choices[0].message.content, req.body.prompt),
      stream: false
    });

    const blueprintProperties = blueprintResponse.choices[0].message.content;
    return JSON.parse(blueprintProperties);
  }));


  res.json(suggestedBlueprints).end();
} 