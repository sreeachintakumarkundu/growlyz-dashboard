import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Campaign from '@/lib/models/Campaign';
import { verifyToken, getToken } from '@/lib/auth';

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
  const { name, objective, budget, spend, ctr, cpc, messages, results, roas, status, startDate, notes } = body;

  await connectDB();
  const campaign = await Campaign.findByIdAndUpdate(
    params.id,
    {
      $set: {
        name: name?.trim(),
        objective: objective?.trim() || '',
        budget:   parseFloat(budget)   || 0,
        spend:    parseFloat(spend)    || 0,
        ctr:      parseFloat(ctr)      || 0,
        cpc:      parseFloat(cpc)      || 0,
        messages: parseInt(messages)   || 0,
        results:  parseInt(results)    || 0,
        roas:     parseFloat(roas)     || 0,
        status:   status || 'active',
        startDate: startDate || null,
        notes:    notes?.trim() || '',
      },
    },
    { new: true }
  );
  if (!campaign) return NextResponse.json({ message: 'Campaign not found' }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function DELETE(req, { params }) {
  if (!guard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();
  await Campaign.findByIdAndDelete(params.id);
  return NextResponse.json({ message: 'Deleted' });
}
