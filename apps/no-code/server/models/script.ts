import mongoose, { Document } from 'mongoose'

export type IScript = {
  tenant: string;
  /** Extension-less path, e.g. `utils/demo` for `./utils/demo.ts` */
  identifier: string;
  description: string;
  /** Original source (ts/js) */
  content: string;
  compiledContent: {
    js: string;
  };
  created: Date;
  updated: Date;
} & Document

const ScriptSchema = new mongoose.Schema<IScript>({
  tenant: {
    type: String,
    required: true
  },
  identifier: {
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

ScriptSchema.index({ tenant: 1, identifier: 1 }, { unique: true });

const Script = mongoose.model<IScript>('Script', ScriptSchema);

export default Script;
