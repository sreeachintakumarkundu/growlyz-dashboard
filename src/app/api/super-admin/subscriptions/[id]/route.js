export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subscription from '@/lib/models/Subscription';
import ActivityLog from '@/lib/models/ActivityLog';
import User from '@/lib/models/User';
import { getToken, verifyToken } from '@/lib/auth';

function guard(req) {
  const token = getToken(req);
  if (!token) return null;
  const d = verifyToken(token);
  if (!d || !['admin', 'super_admin'].includes(d.role)) return null;
  return d;
}

export async function PATCH(req, { params }) {
  const admin = guard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();

  const sub = await Subscription.findById(params.id);
  if (!sub) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const body = await req.json();
  const fields = ['planType','planName','monthlyFee','commissionPercent','commissionFixed',
    'duration','startDate','renewalDate','status','dollarRate','notes'];

  fields.forEach(f => {
    if (body[f] !== undefined) {
      sub[f] = ['monthlyFee','commissionPercent','commissionFixed','duration','dollarRate'].includes(f)
        ? parseFloat(body[f]) || 0 : body[f];
    }
  });

  await sub.save();

  const client = await User.findById(sub.clientId).select('name phone');
  await ActivityLog.create({
    adminId: admin.userId,
    action: 'subscription_updated',
    targetId: sub.clientId,
    targetName: client?.name || client?.phone || '',
    details: `Updated subscription plan for ${client?.name || client?.phone}`,
  });

  return NextResponse.json({ message: 'Subscription updated', subscription: sub });
}

export async function DELETE(req, { params }) {
  const admin = guard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();

  const sub = await Subscription.findByIdAndDelete(params.id);
  if (!sub) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  return NextResponse.json({ message: 'Subscription deleted' });
}
