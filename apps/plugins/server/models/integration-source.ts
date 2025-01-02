import { IntegrationSourceKind, IIntegrationSource as IIntegrationSourceBase } from '@qelos/global-types';
import mongoose, { Document } from 'mongoose'

export interface IIntegrationSource extends Omit<IIntegrationSourceBase, 'plugin'>, Document {
  plugin?: string | mongoose.Schema.Types.ObjectId;
}

const IntegrationSourceSchema = new mongoose.Schema<IIntegrationSource>({
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
  authentication: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => {}
  },
  name: {
    type: String,
    required: true
  },
  labels: {
    type: [String],
    default: []
  },
  kind: {
    type: String,
    enum: Object.values(IntegrationSourceKind),
    required: true
  },
  created: {
    type: Date,
    default: Date.now,
  }
});

IntegrationSourceSchema.index({ tenant: 1 });
IntegrationSourceSchema.index({ tenant: 1, kind: 1 });
const IntegrationSource = mongoose.model<IIntegrationSource>('IntegrationSource', IntegrationSourceSchema);


export default IntegrationSource;
