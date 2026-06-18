export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
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

  const payment = await Payment.findById(params.id);
  if (!payment) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const body = await req.json();
  const fields = ['paymentType','subscriptionType','amount','dollarAmount','dollarRate',
    'dollarSpent','liveBudget','commissionPercent','commissionAmount','productsSold',
    'revenueGenerated','dueAmount','method','transactionId','notes','status'];

  fields.forEach(f => {
    if (body[f] !== undefined) {
      payment[f] = ['amount','dollarAmount','dollarRate','dollarSpent','liveBudget',
        'commissionPercent','commissionAmount','productsSold','revenueGenerated','dueAmount'].includes(f)
        ? parseFloat(body[f]) || 0
        : body[f];
    }
  });

  await payment.save();
  return NextResponse.json({ message: 'Payment updated', payment });
}

export async function DELETE(req, { params }) {
  const admin = guard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();

  const payment = await Payment.findByIdAndDelete(params.id);
  if (!payment) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const client = await User.findById(payment.clientId).select('name phone');
  await ActivityLog.create({
    adminId: admin.userId,
    action: 'payment_deleted',
    targetId: payment.clientId,
    targetName: client?.name || client?.phone || '',
    details: `Deleted payment of ৳${payment.amount} for ${client?.name || client?.phone || payment.clientId}`,
  });

  return NextResponse.json({ message: 'Payment deleted' });
}
