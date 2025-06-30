import mongoose, { Document } from 'mongoose'
export type IComponent = {
  tenant: string;
  identifier: string;
  componentName: string;
  description: string;
  content: string;
  compiledContent: {
    js: string;
    css: string;
  };
  created: Date;
  updated: Date;
} & Document

const ComponentSchema = new mongoose.Schema<IComponent>({
  tenant: {
    type: String,
    index: true,
    required: true
  },
  identifier: {
    type: String,
    required: true
  },
  componentName: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  content: {
    type: String,
    required: true,
  },
  compiledContent: {
    js: String,
    css: String,
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

ComponentSchema.index({ tenant: 1, identifier: 1 }, { unique: true });

const Component = mongoose.model<IComponent>('Component', ComponentSchema);

export default Component;
