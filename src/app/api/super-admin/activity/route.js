export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';
import { getToken, verifyToken } from '@/lib/auth';

function superAdminGuard(req) {
  const token = getToken(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !['admin', 'super_admin'].includes(decoded.role)) return null;
  return decoded;
}

export async function GET(req) {
  if (!superAdminGuard(req)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const targetId = searchParams.get('targetId');

  const query = targetId ? { targetId: new mongoose.Types.ObjectId(targetId) } : {};

  const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(limit);

  return NextResponse.json({ logs });
}
