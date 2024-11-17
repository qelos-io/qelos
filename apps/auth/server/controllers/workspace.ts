import { Response } from 'express'
import { Types } from 'mongoose'
import Workspace from '../models/workspace';
import { AuthRequest } from '../../types';
import { emitPlatformEvent } from '@qelos/api-kit';
import logger from '../services/logger';
import { getSignedToken, getUniqueId, setCookie, verifyToken } from '../services/tokens';
import { getCookieTokenName, getCookieTokenValue, updateToken } from '../services/users';
import User, { UserModel } from '../models/user';
import { cookieTokenExpiration } from '../../config';
import { getRequestHost } from '../services/req-host';
import { getWorkspaceConfiguration } from '../services/workspace-configuration';
import { getEncryptedData, setEncryptedData } from '../services/encrypted-data';

const ObjectId = Types.ObjectId;


function getWorkspaceIdIfExists(_id: string, tenant: string) {
  return Workspace.findOne({ _id, tenant }).select('_id').lean().exec();
}

export async function getWorkspace(req: AuthRequest, res: Response) {
  if (!req.isWorkspacePrivileged) {
    res.status(200).json(req.workspace).end()
    return;
  }
  try {
    const { members, invites } = await Workspace.findOne({ _id: req.workspace._id }, 'members invites').lean().exec();
    res.status(200).json({
      ...req.workspace.toJSON(),
      members,
      invites,
    }).end()
  } catch (err) {
    res.status(500).json({ message: 'Failed to load workspace' }).end()
  }
}

export async function getWorkspaces(req: AuthRequest, res: Response) {
  const { tenant } = req.headers || {};
  const userId = req.userPayload.sub;
  try {
    const workspaces = await Workspace.find({
      tenant,
      'members.user': new ObjectId(userId),
    })
      .select('name logo tenant members.$').lean().exec();
    res.status(200).json(workspaces.map(ws => {
      return {
        ...ws,
        isPrivilegedUser: ws.members[0].roles.includes('admin')
      };
    })).end()
  } catch (err) {
    res.status(500).json({ message: 'Failed to load workspaces' }).end()
  }
}

export async function getEveryWorkspaces(req: AuthRequest, res: Response) {
  const { tenant } = req.headers || {};
  try {
    const workspaces = await Workspace.find({
      tenant,
    })
      .select('name logo tenant').lean().exec();
    res.status(200).json(workspaces).end()
  } catch (err) {
    res.status(500).json({ message: 'Failed to load workspaces' }).end()
  }
}

export async function getWorkspaceEncryptedData(req, res) {
  const tenant = req.headers.tenant as string;
  if (!tenant) {
    return res.status(401).end();
  }
  try {
    const workspace = await getWorkspaceIdIfExists(req.params.workspaceId, tenant);
    if (!workspace) {
      throw new Error('workspace not found');
    }
    const encryptedId = req.headers['x-encrypted-id'];
    const id = workspace._id + (encryptedId ? ('-' + encryptedId) : '');
    const { value } = await getEncryptedData(tenant, id, 'workspace');

    res.status(200).set('Content-Type', 'application/json').end(value);
  } catch (e) {
    res.status(200).json(null).end()
  }
}

export async function setWorkspaceEncryptedData(req, res) {
  const tenant = req.headers.tenant as string;
  if (!tenant) {
    return res.status(401).end();
  }
  try {
    const workspace = await getWorkspaceIdIfExists(req.params.workspaceId, tenant);
    if (!workspace) {
      throw new Error('workspace not found');
    }
    const encryptedId = req.headers['x-encrypted-id'];
    const id = workspace._id + (encryptedId ? ('-' + encryptedId) : '');
    await setEncryptedData(tenant, id, JSON.stringify(req.body), 'workspace');
    res.status(200).set('Content-Type', 'application/json').end('{}');
  } catch (e) {
    res.status(400).json({ message: 'failed to set encrypted data for user' }).end();
  }
}

