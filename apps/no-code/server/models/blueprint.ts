import mongoose, { Document } from 'mongoose'

enum EntityIdentifierMechanism {
  OBJECT_ID = 'objectid',
  GUID = 'guid'
}

export enum BlueprintPropertyType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  TIME = 'time'
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
  roleBased: string[],
  workspaceRoleBased: string[],
}

export interface IBlueprint extends Document {
  tenant: string;
  identifier: string,
  name: string,
  description?: string,
  entityIdentifierMechanism: EntityIdentifierMechanism,
  permissions: Array<Partial<IPermissionsDescriptor>>,
  permissionScope: PermissionScope,
  properties: Record<string, {
    title: string,
    type: BlueprintPropertyType,
    description: string,
    required: boolean,
    enum?: string[],
    multi?: boolean,
    min?: number,
    max?: number,
  }>,
  updateMapping: Record<string, string>,
  relations: { key: string, target: string }[],
  created: Date;
  updated: Date;
}

const BlueprintSchema = new mongoose.Schema<IBlueprint>({
  tenant: {
    type: String,
    index: true,
    required: true
  },
  identifier: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  entityIdentifierMechanism: {
    type: String,
    required: true,
    default: () => EntityIdentifierMechanism.OBJECT_ID,
    enum: Object.values(EntityIdentifierMechanism)
  },
  permissions: [{
    scope: {
      type: String,
      enum: Object.values(PermissionScope)
    },
    operation: {
      type: String,
      enum: Object.values(CRUDOperation)
    },
    roleBased: [String],
    workspaceRoleBased: [String]
  }],
  permissionScope: {
    type: String,
    enum: Object.values(PermissionScope)
  },
  properties: mongoose.SchemaTypes.Mixed,
  relations: [{
    key: String,
    target: String
  }],
  updateMapping: mongoose.SchemaTypes.Mixed,
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  }
});

BlueprintSchema.index({ tenant: 1, identifier: 1 }, { unique: true });

const Blueprint = mongoose.model<IBlueprint>('Blueprint', BlueprintSchema);

export default Blueprint;
