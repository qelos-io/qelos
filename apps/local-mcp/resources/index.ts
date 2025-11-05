/**
 * Resource Registry
 * 
 * Import and export all resources here.
 * Add new resources to the array to automatically register them.
 */

import { registerCurrentUser } from './current-user';
import type { ResourceRegistration } from './types';

/**
 * All available resources
 * Add new resources to this array to register them automatically
 */
export const allResources: ResourceRegistration[] = [
  registerCurrentUser,
];

// Re-export types for convenience
export type { ResourceContext, ResourceRegistration } from './types';
