import mongoose, { Document, Schema } from 'mongoose';
import { IIntegration as IIntegrationBase, IIntegrationEntity as IIntegrationEntityBase } from '@qelos/global-types';

export interface IIntegrationEntity extends Omit<IIntegrationEntityBase, 'source'>, Document {
  source: mongoose.Schema.Types.ObjectId;
}

interface IIntegration extends Omit<IIntegrationBase, '_id' | 'trigger' | 'target'>, Document {
  trigger: IIntegrationEntity;
  target: IIntegrationEntity;
}

const IntegrationEntitySchema = new Schema<IIntegrationEntity>({
  source: {
    type: Schema.Types.ObjectId,
    ref: 'IntegrationSource',
    required: true,
  },
  operation: {
    type: String,
    required: true,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

const IntegrationSchema = new Schema<IIntegration>({
  tenant: {
    type: String,
    index: true,
    required: true,
  },
  plugin: {
    type: Schema.Types.ObjectId,
    ref: 'Plugin',
  },
  user: {
    type: String,
    required: true,
  },
  kind: [String],
  trigger: IntegrationEntitySchema,
  target: IntegrationEntitySchema,
  created: {
    type: Date,
    default: Date.now,
  },
});

const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);

export default Integration;
