export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getToken, verifyToken } from '@/lib/auth';

export async function GET(req) {
  try {
    const token = getToken(req);
    if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid session' }, { status: 401 });

    await connectDB();
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    return NextResponse.json({
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        profileImage: user.profileImage || '',
        businessName: user.businessName || '',
        website: user.website || '',
        fbPage: user.fbPage || '',
        bio: user.bio || '',
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
