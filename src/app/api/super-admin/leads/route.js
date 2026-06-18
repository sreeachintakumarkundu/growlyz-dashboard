export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/lib/models/Lead';
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
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ message: 'clientId required' }, { status: 400 });
  await connectDB();
  const leads = await Lead.find({ clientId }).sort({ createdAt: -1 });
  return NextResponse.json({ leads });
}

export async function POST(req) {
  if (!guard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const { clientId, source, name, phone, email, product, quantity, price, status, notes } = await req.json();
  if (!clientId || !source) return NextResponse.json({ message: 'clientId and source required' }, { status: 400 });
  await connectDB();
  const lead = await Lead.create({
    clientId, source, name: name?.trim() || '', phone: phone?.trim() || '',
    email: email?.trim() || '', product: product?.trim() || '',
    quantity: parseInt(quantity) || 1, price: parseFloat(price) || 0,
    status: status || 'new', notes: notes?.trim() || '',
  });
  return NextResponse.json({ lead }, { status: 201 });
}
