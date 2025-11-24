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
const normalize = (value?: string | string[]) => {
  if (!value) return [] as string[];
  return Array.isArray(value) ? value : [value];
};

const hasMatch = (required: string[], actual: string[]) => {
  if (!required.length || required.includes('*')) return true;
  if (!actual.length) return false;
  return required.some(role => actual.includes(role));
};

/**
 * Verifies if a user has the required roles/permissions for a source
 */
export function verifyUserPermissions(user: any, sourceDetails: any) {
  const requiredRoles = normalize(sourceDetails?.roles);
  const requiredWorkspaceRoles = normalize(sourceDetails?.workspaceRoles);
  const requiredWorkspaceLabels = normalize(sourceDetails?.workspaceLabels);

  const userRoles = normalize(user?.roles);
  const userWorkspaceRoles = normalize(user?.workspace?.roles);
  const userWorkspaceLabels = normalize(user?.workspace?.labels);

  const isGuestRequest = !user?._id;

  if (isGuestRequest) {
    if (!requiredRoles.includes('guest')) {
      return { error: 'Guest access is not allowed', status: 403 };
    }
    // Guest is explicitly allowed, skip the rest of the checks since no user/workspace context exists
    return { success: true };
  }

  if (!hasMatch(requiredRoles.filter(role => role !== 'guest'), userRoles)) {
    return { error: 'User does not have required roles', status: 403 };
  }

  if (!hasMatch(requiredWorkspaceRoles, userWorkspaceRoles)) {
    return { error: 'User does not have required workspace roles', status: 403 };
  }

  if (!hasMatch(requiredWorkspaceLabels, userWorkspaceLabels)) {
    return { error: 'User does not have required workspace labels', status: 403 };
  }

  return { success: true };
}