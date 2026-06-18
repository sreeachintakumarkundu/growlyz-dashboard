export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendOtpEmail } from '@/lib/email';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ message: 'Gmail address is required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return NextResponse.json({ message: 'No account found with this Gmail address' }, { status: 404 });
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.updateOne({ _id: user._id }, { $set: { resetOtp: otp, resetOtpExpiry: expiry } });

    await sendOtpEmail(user.email, otp);

    const [localPart, domain] = user.email.split('@');
    const maskedEmail = localPart.slice(0, 2) + '***@' + domain;

    return NextResponse.json({ message: 'OTP sent successfully', maskedEmail });
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ message: 'Failed to send OTP. Please try again.' }, { status: 500 });
  }
}
