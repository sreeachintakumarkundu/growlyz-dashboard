import mongoose from 'mongoose';

const NoteEntrySchema = new mongoose.Schema({
  text:    { type: String, required: true },
  savedAt: { type: Date, default: Date.now },
}, { _id: false });

const AuditBookingSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    date:        { type: String, required: true },
    timeSlot:    { type: String, required: true },
    status:      { type: String, enum: ['new', 'contacted', 'completed', 'cancelled'], default: 'new' },
    notes:       { type: String, default: '' },
    noteHistory: { type: [NoteEntrySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.AuditBooking || mongoose.model('AuditBooking', AuditBookingSchema);
