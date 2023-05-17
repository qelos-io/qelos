import {FastifyRequest} from 'fastify/types/request';
import {FastifyReply} from 'fastify/types/reply';

export type Crud = {
  name: string,
  display: {
    name: string;
    plural: string;
    capitalized: string;
    capitalizedPlural: string;
  }
}

export interface Screen {
  use?: string;
  structure?: string;
}

export interface ICrudOptions<ResourcePublicData, ResourceInsertData> {
  name?: string;
  identifierKey?: string;
  display: {
    name: string;
    plural?: string;
    capitalized?: string;
    capitalizedPlural?: string;
  },
  nav?: {
    iconName?: string;
    iconSvg?: string;
    priority?: number;
  },
  screens?: {
    list: Screen;
    create: Screen;
    edit: Screen;
  },
  publicKeys?: string[];
  verify?: (request: FastifyRequest, reply: FastifyReply) => Promise<any>;
  createOne: (body: Partial<ResourceInsertData>, request: FastifyRequest, reply: FastifyReply) => (any | Promise<ResourcePublicData>),
  readOne: (id: string, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData>);
  readMany: (query: Record<string, string | string[]>, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData[]>);
  updateOne: (id: string, body: Partial<ResourceInsertData>, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData>);
  deleteOne: (id: string, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData>);
}
