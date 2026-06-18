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

export async function PUT(req, { params }) {
  if (!guard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  await connectDB();
  const lead = await Lead.findByIdAndUpdate(
    params.id,
    {
      $set: {
        name:     body.name?.trim()    ?? '',
        phone:    body.phone?.trim()   ?? '',
        email:    body.email?.trim()   ?? '',
        product:  body.product?.trim() ?? '',
        quantity: parseInt(body.quantity) || 1,
        price:    parseFloat(body.price)  || 0,
        status:   body.status || 'new',
        notes:    body.notes?.trim()   ?? '',
      },
    },
    { new: true }
  );
  if (!lead) return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function DELETE(req, { params }) {
  if (!guard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();
  await Lead.findByIdAndDelete(params.id);
  return NextResponse.json({ message: 'Deleted' });
}
