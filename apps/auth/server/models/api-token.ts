import mongoose, { Document, Schema } from 'mongoose';

export interface IApiToken {
  _id?: any;
  tenant: string;
  user: mongoose.Types.ObjectId;
  workspace?: mongoose.Types.ObjectId;
  nickname: string;
  token: string;
  tokenPrefix: string;
  expiresAt: Date;
  lastUsedAt?: Date;
  created: Date;
}

export type ApiTokenDocument = Document & IApiToken;

const ApiTokenSchema = new Schema({
  tenant: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
  nickname: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  tokenPrefix: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  lastUsedAt: { type: Date, default: null },
  created: { type: Date, default: Date.now },
});

ApiTokenSchema.index({ tenant: 1, user: 1 });
ApiTokenSchema.index({ token: 1 }, { unique: true });
ApiTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Use a type assertion to avoid complex union type error
const ApiToken = mongoose.model('ApiToken', ApiTokenSchema) as unknown as mongoose.Model<IApiToken>;
export default ApiToken;
