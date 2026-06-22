import mongoose, { Document, Schema } from 'mongoose';

export interface IBlacklistedToken extends Document {
  token: string;
  createdAt: Date;
}

const blacklistedTokenSchema = new Schema<IBlacklistedToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // automatically delete documents after 24 hours (86400 seconds)
    },
  }
);

export default mongoose.model<IBlacklistedToken>('BlacklistedToken', blacklistedTokenSchema);
