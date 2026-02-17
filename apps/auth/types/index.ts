import { IAuthConfigurationMetadata } from '@qelos/global-types';
import { Request } from 'express'
import mongoose from 'mongoose';
import { IWorkspace } from '../server/models/workspace';

export interface AuthRequest extends Request {
  headers: {
    tenant: string,
    authorization?: string,
    Authorization?: string,
    tenanthost?: string,
    origin?: string,
    host?: string,
    'x-api-key'?: string,
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
    profileImage: string,
    roles: string[],
    isPrivileged: boolean,
    isApiToken?: boolean,
    isImpersonating?: boolean,
    originalAdminId?: string,
    user: any,
    workspace?: {
      _id: string,
      name: string,
      roles: string[],
      labels: string[]
    }
  }
  originalUserPayload?: {
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
    profileImage: string,
    roles: string[],
    isPrivileged: boolean,
    user: any
  }
  activeWorkspace?: {
    _id: string,
    name: string,
    roles: string[]
    labels: string[]
  }
  workspace?: IWorkspace & mongoose.Document<IWorkspace>,
  isWorkspacePrivileged?: boolean;
  authConfig: IAuthConfigurationMetadata;
}
