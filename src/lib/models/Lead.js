import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  clientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source:    { type: String, enum: ['messenger', 'whatsapp', 'website'], required: true },
  name:      { type: String, trim: true, default: '' },
  phone:     { type: String, trim: true, default: '' },
  email:     { type: String, trim: true, default: '' },
  product:   { type: String, trim: true, default: '' },
  quantity:  { type: Number, default: 1 },
  price:     { type: Number, default: 0 },
  status:    { type: String, enum: ['new', 'contacted', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'new' },
  notes:     { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);
