export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditBooking from '@/lib/models/AuditBooking';
import { getToken, verifyToken } from '@/lib/auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function adminGuard(req) {
  const token = getToken(req);
  if (!token) return null;
  const d = verifyToken(token);
  if (!d || !['admin', 'super_admin'].includes(d.role)) return null;
  return d;
}

// Preflight for cross-origin requests from the marketing website
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Public — marketing website submits here
export async function POST(req) {
  try {
    await connectDB();
    const { name, phone, date, timeSlot } = await req.json();
    if (!name || !phone || !date || !timeSlot) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400, headers: CORS });
    }
    const booking = await AuditBooking.create({ name, phone, date, timeSlot });
    return NextResponse.json({ message: 'Booking saved', booking }, { status: 201, headers: CORS });
  } catch (err) {
    console.error('Audit booking error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500, headers: CORS });
  }
}

// Admin — list all bookings
export async function GET(req) {
  if (!adminGuard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();
  const bookings = await AuditBooking.find().sort({ createdAt: -1 });
  return NextResponse.json({ bookings });
}

// Admin — update status / notes (notes are appended to history, never overwritten)
export async function PATCH(req) {
  if (!adminGuard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();
  const { id, status, notes } = await req.json();

  const booking = await AuditBooking.findById(id);
  if (!booking) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  if (status !== undefined) booking.status = status;

  if (notes !== undefined) {
    const trimmed = notes.trim();
    // Only append to history if text is non-empty and different from the last entry
    const lastNote = booking.noteHistory[booking.noteHistory.length - 1];
    if (trimmed && trimmed !== (lastNote?.text || '')) {
      booking.noteHistory.push({ text: trimmed, savedAt: new Date() });
    }
    booking.notes = trimmed;
  }

  await booking.save();
  return NextResponse.json({ booking });
}

// Admin — delete a booking
export async function DELETE(req) {
  if (!adminGuard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
  await AuditBooking.findByIdAndDelete(id);
  return NextResponse.json({ message: 'Deleted' });
}
