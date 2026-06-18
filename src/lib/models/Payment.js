import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    clientId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentType:       { type: String, enum: ['service-fee','ad-spend','commission','hybrid','other'], default: 'service-fee' },
    subscriptionType:  { type: String, enum: ['one-time','monthly','commission','hybrid'], default: 'one-time' },
    amount:            { type: Number, default: 0 },     // BDT paid
    dollarAmount:      { type: Number, default: 0 },     // USD purchased
    dollarRate:        { type: Number, default: 0 },     // BDT per USD
    dollarSpent:       { type: Number, default: 0 },     // USD spent on ads
    liveBudget:        { type: Number, default: 0 },     // current running ad budget USD
    commissionPercent: { type: Number, default: 0 },
    commissionAmount:  { type: Number, default: 0 },     // commission earned BDT
    productsSold:      { type: Number, default: 0 },
    revenueGenerated:  { type: Number, default: 0 },     // revenue BDT
    dueAmount:         { type: Number, default: 0 },     // outstanding BDT
    method:            { type: String, default: '' },
    transactionId:     { type: String, default: '' },
    notes:             { type: String, default: '' },
    status:            { type: String, enum: ['paid','pending','failed','partial'], default: 'paid' },
    addedBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PaymentSchema.index({ clientId: 1, createdAt: -1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
