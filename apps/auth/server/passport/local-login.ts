import {defaultAuthType} from '../../config';
import {getUser, comparePassword, setToken} from '../services/users';
import {Strategy} from 'passport-local';
import {UserDocument, UserModel} from '../models/user';
import {getWorkspaceConfiguration} from '../services/workspace-configuration';
import Workspace from '../models/workspace';
import logger from '../services/logger';

function getWorkspaceForUser(tenant: string, userId: string, workspaceId: string) {
  const query: any = {
    tenant,
    'members.user': userId
  };
  if (workspaceId) {
    query._id = workspaceId;
  }
  return Workspace
    .findOne(query)
    .select('name members.$')
    .exec()
    .then(({_id, name, members}) => ({
      _id,
      name,
      roles: members[0].roles
    }))
}

module.exports = new Strategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    session: false,
    passReqToCallback: true,
  },
  async (req, email, password, done) => {
    const query: {
      email: string;
      tenant: undefined | string;
      roles?: { $in: string[] };
    } = {email: email.trim(), tenant: req.headers.tenant as string};
    const authType = req.body.authType || defaultAuthType;

    if (req.body.roles && req.body.roles instanceof Array) {
      query.roles = {$in: req.body.roles};
    }
    const preSelectedWorkspace = req.body.workspace;

    const [wsConfig, user] = await Promise.all([
      getWorkspaceConfiguration(query.tenant),
      getUser(query).then((user) => comparePassword((user as unknown as UserModel), password))
    ]);
    let workspace;
    if (wsConfig.isActive) {
      try {
        workspace = await getWorkspaceForUser(query.tenant, (user as any)._id, preSelectedWorkspace);
      } catch (err) {
        logger.log('Error getting workspace', query);
      }
    }

    setToken({user: user as any as UserDocument, workspace}, authType)
      .then(({user, token, refreshToken, cookieToken}) => {
        done(null, {
          token,
          refreshToken,
          cookieToken,
          workspace,
          user: {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: user.name || user.fullName || `${user.firstName} ${user.lastName}`,
            roles: user.roles,
          },
        });
      })
      .catch(done);
  }
);
