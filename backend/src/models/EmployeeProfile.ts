import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployeeProfile extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  departmentId: mongoose.Types.ObjectId;
  designationId: mongoose.Types.ObjectId;
  joiningDate?: Date;
}

const employeeProfileSchema = new Schema<IEmployeeProfile>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    designationId: { type: Schema.Types.ObjectId, ref: 'Designation', required: true },
    joiningDate: { type: Date, default: Date.now },
  },
  { timestamps: true, _id: false } // we define _id explicitly so disable auto _id generation just in case, though mongoose handles it if explicitly defined
);

// We need to re-enable _id generation behavior? No, we provide it.
// Actually, setting _id in schema is enough. We don't need _id: false.
employeeProfileSchema.set('_id', true);

export default mongoose.model<IEmployeeProfile>('EmployeeProfile', employeeProfileSchema);
