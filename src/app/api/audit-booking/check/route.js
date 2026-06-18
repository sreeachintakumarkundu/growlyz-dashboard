import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditBooking from '@/lib/models/AuditBooking';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Public — check if a date+timeSlot is available (not already booked)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date     = searchParams.get('date');
  const timeSlot = searchParams.get('timeSlot');

  if (!date) {
    return NextResponse.json({ message: 'date required' }, { status: 400, headers: CORS });
  }

  await connectDB();

  // If no timeSlot → return all taken slots for the date (for rendering the grid)
  if (!timeSlot) {
    const bookings = await AuditBooking.find(
      { date, status: { $nin: ['cancelled'] } },
    ).select('timeSlot').lean();
    const taken = bookings.map(b => b.timeSlot);
    return NextResponse.json({ taken }, { headers: CORS });
  }

  // If both date + timeSlot → check specific slot
  const existing = await AuditBooking.findOne({
    date,
    timeSlot,
    status: { $nin: ['cancelled'] },
  }).lean();

  return NextResponse.json({ available: !existing }, { headers: CORS });
}
