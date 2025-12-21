import mongoose, { Document } from 'mongoose'

export interface IAuditItem {
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface IAuditInfo {
  created: IAuditItem
  updated?: IAuditItem
}

export interface IBlueprintEntity extends Document {
  tenant: string;
  identifier: string;
  blueprint: string;
  user: mongoose.Schema.Types.ObjectId;
  workspace: mongoose.Schema.Types.ObjectId;
  metadata: any;
  indexes: string[];
  created: Date;
  updated: Date;
  auditInfo: IAuditInfo;
}

const BlueprintEntitySchema = new mongoose.Schema<IBlueprintEntity>({
  tenant: {
    type: String,
    required: true
  },
  identifier: {
    type: String,
    required: true,
    validate(value: string) {
      if (value.includes(' ')) {
        throw new Error('Invalid identifier');
      }
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    required: false,
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
  indexes: [{
    type: String,
    required: true,
  }],
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  auditInfo: {
    created: {
      ip: String,
      userAgent: String,
      timestamp: {
        type: Date,
      },
    },
    updated: {
      ip: String,
      userAgent: String,
      timestamp: {
        type: Date,
      },
    }
  }
});

BlueprintEntitySchema.index({ tenant: 1, blueprint: 1, created: 1 });
BlueprintEntitySchema.index({ tenant: 1, blueprint: 1, identifier: 1 }, { unique: true });
BlueprintEntitySchema.index({ tenant: 1, indexes: 1 });

const BlueprintEntity = mongoose.model<IBlueprintEntity>('BlueprintEntity', BlueprintEntitySchema);

export default BlueprintEntity;
