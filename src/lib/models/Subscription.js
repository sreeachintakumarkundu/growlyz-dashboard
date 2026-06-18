import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema(
  {
    clientId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    planType:          { type: String, enum: ['one-time','commission','hybrid'], default: 'one-time' },
    planName:          { type: String, default: '' },
    // Fees
    monthlyFee:        { type: Number, default: 0 },    // BDT (for one-time / hybrid)
    commissionPercent: { type: Number, default: 0 },    // % (for commission / hybrid)
    commissionFixed:   { type: Number, default: 0 },    // fixed BDT per product
    // Duration
    duration:          { type: Number, default: 1 },    // months
    startDate:         { type: Date },
    renewalDate:       { type: Date },
    // Status
    status:            { type: String, enum: ['paid','pending','overdue','expired'], default: 'pending' },
    // Rates
    dollarRate:        { type: Number, default: 0 },
    notes:             { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
