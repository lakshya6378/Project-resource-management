import mongoose, { Document, Schema } from 'mongoose';
import { IDepartment } from './Department';

export interface IDesignation extends Document {
  title: string;
  departmentId: mongoose.Types.ObjectId | IDepartment;
}

const designationSchema = new Schema<IDesignation>(
  {
    title: { type: String, required: true, unique: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDesignation>('Designation', designationSchema);
