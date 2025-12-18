import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { getUser } from '../services/users';
import { getWorkspaceForUser } from '../services/workspaces';

/**
 * Impersonation middleware that replaces req.userPayload with impersonated user's data
 * when the user is privileged and impersonation headers are present
 */
export async function handleImpersonation(req: AuthRequest, res: Response, next: NextFunction) {
  // Only proceed if user is privileged and impersonation headers are present
  if (!req.userPayload?.isPrivileged || !req.get('x-impersonate-user')) {
    return next();
  }

  const impersonatedUserId = req.get('x-impersonate-user') as string;
  const impersonatedWorkspaceId = req.get('x-impersonate-workspace') as string;
  
  try {
    // Fetch impersonated user data
    const [user, workspace] = await Promise.all([
      getUser({ _id: impersonatedUserId, tenant: req.userPayload.tenant }),
      impersonatedWorkspaceId ? getWorkspaceForUser(req.headers.tenant, impersonatedUserId, impersonatedWorkspaceId) : Promise.resolve(null)
    ]);

    if (!user) {
      return res.status(404).json({ message: 'Impersonated user not found' }).end();
    }

    // Store original admin payload for audit purposes
    req.originalUserPayload = { ...req.userPayload };

    // Replace userPayload with impersonated user's data
    // But preserve isPrivileged flag for audit/security purposes
    req.userPayload = {
      sub: user._id.toString(),
      tenant: req.userPayload.tenant,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.fullName,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      profileImage: user.profileImage,
      roles: user.roles,
      isPrivileged: true, // Keep this to indicate the request is still from a privileged user
      isImpersonating: true, // Add flag to indicate impersonation is active
      originalAdminId: req.originalUserPayload.sub, // Track who is impersonating
      user: user
    };

    // Add workspace context if provided
    if (workspace) {
      req.userPayload.workspace = {
        _id: workspace._id,
        name: workspace.name,
        roles: workspace.members?.[0]?.roles || ['admin'],
        labels: workspace.labels || []
      };
    }

    next();
  } catch (error) {
    console.error('Failed to handle impersonation:', error);
    res.status(500).json({ message: 'Failed to impersonate user', error: error?.message || 'Unknown error' }).end();
  }
}
