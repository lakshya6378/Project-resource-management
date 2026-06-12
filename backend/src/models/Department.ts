import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDepartment>('Department', departmentSchema);
