import mongoose, { Document } from 'mongoose'

export interface IIntegration extends Document {
  tenant: string;
  plugin?: mongoose.Schema.Types.ObjectId;
  user: string;
  kind: string[];
  trigger: IIntegrationEntity;
  target: IIntegrationEntity;
  created: Date;
}

export interface IIntegrationEntity {
  source: mongoose.Schema.Types.ObjectId,
  operation: string,
  details: any;
}

const IntegrationEntitySchema = new mongoose.Schema<IIntegrationEntity>({
  source: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntegrationSource',
    required: true,
  },
  operation: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  }
});

const IntegrationSchema = new mongoose.Schema<IIntegration>({
  tenant: {
    type: String,
    index: true,
    required: true
  },
  plugin: {
    type: mongoose.Schema.Types.ObjectId,
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
  }
});

const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);

export default Integration;
