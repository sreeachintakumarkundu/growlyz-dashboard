export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
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

  const payments = await Payment.find({ clientId }).sort({ createdAt: -1 });

  const summary = {
    totalPaid:            payments.reduce((s, p) => s + (p.amount || 0), 0),
    totalDollarPurchased: payments.reduce((s, p) => s + (p.dollarAmount || 0), 0),
    totalDollarSpent:     payments.reduce((s, p) => s + (p.dollarSpent || 0), 0),
    totalDue:             payments.reduce((s, p) => s + (p.dueAmount || 0), 0),
    totalCommission:      payments.reduce((s, p) => s + (p.commissionAmount || 0), 0),
    totalProductsSold:    payments.reduce((s, p) => s + (p.productsSold || 0), 0),
    totalRevenue:         payments.reduce((s, p) => s + (p.revenueGenerated || 0), 0),
    currentLiveBudget:    payments[0]?.liveBudget || 0,
  };

  return NextResponse.json({ payments, summary });
}

export async function POST(req) {
  const admin = guard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();

  const body = await req.json();
  const { clientId, amount, dollarAmount, dollarRate, dollarSpent, liveBudget,
    paymentType, subscriptionType, commissionPercent, commissionAmount,
    productsSold, revenueGenerated, dueAmount, method, transactionId, notes, status } = body;

  if (!clientId) return NextResponse.json({ message: 'clientId required' }, { status: 400 });

  const client = await User.findById(clientId).select('-password');
  if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

  const payment = await Payment.create({
    clientId, paymentType, subscriptionType,
    amount:            parseFloat(amount) || 0,
    dollarAmount:      parseFloat(dollarAmount) || 0,
    dollarRate:        parseFloat(dollarRate) || 0,
    dollarSpent:       parseFloat(dollarSpent) || 0,
    liveBudget:        parseFloat(liveBudget) || 0,
    commissionPercent: parseFloat(commissionPercent) || 0,
    commissionAmount:  parseFloat(commissionAmount) || 0,
    productsSold:      parseInt(productsSold) || 0,
    revenueGenerated:  parseFloat(revenueGenerated) || 0,
    dueAmount:         parseFloat(dueAmount) || 0,
    method:            method || '',
    transactionId:     transactionId || '',
    notes:             notes || '',
    status:            status || 'paid',
    addedBy:           admin.userId,
  });

  await ActivityLog.create({
    adminId: admin.userId,
    action: 'payment_added',
    targetId: client._id,
    targetName: client.name || client.phone,
    details: `Payment ৳${parseFloat(amount)||0} (${status||'paid'}) added for ${client.name || client.phone}`,
  });

  return NextResponse.json({ message: 'Payment recorded', payment }, { status: 201 });
}