export async function createWorkspace(req: AuthRequest, res: Response) {
  const { tenant } = req.headers || {};
  const userId = req.userPayload.sub;
  const { name, logo, invites = [], labels = [] } = req.body;
  const wsConfig = await getWorkspaceConfiguration(tenant);

  if (
    wsConfig.creationPrivilegedRoles?.length &&
    !wsConfig.creationPrivilegedRoles.some(role => role === '*' || req.userPayload.roles.includes(role))
  ) {
    res.status(403).json({ message: 'you are not permitted to create a workspace' }).end();
    return;
  }

  if (!(labels instanceof Array)) {
    res.status(400).json({ message: 'please provide all mandatory properties (missing "labels").' }).end();
    return;
  }

  if (!wsConfig.allowNonLabeledWorkspaces) {
    if (labels.length === 0) {
      res.status(400).json({ message: 'please provide labels with valid values.' }).end();
      return;
    }

    const selectedLabelsDefinition = wsConfig.labels.find(definition => {
      return definition.value?.length === labels.length &&
        definition.value.map(label => labels.includes(label)).length === labels.length;
    })

    if (!selectedLabelsDefinition) {
      res.status(400).json({ message: 'provided labels does not match available options.' }).end();
      return;
    }
  }

  try {
    const workspace = new Workspace({ tenant, name, logo, invites, labels });
    workspace.members = [{
      user: userId,
      roles: ['admin', 'user']
    }];

    if (req.userPayload.isPrivileged) {
      if (req.body.members?.length) {
        workspace.members = req.body.members;
      }
      if (req.body.labels instanceof Array) {
        workspace.labels = req.body.labels;
      }
    }

    await workspace.save();
    res.status(200).json(workspace).end()

    emitPlatformEvent({
      tenant: tenant,
      user: userId,
      source: 'auth',
      kind: 'workspaces',
      eventName: 'workspaces-created',
      description: 'workspaces created by user endpoint',
      metadata: workspace,
    });

    emitPlatformEvent({
      tenant: tenant,
      user: userId,
      source: 'auth',
      kind: 'invites',
      eventName: 'invite-created',
      description: 'invites created',
      metadata: {
        workspaceId: workspace._id,
        invites,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'failed to create workspace' }).end()
  }
}

export async function updateWorkspace(req: AuthRequest, res: Response) {
  const { name, logo, invites } = req.body;
  const workspace = req.workspace;
  try {

    if (name) {
      workspace.name = name;
    }

    if (logo) {
      workspace.logo = logo;
    }

    if (invites) {
      workspace.invites = invites;
    }

    if (req.userPayload.isPrivileged) {
      if (req.body.members?.length) {
        workspace.members = req.body.members;
      }
      if (req.body.labels instanceof Array) {
        workspace.labels = req.body.labels;
      }
    }

    await workspace.save();
    res.status(200).json(workspace).end()
  } catch (err) {
    logger.log('workspace update error', err);
    res.status(500).json({ message: 'failed to update workspace' }).end()
  }
}

export async function deleteWorkspace(req: AuthRequest, res: Response) {
  const { tenant } = req.headers || {};
  const userId = req.userPayload.sub;

  if (req.activeWorkspace?._id && req.workspace._id.toString() === req.activeWorkspace._id) {
    res.status(400).json({ message: 'You cannot remove your active workspace.' }).end();
    return;
  }


  try {
    await req.workspace.deleteOne();
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
  const token = getCookieTokenValue(req);
  const tenant = req.headers.tenant;

  try {
    const payload = await verifyToken(token, tenant) as any;
    const user = await User
      .findOne({ _id: req.userPayload.sub, tenant })
      .select('tenant email fullName firstName lastName roles tokens')
      .exec() as any as UserModel;

    payload.workspace = {
      _id: req.workspace._id,
      name: req.workspace.name,
      roles: req.workspace.members?.[0].roles || ['admin'],
    }
    const newCookieIdentifier = getUniqueId();
    await updateToken(
      user,
      'cookie',
      payload,
      newCookieIdentifier
    );
    const { token: newToken } = getSignedToken(
      user,
      payload.workspace,
      newCookieIdentifier,
      String(cookieTokenExpiration / 1000)
    );

    setCookie(res, getCookieTokenName(tenant), newToken, null, getRequestHost(req));

    res.json(req.workspace).end()
  } catch (err) {
    res.status(500).json({ message: 'failed to activate workspace' }).end()
  }
}

export async function getWorkspaceMembers(req: AuthRequest, res: Response) {
  const { tenant } = req.headers || {};
  const userId = req.userPayload.sub;
  const _id = req.params.workspaceId;
  try {
    const query: any = {
      tenant,
      _id,
      'members.user': userId
    };

    if (req.userPayload.isPrivileged) {
      delete query['members.user'];
    }
    const workspace = await Workspace.findOne(query).select('members').lean().exec();
    if (!workspace) {
      res.status(404).json({ message: 'workspace not found', from: 'get-members' }).end();
      return;
    }

    let users = await User.find({
      tenant,
      _id: workspace.members.map(member => member.user)
    }).select('_id email fullName firstName lastName').lean().exec();

    users = users.map(user => {
      return {
        ...user,
        ...workspace.members.find(member => (user._id as Types.ObjectId).equals(member.user))
      }
    })

    res.status(200).json(users).end()
  } catch (err) {
    res.status(500).json({ message: 'Failed to load workspace members' }).end()
  }
}

export async function getWorkspaceByParams(req, res, next) {
  const { tenant } = req.headers || {};
  const _id = req.params.workspaceId;

  try {
    const userId = new ObjectId(req.userPayload.sub);
    const query: any = {
      tenant,
      _id,
    };
    const isPrivilegedUser = req.userPayload.isPrivileged;
    if (!isPrivilegedUser) {
      query['members.user'] = userId;
    }
    const select = isPrivilegedUser ? 'name logo' : 'name logo members.$';
    const workspace = await Workspace.findOne(query).select(select).exec();
    if (!workspace) {
      res.status(404).json({ message: 'workspace not found', from: 'get-workspace' }).end();
      return;
    }

    req.workspace = workspace;
    req.isWorkspacePrivileged = isPrivilegedUser || !!req.workspace.members.some(member => (member.user as Types.ObjectId).equals(userId) && member.roles.includes('admin'))

    next();
  } catch {
    res.status(500).send({ message: 'failed to load workspace data' });
  }
}

export function onlyWorkspacePrivileged(req, res, next) {
  if (!req.isWorkspacePrivileged) {
    res.status(403).send({ message: 'not authorized' });
    return;
  }
  next();
}