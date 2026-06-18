import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform:  { type: String, enum: ['facebook', 'google', 'tiktok'], required: true },
  name:      { type: String, required: true, trim: true },
  objective: { type: String, trim: true, default: '' },
  budget:    { type: Number, default: 0 },
  spend:     { type: Number, default: 0 },
  ctr:       { type: Number, default: 0 },
  cpc:       { type: Number, default: 0 },
  messages:  { type: Number, default: 0 },
  results:   { type: Number, default: 0 },
  roas:      { type: Number, default: 0 },
  status:    { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
  startDate: { type: Date, default: null },
  notes:     { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
