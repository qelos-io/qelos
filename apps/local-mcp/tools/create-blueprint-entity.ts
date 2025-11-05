import { z } from 'zod';
import type { ToolRegistration } from './types';

/**
 * Tool: Create Blueprint Entity
 * Create a new entity in a blueprint
 */
export const registerCreateBlueprintEntity: ToolRegistration = (server, context) => {
  server.registerTool(
    'create-blueprint-entity',
    {
      title: 'Create Blueprint Entity',
      description: 'Create a new entity in a blueprint',
      inputSchema: {
        blueprintId: z.string().describe('The blueprint ID'),
        data: z.record(z.any()).describe('Entity data as key-value pairs'),
      },
      outputSchema: {
        id: z.string(),
        success: z.boolean(),
      }
    },
    async ({ blueprintId, data }) => {
      await context.ensureAuthenticated();
      
      const entity = await context.sdk.blueprints.entitiesOf(blueprintId).create(data);
      
      const output = {
        id: entity.identifier,
        success: true
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
};
