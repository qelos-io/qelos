import { getUser, getUserMetadata, updateUser } from '../services/users'
import { Response } from 'express'
import { AuthRequest } from '../../types'
import { getWorkspaceForUser } from '../services/workspaces';
import { basicTenant } from '../../config';

async function getImpersonate(req: AuthRequest, res: Response) {
  const userId = req.headers['x-impersonate-user'] as string;
  const workspaceId = req.headers['x-impersonate-workspace'] as string;
  const [user, workspace] = await Promise.all([
    getUser({ username: req.headers['x-impersonate-user'] as string, tenant: req.userPayload.tenant }).catch(),
    workspaceId ? getWorkspaceForUser(req.headers.tenant, userId, workspaceId).catch() : Promise.resolve()
  ])

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
}

export async function getMe(req: AuthRequest, res: Response) {
  if (req.headers.tenant === basicTenant && req.userPayload.isPrivileged && (req.headers['x-impersonate-tenant'] || req.query.impersonateTenant)) {
    res.set('x-qelos-tenant', req.headers['x-impersonate-tenant'] || req.query.impersonateTenant);
  }
  if (req.userPayload.isPrivileged && req.headers['x-impersonate-user']) {
    return getImpersonate(req, res)
  }

  let metadata = {};
  try {
     metadata = await getUserMetadata(req.userPayload.sub, req.headers.tenant);
  } catch {
    //
  }

  const firstName = req.userPayload.firstName;
  const lastName = req.userPayload.lastName;
  const fullName = req.userPayload.fullName || req.userPayload.name || `${firstName} ${lastName}`;
  res.status(200).json({
    _id: req.userPayload.sub,
    username: req.userPayload.username,
    email: req.userPayload.email,
    name: fullName,
    firstName,
    lastName,
    fullName,
    profileImage: req.userPayload.profileImage,
    roles: req.userPayload.roles,
    metadata,
    workspace: req.activeWorkspace
  }).end();
}

export async function setMe(req: AuthRequest, res: Response) {
  const { username, password, name, fullName, firstName, lastName, birthDate, profileImage, metadata } = req.body || {}
  try {
    await updateUser(
      { _id: req.userPayload.sub, tenant: req.userPayload.tenant } as any,
      { password, fullName: fullName || name, firstName, lastName, birthDate, profileImage, metadata },
      req.authConfig
    )
    res.status(200).json({
      _id: req.userPayload.sub,
      username: username || req.userPayload.username,
      email: req.userPayload.email,
      phone: req.userPayload.phone,
      name: name || req.userPayload.name,
      fullName: fullName || req.userPayload.fullName,
      firstName: firstName || req.userPayload.firstName,
      lastName: lastName || req.userPayload.lastName,
      birthDate: birthDate || req.userPayload.birthDate,
      roles: req.userPayload.roles,
      profileImage: profileImage || req.userPayload.profileImage,
      metadata,
      workspace: req.activeWorkspace
    }).end()
  } catch (e) {
    res.status(500).json({ message: 'failed to update your user information' }).end()
  }
}
