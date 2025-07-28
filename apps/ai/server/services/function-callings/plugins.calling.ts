import { createPlugin } from "../plugins-service-api";

export const createPageCalling = {
    type: 'function',
    name: 'createPage',
    description: 'Create a new page for the application. Returns the created page.',
    function: {
        name: 'createPage',
        description: 'Create a new page for the application. Returns the created page.',
        parameters: {
          type: 'object',
          properties: {
              title: { type: 'string', description: 'Title of the page' },
              description: { type: 'string', description: 'Description of the page. Optional.' },
              targetAudience: { type: 'string', enum: ['guest', 'user', 'admin'], default: 'guest', description: 'Target audience for the page. Can be guest, user or admin. go for "user" if not specified.' },
              navBarPosition: { type: 'string', enum: ['top', 'bottom', 'user-dropdown', false], default: 'top', description: 'Position of the page in the navigation bar. Can be top, bottom, user-dropdown or false. go for "top" if not specified.' },
              html: { type: 'string',
                description: `HTML content of the page. Optional.
Try to be creative and make it look good. you can use vue.js template syntax (only. no script tags or anything else) inside the html, you can use any Element-Plus component.
You can also use any component created by the "createComponent" function.`
              },
              requirements: {
                type: 'array', 
                description: `Requirements for the page. Optional. Will be handled by pinia as page state. Consider to use helper tools to create a requirement object, such as "getHTTPRequirementForPage"`, 
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', description: 'Key of the requirement. This key can be used inside the template.' },
                    fromHTTP: { type: 'object', description: 'HTTP requirement. Optional. This object will be passed to an http request method.' },
                    fromCrud: { type: 'object', description: 'CRUD requirement. Optional.' },
                    fromBlueprint: { type: 'object', description: 'Blueprint requirement. Optional. can be used to get data from a blueprint entity/entities.' },
                    fromData: { type: 'object', description: 'Data requirement. Optional. This is a JSON object that will be passed to the page.' },
                  },  
                  required: ['key']
                }
              },
          },
          required: ['title', 'targetAudience'],
      },
    },
    handler: async (req, payload = { title: '', description: '', targetAudience: 'guest', navBarPosition: 'top', html: '', requirements: [] }) => {
      const tenant = req.headers.tenant;

        if (typeof payload.title !== 'string') {
          throw new Error('title must be a string');
        }

        if (typeof payload.targetAudience !== 'string' || !['guest', 'user', 'admin'].includes(payload.targetAudience)) {
          throw new Error('targetAudience must be one of: guest, user, admin');
        }

        const roles = (payload.targetAudience === 'guest' || payload.targetAudience === 'user') ? ['*'] : ['admin'];

        const plugin = await createPlugin(tenant, req.headers.tenanthost, {
            name: payload.title,
            description: payload.description || '',
            microFrontends: [
              {
                active: true,
                opened: true,
                name: payload.title,
                description: payload.description || '',
                guest: payload.targetAudience === 'guest',
                roles,
                use: 'plain',
                structure: payload.html?.trim() || '<h1>WELCOME TO ' + payload.title + '</h1>',
                searchQuery: false,
                searchPlaceholder: '',
                requirements: payload.requirements || [],
                route: {
                  navBarPosition: payload.navBarPosition,
                  name: payload.title.replace(/\s/g, '-').toLowerCase() + '-page',
                  path: payload.title.replace(/\s/g, '-').toLowerCase(),
                }
              }
            ]
        });

        return plugin;
    }
}

export const getHTTPRequirementForPageCalling = {
    type: 'function',
    name: 'getHTTPRequirementForPage',
    description: 'Get HTTP requirement for page. Returns the requirement object. This is used to create a requirement for a page that will be loaded from an HTTP request on the client side when page is loaded.',
    function: {
        name: 'getHTTPRequirementForPage',
        description: 'Get HTTP requirement for page. Returns the requirement object. This is used to create a requirement for a page that will be loaded from an HTTP request on the client side when page is loaded.',
        parameters: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'Key of the requirement' },
                url: { type: 'string', description: 'URL of the requirement.' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Method of the requirement' },
                query: { type: 'object', description: 'Query of the requirement' },
            },
            required: ['key', 'url', 'method']
        },
    },
    handler: async (req, payload = { key: '', url: '', method: 'GET', query: {} }) => {
        const { key, url, method, query } = payload;

        return {
          key,
          fromHTTP: {
            uri: url?.startsWith('http') ? url : ('https://' + url),
            method,
            query,
          }
        }
    }
}