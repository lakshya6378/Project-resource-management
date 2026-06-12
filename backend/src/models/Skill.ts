import mongoose, { Document, Schema } from 'mongoose';

export interface ISkill extends Document {
  name: string;
  categoryId: mongoose.Types.ObjectId;
}

const skillSchema = new Schema<ISkill>(
  {
    name: { type: String, required: true, unique: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'SkillCategory', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISkill>('Skill', skillSchema);
