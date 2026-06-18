import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema(
  {
    adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminName:  { type: String, default: '' },
    action:     { type: String, required: true },
    targetId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetName: { type: String, default: '' },
    details:    { type: String, default: '' },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
