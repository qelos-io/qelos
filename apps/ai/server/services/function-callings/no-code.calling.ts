import { createAIService } from "../ai-service";
import { createComponent } from "../no-code-service";

export const createComponentCalling = {
    type: 'function',
    name: 'createComponent',
    description: 'Create a new component for the application. Returns the created component.',
    function: {
        name: 'createComponent',
        description: 'Create a new component for the application. Returns the created component.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the component. should be capitalized.' },
                props: { type: 'object', description: 'Props of the component' },
                purpose: { type: 'string', description: 'Purpose of the component' },
                uxAndDesign: { type: 'string', description: 'UX and design of the component' },
            },
            required: ['name', 'props', 'purpose', 'uxAndDesign']
        },
    },
    handler: async (req, payload = { name: '', props: {}, purpose: '', uxAndDesign: '' }) => {
        const { name, props, purpose, uxAndDesign } = payload;
        const { source, sourceAuthentication } = req;

        if (!source || !sourceAuthentication) {
          throw new Error('Could not create component');
        }

        const aiService = createAIService(source, sourceAuthentication);

        const response = await aiService.createChatCompletion({
          messages: [
            {
              role: 'system',
              content: `You are a Vue.js developer. Create a new Vue.js component for the application. Return the created component.
              Use Composition API and script setup. Make the best UX and design possible.`,
            },
            {
              role: 'user',
              content: `Create a component named ${name}. 
              Props: ${JSON.stringify(props)}.
              Purpose: ${purpose}.
              UX and design notes: ${uxAndDesign || 'Make the best UX and design possible'}.`,
            },
          ],
          model: source.metadata.defaultModel,
          temperature: source.metadata.defaultTemperature,
          top_p: source.metadata.defaultTopP,
          frequency_penalty: source.metadata.defaultFrequencyPenalty,
          presence_penalty: source.metadata.defaultPresencePenalty,
          stream: false,
          max_tokens: source.metadata.defaultMaxTokens,
          response_format: source.metadata.defaultResponseFormat,
        });
        
        const component = await createComponent(req.headers.tenant as string, {
          identifier: name,
          name,
          description: purpose,
          content: response.choices[0].message.content,
        });

        return {
          name: component.name,
        }
    }
}