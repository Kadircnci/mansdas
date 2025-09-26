import mongoose, { Document, Schema } from 'mongoose';

export interface IAccount extends Document {
  owner_id: mongoose.Types.ObjectId;
  platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin';
  external_id: string;
  name?: string;
  username?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: Date;
  is_active: boolean;
  profile_picture?: string;
  followers_count?: number;
  last_sync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema: Schema = new Schema({
  owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['instagram', 'twitter', 'facebook', 'linkedin']
  },
  external_id: {
    type: String,
    required: true,
    maxlength: 255
  },
  name: {
    type: String,
    maxlength: 255
  },
  username: {
    type: String,
    maxlength: 255
  },
  access_token: {
    type: String
  },
  refresh_token: {
    type: String
  },
  expires_at: {
    type: Date
  },
  is_active: {
    type: Boolean,
    default: true
  },
  profile_picture: {
    type: String
  },
  followers_count: {
    type: Number,
    default: 0
  },
  last_sync: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
AccountSchema.index({ owner_id: 1 });
AccountSchema.index({ platform: 1 });
AccountSchema.index({ external_id: 1 });
AccountSchema.index({ owner_id: 1, platform: 1 }, { unique: true }); // Compound index to prevent duplicate accounts per user per platform
AccountSchema.index({ is_active: 1 });
AccountSchema.index({ expires_at: 1 });

export default mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);