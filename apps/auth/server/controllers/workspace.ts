import {Response} from 'express'
import {Types} from 'mongoose'
import Workspace from '../models/workspace';
import {AuthRequest} from '../../types';
import {emitPlatformEvent} from '@qelos/api-kit';
import logger from '../services/logger';
import {getSignedToken, getUniqueId, setCookie, verifyToken} from '../services/tokens';
import {updateToken} from '../services/users';
import User, {UserModel} from '../models/user';
import {cookieTokenExpiration} from '../../config';
import {getRequestHost} from '../services/req-host';
import {getWorkspaceConfiguration} from '../services/workspace-configuration';

const ObjectId = Types.ObjectId;

export async function getWorkspace(req: AuthRequest, res: Response) {
  const {tenant} = req.headers || {};
  const userId = req.userPayload.sub;
  const _id = req.params.workspaceId;
  try {
    const workspace = await Workspace.findOne({
      _id,
      tenant,
      'members.user': ObjectId(userId),
    })
      .select('name logo tenant').lean().exec();
    if (!workspace) {
      res.status(404).json({message: 'Workspace not found'}).end();
      return;
    }
    res.status(200).json(workspace).end()
  } catch (err) {
    res.status(500).json({message: 'Failed to load workspace'}).end()
  }
}

export async function getWorkspaces(req: AuthRequest, res: Response) {
  const {tenant} = req.headers || {};
  const userId = req.userPayload.sub;
  try {
    const workspaces = await Workspace.find({
      tenant,
      'members.user': ObjectId(userId),
    })
      .select('name logo tenant members.$').lean().exec();
    res.status(200).json(workspaces.map(ws => {
      return {
        ...ws,
        isPrivilegedUser: ws.members[0].roles.includes('admin')
      };
    })).end()
  } catch (err) {
    res.status(500).json({message: 'Failed to load workspace'}).end()
  }
}

export async function createWorkspace(req: AuthRequest, res: Response) {
  const {tenant} = req.headers || {};
  const userId = req.userPayload.sub;
  const {name, logo, invites = []} = req.body;
  const wsConfig = await getWorkspaceConfiguration(tenant);

  if (
    wsConfig.creationPrivilegedRoles?.length &&
    !wsConfig.creationPrivilegedRoles.some(role => role === '*' || req.userPayload.roles.includes(role))
  ) {
    res.status(403).json({message: 'you are not permitted to create a workspace'}).end();
    return;
  }

  try {
    const workspace = new Workspace({tenant, name, logo, invites});
    workspace.members = [{
      user: userId,
      roles: ['admin', 'user']
    }]
    await workspace.save();
    res.status(200).json(workspace).end()

    emitPlatformEvent({
      tenant: tenant,
      user: userId,
      source: 'auth',
      kind: 'workspaces',
      eventName: 'workspaces-created',
      description: 'workspaces created by user endpoint',
      metadata: workspace
    })
  } catch (err) {
    res.status(500).json({message: 'failed to create workspace'}).end()
  }
}

export async function updateWorkspace(req: AuthRequest, res: Response) {
  const {name, logo} = req.body;
  const workspace = req.workspace;
  try {

    if (name) {
      workspace.name = name;
    }

    if (logo) {
      workspace.logo = logo;
    }

    await workspace.save();
    res.status(200).json(workspace).end()
  } catch (err) {
    logger.log('workspace update error', err);
    res.status(500).json({message: 'failed to update workspace'}).end()
  }
}

export async function deleteWorkspace(req: AuthRequest, res: Response) {
  const {tenant} = req.headers || {};
  const userId = req.userPayload.sub;

  try {
    await req.workspace.remove();
    res.status(200).json(req.workspace).end();

    emitPlatformEvent({
      tenant: tenant,
      user: userId,
      source: 'auth',
      kind: 'workspaces',
      eventName: 'workspaces-deleted',
      description: 'workspaces deleted by user endpoint',
      metadata: req.workspace
    })
  } catch (err) {
    res.status(500).json(err.message).end()
  }
}

export async function activateWorkspace(req: AuthRequest, res: Response) {
  const token = req.signedCookies.token || req.cookies.token;
  const tenant = req.headers.tenant;

  const payload = await verifyToken(token, tenant) as any;
  const user = await User
    .findOne({_id: req.userPayload.sub, tenant})
    .select('tenant email fullName firstName lastName roles tokens')
    .exec() as any as UserModel;

  payload.workspace = {
    _id: req.workspace._id,
    name: req.workspace.name,
    roles: req.workspace.members[0].roles,
  }
  const newCookieIdentifier = getUniqueId();
  await updateToken(
    user,
    'cookie',
    payload,
    newCookieIdentifier
  );
  const {token: newToken} = getSignedToken(
    user,
    payload.workspace,
    newCookieIdentifier,
    String(cookieTokenExpiration / 1000)
  );

  console.log('set the token', newToken, getRequestHost(req))
  setCookie(res, newToken, null, getRequestHost(req));

  res.json(req.workspace).end()
}

export async function getWorkspaceByParams(req, res, next) {
  const {tenant} = req.headers || {};
  const _id = req.params.workspaceId;

  try {
    const userId = ObjectId(req.userPayload.sub);
    const workspace = await Workspace.findOne({
      tenant,
      _id,
      'members.user': userId
    }).select('name logo members.$').exec();
    if (!workspace) {
      res.status(404).json({message: 'workspace not found'});
      return;
    }

    req.workspace = workspace;
    next();
  } catch {
    res.status(500).send({message: 'failed to load workspace data'});
  }
}

export function onlyWorkspacePrivileged(req, res, next) {
  const userId = ObjectId(req.userPayload.sub);
  const isPrivileged = !!req.workspace.members.some(member => (member.user as Types.ObjectId).equals(userId) && member.roles.includes('admin'))
  if (!isPrivileged) {
    res.status(403).send({message: 'not authorized'});
    return;
  }
  next();
}