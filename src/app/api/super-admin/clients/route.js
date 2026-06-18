import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
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

  const clients = await User.aggregate([
    { $match: { role: { $nin: ['admin', 'super_admin'] } } },
    {
      $lookup: {
        from: 'dailymetrics',
        let: { uid: '$_id' },
        pipeline: [{ $match: { $expr: { $eq: ['$userId', '$$uid'] } } }],
        as: 'metricsData',
      },
    },
    {
      $addFields: {
        totalSpend:    { $sum: '$metricsData.adCost' },
        totalMessages: { $sum: '$metricsData.messages' },
        totalResults:  { $sum: '$metricsData.results' },
        lastUpdated:   { $max: '$metricsData.updatedAt' },
      },
    },
    { $project: { password: 0, metricsData: 0 } },
    { $sort: { createdAt: -1 } },
  ]);

  return NextResponse.json({ clients });
}

export async function POST(req) {
  if (!superAdminGuard(req)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { phone, password, name, email, pkg } = await req.json();

    if (!phone?.trim()) return NextResponse.json({ message: 'Phone is required' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });

    await connectDB();

    if (await User.findOne({ phone: phone.trim() })) {
      return NextResponse.json({ message: 'This phone number is already registered' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      phone: phone.trim(),
      password: hashed,
      name: name?.trim() || '',
      email: email?.trim().toLowerCase() || '',
      package: pkg?.trim() || '',
    });

    return NextResponse.json(
      { message: 'Client created successfully', user: { _id: user._id, phone: user.phone, name: user.name, email: user.email, package: user.package, isActive: user.isActive, createdAt: user.createdAt, totalSpend: 0, totalMessages: 0, totalResults: 0, lastUpdated: null } },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
