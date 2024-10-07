import mongoose, { ObjectId, Document, Model } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getSignedToken, getUniqueId } from '../services/tokens';
import { cacheManager } from '../services/cache-manager';
import {
  cookieTokenExpiration,
  defaultAuthType,
  defaultRole,
  refreshTokenExpiration,
  refreshTokenSecret
} from '../../config';

export interface IUser {
  _id?: any;
  tenant: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  salt: string;
  roles: string[];
  tokens: any[];
  metadata: any;
  created: Date;
}

export interface UserDocument extends Omit<IUser, '_id'>, Document {
}

export interface UserModel extends Model<UserDocument> {
  comparePassword(
    password: string,
    callback: (err: Error, success: boolean) => void
  ): void;

  getToken(payload: { authType: string, expiresIn?: string, workspace? }): any;

  getRefreshToken(relatedToken: string): any;

  updateToken(
    authType: string,
    currentPayload: { tokenIdentifier, workspace? },
    newIdentifier: string,
    relatedToken?: string
  ): Promise<UserDocument>;

  deleteToken(authType: string, tokenIdentifier: string): Promise<UserDocument>;

  getTokenByRelatedTokens(authType: string, tokenIdentifier: string): string;

  getUsersList(tenant: string, usersIds: ObjectId[], privilegedUserFields?: string): Promise<string>;
}

const TokenSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['cookie', 'oauth'],
    default: () => defaultAuthType,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  tokenIdentifier: String,
  expiresAt: Date,
})

// define the User model schema
const UserSchema = new mongoose.Schema<UserDocument, UserModel>({
  tenant: {
    type: String,
    index: true,
    default: '0',
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    validate(email = '') {
      return !email || email.includes('@')
    }
  },
  phone: String,
  password: String,
  fullName: String,
  firstName: String,
  lastName: String,
  birthDate: String,
  salt: String,
  roles: {
    type: [String],
  },
  metadata: mongoose.Schema.Types.Mixed,
  tokens: [TokenSchema],
  created: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.index({ tenant: 1, username: 1 }, { unique: true });

/**
 * Compare the passed password with the value in the database. A model method.
 *
 * @param {string} password
 * @param {function} callback
 * @returns {object} callback
 */
UserSchema.methods.comparePassword = function comparePassword(
  this: UserDocument,
  password,
  callback
) {
  bcrypt.compare(password, this.password, callback);
};

UserSchema.methods.getToken = function getToken({ authType, expiresIn, workspace }: {
  authType: 'cookie' | 'oauth',
  expiresIn?,
  workspace?
}) {
  let tokenIdentifier;
  if (authType === 'cookie') {
    tokenIdentifier = getUniqueId();
    this.tokens.push({
      expiresAt: new Date(Date.now() + cookieTokenExpiration),
      kind: authType,
      tokenIdentifier,
    });
    this.markModified('tokens');
  }
  return getSignedToken(this, workspace, tokenIdentifier, expiresIn).token;
};

UserSchema.methods.getRefreshToken = function getRefreshToken(relatedToken, workspace?: any) {
  const tokenIdentifier = getUniqueId();

  this.tokens.push({
    kind: 'oauth',
    tokenIdentifier,
    metadata: { relatedToken, workspace: workspace?._id },
    expiresAt: new Date(Date.now() + cookieTokenExpiration),
  });

  return jwt.sign(
    {
      sub: this._id,
      tenant: this.tenant,
      workspace: workspace?._id,
      tokenIdentifier,
    },
    refreshTokenSecret,
    { expiresIn: refreshTokenExpiration }
  );
};

UserSchema.methods.updateToken = function updateToken(
  authType,
  currentPayload: { tokenIdentifier, workspace? },
  newIdentifier,
  relatedToken
) {
  this.tokens = this.tokens.filter(
    (token) =>
      !(token.kind === authType && token.tokenIdentifier === currentPayload.tokenIdentifier)
  );
  const token = { kind: authType, tokenIdentifier: newIdentifier };
  if (relatedToken || currentPayload.workspace) {
    (token as any).metadata = { relatedToken, workspace: currentPayload.workspace?._id };
  }
  this.tokens.push(token);

  return this.save();
};

UserSchema.methods.deleteToken = function deleteToken(
  authType,
  tokenIdentifier
) {
  this.tokens = this.tokens.filter(
    (token) =>
      !(token.kind === authType && token.tokenIdentifier === tokenIdentifier)
  );

  return this.save();
};

UserSchema.methods.getTokenByRelatedTokens = function getTokenByRelatedTokens(
  authType,
  tokenIdentifier
) {
  const token = this.tokens.find(
    (token) =>
      token.kind === authType &&
      token.metadata?.relatedToken === tokenIdentifier
  );

  return token ? token.tokenIdentifier : tokenIdentifier;
};

UserSchema.statics.getUsersList = function getUsersList(tenant: string, usersIds: ObjectId[], privilegedUserFields?: Array<string>) {
  if (!usersIds.length) {
    return this.find({ tenant })
      .select(privilegedUserFields)
      .lean()
      .exec()
      .then(users => JSON.stringify(users));
  }
  return cacheManager.wrap(`usersList.${tenant}.${usersIds.map(id => id.toString()).join(',')}`,
    async () => {
      const query: Record<string, any> = { _id: { $in: usersIds } }
      query.tenant = tenant;

      try {
        const users = await this.find(query)
          .select(privilegedUserFields)
          .lean()
          .exec();
        return JSON.stringify(users);
      } catch {
        return '[]';
      }
    });
}

/**
 * The pre-save hook method.
 */
UserSchema.pre('save', function saveHook(next) {
  const user = this;

  if (user.email && !user.username) {
    user.username = user.email;
  }

  if (!user.email) {
    user.email = user.username.includes('@') ? user.username : (user.username + '@null')
  }

  // define role for new user
  if (!user.roles || user.roles.length === 0) {
    user.roles = [defaultRole];
  }

  if (user.tokens.length > 10) {
    const now = Date.now();
    user.tokens = user.tokens.filter(token => token.expiresAt && token.expiresAt - now > 0);
  }

  if (!this.salt) {
    this.salt = bcrypt.genSaltSync();
  }

  // proceed further only if the password is modified or the user is new
  if (!user.isModified('password')) return next();

  return bcrypt.genSalt((saltError, salt) => {
    if (saltError) {
      return next(saltError);
    }

    return bcrypt.hash(user.password, salt, (hashError, hash) => {
      if (hashError) {
        return next(hashError);
      }

      // replace a password string with hash value
      user.password = hash;

      return next();
    });
  });
});

const User = mongoose.model<UserDocument, UserModel>('User', UserSchema);
export default User

