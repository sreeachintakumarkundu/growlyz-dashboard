import mongoose from 'mongoose';

const DailyMetricsSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:     { type: String, required: true }, // YYYY-MM-DD
    adCost:   { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    results:  { type: Number, default: 0 },
    notes:    { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DailyMetricsSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyMetrics ||
  mongoose.model('DailyMetrics', DailyMetricsSchema);
