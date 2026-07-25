import { getUser, getUserMetadata, updateUser } from '../services/users'
import { Response } from 'express'
import { AuthRequest } from '../../types'
import { getWorkspaceForUser } from '../services/workspaces';
import {
  buildMeResponse,
  buildProfileUpdate,
  getCachedUserMe,
  setCachedUserMe,
} from '../services/user-me-cache';

export async function getImpersonate(req: AuthRequest, res: Response) {
  const userId = req.get('x-impersonate-user')?.toString() as string;
  const workspaceId = req.get('x-impersonate-workspace')?.toString() as string;
  
  try {
    const [user, workspace] = await Promise.all([
      getUser({ _id: userId, tenant: req.userPayload.tenant }),
      workspaceId ? getWorkspaceForUser(req.headers.tenant, userId, workspaceId) : Promise.resolve(null)
    ]);

    if (!user) {
      return res.status(403).json({ message: 'user not exist' }).end()
    }
    if (workspaceId && !workspace) {
      return res.status(403).json({ message: 'workspace not exist' }).end()
    }

    // Use type assertion to access user properties
    const userObj = user as any;
    const firstName = userObj.firstName;
    const lastName = userObj.lastName;
    const fullName = userObj.fullName || `${firstName} ${lastName}`;
    res.status(200).json({
      _id: userObj._id,
      tenant: userObj.tenant,
      username: userObj.username,
      email: userObj.email,
      name: fullName,
      firstName,
      lastName,
      fullName,
      roles: userObj.roles,
      profileImage: userObj.profileImage,
      metadata: userObj.metadata,
      workspace
    }).end();
  } catch (error) {
    res.status(500).json({ message: 'failed to impersonate user', error: error?.message || 'Unknown error' }).end();
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  if (req.userPayload.isPrivileged && req.get('x-impersonate-user')) {
    return getImpersonate(req, res)
  }

  const tenant = req.headers.tenant;
  const userId = req.userPayload.sub;
  const cached = await getCachedUserMe(tenant, userId);

  let metadata = cached?.metadata || {};
  if (cached?.metadata === undefined) {
    try {
      metadata = await getUserMetadata(userId, tenant);
    } catch {
      //
    }
  }

  res.status(200).json(
    buildMeResponse(req.userPayload, cached, metadata, req.activeWorkspace)
  ).end();
}

export async function setMe(req: AuthRequest, res: Response) {
  const { username, password, name, fullName, firstName, lastName, birthDate, profileImage, metadata } = req.body || {}
  const tenant = req.userPayload.tenant;
  const userId = req.userPayload.sub;

  try {
    await updateUser(
      { _id: userId, tenant } as any,
      { password, fullName: fullName || name, firstName, lastName, birthDate, profileImage, metadata },
      req.authConfig
    )

    const cached = await getCachedUserMe(tenant, userId);
    const profileUpdate = buildProfileUpdate(cached, req.userPayload, {
      name,
      fullName,
      firstName,
      lastName,
      birthDate,
      profileImage,
      metadata,
    });
    await setCachedUserMe(tenant, userId, profileUpdate);

    const response = buildMeResponse(
      req.userPayload,
      profileUpdate,
      profileUpdate.metadata || {},
      req.activeWorkspace
    );
    res.status(200).json({
      ...response,
      username: username || req.userPayload.username,
    }).end()
  } catch (e) {
    res.status(500).json({ message: 'failed to update your user information' }).end()
  }
}
