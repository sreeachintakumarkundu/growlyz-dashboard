export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subscription from '@/lib/models/Subscription';
import User from '@/lib/models/User';
import ActivityLog from '@/lib/models/ActivityLog';
import { getToken, verifyToken } from '@/lib/auth';

function guard(req) {
  const token = getToken(req);
  if (!token) return null;
  const d = verifyToken(token);
  if (!d || !['admin', 'super_admin'].includes(d.role)) return null;
  return d;
}

export async function GET(req) {
  if (!guard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ message: 'clientId required' }, { status: 400 });

  const subscription = await Subscription.findOne({ clientId });
  return NextResponse.json({ subscription });
}

export async function POST(req) {
  const admin = guard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();

  const body = await req.json();
  const { clientId } = body;
  if (!clientId) return NextResponse.json({ message: 'clientId required' }, { status: 400 });

  const client = await User.findById(clientId).select('name phone');
  if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

  const subscription = await Subscription.findOneAndUpdate(
    { clientId },
    {
      clientId,
      planType:          body.planType || 'one-time',
      planName:          body.planName || '',
      monthlyFee:        parseFloat(body.monthlyFee) || 0,
      commissionPercent: parseFloat(body.commissionPercent) || 0,
      commissionFixed:   parseFloat(body.commissionFixed) || 0,
      duration:          parseInt(body.duration) || 1,
      startDate:         body.startDate || null,
      renewalDate:       body.renewalDate || null,
      status:            body.status || 'pending',
      dollarRate:        parseFloat(body.dollarRate) || 0,
      notes:             body.notes || '',
    },
    { upsert: true, new: true }
  );

  await ActivityLog.create({
    adminId: admin.userId,
    action: 'subscription_updated',
    targetId: client._id,
    targetName: client.name || client.phone,
    details: `Subscription set to "${body.planName || body.planType}" for ${client.name || client.phone}`,
  });

  return NextResponse.json({ message: 'Subscription saved', subscription }, { status: 201 });
}
