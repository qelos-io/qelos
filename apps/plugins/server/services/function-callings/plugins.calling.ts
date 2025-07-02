import Plugin from "../../models/plugin";

export const createPageCalling = {
    type: 'function',
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
              description: 'HTML content of the page. Optional. Try to be creative and make it look good. you can use vue.js template syntax (only. no script tags or anything else) inside the html.'
             },
        },
        required: ['title', 'targetAudience'],
    },
    function: {
        name: 'createPage',
        description: 'Create a new page for the application. Returns the created page.',
    },
    handler: async (req, payload = { title: '', description: '', targetAudience: 'guest', navBarPosition: 'top', html: '' }) => {
        const tenant = req.headers.tenant;

        if (typeof payload.title !== 'string') {
          throw new Error('title must be a string');
        }

        if (typeof payload.description !== 'string') {
          throw new Error('description must be a string');
        }

        if (typeof payload.targetAudience !== 'string' || !['guest', 'user', 'admin'].includes(payload.targetAudience)) {
          throw new Error('targetAudience must be one of: guest, user, admin');
        }

        const roles = (payload.targetAudience === 'guest' || payload.targetAudience === 'user') ? ['*'] : ['admin'];

        const plugin = new Plugin({
            tenant,
            name: payload.title,
            description: payload.description,
            microFrontends: [
              {
                active: true,
                opened: true,
                name: payload.title,
                description: payload.description,
                guest: payload.targetAudience === 'guest',
                roles,
                use: 'plain',
                structure: payload.html?.trim() || '<h1>WELCOME TO ' + payload.title + '</h1>',
                searchQuery: false,
                searchPlaceholder: '',
                requirements: [],
                route: {
                  navBarPosition: payload.navBarPosition,
                  name: payload.title.replace(/\s/g, '-').toLowerCase() + '-page',
                  path: payload.title.replace(/\s/g, '-').toLowerCase(),
                }
              }
            ]
        });

        return plugin.save();
    }
}
