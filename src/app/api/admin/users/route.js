export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getToken, verifyToken } from '@/lib/auth';

async function adminGuard(req) {
  const token = getToken(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

export async function GET(req) {
  const admin = await adminGuard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    const query = phone ? { phone: { $regex: phone, $options: 'i' } } : {};
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const admin = await adminGuard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

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
      { message: 'Client created successfully', user: { _id: user._id, phone: user.phone, name: user.name, email: user.email, package: user.package, createdAt: user.createdAt } },
      { status: 201 }
    );
  } catch (err) {
    console.error('Admin create user error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
