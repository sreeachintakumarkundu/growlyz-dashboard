/**
 * make-superadmin.js — Create or promote a super-admin account.
 *
 * Usage:
 *   node make-superadmin.js                                  # defaults below
 *   node make-superadmin.js <phone> <password> [name]
 *   node make-superadmin.js +8801700000000 myStrongPass "Owner"
 *
 * If the phone already exists, it is promoted to super_admin and (optionally)
 * its password is reset to the one provided.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');

function readEnvUri() {
  try {
    const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    const line = env.split('\n').find(l => /^\s*MONGODB_URI\s*=/.test(l));
    if (line) return line.replace(/^\s*MONGODB_URI\s*=/, '').trim();
  } catch { /* fall through */ }
  return 'mongodb://localhost:27017/growlyz-dashboard';
}

const MONGODB_URI = process.env.MONGODB_URI || readEnvUri();

const phone    = process.argv[2] || '+8801700000000';
const password = process.argv[3] || 'superadmin123';
const name     = process.argv[4] || 'Super Admin';

const UserSchema = new mongoose.Schema(
  {
    phone:    { type: String, required: true, unique: true, trim: true },
    name:     { type: String, trim: true, default: '' },
    email:    { type: String, trim: true, default: '' },
    package:  { type: String, trim: true, default: '' },
    password: { type: String, required: true },
    role:     { type: String, enum: ['user', 'admin', 'super_admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false }
);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function run() {
  await mongoose.connect(MONGODB_URI, {
    serverApi: { version: '1', deprecationErrors: true },
  });
  console.log('✅  Connected to MongoDB');

  const hashed = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ phone });

  if (existing) {
    existing.role     = 'super_admin';
    existing.isActive = true;
    existing.password = hashed;
    await existing.save();
    console.log(`✅  Promoted existing account to super_admin: ${phone}`);
  } else {
    await User.create({ phone, name, password: hashed, role: 'super_admin', isActive: true });
    console.log(`✅  Created super_admin account: ${phone}`);
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`  Login phone    : ${phone}`);
  console.log(`  Login password : ${password}`);
  console.log(`  Then open      : /super-admin`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌  Failed:', err.message);
  process.exit(1);
});
