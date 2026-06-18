import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import DailyMetrics from '@/lib/models/DailyMetrics';
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

  const clientFilter = { role: { $nin: ['admin', 'super_admin'] } };

  const [totalClients, activeClients, spendAgg, msgAgg, resultsAgg] = await Promise.all([
    User.countDocuments(clientFilter),
    User.countDocuments({ ...clientFilter, isActive: true }),
    DailyMetrics.aggregate([{ $group: { _id: null, total: { $sum: '$adCost' } } }]),
    DailyMetrics.aggregate([{ $group: { _id: null, total: { $sum: '$messages' } } }]),
    DailyMetrics.aggregate([{ $group: { _id: null, total: { $sum: '$results' } } }]),
  ]);

  return NextResponse.json({
    totalClients,
    activeClients,
    suspendedClients: totalClients - activeClients,
    totalSpend:    spendAgg[0]?.total ?? 0,
    totalMessages: msgAgg[0]?.total ?? 0,
    totalResults:  resultsAgg[0]?.total ?? 0,
  });
}
