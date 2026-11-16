import { createAIService } from "../ai-service";
import logger from "../logger";
import { createScript, getScript, getScripts, updateScript } from "../no-code-service";
import {
  buildIdentifier,
  filterItems,
  findItem,
  importPathOf,
  isValidIdentifier,
  summarizeItem,
  typeOf,
  type ScriptItem,
  type ScriptItemType,
} from "../scripts-tools.service";

/**
 * Components (.vue) and scripts (.ts/.js modules) share one folder-like space: an identifier is a path
 * such as `utils/format-price` or `products/ProductCard`. A component or script imports another script with
 * `import { formatPrice } from './utils/format-price.ts'`.
 */

const VUE_RULES = `You are a Vue.js developer. Use Composition API with <script setup>. Make the best UX and design possible.
Use Element-Plus components for consistent UI.
Use the best practices for Vue.js development.
Always use closing tags for custom components. e.g. <my-component></my-component>.
Use v-slot only on template tags.
Shared, non-UI logic (formatting, calculations, API wrappers) belongs in scripts. Import an existing script with a relative path, e.g. import { formatPrice } from './utils/format-price.ts'. Only import scripts that are listed as available - never invent script paths.`;

const SCRIPT_RULES = `You are a TypeScript developer. Write a single ES module that runs in the browser.
Use named exports (and types) with clear names. Keep it small, pure and reusable.
It may import only other available scripts using a relative path (e.g. import { x } from './utils/x.ts') and the libraries 'vue', 'vue-router', 'element-plus' and 'vue-i18n'. Never import any other package.
Do not use Node.js APIs.`;

function defineCalling(definition: { name: string; description: string; parameters: any; handler: (req: any, payload?: any) => Promise<any> }) {
  const { name, description, parameters, handler } = definition;
  return { type: 'function', name, description, parameters, function: { name, description, parameters }, handler };
}

const errorOf = (err: any) => err?.response?.data || err?.message || 'unknown error';

/** The scripts a new or edited piece of code may import, as a prompt section. */
function availableScriptsPrompt(items: ScriptItem[]) {
  const scripts = items.filter(item => typeOf(item) === 'script');
  if (!scripts.length) return 'There are no scripts yet.';
  return `Available scripts (import path - description):\n${scripts
    .map(item => `- ${importPathOf(item.identifier)}${item.description ? ` - ${item.description}` : ''}`)
    .join('\n')}`;
}

async function generateCode(req, system: string, user: string): Promise<string> {
  const { source, sourceAuthentication } = req;
  if (!source || !sourceAuthentication) {
    throw new Error('Could not generate code');
  }
  const aiService = createAIService(source, sourceAuthentication);
  const response = await aiService.createChatCompletion({
    messages: [
      { role: 'system', content: `${system}\nReturn a json object with the code. e.g. { "code": "..." }` },
      { role: 'user', content: user },
    ],
    model: source.metadata.defaultModel,
    temperature: source.metadata.defaultTemperature,
    top_p: source.metadata.defaultTopP,
    frequency_penalty: source.metadata.defaultFrequencyPenalty,
    presence_penalty: source.metadata.defaultPresencePenalty,
    stream: false,
    max_tokens: source.metadata.defaultMaxTokens,
    response_format: { type: 'json_object' },
    loggingContext: {
      tenant: req.headers.tenant,
      userId: req.user?._id?.toString(),
      workspaceId: req.workspace?._id?.toString(),
    },
  });
  return JSON.parse(response.choices[0].message.content).code;
}

const typeParameter = {
  type: 'string',
  enum: ['component', 'script'],
  description: 'Only components (Vue .vue) or only scripts (ts/js modules). Omit for both.',
};

export const getComponentsCalling = defineCalling({
  name: 'getComponents',
  description: 'List the components (Vue) and scripts (ts/js modules) of the application, organized as paths. Returns a summary of each (no source code); use getScript to read the source.',
  parameters: {
    type: 'object',
    properties: {
      type: typeParameter,
      folder: { type: 'string', description: 'Only items inside this folder, e.g. "utils" or "products".' },
      query: { type: 'string', description: 'Optional search words matched against name, path and description.' },
    },
    required: [],
  },
  handler: async (req, payload: { type?: ScriptItemType; folder?: string; query?: string } = {}) => {
    const items: ScriptItem[] = await getScripts(req.headers.tenant as string);
    return filterItems(items, payload).map(summarizeItem);
  },
});

