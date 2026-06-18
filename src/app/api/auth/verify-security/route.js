export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// Verify Gmail + security question + answer — does NOT reset password
export async function POST(req) {
  try {
    const { email, securityQuestion, securityAnswer } = await req.json();

    if (!email?.trim() || !securityQuestion?.trim() || !securityAnswer?.trim()) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return NextResponse.json({ message: 'No account found with this Gmail address' }, { status: 404 });

    const questionMatch = user.securityQuestion?.trim().toLowerCase() === securityQuestion.trim().toLowerCase();
    const answerMatch   = user.securityAnswer?.trim().toLowerCase()   === securityAnswer.trim().toLowerCase();

    if (!questionMatch || !answerMatch) {
      return NextResponse.json({ message: 'Security question or answer is incorrect.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Verified' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
