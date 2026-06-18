import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyMetrics from '@/lib/models/DailyMetrics';
import { getToken, verifyToken } from '@/lib/auth';

export async function GET(req) {
  try {
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid session' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days') || '7'), 30);

    const metrics = await DailyMetrics.find({ userId: decoded.userId })
      .sort({ date: -1 })
      .limit(days);

    return NextResponse.json({ metrics });
  } catch (err) {
    console.error('History metrics error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
