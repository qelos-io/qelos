/**
 * Tool Registry
 * 
 * Import and export all tools here.
 * Add new tools to the array to automatically register them.
 */

import { registerListWorkspaces } from './list-workspaces';
import { registerGetBlueprintEntities } from './get-blueprint-entities';
import { registerCreateBlueprintEntity } from './create-blueprint-entity';
import { registerGetAppConfig } from './get-app-config';
import type { ToolRegistration } from './types';

/**
 * All available tools
 * Add new tools to this array to register them automatically
 */
export const allTools: ToolRegistration[] = [
  registerListWorkspaces,
  registerGetBlueprintEntities,
  registerCreateBlueprintEntity,
  registerGetAppConfig,
];

// Re-export types for convenience
export type { ToolContext, ToolRegistration } from './types';
