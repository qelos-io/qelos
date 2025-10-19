import { createAIService } from "../ai-service";
import logger from "../logger";
import { createComponent, getComponent, getComponents, updateComponent } from "../no-code-service";

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

      try {
        const response = await aiService.createChatCompletion({
          messages: [
            {
              role: 'system',
              content: `You are a Vue.js developer. Your task is to create a Vue.js component based on the provided specifications.
              Use Composition API with <script setup>. Make the best UX and design possible.
              Use Element-Plus components for consistent UI.
              Use the best practices for Vue.js development.
              Always use closing tags for custom components. e.g. <my-component></my-component>.
              Use v-slot only on template tags.
              Return a json object with the component code and the component name. e.g. { name: 'MyComponent', code: '...' }`,
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
          response_format: { type: 'json_object' },
        });
        const component = await createComponent(req.headers.tenant as string, {
          identifier: name,
          componentName: name,
          description: purpose,
          content: JSON.parse(response.choices[0].message.content).code,
        });

        return {
          componentName: component.componentName,
        }
      } catch (err: any) {
        logger.log('failed to create component', err?.response?.data || err?.message || 'unknown error');
        return {
          message: 'failed to create component',
          error: err?.response?.data || err?.message || 'unknown error',
        }
      }
  }
}

export const editComponentCalling = { 
  type: 'function',
  name: 'editComponent',
  description: 'Edit an existing component for the application. Returns the edited component.',
  function: {
      name: 'editComponent',
      description: 'Edit an existing component for the application. Returns the edited component.',
      parameters: {
          type: 'object',
          properties: {
              componentId: { type: 'string', description: 'ID of the component to edit' },
              requestToEdit: { type: 'string', description: 'prompt to edit the component' },
          },
          required: ['componentId', 'requestToEdit']
      },
  },
  handler: async (req, payload = { componentId: '', requestToEdit: '' }) => {
    const { componentId, requestToEdit } = payload;
    const { source, sourceAuthentication } = req;        

    if (!source || !sourceAuthentication) {
      throw new Error('Could not edit component');
    }

    const aiService = createAIService(source, sourceAuthentication);
    const componentData = await getComponent(req.headers.tenant as string, componentId);

    try {
      const response = await aiService.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: `You are a Vue.js developer. Your task is to create a Vue.js component based on the provided specifications.
            Use Composition API with <script setup>. Make the best UX and design possible.
            Use Element-Plus components for consistent UI.
            Use the best practices for Vue.js development.
            Always use closing tags for custom components. e.g. <my-component></my-component>.
            Use v-slot only on template tags.
            Return a json object with the component code. e.g. { code: '...' }`,
          },
          {
            role: 'user',
            content: `Edit the component.  Request to edit: ${requestToEdit}.
            Current component code:
${componentData.content}`,
          },
        ],
        model: source.metadata.defaultModel,
        temperature: source.metadata.defaultTemperature,
        top_p: source.metadata.defaultTopP,
        frequency_penalty: source.metadata.defaultFrequencyPenalty,
        presence_penalty: source.metadata.defaultPresencePenalty,
        stream: false,
        max_tokens: source.metadata.defaultMaxTokens,
        response_format: { type: 'json_object' },
      });
      const component = await updateComponent(req.headers.tenant as string, componentId, {
        content: JSON.parse(response.choices[0].message.content).code,
      });

      return {
        componentName: component.componentName,
      }
    } catch (err: any) {
      logger.log('failed to update component', err?.response?.data || err?.message || 'unknown error');
      return {
        message: 'failed to update component',
        error: err?.response?.data || err?.message || 'unknown error',
      }
    }
  }
}


export const getComponentsCalling = {
    type: 'function',
    name: 'getComponents',
    description: 'Get list of components for the application. Returns an array of components.',
    parameters: {},
    function: {
      name: 'getComponents',
      description: 'Get list of components for the application. Returns an array of components.',
     }, 
    handler: async (req) => {
      const tenant = req.headers.tenant;
      const list = await getComponents(tenant);

      return list;
    }
} 