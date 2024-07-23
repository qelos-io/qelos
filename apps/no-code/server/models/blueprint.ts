import mongoose, { Document } from 'mongoose'
import {
  IBlueprint as IBlueprintType,
  CRUDOperation,
  EntityIdentifierMechanism,
  PermissionScope
} from '@qelos/global-types'

export type IBlueprint = IBlueprintType & Document

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
  dispatchers: {
    create: {
      type: Boolean,
      default: () => false
    },
    update: {
      type: Boolean,
      default: () => false
    },
    delete: {
      type: Boolean,
      default: () => false
    },
  },
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
