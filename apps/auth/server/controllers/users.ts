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

const privilegedUserFields = 'username email phone fullName firstName lastName birthDate roles';

function getUserIdIfExists(_id, tenant) {
  return User.findOne({ _id, tenant }).select('_id').lean().exec();
}

function getUsersForAdmin(req: AuthRequest, res: Response): void {
  // support old versions
  const email = req.query.email?.toString().toLowerCase().trim().replace(/ /g, '+') || undefined;

  const username = email || req.query.username?.toString().toLowerCase().trim().replace(/ /g, '+') || undefined;


  const query = {
    tenant: req.headers.tenant,
    username: req.query.exact ? username : (username ? new RegExp(username, 'i') : undefined),
    $or: []
  }
  if (!username) {
    delete query.username;
    delete query.$or;
  } else {
    // temporary to support migration
    query.$or = [
      {
        username: query.username
      },
      {
        email: query.username
      }
    ]
    delete query.username;
  }

  User
    .find(query)
    .select(privilegedUserFields)
    .lean()
    .exec()
    .then(users => {
      const emptyUsernames = users.filter(user => !user.username)
      emptyUsernames.forEach(user => user.username = user.email);
      res.json(users).end();

      if (emptyUsernames.length) {
        logger.log('user email migration for tenant ' + query.tenant);
        Promise.all(emptyUsernames.map(user => User.updateOne({ _id: user._id }, {
          $set: { username: user.username },
        }).exec())).catch()
      }
    })
    .catch(() => {
      res.json([]).end();
    })
}

function getUsers(req: AuthRequest, res: Response): RequestHandler {
  if (!req.query.users) {
    getUsersForAdmin(req, res);
    return;
  }

  const users = (req.query.users as string || '')
    .split(',')
    .map(id => {
      const val = id.trim()
      if (isObjectId(val)) {
        return ObjectId(val)
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

  User
    .getUsersList(req.headers.tenant, users.filter(Boolean) as any as Schema.Types.ObjectId[], privilegedUserFields)
    .then(list => {
      res.status(200)
        .setHeader('x-tenant', req.headers.tenant)
        .setHeader('x-user', 'p-' + req.userPayload.sub)
        .set('Content-Type', 'application/json').end(list)
    })
    .catch(() => res.status(404).json({ message: 'could not load users' }).end())
}

function getUser(req: AuthRequest, res: Response): RequestHandler {
  const isPrivileged = !!(req.userPayload && req.userPayload.isPrivileged)

  const promises: Array<Promise<any>> = [
    User.findOne({ _id: req.params.userId, tenant: req.headers.tenant })
      .select(isPrivileged ? privilegedUserFields : 'fullName')
      .lean().exec()
  ]
  if (isPrivileged) {
    promises.push(UserInternalMetadata.findOne({
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

async function getUserEncryptedData(req: AuthRequest, res: Response) {
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

async function setUserEncryptedData(req: AuthRequest, res: Response) {
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

async function createUser(req: AuthRequest, res: Response) {
  const { tenant, name, internalMetadata, metadata, ...userData } = req.body
  const user = new User(userData);
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
  if (req.authConfig.treatUsernameAs === 'email') {
    user.username = user.username.toLowerCase().trim().replace(/ /g, '+');
    if (user.username.indexOf('@') === -1) {
      throw new Error('username should be an email address');
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
      user: _id,
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

async function updateUser(req: AuthRequest, res: Response) {
  const { username, roles, name, password, fullName, firstName, lastName, birthDate, internalMetadata } = req.body || {}
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
      { username, roles, password, fullName: fullName || name, firstName, lastName, birthDate, metadata },
      req.authConfig
    )
    if (internalMetadata) {
      const userInternalMetadata = (await UserInternalMetadata.findOne({
        user: req.params.userId,
        tenant: req.headers.tenant
      }).exec()) || new UserInternalMetadata({
        user: req.params.userId,
        tenant: req.headers.tenant
      })
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

async function removeUser(req: AuthRequest, res: Response) {
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

export default {
  getUsersForAdmin,
  getUsers,
  createUser,
  getUser,
  updateUser,
  removeUser,
  getUserEncryptedData,
  setUserEncryptedData
}
