import {StandardPayload} from './handlers';

export type RequestUser = { _id, email, firstName, lastName };

declare module 'fastify' {
  interface FastifyRequest {
    tenantPayload: StandardPayload & any;
    user?: RequestUser
  }
}