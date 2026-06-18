export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getToken, verifyToken } from '@/lib/auth';

function getUser(req) {
  const token = getToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req) {
  const decoded = getUser(req);
  if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(decoded.userId).select('-password -resetOtp -resetOtpExpiry -securityAnswer');
  if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PUT(req) {
  const decoded = getUser(req);
  if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { name, email, businessName, website, fbPage, bio, profileImage } = await req.json();

  await connectDB();
  const updated = await User.findByIdAndUpdate(
    decoded.userId,
    {
      $set: {
        name:         name?.trim()         ?? undefined,
        email:        email?.trim().toLowerCase() ?? undefined,
        businessName: businessName?.trim() ?? undefined,
        website:      website?.trim()      ?? undefined,
        fbPage:       fbPage?.trim()       ?? undefined,
        bio:          bio?.trim()          ?? undefined,
        ...(profileImage !== undefined && { profileImage }),
      },
    },
    { new: true }
  ).select('-password -resetOtp -resetOtpExpiry -securityAnswer');

  return NextResponse.json({ user: updated });
}
