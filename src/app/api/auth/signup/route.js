import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken, setCookieOptions } from '@/lib/auth';

export async function POST(req) {
  try {
    const { phone, password, name, email, securityQuestion, securityAnswer } = await req.json();

    if (!phone?.trim() || !password) {
      return NextResponse.json(
        { message: 'Phone and password are required' },
        { status: 400 }
      );
    }
    if (!email?.trim()) {
      return NextResponse.json(
        { message: 'Gmail address is required' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    if (await User.findOne({ phone: phone.trim() })) {
      return NextResponse.json(
        { message: 'This phone number is already registered' },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      phone: phone.trim(),
      password: hashed,
      name: name?.trim() || '',
      email: email.trim().toLowerCase(),
      securityQuestion: securityQuestion?.trim() || '',
      securityAnswer: securityAnswer?.trim() || '',
    });

    const token = signToken({ userId: user._id.toString(), role: user.role });

    const res = NextResponse.json(
      {
        message: 'Account created successfully',
        user: { id: user._id, phone: user.phone, name: user.name, role: user.role },
      },
      { status: 201 }
    );

    res.cookies.set('gz_token', token, setCookieOptions());
    return res;
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ message: 'Server error. Please try again.' }, { status: 500 });
  }
}
