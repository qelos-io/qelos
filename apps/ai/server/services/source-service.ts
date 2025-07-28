import logger from "./logger";
import { getSourceAuthentication } from "./plugins-service-api";

/**
 * Gets a source by ID and verifies permissions
 */
export async function getSourceById(tenant: string, sourceId: string) {
  try {
    // Get source data from plugins service
    const sourceData = await getSourceAuthentication(tenant, sourceId);
    
    if (!sourceData || !sourceData.authentication) {
      return { error: 'Source not found', status: 404 };
    }

    return { 
      source: sourceData,
      authentication: sourceData.authentication
    };
  } catch (e: any) {
    logger.error('Failed to get source by ID', e);
    return { error: 'Could not get source', status: 500 };
  }
}

/**
 * Verifies if a user has the required roles/permissions for a source
 */
export function verifyUserPermissions(user: any, sourceDetails: any) {
  const { roles, workspaceRoles, workspaceLabels } = sourceDetails || {};

  if (roles && roles?.length > 0) {
    if (!roles.some(role => user.roles.includes(role))) {
      return { error: 'User does not have required roles', status: 403 };
    }
  }

  if (workspaceRoles && workspaceRoles?.length > 0) {
    if (!workspaceRoles.some(role => user.workspace.roles.includes(role))) {
      return { error: 'User does not have required workspace roles', status: 403 };
    }
  }

  if (workspaceLabels && workspaceLabels?.length > 0) {
    if (!workspaceLabels.some(label => user.workspace.labels.includes(label))) {
      return { error: 'User does not have required workspace labels', status: 403 };
    }
  }

  return { success: true };
}