import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    phone:         { type: String, required: true, unique: true, trim: true },
    name:          { type: String, trim: true, default: '' },
    email:         { type: String, trim: true, default: '' },
    package:       { type: String, trim: true, default: '' },
    password:      { type: String, required: true, minlength: 6 },
    role:          { type: String, enum: ['user', 'admin', 'super_admin'], default: 'user' },
    isActive:      { type: Boolean, default: true },
    businessName:  { type: String, trim: true, default: '' },
    website:       { type: String, trim: true, default: '' },
    fbPage:        { type: String, trim: true, default: '' },
    adAccountId:   { type: String, trim: true, default: '' },
    pixelId:       { type: String, trim: true, default: '' },
    notes:         { type: String, default: '' },
    monthlyBudget: { type: Number, default: 0 },
    country:       { type: String, default: 'Bangladesh' },
    clientStatus:  { type: String, enum: ['active', 'paused', 'suspended', 'vip'], default: 'active' },
    resetOtp:        { type: String, default: null },
    resetOtpExpiry:  { type: Date, default: null },
    securityQuestion:{ type: String, default: '' },
    securityAnswer:  { type: String, default: '' },
    profileImage:    { type: String, default: '' },
    bio:             { type: String, default: '' },
    permissions:     { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
