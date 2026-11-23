import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sidHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revoked: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
