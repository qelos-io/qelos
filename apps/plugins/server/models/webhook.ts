import { Schema, model } from 'mongoose';

const webhookSchema = new Schema({
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: 'IntegrationSource',
    required: true,
  },
  webhookId: {
    type: String,
    required: true,
    unique: true,
  },
  tenant: {
    type: String,
    required: true,
  },
});

export default model('Webhook', webhookSchema);
