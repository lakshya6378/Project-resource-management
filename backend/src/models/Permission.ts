import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission extends Document {
  code: string;
  description?: string;
}

const permissionSchema = new Schema<IPermission>(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPermission>('Permission', permissionSchema);
