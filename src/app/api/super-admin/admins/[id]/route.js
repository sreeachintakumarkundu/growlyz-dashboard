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

export async function PUT(req, { params }) {
  const caller = superAdminOnly(req);
  if (!caller) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  const { name, email, permissions, password } = await req.json();

  await connectDB();
  const target = await User.findById(params.id);
  if (!target) return NextResponse.json({ message: 'Admin not found' }, { status: 404 });

  // Cannot demote or modify another super_admin
  if (target.role === 'super_admin' && target._id.toString() !== caller.userId) {
    return NextResponse.json({ message: 'Cannot modify another Super Admin' }, { status: 403 });
  }

  const update = {
    name: name?.trim() ?? target.name,
    email: email?.trim().toLowerCase() ?? target.email,
    permissions: permissions ?? target.permissions,
  };
  if (password && password.length >= 6) {
    update.password = await bcrypt.hash(password, 12);
  }

  const updated = await User.findByIdAndUpdate(params.id, { $set: update }, { new: true })
    .select('-password -resetOtp -resetOtpExpiry -securityAnswer');
  return NextResponse.json({ admin: updated });
}

export async function DELETE(req, { params }) {
  const caller = superAdminOnly(req);
  if (!caller) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  await connectDB();
  const target = await User.findById(params.id);
  if (!target) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  if (target.role === 'super_admin') {
    return NextResponse.json({ message: 'Cannot delete a Super Admin' }, { status: 403 });
  }
  if (target._id.toString() === caller.userId) {
    return NextResponse.json({ message: 'Cannot delete yourself' }, { status: 403 });
  }

  await User.findByIdAndDelete(params.id);
  return NextResponse.json({ message: 'Deleted' });
}
