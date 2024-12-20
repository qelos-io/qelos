import mongoose, { Document } from 'mongoose'

export enum IntegrationSourceKind {
  Qelos = 'qelos',
  OpenAI = 'openai',
  SMTP = 'smtp',
  N8n = 'n8n',
  Supabase = 'supabase',
}

export interface IIntegrationSource extends Document {
  tenant: string;
  plugin?: mongoose.Schema.Types.ObjectId;
  user: string;
  authentication: string;
  name: string;
  labels: string[];
  kind: IntegrationSourceKind;
  created: Date;
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
