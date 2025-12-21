import mongoose, {Document} from 'mongoose'

export interface IEvent extends Document {
  tenant: string;
  user?: string;
  source: string;
  kind: string;
  eventName: string;
  description: string;
  metadata: any;
  created: Date;
}

const EventSchema = new mongoose.Schema<IEvent>({
  tenant: {
    type: String,
    required: true
  },
  user: {
    type: String,
  },
  source: {
    type: String,
    required: true
  },
  kind: {
    type: String,
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  description: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created: {
    type: Date,
    default: Date.now,
  }
});

// Index for the specific query pattern with proper sort order
EventSchema.index({ tenant: 1, kind: 1, eventName: 1, source: 1, created: -1 });

// Supporting indexes for other query patterns
EventSchema.index({ tenant: 1, source: 1, kind: 1, eventName: 1 });

const PlatformEvent = mongoose.model<IEvent>('Event', EventSchema);

export default PlatformEvent;
