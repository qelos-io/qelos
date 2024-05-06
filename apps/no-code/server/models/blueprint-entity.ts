import mongoose, { Document } from 'mongoose'

export interface IBlueprintEntity extends Document {

}

const BlueprintEntitySchema = new mongoose.Schema<IBlueprintEntity>({
  tenant: {
    type: String,
    index: true,
    required: true
  },
  identifier: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
  },
  blueprint: {
    ref: 'Blueprint',
    type: mongoose.Schema.Types.ObjectId,
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

const BlueprintEntity = mongoose.model<IBlueprintEntity>('Blueprint', BlueprintEntitySchema);

export default BlueprintEntity;
