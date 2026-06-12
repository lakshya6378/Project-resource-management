import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployeeSkill extends Document {
  resourceId: mongoose.Types.ObjectId; // points to User
  skillId: mongoose.Types.ObjectId;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
}

const employeeSkillSchema = new Schema<IEmployeeSkill>(
  {
    resourceId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    proficiency: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'EXPERT'], required: true },
  },
  { timestamps: true }
);

employeeSkillSchema.index({ resourceId: 1, skillId: 1 }, { unique: true });

export default mongoose.model<IEmployeeSkill>('EmployeeSkill', employeeSkillSchema);
