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
}

export interface IBlueprint extends Document {
  tenant: string;
  identifier: string,
  name: string,
  entityIdentifierMechanism: EntityIdentifierMechanism,
  permissions: Array<Partial<{
    kind: string,
    roleBased: [],
    workspaceRoleBased: [],

  }>>,
  properties: Record<string, {
    title: string,
    type: BlueprintPropertyType,
    description: string,
    required: boolean,
    enum?: string[],
    multi?: boolean,
    min?: number,
    max?: number,
  }>
  relations: { key: string, target: string }[],
  created: Date;
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
  entityIdentifierMechanism: {
    type: String,
    enum: Object.values(EntityIdentifierMechanism)
  },
  properties: mongoose.SchemaTypes.Mixed,
  relations: [{
    key: String,
    target: String
  }],
  created: {
    type: Date,
    default: Date.now,
  }
});

BlueprintSchema.index({ tenant: 1, identifier: 1 }, { unique: true });

const Blueprint = mongoose.model<IBlueprint>('Blueprint', BlueprintSchema);

export default Blueprint;
