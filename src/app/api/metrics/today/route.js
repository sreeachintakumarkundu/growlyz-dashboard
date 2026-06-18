export const dynamic = 'force-dynamic';
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
    const today = new Date().toISOString().split('T')[0];
    const metrics = await DailyMetrics.findOne({ userId: decoded.userId, date: today });

    return NextResponse.json({
      date: today,
      metrics: metrics
        ? {
            adCost: metrics.adCost,
            messages: metrics.messages,
            results: metrics.results,
            notes: metrics.notes,
          }
        : { adCost: 0, messages: 0, results: 0, notes: '' },
    });
  } catch (err) {
    console.error('Today metrics error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
