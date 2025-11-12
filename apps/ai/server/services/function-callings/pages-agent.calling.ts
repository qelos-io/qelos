import { processPagesChatCompletion } from "../system-agents/pages-agent";

export const callPagesEditorAgentCalling = {
  type: 'function',
  name: 'callPagesEditorAgent',
  description: 'Call pages editor agent. This agent can create and manage pages and components in your application. It can create new pages, edit existing ones, create and deploy UI components, and add various content elements like forms, tables, and grids. The agent supports operations such as: createComponent (build reusable UI components), createPage (create new application pages), editPage (modify existing pages), createBlueprint (define data structures), getPages (find existing pages), addFreeTextToPage (add custom HTML/Vue content), addGridToPage (add card-based data displays), addTableToPage (add tabular data displays), and addFormToPage (add data entry forms). Use this agent when you need to build or modify your application UI.',
  parameters: {},
  function: {
    name: 'callPagesEditorAgent',
    description: 'Call pages editor agent. This agent can create and manage pages and components in your application. It can create new pages, edit existing ones, create and deploy UI components, and add various content elements like forms, tables, and grids. The agent supports operations such as: createComponent (build reusable UI components), createPage (create new application pages), editPage (modify existing pages), createBlueprint (define data structures), getPages (find existing pages), addFreeTextToPage (add custom HTML/Vue content), addGridToPage (add card-based data displays), addTableToPage (add tabular data displays), and addFormToPage (add data entry forms). Use this agent when you need to build or modify your application UI.',
    parameters: {
      type: 'object',
      properties: {
        messages: { type: 'array',
          items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } }, 
          required: ['role', 'content'] },
          description: 'User messages to pass to the pages editor agent' },
      },
      required: ['messages']
    },
  },
  handler: async (req, payload: { messages: any[] }) => {
    req.aiOptions = {
      ...req.body,
      messages: payload.messages || []
    }

    const result = await processPagesChatCompletion(req, null);

    return result;
  }
} 