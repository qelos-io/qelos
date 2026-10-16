import { DEFAULT_AI_MODEL_BY_PROVIDER, getProviderFromSourceKind } from '@qelos/global-types';
import { AIMessageTemplates } from '../services/ai-message-templates';
import { createAIService } from '../services/ai-service';
import {
  BlueprintPlanItem,
  extractJson,
  normalizeBlueprint,
  parseBlueprintPlan,
} from '../services/blueprint-generation';
import logger from '../services/logger';

function getDefaultModelForSource(source) {
  const provider = getProviderFromSourceKind(source.kind);
  return provider ? DEFAULT_AI_MODEL_BY_PROVIDER[provider] : DEFAULT_AI_MODEL_BY_PROVIDER.openai;
}

const describePlan = (plan: BlueprintPlanItem[]) =>
  plan
    .map((item) => `- ${item.identifier} (${item.name}): ${item.purpose || 'no description'}${item.relatesTo.length ? ` - points at: ${item.relatesTo.join(', ')}` : ''}`)
    .join('\n');

export async function createBlueprintUsingAI(req, res) {
  const tenant = req.headers.tenant;

  if (!req.body.prompt) {
    res.status(400).json({ message: 'Missing prompt' }).end();
    return;
  }

  const aiService = createAIService(req.source, req.sourceAuthentication);
  const model = req.source.metadata.defaultModel || getDefaultModelForSource(req.source);
  const loggingContext = {
    tenant,
    userId: req.user?._id?.toString(),
    workspaceId: req.workspace?._id?.toString(),
  };
  const complete = (messages) =>
    aiService.createChatCompletion({ model, messages, stream: false, loggingContext });

  const planResponse = await complete([
    AIMessageTemplates.getNoCodeBlueprintsSystemMessage(),
    { role: 'user', content: `App idea: ${req.body.prompt}` },
  ]);
  const plan = parseBlueprintPlan(planResponse.choices[0].message.content);

  if (!plan.length) {
    res.status(422).json({ message: 'The AI did not suggest any blueprint for this idea. Try describing the app in more detail.' }).end();
    return;
  }

  const identifiers = plan.map((item) => item.identifier);
  const planDescription = describePlan(plan);

  // One blueprint failing (bad JSON, a timeout) should not lose the others; it gets one retry first.
  const generateOne = async (item: BlueprintPlanItem) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await complete(
          AIMessageTemplates.getBlueprintGenerationMessages(`${item.identifier} (${item.name}): ${item.purpose}`, planDescription, req.body.prompt),
        );
        return normalizeBlueprint(extractJson(response.choices[0].message.content), identifiers, item);
      } catch (error) {
        if (attempt === 1) {
          logger.warn(`blueprint generation failed for "${item.identifier}": ${error?.message}`);
        }
      }
    }
    return null;
  };

  const generated = (await Promise.all(plan.map(generateOne))).filter(Boolean);

  if (!generated.length) {
    res.status(502).json({ message: 'The AI answered, but none of the blueprints could be read. Please try again.' }).end();
    return;
  }

  // Relations may only point at blueprints that were actually generated.
  const generatedIdentifiers = new Set(generated.map((blueprint) => blueprint.identifier));
  for (const blueprint of generated) {
    blueprint.relations = blueprint.relations.filter((relation) => generatedIdentifiers.has(relation.target));
  }

  res.json(generated).end();
}
