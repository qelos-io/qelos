import { defaultAuthType } from '../../config';
import { getUser, comparePassword, setToken, clearOldTokens } from '../services/users';
import { Strategy } from 'passport-local';
import { UserDocument, UserModel } from '../models/user';
import { getWorkspaceConfiguration } from '../services/workspace-configuration';
import logger from '../services/logger';
import { getWorkspaceForUser } from '../services/workspaces';

module.exports = new Strategy(
  {
    usernameField: 'username',
    passwordField: 'password',
    session: false,
    passReqToCallback: true,
  },
  async (req, username, password, done) => {
    const query: {
      username: string;
      tenant: undefined | string;
      roles?: { $in: string[] };
    } = { username: username.trim() || req.body?.email?.trim(), tenant: req.headers.tenant as string };
    const authType = req.body.authType || defaultAuthType;

    if (req.body.roles && req.body.roles instanceof Array) {
      query.roles = { $in: req.body.roles };
    }
    const preSelectedWorkspace = req.body.workspace;

    const [wsConfig, user] = await Promise.all([
      getWorkspaceConfiguration(query.tenant),
      getUser(query)
        .then((user) => user && comparePassword((user as unknown as UserModel), password))
        .catch(() => null)
    ]);
    if (!user) {
      return done({ message: 'Invalid username or password' });
    }
    let workspace;
    if (wsConfig.isActive) {
      try {
        workspace = await getWorkspaceForUser(query.tenant, user._id, preSelectedWorkspace || user.lastLogin?.workspace || user.tokens?.at(-1)?.metadata?.workspace);
      } catch (err) {
        logger.log('Error getting workspace', query);
      }
    }

    setToken({ user: user as any as UserDocument, workspace }, authType)
      .then(({ user, token, refreshToken, cookieToken }) => {
        done(null, {
          tenant: query.tenant,
          token,
          refreshToken,
          cookieToken,
          workspace,
          user: {
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: user.name || user.fullName || `${user.firstName} ${user.lastName}`,
            roles: user.roles,
          },
        });
      })
      .catch((err) => done(err))
      .finally(() => setTimeout(() => clearOldTokens((user as any)._id).catch(), 1000)) // 1 second delay
  }
);
