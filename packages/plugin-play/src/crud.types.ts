import { FastifyRequest } from 'fastify/types/request';
import { FastifyReply } from 'fastify/types/reply';
export type Crud = {
  name: string,
  display: {
    name: string;
    plural: string;
    capitalized: string;
    capitalizedPlural: string;
  },
  identifierKey: string,
  schema?: any,
  searchQuery?: boolean,
  searchPlaceholder?: string,
}

export interface Screen {
  roles?: string[];
  workspaceRoles?: string[];
  workspaceLabels?: string[];
  use?: string;
  structure?: string;
  searchQuery?: boolean;
  searchPlaceholder?: string;
  navigateAfterSubmit?: {
    name: string,
    params: Record<string, string>,
    query: Record<string, string>,
  },
  clearAfterSubmit?: boolean,
}

export interface ResourceProperty<T = any> {
  public?: boolean;
  hideInList?: boolean;
  type?: String | Number | Boolean | Object | null | Array<T>;
  schema?: ResourceSchema | ResourceProperty<T>;
  validate?: (value: any) => boolean | Promise<boolean>;
  options?: Array<any>;
  ref?: string;
}

// @ts-ignore
export type ResourceSchema = Record<string, ResourceProperty>;

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
    list: false | Screen;
    create: false | Screen;
    edit: false | Screen;
    view: false | Screen;
  },
  schema?: ResourceSchema,
  dispatchPrefix?: string | false,
  verify?: (request: FastifyRequest, reply: FastifyReply) => Promise<any>;
  createOne: (body: Partial<ResourceInsertData>, request: FastifyRequest, reply: FastifyReply) => (any | Promise<ResourcePublicData>),
  readOne: (id: string, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData>);
  readMany: (query: Record<string, string | string[]>, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData[]>);
  updateOne: (id: string, body: Partial<ResourceInsertData>, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData>);
  deleteOne: (id: string, request: FastifyRequest, reply: FastifyReply) => (Promise<ResourcePublicData>);
}
