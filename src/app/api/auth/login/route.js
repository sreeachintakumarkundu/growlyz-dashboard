export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken, setCookieOptions } from '@/lib/auth';

export async function POST(req) {
  try {
    const { phone, password } = await req.json();

    if (!phone?.trim() || !password) {
      return NextResponse.json(
        { message: 'Phone and password are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ phone: phone.trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { message: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Account is disabled. Contact support.' },
        { status: 403 }
      );
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });

    const res = NextResponse.json({
      message: 'Logged in successfully',
      user: { id: user._id, phone: user.phone, name: user.name, role: user.role },
    });

    res.cookies.set('gz_token', token, setCookieOptions());
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Server error. Please try again.' }, { status: 500 });
  }
}
