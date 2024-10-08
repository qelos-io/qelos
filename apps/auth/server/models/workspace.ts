import mongoose, { Schema, Types, Document } from 'mongoose';

export type Invite = { email: string; phone: string; name: string; created?: Date };

export interface IWorkspace extends Document {
  name: string;
  tenant: string;
  logo?: string;
  members: { user: Types.ObjectId | string; roles: string[]; created?: Date }[];
  labels: string[];
  invites: Invite[];
  created?: Date;
}

export const WorkspaceSchema = new mongoose.Schema<IWorkspace>({
  name: {
    type: String,
    required: true
  },
  tenant: {
    type: String,
    index: true,
    default: '0',
    required: true
  },
  logo: {
    type: String,
  },
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roles: [{ type: String, required: true }],
    created: { type: Date, default: Date.now }
  }],
  labels: [{ type: String, required: true }],
  invites: [{
    email: { type: String },
    phone: { type: String },
    name: { type: String },
    created: { type: Date, default: Date.now }
  }],
  created: { type: Date, default: Date.now }
});

const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
export default Workspace