export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import DailyMetrics from '@/lib/models/DailyMetrics';
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
  const clientId = searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ message: 'clientId required' }, { status: 400 });

  const metrics = await DailyMetrics.find({ userId: clientId })
    .sort({ date: -1 })
    .limit(30);

  return NextResponse.json({ metrics });
}

export async function POST(req) {
  const admin = superAdminGuard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  await connectDB();

  const { clientId, date, adCost, messages, results, notes } = await req.json();
  if (!clientId || !date) {
    return NextResponse.json({ message: 'clientId and date required' }, { status: 400 });
  }

  const client = await User.findById(clientId).select('-password');
  if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

  const metrics = await DailyMetrics.findOneAndUpdate(
    { userId: clientId, date },
    {
      userId: clientId,
      date,
      adCost: adCost ?? 0,
      messages: messages ?? 0,
      results: results ?? 0,
      notes: notes || '',
      updatedBy: admin.userId,
    },
    { upsert: true, new: true }
  );

  await ActivityLog.create({
    adminId: admin.userId,
    action: 'update_metrics',
    targetId: client._id,
    targetName: client.name || client.phone,
    details: `Updated metrics for ${client.name || client.phone} on ${date} — $${adCost ?? 0} spend, ${messages ?? 0} messages, ${results ?? 0} results`,
  });

  return NextResponse.json({ message: 'Metrics saved', metrics });
}
