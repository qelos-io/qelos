import User, { UserDocument, UserModel } from '../models/user';
import { cookieTokenExpiration } from '../../config';
import { Types } from 'mongoose';
import { getAbsoluteDate } from './dates';
import { IAdditionalField, IAuthConfigurationMetadata } from './auth-configuration';

export function getValidMetadata(metadata: any = {}, additionalFields: IAdditionalField[] = []) {
  const result = {};
  for (const field of additionalFields) {
    if (metadata[field.key] !== undefined && typeof metadata[field.key] === field.valueType) {
      result[field.key] = metadata[field.key];
    } else if (field.defaultValue) {
      result[field.key] = field.defaultValue;
    } else if (field.required) {
      throw { code: 'INVALID_METADATA' };
    }
  }
  return result;
}

export async function getUser(query: any) {
  try {
    const user = await User.findOne(query).exec();
    if (user) {
      return user;
    } else {
      query.email = query.username;
      delete query.username;
      const raceUser = await User.findOne(query).exec();
      if (raceUser) {
        raceUser.username = raceUser.email;
        await raceUser.save()
        return raceUser;
      }
    }
  } catch (err) {
    throw { code: 'FORM_SUBMISSION_FAILED', info: err };
  }

  throw { code: 'INCORRECT_CREDENTIALS' };
}

export async function updateUser(
  user: UserDocument | { _id: Types.ObjectId | string, tenant: string },
  {
    username = null,
    password = null,
    fullName = null,
    roles = null,
    firstName = null,
    lastName = null,
    birthDate = null,
    metadata = null
  },
  authConfig?: IAuthConfigurationMetadata
) {
  let directUpdate;
  if (!(user instanceof User)) {
    if (username || roles || password) {
      user = await User.findOne(user).exec();
    } else {
      directUpdate = { _id: user._id, tenant: user.tenant };
      user = {} as UserDocument;
    }
  }

  if (fullName) {
    user.fullName = fullName;
  }

  if (username) {
    user.username = username;
  }

  if (password) {
    user.password = password;
  }

  if (firstName) {
    user.firstName = firstName;
  }

  if (lastName) {
    user.lastName = lastName;
  }

  if (birthDate) {
    user.birthDate = getAbsoluteDate(birthDate);
  }

  if (roles) {
    user.roles = roles;
  }

  if (metadata && authConfig) {
    user.metadata = getValidMetadata(metadata, authConfig.additionalUserFields);
  }

  switch (authConfig?.treatUsernameAs) {
    case 'email':
      user.email = user.username;
      break;
    case 'phone':
      user.phone = user.username;
      break;
    default:
      break;
  }

  return (directUpdate
      ? User.updateOne(directUpdate, { $set: user })
      : user.save()
  ).catch((err: Error) =>
    Promise.reject({ code: 'UPDATE_USER_FAILED', info: err })
  );
}

export async function deleteUser(userId: string, tenant: string) {
  if (!tenant) {
    throw new Error('tenant is missing');
  }

  try {
    await User.deleteOne({ _id: userId, tenant }).exec();
    return { code: 'USER_DELETED_SUCCESSFULLY', info: userId };
  } catch (error) {
    throw { code: 'USER_DELETE_FAILED', info: error }
  }
}

export function comparePassword(user: UserModel, password: string): Promise<UserModel> {
  return new Promise((resolve, reject) => {
    return user.comparePassword(password.trim(), (passwordErr, isMatch) => {
      if (passwordErr) {
        return reject({ code: 'FORM_SUBMISSION_FAILED', info: passwordErr });
      }
      if (!isMatch) {
        return reject({ code: 'INCORRECT_CREDENTIALS' });
      }
      resolve(user);
    });
  });
}

export function setToken({ user, workspace }: { user: UserDocument, workspace?: any }, authType: string) {
  if (authType === 'oauth') {
    return setOAuthAuthentication(user, workspace);
  }
  if (authType === 'cookie') {
    return setCookieAuthentication(user, workspace);
  }
  throw { code: 'INVALID_AUTH_TYPE' };
}

export function updateToken(
  user: UserModel,
  authType: string,
  currentPayload: { tokenIdentifier, workspace?: { _id, name, roles } },
  newToken: string
) {
  return user
    .updateToken(authType, currentPayload, newToken)
    .catch((err) => Promise.reject({ code: 'UPDATE_TOKEN_FAILED', info: err }));
}

export async function deleteToken(
  tenant: string,
  userId: string,
  authType: string,
  token: string,
  isRelatedToken: boolean
) {
  try {
    const user: any = await User.findOne({ _id: userId, tenant }).exec();
    if (isRelatedToken) {
      token = await user?.getTokenByRelatedTokens(authType, token);
    }
    user?.deleteToken(authType, token);
  } catch (e) {
    return false;
  }

  return true;
}

function setOAuthAuthentication(user: any, workspace?: any) {
  const token = user.getToken({ authType: 'oauth', workspace });
  const refreshToken = user.getRefreshToken(token, workspace);

  return user.save().then(() => {
    return {
      token,
      refreshToken,
      user,
      workspace,
    };
  });
}

function setCookieAuthentication(user: any, workspace?: any) {
  const cookieToken = user.getToken({ authType: 'cookie', expiresIn: cookieTokenExpiration / 1000, workspace });

  return user.save().then(() => {
    return { user, workspace, cookieToken };
  });
}

export function getUserIfTokenExists(tenant: string, userId: string, tokenId: string) {
  return User.findOne({
    _id: userId,
    tenant,
    'tokens.tokenIdentifier': tokenId,
  })
    .then((user: any) => user || Promise.reject())
    .catch(() => Promise.reject({ code: 'USER_WITH_TOKEN_NOT_EXISTS' }));
}

