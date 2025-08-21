import { processPagesChatCompletion } from "../pages-chat-completion-service";

export const callPagesAgentCalling = {
  type: 'function',
  name: 'callPagesAgent',
  description: 'Call pages agent. This agent helps you create and manage pages and components in your application. It can create new pages, edit existing ones, create UI components, and add various content elements like forms, tables, and grids. The agent supports operations such as: createComponent (build reusable UI components), createPage (create new application pages), editPage (modify existing pages), createBlueprint (define data structures), getPages (find existing pages), addFreeTextToPage (add custom HTML/Vue content), addGridToPage (add card-based data displays), addTableToPage (add tabular data displays), and addFormToPage (add data entry forms). Use this agent when you need to build or modify your application UI.',
  parameters: {},
  function: {
    name: 'callPagesAgent',
    description: 'Call pages agent. This agent helps you create and manage pages and components in your application. It can create new pages, edit existing ones, create UI components, and add various content elements like forms, tables, and grids. The agent supports operations such as: createComponent (build reusable UI components), createPage (create new application pages), editPage (modify existing pages), createBlueprint (define data structures), getPages (find existing pages), addFreeTextToPage (add custom HTML/Vue content), addGridToPage (add card-based data displays), addTableToPage (add tabular data displays), and addFormToPage (add data entry forms). Use this agent when you need to build or modify your application UI.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'User prompt to filter pages by name or description' },
      },
      required: ['prompt']
    },
  },
  handler: async (req, payload = { prompt: '' }) => {
    const tenant = req.headers.tenant;
    const result = await processPagesChatCompletion(req, null);

    return result;
  }
} 