import { z } from 'zod';
import type { ToolRegistration } from './types';

/**
 * Tool: List Workspaces
 * Get all workspaces from Qelos
 */
export const registerListWorkspaces: ToolRegistration = (server, context) => {
  server.registerTool(
    'list-workspaces',
    {
      title: 'List Workspaces',
      description: 'Get all workspaces from Qelos',
      inputSchema: {},
      outputSchema: {
        workspaces: z.array(z.object({
          id: z.string(),
          name: z.string(),
          labels: z.array(z.string()).optional(),
        }))
      }
    },
    async () => {
      await context.ensureAuthenticated();
      const workspaces = await context.sdk.workspaces.getList();
      
      const output = {
        workspaces: workspaces.map((ws: any) => ({
          id: ws._id,
          name: ws.name,
          labels: ws.labels || [],
        }))
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
};
