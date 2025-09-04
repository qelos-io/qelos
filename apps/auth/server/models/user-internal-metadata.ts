import mongoose, {Schema} from 'mongoose';

// Use type assertion to avoid complex union type error
const UserInternalMetadataSchema = new mongoose.Schema<any, any>({
  tenant: {
    type: String,
    index: true,
    default: '0',
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: Schema.Types.Mixed
});

UserInternalMetadataSchema.index({tenant: 1, user: 1}, {unique: true});

// Use a more robust type assertion to avoid complex union type error
const UserInternalMetadata = mongoose.model('UserInternalMetadata', UserInternalMetadataSchema) as unknown as mongoose.Model<{ metadata?: any, user: Schema.Types.ObjectId, tenant: string }>;
export default UserInternalMetadata

