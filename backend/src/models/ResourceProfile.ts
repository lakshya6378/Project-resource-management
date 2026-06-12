import mongoose, { Document, Schema } from 'mongoose';

export interface IResourceProfile extends Document {
  _id: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
  status: 'BENCH' | 'ALLOCATED' | 'INACTIVE';
  currentUtilisation: number;
}

const resourceProfileSchema = new Schema<IResourceProfile>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['BENCH', 'ALLOCATED', 'INACTIVE'], default: 'BENCH' },
    currentUtilisation: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true, _id: false }
);

resourceProfileSchema.set('_id', true);

export default mongoose.model<IResourceProfile>('ResourceProfile', resourceProfileSchema);
