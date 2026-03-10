import mongoose, { Document } from 'mongoose';

export interface WebhookEventDocument extends Document {
  tenant: string;
  externalEventId: string;
  providerKind: string;
  eventType: string;
  processedAt: Date;
}

const WebhookEventSchema = new mongoose.Schema<any, any>({
  tenant: {
    type: String,
    required: true,
  },
  externalEventId: {
    type: String,
    required: true,
  },
  providerKind: {
    type: String,
    required: true,
  },
  eventType: {
    type: String,
    required: true,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
});

WebhookEventSchema.index({ tenant: 1, externalEventId: 1, providerKind: 1 }, { unique: true });

const WebhookEvent = mongoose.model('WebhookEvent', WebhookEventSchema) as unknown as mongoose.Model<WebhookEventDocument>;
export default WebhookEvent;
