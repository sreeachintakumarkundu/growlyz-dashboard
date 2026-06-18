export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyMetrics from '@/lib/models/DailyMetrics';
import User from '@/lib/models/User';
import { getToken, verifyToken } from '@/lib/auth';

async function adminGuard(req) {
  const token = getToken(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function POST(req) {
  const admin = await adminGuard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  try {
    const { userId, date, adCost, messages, results, notes } = await req.json();
    if (!userId || !date) {
      return NextResponse.json({ message: 'userId and date required' }, { status: 400 });
    }

    await connectDB();

    if (!(await User.findById(userId))) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const metrics = await DailyMetrics.findOneAndUpdate(
      { userId, date },
      {
        userId,
        date,
        adCost: adCost ?? 0,
        messages: messages ?? 0,
        results: results ?? 0,
        notes: notes || '',
        updatedBy: admin.userId,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Metrics saved successfully', metrics });
  } catch (err) {
    console.error('Admin metrics POST error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function GET(req) {
  const admin = await adminGuard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ message: 'userId required' }, { status: 400 });
    }

    const metrics = await DailyMetrics.find({ userId })
      .sort({ date: -1 })
      .limit(30);

    return NextResponse.json({ metrics });
  } catch (err) {
    console.error('Admin metrics GET error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
