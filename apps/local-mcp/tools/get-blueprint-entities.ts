import { z } from 'zod';
import type { ToolRegistration } from './types';

/**
 * Tool: Get Blueprint Entities
 * Fetch entities from a specific blueprint
 */
export const registerGetBlueprintEntities: ToolRegistration = (server, context) => {
  server.registerTool(
    'get-blueprint-entities',
    {
      title: 'Get Blueprint Entities',
      description: 'Fetch entities from a specific blueprint',
      inputSchema: {
        blueprintId: z.string().describe('The blueprint ID'),
        limit: z.number().optional().describe('Maximum number of entities to return'),
      },
      outputSchema: {
        entities: z.array(z.any()),
        count: z.number(),
      }
    },
    async ({ blueprintId, limit }) => {
      await context.ensureAuthenticated();
      
      const entities = await context.sdk.blueprints.entitiesOf(blueprintId).getList({
        $limit: limit || 100
      });
      
      const output = {
        entities,
        count: entities.length
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
};
