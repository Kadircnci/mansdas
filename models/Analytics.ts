import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  user_id: mongoose.Types.ObjectId;
  post_id?: mongoose.Types.ObjectId;
  account_id?: mongoose.Types.ObjectId;
  metric_type: 'post_created' | 'post_published' | 'post_failed' | 'account_connected' | 'login' | 'api_call';
  platform?: 'instagram' | 'twitter' | 'facebook' | 'linkedin';
  value?: number;
  metadata?: {
    error_message?: string;
    response_time?: number;
    user_agent?: string;
    ip_address?: string;
    additional_data?: any;
  };
  date: Date;
  createdAt: Date;
}

const AnalyticsSchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post_id: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  account_id: {
    type: Schema.Types.ObjectId,
    ref: 'Account'
  },
  metric_type: {
    type: String,
    required: true,
    enum: ['post_created', 'post_published', 'post_failed', 'account_connected', 'login', 'api_call']
  },
  platform: {
    type: String,
    enum: ['instagram', 'twitter', 'facebook', 'linkedin']
  },
  value: {
    type: Number,
    default: 1
  },
  metadata: {
    error_message: { type: String },
    response_time: { type: Number },
    user_agent: { type: String },
    ip_address: { type: String },
    additional_data: { type: Schema.Types.Mixed }
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for analytics queries
AnalyticsSchema.index({ user_id: 1 });
AnalyticsSchema.index({ metric_type: 1 });
AnalyticsSchema.index({ date: -1 });
AnalyticsSchema.index({ user_id: 1, metric_type: 1, date: -1 });
AnalyticsSchema.index({ platform: 1, date: -1 });
AnalyticsSchema.index({ post_id: 1 });
AnalyticsSchema.index({ account_id: 1 });

// TTL index for data retention (keep analytics for 1 year)
AnalyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export default mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);