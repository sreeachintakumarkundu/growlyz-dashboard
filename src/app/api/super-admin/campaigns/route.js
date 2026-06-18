export const dynamic = 'force-dynamic';
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

export async function GET(req) {
  if (!guard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const platform = searchParams.get('platform');
  if (!clientId) return NextResponse.json({ message: 'clientId required' }, { status: 400 });

  await connectDB();
  const filter = { clientId };
  if (platform) filter.platform = platform;
  const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });
  return NextResponse.json({ campaigns });
}

export async function POST(req) {
  if (!guard(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { clientId, platform, name, objective, budget, spend, ctr, cpc, messages, results, roas, status, startDate, notes } = body;

  if (!clientId || !platform || !name?.trim()) {
    return NextResponse.json({ message: 'clientId, platform, and name are required' }, { status: 400 });
  }

  await connectDB();
  const campaign = await Campaign.create({
    clientId, platform, name: name.trim(),
    objective: objective?.trim() || '',
    budget: parseFloat(budget) || 0,
    spend:  parseFloat(spend)  || 0,
    ctr:    parseFloat(ctr)    || 0,
    cpc:    parseFloat(cpc)    || 0,
    messages: parseInt(messages) || 0,
    results:  parseInt(results)  || 0,
    roas:     parseFloat(roas)   || 0,
    status:   status || 'active',
    startDate: startDate || null,
    notes: notes?.trim() || '',
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
