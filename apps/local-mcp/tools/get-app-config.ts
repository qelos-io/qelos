import { z } from 'zod';
import type { ToolRegistration } from './types';

/**
 * Tool: Get App Configuration
 * Retrieve application configuration
 */
export const registerGetAppConfig: ToolRegistration = (server, context) => {
  server.registerTool(
    'get-app-config',
    {
      title: 'Get App Configuration',
      description: 'Retrieve application configuration',
      inputSchema: {},
      outputSchema: {
        config: z.any(),
      }
    },
    async () => {
      await context.ensureAuthenticated();
      
      const config = await context.sdk.appConfigurations.getAppConfiguration();
      
      const output = { config };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
};
