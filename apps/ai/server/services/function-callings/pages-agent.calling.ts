import { processPagesChatCompletion } from "../system-agents/pages-agent";

export const callPagesEditorAgentCalling = {
  type: 'function',
  name: 'callPagesEditorAgent',
  description: 'Call pages editor agent. This agent can create and manage pages and components in your application. It can create new pages, edit existing ones, create and deploy UI components, and add various content elements like forms, tables, and grids. Use this agent when you need to build or modify your application UI. If you received a context to help this agent identify the relevant page, plugin, component, etc - add it to the messages array.',
  parameters: {},
  function: {
    name: 'callPagesEditorAgent',
    description: 'Call pages editor agent. This agent can create and manage pages and components in your application. It can create new pages, edit existing ones, create and deploy UI components, and add various content elements like forms, tables, and grids. Use this agent when you need to build or modify your application UI. If you received a context to help this agent identify the relevant page, plugin, component, etc - add it to the messages array.',
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
    // Separate system messages from regular messages
    const systemMessages = payload.messages?.filter(msg => msg.role === 'system') || [];
    const userMessages = payload.messages?.filter(msg => msg.role !== 'system') || [];
    
    req.aiOptions = {
      ...req.body,
      messages: userMessages,
      // Add system messages to pre_messages so they're handled as instructions
      pre_messages: (req.body.pre_messages || []).concat(systemMessages)
    }

    // For function call handlers, we need to use non-streaming mode
    // to get a proper result that can be returned
    const result = await processPagesChatCompletion(req, null);

    return result;
  }
} 