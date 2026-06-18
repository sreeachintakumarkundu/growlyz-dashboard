import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// Step 1: find account by Gmail or phone
export async function PUT(req) {
  try {
    const { identity } = await req.json();
    if (!identity?.trim()) {
      return NextResponse.json({ message: 'Gmail or phone number is required' }, { status: 400 });
    }

    await connectDB();

    const val = identity.trim();
    const isEmail = val.includes('@');
    const user = isEmail
      ? await User.findOne({ email: val.toLowerCase() })
      : await User.findOne({ phone: val });

    if (!user) {
      return NextResponse.json({ message: 'No account found. Check your Gmail or phone number.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Account found', email: user.email });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// Step 2: verify selected question + answer, then reset password
export async function POST(req) {
  try {
    const { email, securityQuestion, securityAnswer, newPassword } = await req.json();

    if (!email?.trim() || !securityQuestion?.trim() || !securityAnswer?.trim() || !newPassword) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return NextResponse.json({ message: 'No account found with this Gmail address' }, { status: 404 });

    const questionMatch = user.securityQuestion?.trim().toLowerCase() === securityQuestion.trim().toLowerCase();
    const answerMatch = user.securityAnswer?.trim().toLowerCase() === securityAnswer.trim().toLowerCase();

    if (!questionMatch || !answerMatch) {
      return NextResponse.json({ message: 'Security question or answer is incorrect.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed } });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error. Please try again.' }, { status: 500 });
  }
}
