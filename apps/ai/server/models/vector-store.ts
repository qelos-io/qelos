import mongoose, { Document, Schema } from 'mongoose';

export type VectorStoreScope = 'thread' | 'user' | 'workspace' | 'tenant';

// Define the vector store interface
export interface IVectorStore extends Document {
  scope: VectorStoreScope;
  subjectId?: mongoose.Types.ObjectId; // ID of thread/user/workspace, empty for tenant
  subjectModel?: string; // Model name for dynamic reference
  tenant: string;
  agent: mongoose.Types.ObjectId;
  externalId: string; // OpenAI vector store ID
  expirationAfterDays?: number;
  hardcodedIds?: string[]; // List of additional vector store IDs to use
  created: Date;
  updated: Date;
}

// Define the vector store schema
const VectorStoreSchema = new Schema<IVectorStore>(
  {
    scope: { 
      type: String, 
      required: true, 
      enum: ['thread', 'user', 'workspace', 'tenant'] 
    },
    subjectId: { 
      type: Schema.Types.ObjectId, 
      required: false,
      refPath: 'subjectModel' // Dynamic reference based on scope
    },
    subjectModel: {
      type: String,
      required: false,
      enum: ['Thread', 'User', 'Workspace']
    },
    tenant: { type: String, required: true },
    agent: { type: Schema.Types.ObjectId, required: true, ref: 'Integration' },
    externalId: { type: String, required: true },
    expirationAfterDays: { type: Number, required: false },
    hardcodedIds: [{ type: String }],
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now }
  },
  {
    timestamps: { createdAt: 'created', updatedAt: 'updated' },
    versionKey: false
  }
);

// Remove the pre-save hook since Mongoose timestamps handle updating automatically
// VectorStoreSchema.pre('save', function (next) {
//   this.updated = new Date();
//   next();
// });

// Add indexes for efficient queries
VectorStoreSchema.index({ scope: 1, subjectId: 1, tenant: 1 });
VectorStoreSchema.index({ agent: 1 });
VectorStoreSchema.index({ externalId: 1 });
VectorStoreSchema.index({ tenant: 1 });

// Create and export the VectorStore model
export const VectorStore = mongoose.model<IVectorStore>('VectorStore', VectorStoreSchema);
