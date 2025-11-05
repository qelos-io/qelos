import type { ResourceRegistration } from './types';

/**
 * Resource: Current User
 * Information about the authenticated user
 */
export const registerCurrentUser: ResourceRegistration = (server, context) => {
  server.registerResource(
    'current-user',
    'qelos://user/current',
    {
      title: 'Current User',
      description: 'Information about the authenticated user',
      mimeType: 'application/json'
    },
    async (uri) => {
      await context.ensureAuthenticated();
      const user = await context.sdk.authentication.getLoggedInUser();
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(user, null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );
};
