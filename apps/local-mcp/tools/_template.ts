import { z } from 'zod';
import type { ToolRegistration } from './types';

/**
 * Tool: [Tool Name]
 * [Brief description of what this tool does]
 */
export const register[ToolName]: ToolRegistration = (server, context) => {
  server.registerTool(
    'tool-name',  // Tool ID in kebab-case
    {
      title: 'Tool Name',  // Display name
      description: 'What this tool does',
      inputSchema: {
        // Define your input parameters here
        // Example:
        // param1: z.string().describe('Description of param1'),
        // param2: z.number().optional().describe('Optional parameter'),
      },
      outputSchema: {
        // Define your output structure here
        // Example:
        // result: z.string(),
        // count: z.number(),
      }
    },
    async (params) => {
      // 1. Ensure authentication
      await context.ensureAuthenticated();
      
      // 2. Use the Qelos SDK to fetch/modify data
      // const data = await context.sdk.someMethod(params.param1);
      
      // 3. Prepare your output
      const output = {
        // Your output data here
      };
      
      // 4. Return formatted response
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
};
