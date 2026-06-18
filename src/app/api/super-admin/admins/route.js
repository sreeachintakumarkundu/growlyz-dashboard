import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getToken, verifyToken } from '@/lib/auth';

function superAdminOnly(req) {
  const token = getToken(req);
  if (!token) return null;
  const d = verifyToken(token);
  return d?.role === 'super_admin' ? d : null;
}

export async function GET(req) {
  if (!superAdminOnly(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  await connectDB();
  const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } })
    .select('-password -resetOtp -resetOtpExpiry -securityAnswer')
    .sort({ createdAt: -1 });
  return NextResponse.json({ admins });
}

export async function POST(req) {
  if (!superAdminOnly(req)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  const { phone, name, email, password, permissions } = await req.json();
  if (!phone?.trim() || !password) {
    return NextResponse.json({ message: 'Phone and password are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
  }

  await connectDB();
  if (await User.findOne({ phone: phone.trim() })) {
    return NextResponse.json({ message: 'This phone number is already registered' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await User.create({
    phone: phone.trim(),
    name: name?.trim() || '',
    email: email?.trim().toLowerCase() || '',
    password: hashed,
    role: 'admin',
    permissions: permissions || [],
  });

  const { password: _, ...safe } = admin.toObject();
  return NextResponse.json({ admin: safe }, { status: 201 });
}
