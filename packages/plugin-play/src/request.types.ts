import {StandardPayload} from './handlers';

export type RequestUser = {
  _id: string,
  email: string,
  firstName: string,
  lastName: string,
  roles: string[],
  workspace?: {
    _id: string,
    roles: string[]
  }
};

declare module 'fastify' {
  interface FastifyRequest {
    tenantPayload: StandardPayload & any;
    user?: RequestUser
  }
}