import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
import Subscription from '@/lib/models/Subscription';
import { getToken, verifyToken } from '@/lib/auth';

export async function GET(req) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ message: 'Invalid session' }, { status: 401 });

  await connectDB();
  const clientId = decoded.userId;

  const [payments, subscription] = await Promise.all([
    Payment.find({ clientId }).sort({ createdAt: -1 }),
    Subscription.findOne({ clientId }),
  ]);

  const summary = {
    totalPaid:            payments.reduce((s, p) => s + (p.amount || 0), 0),
    totalDollarPurchased: payments.reduce((s, p) => s + (p.dollarAmount || 0), 0),
    totalDollarSpent:     payments.reduce((s, p) => s + (p.dollarSpent || 0), 0),
    totalDue:             payments.reduce((s, p) => s + (p.dueAmount || 0), 0),
    currentLiveBudget:    payments[0]?.liveBudget || 0,
    lastPaymentDate:      payments[0]?.createdAt || null,
  };

  return NextResponse.json({ payments, subscription, summary });
}
