import { Response, RequestHandler } from 'express'
import { emitPlatformEvent } from '@qelos/api-kit';
import { AuthRequest } from '../../types'
import User from '../models/user'
import UserInternalMetadata from '../models/user-internal-metadata';
import { getEncryptedData, setEncryptedData } from '../services/encrypted-data';
import logger from '../services/logger';
import { isObjectId } from '../../helpers/mongo-utils';
import * as UsersService from '../services/users';
import { Types, Schema } from 'mongoose';

import ObjectId = Types.ObjectId
import { getValidMetadata } from '../services/users';
import Workspace from '../models/workspace';

const privilegedUserFields = 'username phone fullName firstName lastName birthDate roles profileImage socialLogins emailVerified lastLogin';

function getUserIdIfExists(_id, tenant) {
  // Use type assertion to avoid complex union type error
  return (User as any).findOne({ _id, tenant }).select('_id').lean().exec();
}

export function getUsersForAdmin(req: AuthRequest, res: Response): void {
  try {
    // support old versions
    const username = req.query.username?.toString().toLowerCase().trim().replace(/ /g, '+') || undefined;

    const query: any = {
      tenant: req.headers.tenant,
      username: req.query.exact ? username ? new RegExp(username, 'i') : undefined : username ? new RegExp(username, 'i') : undefined,
    };

    if (typeof (req.query as any).roles === 'string') {
      query.roles = { $in: (req.query as any).roles.split(',').map((role: string) => role.trim()) };
    }

    if (req.query._id) {
      query._id = { $in: (req.query._id as string).split(',').map(id => new ObjectId(id.trim())) };
    }

    if (!query.username) {
      delete query.username;
    }

    logger.log('admin db query', query);

    // Use type assertion to avoid complex union type error
    (User as any)
      .find(query)
      .select(req.query.select ? req.query.select.toString().replace(/,/g, ' ') : privilegedUserFields)
      .lean()
      .exec()
      .then((users: any[] = []) => {
        res.json(users).end();
      })
      .catch((err) => {
        logger.error('failed to load users for admin', req.query, err);
        res.json([]).end();
      })
  } catch (err) {
    logger.error('failed to load users for admin', req.query, err);
    res.json([]).end();
  }
}

export function getUsers(req: AuthRequest, res: Response): RequestHandler {
  if (!req.query.users) {
    getUsersForAdmin(req, res);
    return;
  }

  const users = (req.query.users as string || '')
    .split(',')
    .map(id => {
      const val = id.trim()
      if (isObjectId(val)) {
        return new ObjectId(val)
      }
      return false
    })
    .filter(Boolean)

  if (!users.length) {
    res.status(200)
      .setHeader('x-tenant', req.headers.tenant)
      .setHeader('x-user', req.userPayload?.sub || '-')
      .set('Content-Type', 'application/json').end('[]')
    return;
  }
  
  // If there are too many users, batch them to avoid large queries
  const BATCH_SIZE = 100;
  if (users.length > BATCH_SIZE) {
    const batches = [];
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      batches.push(User.getUsersList(req.headers.tenant, batch as any as Schema.Types.ObjectId[], privilegedUserFields));
    }
    
    Promise.all(batches)
      .then(results => {
        // Combine the results from all batches
        const combinedUsers = results.map(result => JSON.parse(result)).flat();
        const combinedResult = JSON.stringify(combinedUsers);
        
        res.status(200)
          .setHeader('x-tenant', req.headers.tenant)
          .setHeader('x-user', 'p-' + req.userPayload.sub)
          .set('Content-Type', 'application/json').end(combinedResult);
      })
      .catch(() => res.status(404).json({ message: 'could not load users' }).end());
  } else {
    // For smaller batches, use the original approach
    User
      .getUsersList(req.headers.tenant, users as any as Schema.Types.ObjectId[], privilegedUserFields)
      .then(list => {
        res.status(200)
          .setHeader('x-tenant', req.headers.tenant)
          .setHeader('x-user', 'p-' + req.userPayload.sub)
          .set('Content-Type', 'application/json').end(list)
      })
      .catch(() => res.status(404).json({ message: 'could not load users' }).end());
  }
}

export function getUser(req: AuthRequest, res: Response): RequestHandler {
  const isPrivileged = !!(req.userPayload && req.userPayload.isPrivileged)

  const promises: Array<Promise<any>> = [
    // Use type assertion to avoid complex union type error
    (User as any).findOne({ _id: req.params.userId, tenant: req.headers.tenant })
      .select(isPrivileged ? privilegedUserFields : 'fullName')
      .lean().exec()
  ]
  if (isPrivileged) {
    // Use type assertion to avoid complex union type error
    promises.push((UserInternalMetadata as any).findOne({
      user: req.params.userId,
      tenant: req.headers.tenant
    }).lean().exec().catch(() => null))
  }

  Promise.all(promises)
    .then(([user, internalMetadata]) => {
      if (!user) {
        return Promise.reject(null)
      }
      if (isPrivileged) {
        user.internalMetadata = internalMetadata?.metadata || {};
      }
      res.status(200).json(user).end()
    })
    .catch(() => res.status(404).json({ message: 'user not exists' }).end())
  return;
}

export async function getUserEncryptedData(req: AuthRequest, res: Response) {
  const tenant = req.headers.tenant as string;
  if (!tenant) {
    return res.status(401).end();
  }
  try {
    const user = await getUserIdIfExists(req.params.userId, tenant);
    if (!user) {
      throw new Error('user not found');
    }
    const encryptedId = req.headers['x-encrypted-id'];
    const id = user._id + (encryptedId ? ('-' + encryptedId) : '');
    const { value } = await getEncryptedData(tenant, id);

    res.status(200).set('Content-Type', 'application/json').end(value);
  } catch (e) {
    res.status(200).json(null).end()
  }
}

