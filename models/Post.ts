import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  author_id: mongoose.Types.ObjectId;
  title: string;
  content?: string;
  scheduled_at?: Date;
  status: 'taslak' | 'kuyruk' | 'planlandi' | 'yayinlandi' | 'basarisiz' | 'rededildi' | 'onay_bekliyor';
  retry_count: number;
  last_error?: string;
  platforms: string[];
  caption?: string;
  tone?: string;
  account_id?: mongoose.Types.ObjectId;
  mode?: 'manuel' | 'otomatik';
  user_prompt?: string;
  generated_content?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema({
  author_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 500
  },
  content: {
    type: String
  },
  scheduled_at: {
    type: Date
  },
  status: {
    type: String,
    enum: ['taslak', 'kuyruk', 'planlandi', 'yayinlandi', 'basarisiz', 'rededildi', 'onay_bekliyor'],
    default: 'taslak'
  },
  retry_count: {
    type: Number,
    default: 0
  },
  last_error: {
    type: String
  },
  platforms: [{
    type: String
  }],
  caption: {
    type: String
  },
  tone: {
    type: String,
    maxlength: 100
  },
  account_id: {
    type: Schema.Types.ObjectId,
    ref: 'Account'
  },
  mode: {
    type: String,
    enum: ['manuel', 'otomatik'],
    default: 'manuel'
  },
  user_prompt: {
    type: String
  },
  generated_content: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
PostSchema.index({ author_id: 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ scheduled_at: 1 });
PostSchema.index({ account_id: 1 });
PostSchema.index({ author_id: 1, status: 1 }); // Compound index for user's posts by status
PostSchema.index({ status: 1, scheduled_at: 1 }); // For querying scheduled posts
PostSchema.index({ mode: 1 });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);