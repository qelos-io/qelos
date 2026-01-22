import { processIntegrationsChatCompletion } from "../system-agents/integrations-agent";

export const callIntegrationManagerAgentCalling = {
  type: 'function',
  name: 'call_integration_manager_agent',
  description: `Call the integration manager agent. manage all integrations and connections (a.k.a integration sources). 
      This agent can manage integrations and integration sources in your application. Use this agent when you need to build or modify your application integrations.
      when the user asks for integrations or connections - use this agent.`,
  function: {
      name: 'call_integration_manager_agent',
      description: `Call the integration editor agent. manage all integrations and connections (a.k.a integration sources). 
      This agent can manage integrations and integration sources in your application. Use this agent when you need to build or modify your application integrations.
      when the user asks for integrations or connections - use this agent.`,
      parameters: {
        type: 'object',
        properties: {
          messages: { type: 'array',
            items: { type: 'object', properties: { role: { type: 'string' }, content: { type: 'string' } }, 
            required: ['role', 'content'] },
            description: 'User messages to pass to the integrations editor agent' },
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
      const result = await processIntegrationsChatCompletion(req, null);
  
      return result;
    }
};