export async function setUserEncryptedData(req: AuthRequest, res: Response) {
  const tenant = req.headers.tenant as string;
  if (!tenant) {
    return res.status(401).end();
  }
  try {
    const user = await getUserIdIfExists(req.params.userId, tenant);
    if (!user) {
      throw new Error('user not found');
    }
    const encryptedId = req.headers['x-encrypted-id'];
    const id = user._id + (encryptedId ? ('-' + encryptedId) : '');
    await setEncryptedData(tenant, id, JSON.stringify(req.body));
    res.status(200).set('Content-Type', 'application/json').end('{}');
  } catch (e) {
    res.status(400).json({ message: 'failed to set encrypted data for user' }).end();
  }
}

export async function createUser(req: AuthRequest, res: Response) {
  const { tenant, name, internalMetadata, metadata, ...userData } = req.body
  const user = new User(userData);

  if (req.authConfig.treatUsernameAs === 'email') {
    user.username = user.username.toLowerCase().trim().replace(/ /g, '+');
    user.email = user.username;
    if (!user.username.includes('@')) {
      res.status(400).json({ message: 'username should be an email address' }).end();
      return;
    }
  }

  user.tenant = req.headers.tenant;
  if (!user.fullName && name) {
    user.fullName = name;
  }
  if (metadata) {
    try {
      user.metadata = getValidMetadata(metadata, req.authConfig.additionalUserFields);
    } catch {
      // nothing
    }
  }
  try {
    if (!user.tenant) {
      throw new Error('tenant is missing');
    }
    const { _id, fullName, firstName, lastName, birthDate, username, roles } = await user.save()
    const userInternalMetadata = new UserInternalMetadata({
      tenant: req.headers.tenant,
      user: _id,
      metadata: internalMetadata || {}
    });
    await userInternalMetadata.save();

    const response = { _id, name: fullName, firstName, lastName, birthDate, username, roles, internalMetadata };

    emitPlatformEvent({
      tenant: req.headers.tenant,
      user: _id as string,
      source: 'auth',
      kind: 'users',
      eventName: 'user-created',
      description: 'user created by admin endpoint',
      metadata: {
        user: response
      }
    })

    res.status(200).json(response).end()
  } catch (e) {
    logger.log('internal user create error', e);
    res.status(400).json({ message: 'user creation failed' }).end()
  }
}

export async function updateUser(req: AuthRequest, res: Response) {
  const {
    username,
    roles,
    name,
    password,
    fullName,
    firstName,
    lastName,
    birthDate,
    profileImage,
    internalMetadata
  } = req.body || {}
  let metadata;
  let newInternalMetadata;
  try {
    if (req.body?.metadata) {
      metadata = getValidMetadata(req.body?.metadata, req.authConfig.additionalUserFields);
    }
  } catch {
    metadata = null;
  }
  try {
    await UsersService.updateUser(
      { _id: req.params.userId, tenant: req.headers.tenant },
      { username, roles, password, fullName: fullName || name, firstName, lastName, birthDate, metadata, profileImage },
      req.authConfig
    )
    if (internalMetadata) {
      // Use type assertion to avoid complex union type error
      const userInternalMetadata = (await (UserInternalMetadata as any).findOne({
        user: req.params.userId,
        tenant: req.headers.tenant
      }).exec()) || (new (UserInternalMetadata as any)({
        user: req.params.userId,
        tenant: req.headers.tenant
      }) as any)
      newInternalMetadata = userInternalMetadata.metadata = Object.assign(userInternalMetadata.metadata || {}, internalMetadata);
      userInternalMetadata.markModified('metadata')
      await userInternalMetadata.save();
    }

    const response = {
      username,
      name: fullName || name,
      fullName: fullName || name,
      firstName,
      lastName,
      birthDate,
      profileImage,
      roles,
      internalMetadata: newInternalMetadata || internalMetadata,
      _id: req.params.userId
    };

    emitPlatformEvent({
      tenant: req.headers.tenant,
      user: req.params.userId,
      source: 'auth',
      kind: 'users',
      eventName: 'user-updated',
      description: 'user updated by admin endpoint',
      metadata: {
        user: response
      }
    })

    res.status(200).json(response).end()
  } catch (e) {
    res.status(500).json({ message: 'user update failed', info: e?.info }).end()
  }
}

export async function removeUser(req: AuthRequest, res: Response) {
  try {
    await UsersService.deleteUser(req.params.userId, req.headers.tenant);

    emitPlatformEvent({
      tenant: req.headers.tenant,
      user: req.params.userId,
      source: 'auth',
      kind: 'users',
      eventName: 'user-removed',
      description: 'user removed by admin endpoint',
      metadata: null
    })

    res.status(200).json({ _id: req.params.userId, tenant: req.headers.tenant }).end()
  } catch (e) {
    res.status(400).json({ message: 'user deletion failed' }).end()
  }
}

export async function getUsersStats(req: AuthRequest, res: Response) {
  try {
    const [users, workspaces] = await Promise.all([
      User.countDocuments({ tenant: req.headers.tenant }).exec(),
      Workspace.countDocuments({ tenant: req.headers.tenant }).exec()
    ]);
    res.status(200).json({ users, workspaces }).end();
  } catch (e) {
    res.status(500).json({ message: 'could not load users stats' }).end();
  }
}