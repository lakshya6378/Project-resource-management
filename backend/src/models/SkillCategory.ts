import mongoose, { Document, Schema } from 'mongoose';

export interface ISkillCategory extends Document {
  name: string;
  description?: string;
}

const skillCategorySchema = new Schema<ISkillCategory>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ISkillCategory>('SkillCategory', skillCategorySchema);