export const searchComponentsCalling = defineCalling({
  name: 'searchComponents',
  description: 'Search existing components and scripts by name, path or description to find reusable pieces. Returns a summary of the best matches.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search phrase to match against name, path or description.' },
      limit: { type: 'number', description: 'Maximum number of results to return.', default: 10 },
      type: typeParameter,
    },
    required: ['query'],
  },
  handler: async (req, payload: { query?: string; limit?: number; type?: ScriptItemType } = {}) => {
    const items: ScriptItem[] = await getScripts(req.headers.tenant as string);
    const limit = Math.max(1, Math.min(payload.limit || 10, 50));
    const query = (payload.query || '').trim().toLowerCase();
    const matches = filterItems(items, { type: payload.type, query });

    const score = (item: ScriptItem) => {
      const name = (item.componentName || item.identifier.split('/').pop() || '').toLowerCase();
      if (name === query) return 100;
      if (name.startsWith(query)) return 75;
      if (name.includes(query)) return 50;
      return item.description?.toLowerCase().includes(query) ? 25 : 10;
    };
    return matches.sort((a, b) => score(b) - score(a)).slice(0, limit).map(summarizeItem);
  },
});

export const getScriptCalling = defineCalling({
  name: 'getScript',
  description: 'Read the source code of an existing script or component by its identifier (path), e.g. "utils/format-price" or "products/ProductCard". Use it to learn the exports of a script before importing it, or to see how a component is built.',
  parameters: {
    type: 'object',
    properties: {
      identifier: { type: 'string', description: 'Identifier (path) or name of the script or component. File extensions are ignored.' },
    },
    required: ['identifier'],
  },
  handler: async (req, payload: { identifier?: string } = {}) => {
    const tenant = req.headers.tenant as string;
    try {
      const item = findItem(await getScripts(tenant), payload.identifier || '');
      if (!item) {
        return { message: `No script or component found for "${payload.identifier}". Use getComponents to list what exists.` };
      }
      const full = await getScript(tenant, item._id as string);
      return { ...summarizeItem({ ...item, ...full }), content: full.content };
    } catch (err: any) {
      logger.log('failed to read script', errorOf(err));
      return { message: 'failed to read script', error: errorOf(err) };
    }
  },
});

export const createScriptCalling = defineCalling({
  name: 'createScript',
  description: 'Create a new script: a reusable TypeScript module (helpers, formatters, calculations, API wrappers) that components and other scripts can import. It is compiled and minified automatically. Returns its identifier and the import path to use.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'File name without extension, in kebab-case. e.g. "format-price".' },
      folder: { type: 'string', description: 'Folder to put it in, e.g. "utils", "services" or "products". Defaults to "utils".' },
      purpose: { type: 'string', description: 'What the script is for.' },
      exports: { type: 'string', description: 'The functions, constants or types it should export, with their signatures and behavior.' },
    },
    required: ['name', 'purpose', 'exports'],
  },
  handler: async (req, payload: { name?: string; folder?: string; purpose?: string; exports?: string } = {}) => {
    const tenant = req.headers.tenant as string;
    const identifier = buildIdentifier(payload.name || '', payload.folder ?? 'utils');
    if (!isValidIdentifier(identifier)) {
      return { message: 'failed to create script', error: 'Use only letters, numbers, hyphens and slashes in the name and folder.' };
    }

    try {
      const items: ScriptItem[] = await getScripts(tenant);
      if (items.some(item => typeOf(item) === 'script' && item.identifier === identifier)) {
        return { message: 'failed to create script', error: `A script "${identifier}" already exists. Use getScript to read it, or editComponent to change it.` };
      }
      const code = await generateCode(
        req,
        SCRIPT_RULES,
        `Create the script "${identifier}".
Purpose: ${payload.purpose}.
Exports: ${payload.exports}.
${availableScriptsPrompt(items)}`,
      );
      const created = await createScript(tenant, { type: 'script', identifier, description: payload.purpose, content: code });
      return { identifier: created.identifier, import: importPathOf(created.identifier) };
    } catch (err: any) {
      logger.log('failed to create script', errorOf(err));
      return { message: 'failed to create script', error: errorOf(err) };
    }
  },
});

