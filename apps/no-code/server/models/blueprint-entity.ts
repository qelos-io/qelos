import mongoose, { Document } from 'mongoose'

export interface IBlueprintEntity extends Document {
  tenant: string;
  identifier: string;
  blueprint: string;
  user: mongoose.Schema.Types.ObjectId;
  workspace: mongoose.Schema.Types.ObjectId;
  metadata: any;
  created: Date,
  updated: Date,
}

const BlueprintEntitySchema = new mongoose.Schema<IBlueprintEntity>({
  tenant: {
    type: String,
    index: true,
    required: true
  },
  identifier: {
    type: String,
    required: true,
    validate(value: string) {
      if (!value.match(/^[a-zA-Z0-9_]+$/)) {
        throw new Error('Invalid identifier');
      }
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    required: true,
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    required: false,
  },
  blueprint: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: () => ({})
  },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  }
});

BlueprintEntitySchema.index({ tenant: 1, blueprint: 1 });
BlueprintEntitySchema.index({ tenant: 1, blueprint: 1, identifier: 1 }, { unique: true });

const BlueprintEntity = mongoose.model<IBlueprintEntity>('BlueprintEntity', BlueprintEntitySchema);

export default BlueprintEntity;
