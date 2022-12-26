import {StandardPayload} from './handlers';

declare module 'fastify' {
  interface FastifyRequest {
    tenantPayload: StandardPayload & any;
    user?: { email, firstName, lastName }
  }
}