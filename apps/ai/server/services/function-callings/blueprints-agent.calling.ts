import { processBlueprintsChatCompletion } from "../system-agents/blueprints-agent";

export const callBlueprintsAgentCalling = {
  type: 'function',
  name: 'callBlueprintsAgent',
  description: 'Call the blueprints agent. This agent specializes in designing and evolving data models (blueprints): it can inspect existing blueprints, create new ones, and update existing entities, including fields, relations, and permissions.',
  function: {
    name: 'callBlueprintsAgent',
    description: 'Call the blueprints agent with a focused conversation about data models and entities.',
    parameters: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
          description: 'Conversation messages to pass to the blueprints agent',
        },
      },
      required: ['messages'],
    },
  },
  handler: async (req, payload: { messages: any[] }) => {
    req.aiOptions = {
      ...req.body,
      messages: payload.messages || [],
    };

    // For function call handlers, we need to use non-streaming mode
    // to get a proper result that can be returned
    const result = await processBlueprintsChatCompletion(req, null);

    return result;
  },
};
