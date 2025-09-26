import mongoose, { Document, Schema } from 'mongoose';

export interface IContent extends Document {
  author_id: mongoose.Types.ObjectId;
  title: string;
  content_text?: string;
  mode: string;
  tone?: string;
  user_prompt?: string;
  generated_content?: string;
  platforms: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema: Schema = new Schema({
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
  content_text: {
    type: String
  },
  mode: {
    type: String,
    required: true,
    maxlength: 50
  },
  tone: {
    type: String,
    maxlength: 100
  },
  user_prompt: {
    type: String
  },
  generated_content: {
    type: String
  },
  platforms: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for better performance
ContentSchema.index({ author_id: 1 });
ContentSchema.index({ mode: 1 });

export default mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);