export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getToken, verifyToken } from '@/lib/auth';

function getUser(req) {
  const token = getToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(req) {
  const decoded = getUser(req);
  if (!decoded) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('avatar');
  if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validate type
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ message: 'Only JPG, PNG, WebP, or GIF allowed' }, { status: 400 });
  }
  // Validate size (2MB)
  if (buffer.length > 2 * 1024 * 1024) {
    return NextResponse.json({ message: 'Image must be under 2MB' }, { status: 400 });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `avatar_${decoded.userId}_${Date.now()}.${ext}`;
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  await writeFile(join(uploadDir, filename), buffer);

  const imageUrl = `/uploads/${filename}`;
  await connectDB();
  await User.findByIdAndUpdate(decoded.userId, { $set: { profileImage: imageUrl } });

  return NextResponse.json({ imageUrl });
}
