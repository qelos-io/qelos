export enum EntityIdentifierMechanism {
  OBJECT_ID = 'objectid',
  GUID = 'guid'
}

export enum BlueprintPropertyType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  TIME = 'time',
  OBJECT = 'object'
}

export enum PermissionScope {
  USER = 'user',
  WORKSPACE = 'workspace',
  TENANT = 'tenant'
}

export enum CRUDOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete'
}

export interface IPermissionsDescriptor {
  scope: PermissionScope,
  operation: CRUDOperation,
  guest: boolean,
  roleBased: string[],
  workspaceRoleBased: string[],
  workspaceLabelsBased: string[],
}

export interface IBlueprintPropertyDescriptor {
  title: string,
  type: BlueprintPropertyType,
  description: string,
  required: boolean,
  enum?: string[],
  multi?: boolean,
  min?: number,
  max?: number,
  schema?: any;
}

export interface IBlueprintLimitation {
  scope: PermissionScope;
  workspaceLabels: string[];
  roles: string[];
  properties?: string[];
  value: number;
}

export interface IBlueprint {
  tenant: string;
  identifier: string;
  name: string;
  description?: string;
  entityIdentifierMechanism: EntityIdentifierMechanism;
  permissions: Array<Partial<IPermissionsDescriptor>>;
  permissionScope: PermissionScope;
  properties: Record<string, IBlueprintPropertyDescriptor>;
  updateMapping: Record<string, string>;
  relations: { key: string, target: string }[];
  limitations?: Array<IBlueprintLimitation>;
  dispatchers: {
    create: boolean,
    update: boolean,
    delete: boolean
  };
  created: Date;
  updated: Date;
  workspaceLabelsBased?: string[];
}