/**
 * seed.js — Run with:  node seed.js
 * Adds 10 demo clients + 7 days of metrics each.
 * All accounts use password: demo123
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');

/* Read MONGODB_URI from .env.local (Atlas cluster), fall back to localhost. */
function readEnvUri() {
  try {
    const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    const line = env.split('\n').find(l => /^\s*MONGODB_URI\s*=/.test(l));
    if (line) return line.replace(/^\s*MONGODB_URI\s*=/, '').trim();
  } catch { /* no .env.local — use default */ }
  return 'mongodb://localhost:27017/growlyz-dashboard';
}

const MONGODB_URI = process.env.MONGODB_URI || readEnvUri();

/* ── Schemas (inline so we don't need transpilation) ── */
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
  { timestamps: true }
);

const DailyMetricsSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:     { type: String, required: true },
    adCost:   { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    results:  { type: Number, default: 0 },
    notes:    { type: String, default: '' },
  },
  { timestamps: true }
);
DailyMetricsSchema.index({ userId: 1, date: 1 }, { unique: true });

const User        = mongoose.models.User        || mongoose.model('User', UserSchema);
const DailyMetrics = mongoose.models.DailyMetrics || mongoose.model('DailyMetrics', DailyMetricsSchema);

/* ── Demo client data ── */
const DEMO_CLIENTS = [
  { name: 'Rahat Ahmed',       phone: '+8801711000001', email: 'rahat@demo.com',    package: 'Starter',    adRange: [15, 40],  msgRange: [30, 80],  resRange: [3, 12]  },
  { name: 'Sania Akter',       phone: '+8801811000002', email: 'sania@demo.com',    package: 'Pro',        adRange: [60, 120], msgRange: [90, 200], resRange: [10, 30] },
  { name: 'Karim Mia',         phone: '+8801911000003', email: 'karim@demo.com',    package: 'Enterprise', adRange: [200, 450],msgRange: [300, 600],resRange: [40, 90] },
  { name: 'Nadia Hossain',     phone: '+8801611000004', email: 'nadia@demo.com',    package: 'Starter',    adRange: [10, 35],  msgRange: [20, 60],  resRange: [2, 8]   },
  { name: 'Rafiqul Islam',     phone: '+8801711000005', email: 'rafiqul@demo.com',  package: 'Pro',        adRange: [70, 140], msgRange: [100, 220],resRange: [12, 35] },
  { name: 'Mehjabin Chowdhury',phone: '+8801811000006', email: 'mehjabin@demo.com', package: 'Starter',    adRange: [12, 38],  msgRange: [25, 70],  resRange: [2, 10]  },
  { name: 'Arif Hossain',      phone: '+8801911000007', email: 'arif@demo.com',     package: 'Pro',        adRange: [55, 130], msgRange: [85, 190], resRange: [9, 28]  },
  { name: 'Shirin Akter',      phone: '+8801611000008', email: 'shirin@demo.com',   package: 'Enterprise', adRange: [180, 420],msgRange: [280, 560],resRange: [35, 80] },
  { name: 'Mahmudul Haq',      phone: '+8801711000009', email: 'mahmudul@demo.com', package: 'Starter',    adRange: [8, 30],   msgRange: [15, 50],  resRange: [1, 6]   },
  { name: 'Farhan Ahmed',      phone: '+8801811000010', email: 'farhan@demo.com',   package: 'Pro',        adRange: [65, 135], msgRange: [95, 210], resRange: [11, 32] },
];

/* ── Helpers ── */
function rnd(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/* ── Main ── */
async function seed() {
  console.log('\n🌱  GrowlyZ Demo Seeder\n');
  await mongoose.connect(MONGODB_URI, {
    serverApi: { version: '1', deprecationErrors: true },
  });
  console.log('✅  Connected to MongoDB\n');

  const hashed = await bcrypt.hash('demo123', 10);
  let created = 0, skipped = 0;

  for (const client of DEMO_CLIENTS) {
    const existing = await User.findOne({ phone: client.phone });
    if (existing) {
      console.log(`⏭️   Skipped  ${client.name.padEnd(22)} (already exists)`);
      skipped++;
      continue;
    }

    const user = await User.create({
      phone:    client.phone,
      name:     client.name,
      email:    client.email,
      package:  client.package,
      password: hashed,
      role:     'user',
      isActive: true,
    });

    // Add 7 days of metrics
    for (let day = 6; day >= 0; day--) {
      const [adMin, adMax]   = client.adRange;
      const [msgMin, msgMax] = client.msgRange;
      const [resMin, resMax] = client.resRange;

      await DailyMetrics.create({
        userId:   user._id,
        date:     dateStr(day),
        adCost:   rnd(adMin, adMax),
        messages: Math.round(rnd(msgMin, msgMax)),
        results:  Math.round(rnd(resMin, resMax)),
        notes:    day === 0 ? 'Campaign running smoothly.' : '',
      });
    }

    console.log(`✅  Created  ${client.name.padEnd(22)} [${client.package.padEnd(10)}]  ${client.phone}`);
    created++;
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`  Created : ${created}  |  Skipped : ${skipped}`);
  console.log(`  Password for all accounts: demo123`);
  console.log(`─────────────────────────────────────────\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
