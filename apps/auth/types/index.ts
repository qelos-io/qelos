import { Request } from 'express'
import mongoose from 'mongoose';
import { IWorkspace } from '../server/models/workspace';
import { IAuthConfigurationMetadata } from '../server/services/auth-configuration';

export interface AuthRequest extends Request {
  headers: {
    tenant: string,
    authorization?: string,
    Authorization?: string,
    tenanthost?: string,
    origin?: string,
    host?: string,
  }
  userPayload: {
    sub: string,
    tenant: string,
    username: string,
    email?: string,
    phone?: string,
    name: string,
    fullName: string,
    firstName: string,
    lastName: string,
    birthDate: string,
    roles: string[],
    isPrivileged: boolean,
    user: any
  }
  activeWorkspace?: {
    _id: string,
    name: string,
    roles: string[]
  }
  workspace?: IWorkspace & mongoose.Document<IWorkspace>,
  isWorkspacePrivileged?: boolean;
  authConfig: IAuthConfigurationMetadata;
}
