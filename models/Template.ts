import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplate extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  content: string;
  tone?: string;
  platform?: 'instagram' | 'twitter' | 'facebook' | 'linkedin';
  category?: string;
  tags: string[];
  is_public: boolean;
  usage_count: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 500
  },
  content: {
    type: String,
    required: true
  },
  tone: {
    type: String,
    maxlength: 50
  },
  platform: {
    type: String,
    enum: ['instagram', 'twitter', 'facebook', 'linkedin']
  },
  category: {
    type: String,
    maxlength: 100
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  is_public: {
    type: Boolean,
    default: false
  },
  usage_count: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Indexes for template queries
TemplateSchema.index({ user_id: 1 });
TemplateSchema.index({ platform: 1 });
TemplateSchema.index({ category: 1 });
TemplateSchema.index({ tags: 1 });
TemplateSchema.index({ is_public: 1 });
TemplateSchema.index({ usage_count: -1 });
TemplateSchema.index({ rating: -1 });
TemplateSchema.index({ title: 'text', description: 'text', content: 'text' }); // Text search

export default mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);