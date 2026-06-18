import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import DailyMetrics from '@/lib/models/DailyMetrics';
import ActivityLog from '@/lib/models/ActivityLog';
import { getToken, verifyToken } from '@/lib/auth';

function superAdminGuard(req) {
  const token = getToken(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !['admin', 'super_admin'].includes(decoded.role)) return null;
  return decoded;
}

export async function PATCH(req, { params }) {
  const admin = superAdminGuard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  const { id } = params;
  await connectDB();

  const client = await User.findById(id).select('-password');
  if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === 'edit') {
    const { name, email, businessName, website, fbPage, adAccountId, pixelId, notes, country, clientStatus } = body;
    const pkg = body.package;
    const monthlyBudget = body.monthlyBudget;

    if (name !== undefined)         client.name = name.trim();
    if (email !== undefined)        client.email = email.trim();
    if (pkg !== undefined)          client.package = pkg.trim();
    if (businessName !== undefined) client.businessName = businessName.trim();
    if (website !== undefined)      client.website = website.trim();
    if (fbPage !== undefined)       client.fbPage = fbPage.trim();
    if (adAccountId !== undefined)  client.adAccountId = adAccountId.trim();
    if (pixelId !== undefined)      client.pixelId = pixelId.trim();
    if (notes !== undefined)        client.notes = notes;
    if (country !== undefined)      client.country = country;
    if (monthlyBudget !== undefined) client.monthlyBudget = parseFloat(monthlyBudget) || 0;
    if (clientStatus !== undefined) {
      client.clientStatus = clientStatus;
      if (clientStatus === 'paused' || clientStatus === 'suspended') {
        client.isActive = false;
      } else if (clientStatus === 'active' || clientStatus === 'vip') {
        client.isActive = true;
      }
    }

    await client.save();

    await ActivityLog.create({
      adminId: admin.userId,
      action: 'edit_client',
      targetId: client._id,
      targetName: client.name || client.phone,
      details: `Edited profile for ${client.name || client.phone} (${client.phone})`,
    });

    return NextResponse.json({ message: 'Client updated', client });
  }

  if (action === 'toggleStatus') {
    const newStatus = !!body.isActive;
    client.isActive = newStatus;
    await client.save();

    const actionKey = newStatus ? 'activate_client' : 'suspend_client';
    const verb = newStatus ? 'Activated' : 'Suspended';

    await ActivityLog.create({
      adminId: admin.userId,
      action: actionKey,
      targetId: client._id,
      targetName: client.name || client.phone,
      details: `${verb} client ${client.name || client.phone} (${client.phone})`,
    });

    return NextResponse.json({ message: `Client ${verb.toLowerCase()}`, client });
  }

  return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req, { params }) {
  const admin = superAdminGuard(req);
  if (!admin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  const { id } = params;
  await connectDB();

  const client = await User.findById(id).select('-password');
  if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 });

  const displayName = client.name || client.phone;

  await Promise.all([
    User.findByIdAndDelete(id),
    DailyMetrics.deleteMany({ userId: id }),
  ]);

  await ActivityLog.create({
    adminId: admin.userId,
    action: 'delete_client',
    targetName: displayName,
    details: `Deleted client ${displayName} (${client.phone}) and all their metrics`,
  });

  return NextResponse.json({ message: 'Client deleted' });
}
