import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email?: string;
  password_hash: string;
  role: 'admin' | 'user';
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    company?: string;
    website?: string;
    timezone?: string;
  };
  settings: {
    emailNotifications: boolean;
    autoPostApproval: boolean;
    defaultTone?: string;
    preferredLanguage: string;
  };
  subscription?: {
    plan: 'free' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'canceled';
    expiresAt?: Date;
  };
  lastLoginAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password_hash: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  profile: {
    firstName: { type: String, maxlength: 100 },
    lastName: { type: String, maxlength: 100 },
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    company: { type: String, maxlength: 200 },
    website: { type: String },
    timezone: { type: String, default: 'UTC' }
  },
  settings: {
    emailNotifications: { type: Boolean, default: true },
    autoPostApproval: { type: Boolean, default: false },
    defaultTone: { type: String },
    preferredLanguage: { type: String, default: 'tr' }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'canceled'],
      default: 'active'
    },
    expiresAt: { type: Date }
  },
  lastLoginAt: { type: Date },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ 'subscription.status': 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ lastLoginAt: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);