export const createComponentCalling = defineCalling({
  name: 'createComponent',
  description: 'Create a new Vue component for the application. It may import existing scripts. Returns the created component.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name of the component. should be capitalized.' },
      folder: { type: 'string', description: 'Optional folder to organize it in, e.g. "products". The component is stored at "folder/Name".' },
      props: { type: 'object', description: 'Props of the component' },
      purpose: { type: 'string', description: 'Purpose of the component' },
      uxAndDesign: { type: 'string', description: 'UX and design of the component' },
    },
    required: ['name', 'props', 'purpose', 'uxAndDesign'],
  },
  handler: async (req, payload: { name?: string; folder?: string; props?: any; purpose?: string; uxAndDesign?: string } = {}) => {
    const { name, folder, props, purpose, uxAndDesign } = payload;
    const tenant = req.headers.tenant as string;
    const identifier = buildIdentifier(name || '', folder);
    if (!isValidIdentifier(identifier)) {
      return { message: 'failed to create component', error: 'Use only letters, numbers, hyphens and slashes in the name and folder.' };
    }
    const componentName = identifier.split('/').pop() as string;

    try {
      const items: ScriptItem[] = await getScripts(tenant);
      const code = await generateCode(
        req,
        `${VUE_RULES}\nReturn the full single-file component code.`,
        `Create a component named ${componentName}.
Props: ${JSON.stringify(props)}.
Purpose: ${purpose}.
UX and design notes: ${uxAndDesign || 'Make the best UX and design possible'}.
${availableScriptsPrompt(items)}`,
      );
      const component = await createScript(tenant, {
        type: 'component',
        identifier,
        componentName,
        description: purpose,
        content: code,
      });

      return {
        componentName: component.componentName,
        identifier: component.identifier,
      };
    } catch (err: any) {
      logger.log('failed to create component', errorOf(err));
      return { message: 'failed to create component', error: errorOf(err) };
    }
  },
});

export const editComponentCalling = defineCalling({
  name: 'editComponent',
  description: 'Edit an existing component or script of the application, found by its identifier (path) or name. Returns the updated item.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Identifier (path) or name of the existing component or script, e.g. "products/ProductCard" or "utils/format-price".' },
      props: { type: 'object', description: 'Props of the component' },
      purpose: { type: 'string', description: 'Purpose of the component' },
      uxAndDesign: { type: 'string', description: 'What to change: the request to edit.' },
    },
    required: ['name', 'uxAndDesign'],
  },
  handler: async (req, payload: { name?: string; props?: any; purpose?: string; uxAndDesign?: string } = {}) => {
    const { name, uxAndDesign } = payload;
    const tenant = req.headers.tenant as string;

    try {
      const items: ScriptItem[] = await getScripts(tenant);
      const item = findItem(items, name || '');
      if (!item) {
        return { message: 'failed to update', error: `No script or component found for "${name}". Use getComponents to list what exists.` };
      }
      const current = await getScript(tenant, item._id as string);
      const isScript = typeOf(item) === 'script';

      const code = await generateCode(
        req,
        isScript ? SCRIPT_RULES : `${VUE_RULES}\nReturn the full single-file component code.`,
        `Edit the ${isScript ? 'script' : 'component'} "${item.identifier}". Request to edit: ${uxAndDesign}.
${availableScriptsPrompt(items.filter(other => other._id !== item._id))}
Current code:
${current.content}`,
      );
      const updated = await updateScript(tenant, item._id as string, { content: code });

      return { type: typeOf(item), identifier: updated.identifier, componentName: updated.componentName };
    } catch (err: any) {
      logger.log('failed to update component', errorOf(err));
      return { message: 'failed to update', error: errorOf(err) };
    }
  },
});
