import mongoose, { Document, Schema } from 'mongoose';

// Define the message interface
interface IMessage {
  role: string;
  content: string;
  timestamp: Date;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
  function_call?: any;
  message_id?: string; // Unique identifier for message correlation
}

interface IMessageSummary {
  fromIndex: number;
  toIndex: number;
  summary: string;
}

// Define the thread interface
export interface IThread extends Document {
  integration: mongoose.Types.ObjectId;
  title?: string;
  messages: IMessage[];
  messageSummaries: IMessageSummary[];
  created: Date;
  updated: Date;
  user: mongoose.Types.ObjectId;
  workspace?: mongoose.Types.ObjectId;
  codeInterpreterContainerId?: string;
  codeInterpreterContainerExpiresAt?: Date;
}

// Define the message schema
const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, required: true }, // 'user', 'assistant', 'system', 'tool', etc.
    content: { type: String, required: false }, // Content can be empty for function calls
    timestamp: { type: Date, default: Date.now },
    tool_calls: { type: Schema.Types.Mixed, required: false }, // For function calling
    name: { type: String, required: false }, // For tool messages
    tool_call_id: { type: String, required: false }, // For tool messages
    function_call: { type: Schema.Types.Mixed, required: false }, // For legacy function calling
    message_id: { type: String, required: false } // Unique identifier for message correlation
  },
  { _id: false, strict: false } // Don't create _id for subdocuments and allow additional fields
);

// Define the message summary schema
const MessageSummarySchema = new Schema<IMessageSummary>(
  {
    fromIndex: { type: Number, required: true },
    toIndex: { type: Number, required: true },
    summary: { type: String, required: true }
  },
  { _id: false } // Don't create _id for subdocuments
);

// Define the thread schema
const ThreadSchema = new Schema<IThread>(
  {
    integration: { type: Schema.Types.ObjectId, required: true, ref: 'Integration' },
    title: { type: String, required: false },
    messages: { type: [MessageSchema], default: [] },
    messageSummaries: { type: [MessageSummarySchema], default: [] },
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace' },
    codeInterpreterContainerId: { type: String, required: false },
    codeInterpreterContainerExpiresAt: { type: Date, required: false },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now }
  },
  {
    timestamps: { createdAt: 'created', updatedAt: 'updated' },
    versionKey: false
  }
);

ThreadSchema.pre('save', function (next) {
  this.updated = new Date();
  next();
});

// add indexes
ThreadSchema.index({ integration: 1 });
ThreadSchema.index({ user: 1 });
ThreadSchema.index({ workspace: 1 });

// Create and export the Thread model
export const Thread = mongoose.model<IThread>('Thread', ThreadSchema);
