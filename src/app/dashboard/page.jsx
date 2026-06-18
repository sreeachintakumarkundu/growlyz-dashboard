'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playLogout } from '@/lib/sounds';
import GrowlyZLogo from '@/components/GrowlyZLogo';

/* ── Helpers ── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtShortDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function formatDate(d = new Date()) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── Status palettes ── */
const PAY_STATUS = {
  paid:    { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  color: '#34d399', label: 'Paid' },
  pending: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',  color: '#fbbf24', label: 'Pending' },
  failed:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',   color: '#f87171', label: 'Failed' },
  partial: { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)',  color: '#818cf8', label: 'Partial' },
};
const SUB_STATUS = {
  paid:    { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  color: '#34d399', label: 'Paid' },
  pending: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',  color: '#fbbf24', label: 'Pending' },
  overdue: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',   color: '#f87171', label: 'Overdue' },
  expired: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)', color: '#9ca3af', label: 'Expired' },
};
const PLAN_LABELS = { 'one-time': 'One-Time Package', commission: 'Commission Based', hybrid: 'Hybrid Plan' };

/* ── SVG Charts ── */
function AreaChart({ data = [], labels = [], color = '#FF7A00', height = 100 }) {
  if (!data.length) return <div className="flex items-center justify-center text-slate-600 text-sm" style={{ height }}>No data</div>;
  const w = 500, h = height, padL = 40, padR = 12, padT = 10, padB = 24;
  const max = Math.max(...data, 1);
  const cw = w - padL - padR, ch = h - padT - padB;
  const pts = data.map((v, i) => ({ x: padL + (i / Math.max(data.length - 1, 1)) * cw, y: padT + ch - (v / max) * ch, v }));
  const lineD = `M${pts.map(p => `${p.x},${p.y}`).join(' L')}`;
  const fillD = `M${pts[0].x},${padT + ch} L${pts.map(p => `${p.x},${p.y}`).join(' L')} L${pts[pts.length - 1].x},${padT + ch} Z`;
  const gid = `ac-${color.replace('#', '')}-${height}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gid})`} />
      <path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="rgba(15,23,42,0.8)" strokeWidth="1.5" />)}
      {labels.map((lbl, i) => {
        if (!pts[i]) return null;
        const step = Math.ceil(labels.length / 6);
        if (i % step !== 0 && i !== labels.length - 1) return null;
        return <text key={i} x={pts[i].x} y={h - 4} fill="rgba(148,163,184,0.5)" fontSize="9" textAnchor="middle">{lbl}</text>;
      })}
    </svg>
  );
}

function BarChart({ data = [], labels = [], color = '#FF7A00', height = 100 }) {
  if (!data.length) return <div className="flex items-center justify-center text-slate-600 text-sm" style={{ height }}>No data</div>;
  const max = Math.max(...data, 1);
  return (
    <div style={{ height }} className="flex items-end gap-1 px-1">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${labels[i] || i}: ${v}`}>
          <div className="w-full rounded-t transition-all duration-200 group-hover:opacity-80"
            style={{ height: `${Math.max((v / max) * 100, 2)}%`, background: `linear-gradient(to top, ${color}cc, ${color})`, minHeight: 2 }} />
        </div>
      ))}
    </div>
  );
}

function MiniSparkline({ data = [], color = '#FF7A00' }) {
  if (!data.length) return <div style={{ width: 80, height: 28 }} />;
  const w = 80, h = 28, pad = 2;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const pathD = `M${pts.join(' L')}`;
  const areaD = `M${pts[0]} L${pts.join(' L')} L${pts[pts.length - 1].split(',')[0]},${h} L${pts[0].split(',')[0]},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KPICard({ icon, label, value, sub, trend, trendValue, sparkData = [], color = '#FF7A00', loading = false }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/40 p-4 animate-pulse" style={{ background: 'rgba(30,41,59,0.5)' }}>
        <div className="h-3 w-16 bg-slate-700 rounded mb-3" />
        <div className="h-6 w-24 bg-slate-700 rounded mb-2" />
        <div className="h-2 w-12 bg-slate-700/60 rounded" />
      </div>
    );
  }
  const up = trend === 'up';
  const down = trend === 'down';
  return (
    <div className="rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.01]"
      style={{ background: 'rgba(30,41,59,0.5)', borderColor: 'rgba(51,65,85,0.5)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 18px ${color}18`; e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs text-slate-400 font-medium">{label}</span>
        </div>
        {sparkData.length > 1 && <MiniSparkline data={sparkData} color={color} />}
      </div>
      <div className="text-xl font-bold text-white tabular-nums mb-1">{value}</div>
      <div className="flex items-center gap-2">
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
        {(up || down) && trendValue && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

function InsightCard({ type, message }) {
  const styles = {
    warning: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', color: '#fbbf24', icon: '⚠️' },
    success: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', color: '#34d399', icon: '✅' },
    info:    { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)', color: '#818cf8', icon: 'ℹ️' },
    danger:  { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  color: '#f87171', icon: '🚨' },
  };
  const s = styles[type] || styles.info;
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="text-base flex-shrink-0 mt-0.5">{s.icon}</span>
      <span style={{ color: s.color }}>{message}</span>
    </div>
  );
}

function DonutChart({ paid, due, size = 120 }) {
  const total = (paid + due) || 1;
  const pct = paid / total;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const arc = pct * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="14" />
      {arc > 0 && (
        <circle cx="50" cy="50" r={r} fill="none" stroke="#34d399" strokeWidth="14"
          strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      )}
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{Math.round(pct * 100)}%</text>
      <text x="50" y="60" textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="9">Paid</text>
    </svg>
  );
}

/* ── Skeleton / Stat cards ── */
function SkeletonCard() {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-700" />
        <div className="h-4 w-28 bg-slate-700 rounded" />
      </div>
      <div className="h-8 w-20 bg-slate-700 rounded mb-2" />
      <div className="h-3 w-16 bg-slate-700/60 rounded" />
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, bgStyle }) {
  return (
    <div className="card-shine bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all duration-200 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg" style={bgStyle}>{icon}</div>
        <span className="text-slate-400 text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
    </div>
  );
}

/* ── Payment KPI Card ── */
function PayCard({ icon, label, value, sub, color, loading }) {
  if (loading) return (
    <div className="rounded-2xl border border-slate-700/40 p-4 animate-pulse" style={{ background: 'rgba(30,41,59,0.5)' }}>
      <div className="h-3 w-16 bg-slate-700 rounded mb-3" />
      <div className="h-6 w-24 bg-slate-700 rounded mb-2" />
      <div className="h-2 w-12 bg-slate-700/60 rounded" />
    </div>
  );
  return (
    <div className="rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.01]"
      style={{ background: 'rgba(30,41,59,0.5)', borderColor: 'rgba(51,65,85,0.5)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 18px ${color}18`; e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums mb-1" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/* ── Tab button ── */
function TabBtn({ id, label, icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
        active
          ? 'text-white border-orange-500'
          : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
      }`}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [todayMetrics, setTodayMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Billing / payments state
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [paySearch, setPaySearch] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState('all');
  const [payPage, setPayPage] = useState(1);
  const PAY_PER_PAGE = 10;

  // Profile state
  const [profileForm, setProfileForm] = useState({ name: '', email: '', businessName: '', website: '', fbPage: '', bio: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Poll metrics every 15 s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [tr, hr] = await Promise.all([fetch('/api/metrics/today'), fetch('/api/metrics/history?days=30')]);
        if (tr.ok) { const d = await tr.json(); setTodayMetrics(d.metrics); }
        if (hr.ok) { const d = await hr.json(); setHistory(d.metrics || []); }
      } catch {}
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const r = await fetch('/api/client/billing');
      if (r.ok) { const d = await r.json(); setBilling(d); }
    } finally { setBillingLoading(false); }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [meRes, todayRes, historyRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/metrics/today'),
        fetch('/api/metrics/history?days=30'),
      ]);
      if (!meRes.ok) { router.push('/login'); return; }
      const meData = await meRes.json();
      setUser(meData.user);
      if (todayRes.ok) { const td = await todayRes.json(); setTodayMetrics(td.metrics); }
      if (historyRes.ok) { const hd = await historyRes.json(); setHistory(hd.metrics || []); }
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { loadBilling(); }, [loadBilling]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      playLogout();
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('gz_session');
      router.push('/login');
      router.refresh();
    } catch { setLoggingOut(false); }
  }

  useEffect(() => {
    if (user) {
      localStorage.setItem('gz_session', JSON.stringify({ phone: user.phone, name: user.name, role: user.role, ts: Date.now() }));
      setProfileForm({
        name:         user.name         || '',
        email:        user.email        || '',
        businessName: user.businessName || '',
        website:      user.website      || '',
        fbPage:       user.fbPage       || '',
        bio:          user.bio          || '',
      });
    }
  }, [user]);

  /* ── Billing computed values ── */
  const payments = billing?.payments || [];
  const subscription = billing?.subscription || null;
  const summary = billing?.summary || {};
  const totalPaidBDT          = summary.totalPaid || 0;
  const totalDollarPurchased  = summary.totalDollarPurchased || 0;
  const totalDollarSpent      = summary.totalDollarSpent || 0;
  const totalDue              = summary.totalDue || 0;
  const currentLiveBudget     = summary.currentLiveBudget || 0;
  const totalCommission       = payments.reduce((s, p) => s + (p.commissionAmount || 0), 0);
  const totalProductsSold     = payments.reduce((s, p) => s + (p.productsSold || 0), 0);
  const totalRevenue          = payments.reduce((s, p) => s + (p.revenueGenerated || 0), 0);

  // All-time performance metrics (computed from history — same logic as Super Admin Overview)
  const totalSpend    = history.reduce((s, m) => s + (m.adCost || 0), 0);
  const totalMessages = history.reduce((s, m) => s + (m.messages || 0), 0);
  const totalResults  = history.reduce((s, m) => s + (m.results || 0), 0);
  const costPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
  const convRate      = totalMessages > 0 ? (totalResults / totalMessages) * 100 : 0;
  const activeDays    = history.filter(m => (m.adCost || 0) > 0).length;

  const last7      = history.slice(0, 7);
  const prev7      = history.slice(7, 14);
  const last7Spend = last7.reduce((s, m) => s + (m.adCost || 0), 0);
  const prev7Spend = prev7.reduce((s, m) => s + (m.adCost || 0), 0);
  const spendTrend = prev7Spend > 0 ? ((last7Spend - prev7Spend) / prev7Spend) * 100 : 0;

  const spendSpark   = [...last7].reverse().map(m => m.adCost || 0);
  const messageSpark = [...last7].reverse().map(m => m.messages || 0);
  const resultSpark  = [...last7].reverse().map(m => m.results || 0);

  const chart7       = [...last7].reverse();
  const chartLabels  = chart7.map(m => fmtShortDate(m.date));
  const chartSpend   = chart7.map(m => m.adCost || 0);
  const chartMessages = chart7.map(m => m.messages || 0);

  const insights = [];
  if (spendTrend > 20)             insights.push({ type: 'success', message: `Ad spend increased ${spendTrend.toFixed(0)}% vs previous 7 days — strong campaign momentum.` });
  if (spendTrend < -20)            insights.push({ type: 'warning', message: `Ad spend dropped ${Math.abs(spendTrend).toFixed(0)}% vs previous 7 days — review campaign budget.` });
  if (convRate > 15)               insights.push({ type: 'success', message: `Conversion rate at ${convRate.toFixed(1)}% — excellent lead quality from ads.` });
  if (convRate > 0 && convRate < 5) insights.push({ type: 'warning', message: `Conversion rate at ${convRate.toFixed(1)}% — consider improving landing page or targeting.` });
  if (!insights.length)            insights.push({ type: 'info',    message: 'Performance looks stable. Keep monitoring daily metrics.' });

  // Monthly chart data
  const monthlyPayData = (() => {
    const map = new Map();
    [...payments].reverse().forEach(p => {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!map.has(key)) map.set(key, { label, paid: 0, spent: 0, commission: 0 });
      const m = map.get(key);
      m.paid += p.amount || 0;
      m.spent += p.dollarSpent || 0;
      m.commission += p.commissionAmount || 0;
    });
    const entries = [...map.entries()].slice(-6);
    return {
      labels:     entries.map(([, v]) => v.label),
      paid:       entries.map(([, v]) => v.paid),
      spent:      entries.map(([, v]) => v.spent),
      commission: entries.map(([, v]) => v.commission),
    };
  })();

  // Filtered + paginated payments
  const filteredPayments = payments.filter(p => {
    const q = paySearch.toLowerCase();
    const matchSearch = !q ||
      (p.transactionId || '').toLowerCase().includes(q) ||
      (p.method || '').toLowerCase().includes(q) ||
      (p.paymentType || '').toLowerCase().includes(q);
    const matchStatus = payStatusFilter === 'all' || p.status === payStatusFilter;
    return matchSearch && matchStatus;
  });
  const totalPayPages = Math.ceil(filteredPayments.length / PAY_PER_PAGE);
  const paginatedPayments = filteredPayments.slice((payPage - 1) * PAY_PER_PAGE, payPage * PAY_PER_PAGE);

  const displayName = user?.name || user?.phone || '';
  const shortPhone = user?.phone
    ? user.phone.length > 11 ? user.phone.slice(0, 11) + '...' : user.phone
    : '';

  return (
    <div className="min-h-screen bg-slate-900"
      style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(255,85,0,0.08) 0%, transparent 60%), #0f172a' }}>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GrowlyZLogo size={32} />
            <span className="text-lg font-bold gradient-text">GrowlyZ</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/website.html" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200"
              style={{ background: 'rgba(255,85,0,0.08)', borderColor: 'rgba(255,85,0,0.3)', color: '#FF7A00' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,85,0,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,85,0,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,85,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,85,0,0.3)'; }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              <span className="hidden sm:inline whitespace-nowrap">Website</span>
            </a>

            {user && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm hidden sm:block truncate max-w-[130px]">{shortPhone}</span>
                {['admin', 'super_admin'].includes(user.role) && (
                  <button onClick={() => router.push('/super-admin')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)', boxShadow: '0 0 18px rgba(255,85,0,0.35)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(255,85,0,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(255,85,0,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span className="hidden sm:inline">Super Admin</span>
                  </button>
                )}
              </div>
            )}
            <button onClick={handleLogout} disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50">
              {loggingOut ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Greeting */}
        <div className="animate-fade-in flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => setActiveTab('profile')}>
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-500/40 group-hover:border-orange-500 transition-all"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white border-2 border-orange-500/40 group-hover:border-orange-500 transition-all"
                style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
              >
                {(displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {getGreeting()},{' '}
              <span className="gradient-text">{displayName || '...'}</span>!
            </h1>
            <p className="text-slate-400 mt-0.5 text-sm">{formatDate()}</p>
            <p className="text-slate-600 text-xs mt-0.5">Data refreshes daily after 12:00 AM</p>
          </div>
        </div>

        {/* Due amount alert */}
        {!billingLoading && totalDue > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm animate-slide-up"
            style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>You have an outstanding due amount of <strong>৳{totalDue.toLocaleString()}</strong>. Please contact your account manager.</span>
          </div>
        )}

        {/* Tab navigation */}
        <div className="border-b border-slate-800 -mb-2">
          <div className="flex items-center gap-0 overflow-x-auto">
            <TabBtn id="overview" label="Overview" icon="📊" active={activeTab === 'overview'} onClick={setActiveTab} />
            <TabBtn id="payments" label="Payments" icon="💳" active={activeTab === 'payments'} onClick={setActiveTab} />
            <TabBtn id="profile" label="My Profile" icon="👤" active={activeTab === 'profile'} onClick={setActiveTab} />
          </div>
        </div>

        {/* ══════ TAB: OVERVIEW ══════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {/* ── Today's Quick Stats ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Activity</h2>
                <span className="text-xs text-slate-600">Data refreshes daily after 12:00 AM</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {loading ? (
                  <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
                ) : (
                  <>
                    <StatCard icon="💰" label="Ad Spend Today" value={`$${(todayMetrics?.adCost ?? 0).toFixed(2)}`} subtitle="USD"
                      bgStyle={{ background: 'linear-gradient(135deg, rgba(255,85,0,0.3), rgba(255,146,0,0.2))', border: '1px solid rgba(255,85,0,0.2)' }} />
                    <StatCard icon="💬" label="Messages Today" value={(todayMetrics?.messages ?? 0).toLocaleString()} subtitle="Received"
                      bgStyle={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.2)' }} />
                    <StatCard icon="🎯" label="Results Today" value={(todayMetrics?.results ?? 0).toLocaleString()} subtitle="Conversions"
                      bgStyle={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))', border: '1px solid rgba(16,185,129,0.2)' }} />
                  </>
                )}
              </div>
              {!loading && todayMetrics?.notes && (
                <div className="mt-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 animate-slide-up">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-300">Note from Admin</span>
                    <span className="text-xs text-slate-500 ml-auto">Today</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{todayMetrics.notes}</p>
                </div>
              )}
            </div>

            {/* ── Performance Summary (All-time) ── */}
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-white">Performance Summary</h2>
                <p className="text-xs text-slate-500 mt-0.5">All-time metrics</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <KPICard icon="💰" label="Total Spend" color="#FF7A00"
                  value={`$${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  sub="All campaigns"
                  trend={spendTrend > 0 ? 'up' : spendTrend < 0 ? 'down' : undefined}
                  trendValue={spendTrend !== 0 ? `${Math.abs(spendTrend).toFixed(0)}%` : undefined}
                  sparkData={spendSpark}
                  loading={loading}
                />
                <KPICard icon="💬" label="Total Messages" color="#818cf8"
                  value={totalMessages.toLocaleString()}
                  sub="Inbound leads"
                  sparkData={messageSpark}
                  loading={loading}
                />
                <KPICard icon="🎯" label="Total Results" color="#34d399"
                  value={totalResults.toLocaleString()}
                  sub="Conversions"
                  sparkData={resultSpark}
                  loading={loading}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KPICard icon="📉" label="Cost / Result" color="#f59e0b"
                  value={costPerResult > 0 ? `$${costPerResult.toFixed(2)}` : '—'}
                  sub="Per conversion"
                  loading={loading}
                />
                <KPICard icon="%" label="Conv Rate" color="#ec4899"
                  value={`${convRate.toFixed(1)}%`}
                  sub="Messages → Results"
                  loading={loading}
                />
                <KPICard icon="📅" label="Active Days" color="#06b6d4"
                  value={activeDays}
                  sub={`of ${history.length} recorded`}
                  loading={loading}
                />
              </div>
            </div>

            {/* ── Payment Summary Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Paid BDT',    value: `৳${totalPaidBDT.toLocaleString()}`,           color: '#34d399' },
                { label: 'Dollar Purchased',  value: `$${totalDollarPurchased.toFixed(2)}`,          color: '#818cf8' },
                { label: 'Payments Made',     value: payments.length,                                color: '#fbbf24' },
                { label: 'Package',           value: user?.package || '—',                           color: '#FF7A00' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-slate-700/40 p-3 text-center" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  {billingLoading ? (
                    <div className="h-5 w-16 bg-slate-700 rounded animate-pulse mx-auto mb-1" />
                  ) : (
                    <div className="text-base font-bold tabular-nums" style={{ color }}>{value}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* ── 7-Day Performance Charts ── */}
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-white">7-Day Performance</h2>
                <p className="text-xs text-slate-500 mt-0.5">Last 7 days trend</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-700/40 p-4 bg-slate-800/60">
                  <p className="text-xs text-slate-400 font-medium mb-3">Ad Spend (USD)</p>
                  {loading
                    ? <div className="animate-pulse bg-slate-700/40 rounded h-24" />
                    : <AreaChart data={chartSpend} labels={chartLabels} color="#FF7A00" height={100} />
                  }
                </div>
                <div className="rounded-2xl border border-slate-700/40 p-4 bg-slate-800/60">
                  <p className="text-xs text-slate-400 font-medium mb-3">Messages Received</p>
                  {loading
                    ? <div className="animate-pulse bg-slate-700/40 rounded h-24" />
                    : <AreaChart data={chartMessages} labels={chartLabels} color="#818cf8" height={100} />
                  }
                </div>
              </div>
            </div>

            {/* ── AI Insights ── */}
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-white">AI Insights</h2>
                <p className="text-xs text-slate-500 mt-0.5">Auto-generated based on your data</p>
              </div>
              <div className="space-y-2">
                {loading
                  ? <div className="h-10 bg-slate-800/40 rounded-xl animate-pulse" />
                  : insights.map((ins, i) => <InsightCard key={i} type={ins.type} message={ins.message} />)
                }
              </div>
            </div>

            {/* ── Recent History Table ── */}
            <div className="animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Recent History</h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">Last {history.length} days</span>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center animate-pulse">
                    <div className="h-4 w-40 bg-slate-700 rounded mx-auto mb-3" />
                    <div className="h-4 w-32 bg-slate-700/60 rounded mx-auto" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: 'rgba(255,85,0,0.1)', border: '1px solid rgba(255,85,0,0.2)' }}>
                      <svg className="w-8 h-8 text-orange-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-medium">No data yet</p>
                    <p className="text-slate-600 text-sm mt-1">Your metrics will appear here once your campaign starts.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          {['Date', 'Ad Cost', 'Messages', 'Results'].map(h => (
                            <th key={h} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 ${h === 'Date' ? 'text-left' : 'text-right'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row, i) => (
                          <tr key={row._id || row.date}
                            className={`border-b border-slate-700/30 last:border-0 transition-colors hover:bg-slate-700/20 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                            <td className="px-5 py-3.5 text-slate-300 font-medium whitespace-nowrap">
                              {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-3.5 text-right"><span className="text-orange-400 font-semibold">${(row.adCost ?? 0).toFixed(2)}</span></td>
                            <td className="px-5 py-3.5 text-right text-slate-300">{(row.messages ?? 0).toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-right"><span className="text-green-400 font-medium">{(row.results ?? 0).toLocaleString()}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ══════ TAB: PAYMENTS ══════ */}
        {activeTab === 'payments' && (
          <div className="space-y-6">

            {/* ── 7 SUMMARY KPI CARDS ── */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Payment Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <PayCard icon="৳" label="Total Paid BDT" value={`৳${totalPaidBDT.toLocaleString()}`} sub="All payments" color="#34d399" loading={billingLoading} />
                <PayCard icon="$" label="Dollar Purchased" value={`$${totalDollarPurchased.toFixed(2)}`} sub="USD for ads" color="#818cf8" loading={billingLoading} />
                <PayCard icon="📊" label="Dollar Spent" value={`$${totalDollarSpent.toFixed(2)}`} sub="Total ad spend" color="#FF7A00" loading={billingLoading} />
                <PayCard icon="🟢" label="Live Ad Budget" value={`$${currentLiveBudget.toFixed(2)}`} sub="Currently running" color="#06b6d4" loading={billingLoading} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <PayCard icon="⚠️" label="Due Amount" value={`৳${totalDue.toLocaleString()}`} sub="Outstanding" color={totalDue > 0 ? '#f87171' : '#34d399'} loading={billingLoading} />

                {/* Active subscription card */}
                <div className="rounded-2xl border p-4 transition-all"
                  style={{ background: 'rgba(30,41,59,0.5)', borderColor: 'rgba(51,65,85,0.5)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📋</span>
                    <span className="text-xs text-slate-400 font-medium">Active Subscription</span>
                  </div>
                  {billingLoading ? (
                    <div className="h-5 w-28 bg-slate-700 rounded animate-pulse" />
                  ) : subscription ? (
                    <>
                      <div className="text-sm font-bold text-white leading-snug">{subscription.planName || PLAN_LABELS[subscription.planType] || 'Custom Plan'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{PLAN_LABELS[subscription.planType]}</div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-500">No plan set</div>
                  )}
                </div>

                {/* Subscription status card */}
                <div className="rounded-2xl border p-4 transition-all"
                  style={{ background: 'rgba(30,41,59,0.5)', borderColor: 'rgba(51,65,85,0.5)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">✅</span>
                    <span className="text-xs text-slate-400 font-medium">Subscription Status</span>
                  </div>
                  {billingLoading ? (
                    <div className="h-5 w-20 bg-slate-700 rounded animate-pulse" />
                  ) : subscription ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).bg,
                        border: `1px solid ${(SUB_STATUS[subscription.status] || SUB_STATUS.pending).border}`,
                        color: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).color,
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).color }} />
                      {(SUB_STATUS[subscription.status] || SUB_STATUS.pending).label}
                    </span>
                  ) : (
                    <div className="text-sm text-slate-500">—</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── SUBSCRIPTION DETAILS (read-only) ── */}
            {!billingLoading && subscription && (
              <div className="rounded-2xl border border-slate-700/40 overflow-hidden" style={{ background: 'rgba(30,41,59,0.4)' }}>
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/40">
                  <span>📋</span>
                  <span className="text-sm font-semibold text-white">Your Subscription Plan</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium ml-1"
                    style={{
                      background: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).bg,
                      color: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).color,
                      border: `1px solid ${(SUB_STATUS[subscription.status] || SUB_STATUS.pending).border}`,
                    }}>
                    {(SUB_STATUS[subscription.status] || SUB_STATUS.pending).label}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div><span className="text-slate-500 block mb-0.5">Plan Type</span><span className="text-white font-medium">{PLAN_LABELS[subscription.planType] || subscription.planType}</span></div>
                    <div><span className="text-slate-500 block mb-0.5">Plan Name</span><span className="text-white font-medium">{subscription.planName || '—'}</span></div>
                    {(subscription.planType === 'one-time' || subscription.planType === 'hybrid') && (
                      <div><span className="text-slate-500 block mb-0.5">Monthly Fee</span><span className="text-emerald-400 font-bold">৳{(subscription.monthlyFee || 0).toLocaleString()}</span></div>
                    )}
                    {(subscription.planType === 'commission' || subscription.planType === 'hybrid') && (
                      <div><span className="text-slate-500 block mb-0.5">Commission %</span><span className="text-orange-400 font-bold">{subscription.commissionPercent || 0}%</span></div>
                    )}
                    <div><span className="text-slate-500 block mb-0.5">Duration</span><span className="text-white font-medium">{subscription.duration || 1} month{subscription.duration !== 1 ? 's' : ''}</span></div>
                    <div><span className="text-slate-500 block mb-0.5">Renewal Date</span><span className="text-white font-medium">{fmtDate(subscription.renewalDate)}</span></div>
                  </div>

                  {(subscription.planType === 'commission' || subscription.planType === 'hybrid') && (
                    <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/40">
                      <div className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-xl font-bold text-white">{totalProductsSold.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Products Sold</div>
                      </div>
                      <div className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-xl font-bold text-white">৳{totalRevenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Total Revenue</div>
                      </div>
                      <div className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-xl font-bold text-emerald-400">৳{totalCommission.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Commission Earned</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PAYMENT HISTORY TABLE ── */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div>
                  <p className="text-base font-semibold text-white">Payment History</p>
                  <p className="text-xs text-slate-500">{filteredPayments.length} transaction{filteredPayments.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <div className="relative">
                    <input value={paySearch}
                      onChange={e => { setPaySearch(e.target.value); setPayPage(1); }}
                      placeholder="Search…"
                      className="bg-slate-700/40 border border-slate-600/60 rounded-lg text-white text-xs px-3 py-2 pl-8 focus:outline-none focus:ring-1 focus:ring-orange-500/50 w-32"
                    />
                    <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <select value={payStatusFilter} onChange={e => { setPayStatusFilter(e.target.value); setPayPage(1); }}
                    className="bg-slate-700/40 border border-slate-600/60 rounded-lg text-white text-xs px-3 py-2 focus:outline-none">
                    <option value="all">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 900 }}>
                    <thead>
                      <tr className="border-b border-slate-700/50" style={{ background: 'rgba(15,23,42,0.6)' }}>
                        {['Date','Type','Amount BDT','$ Purchased','$ Spent','Live Budget','Rate','Method','Txn ID','Sub Type','Commission','Status'].map(h => (
                          <th key={h} className="px-3 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs whitespace-nowrap text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {billingLoading ? (
                        [...Array(3)].map((_, i) => (
                          <tr key={i}>
                            {[...Array(12)].map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-700/40 rounded animate-pulse" /></td>)}
                          </tr>
                        ))
                      ) : paginatedPayments.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-12 text-center">
                            <div className="text-slate-400 font-medium mb-1">
                              {paySearch || payStatusFilter !== 'all' ? 'No payments match your filter.' : 'No payments recorded yet.'}
                            </div>
                            {!paySearch && payStatusFilter === 'all' && (
                              <p className="text-slate-600 text-xs">Your payment history will appear here once your admin records a payment.</p>
                            )}
                          </td>
                        </tr>
                      ) : paginatedPayments.map(p => {
                        const ps = PAY_STATUS[p.status] || PAY_STATUS.pending;
                        return (
                          <tr key={p._id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                            <td className="px-3 py-3 text-slate-400 capitalize whitespace-nowrap">{(p.paymentType || '—').replace('-', ' ')}</td>
                            <td className="px-3 py-3 text-emerald-400 font-semibold whitespace-nowrap">৳{(p.amount || 0).toLocaleString()}</td>
                            <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{p.dollarAmount ? `$${p.dollarAmount}` : '—'}</td>
                            <td className="px-3 py-3 text-orange-400 whitespace-nowrap">{p.dollarSpent ? `$${p.dollarSpent}` : '—'}</td>
                            <td className="px-3 py-3 text-cyan-400 whitespace-nowrap">{p.liveBudget ? `$${p.liveBudget}` : '—'}</td>
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{p.dollarRate || '—'}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/40">{p.method || '—'}</span>
                            </td>
                            <td className="px-3 py-3 text-slate-400 font-mono whitespace-nowrap">{p.transactionId || '—'}</td>
                            <td className="px-3 py-3 text-slate-500 capitalize whitespace-nowrap">{(p.subscriptionType || '—').replace('-', ' ')}</td>
                            <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{p.commissionPercent ? `${p.commissionPercent}%` : '—'}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: ps.bg, border: `1px solid ${ps.border}`, color: ps.color }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ps.color }} />
                                {ps.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPayPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                  <span>Showing {Math.min((payPage - 1) * PAY_PER_PAGE + 1, filteredPayments.length)}–{Math.min(payPage * PAY_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPayPage(p => Math.max(1, p - 1))} disabled={payPage === 1}
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 disabled:opacity-40 hover:bg-slate-700 transition-colors">‹</button>
                    {[...Array(Math.min(totalPayPages, 5))].map((_, i) => (
                      <button key={i} onClick={() => setPayPage(i + 1)}
                        className={`w-7 h-6 rounded border transition-all ${payPage === i + 1 ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' : 'bg-slate-800 border-slate-700/60 hover:bg-slate-700'}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setPayPage(p => Math.min(totalPayPages, p + 1))} disabled={payPage === totalPayPages}
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 disabled:opacity-40 hover:bg-slate-700 transition-colors">›</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── PAYMENT ANALYTICS CHARTS ── */}
            <div>
              <h3 className="text-base font-semibold text-white mb-4">Payment Analytics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-700/50 p-4 bg-slate-800/60">
                  <p className="text-xs text-slate-400 font-medium mb-3">Monthly Payments (BDT)</p>
                  {billingLoading ? <div className="animate-pulse bg-slate-700/40 rounded h-24" /> : (
                    <BarChart data={monthlyPayData.paid} labels={monthlyPayData.labels} color="#34d399" height={100} />
                  )}
                </div>
                <div className="rounded-2xl border border-slate-700/50 p-4 bg-slate-800/60">
                  <p className="text-xs text-slate-400 font-medium mb-3">Monthly Ad Spend (USD)</p>
                  {billingLoading ? <div className="animate-pulse bg-slate-700/40 rounded h-24" /> : (
                    <AreaChart data={monthlyPayData.spent} labels={monthlyPayData.labels} color="#FF7A00" height={100} />
                  )}
                </div>
                <div className="rounded-2xl border border-slate-700/50 p-4 bg-slate-800/60">
                  <p className="text-xs text-slate-400 font-medium mb-3">Commission Earnings (BDT)</p>
                  {billingLoading ? <div className="animate-pulse bg-slate-700/40 rounded h-24" /> : (
                    <BarChart data={monthlyPayData.commission} labels={monthlyPayData.labels} color="#c084fc" height={100} />
                  )}
                </div>
                <div className="rounded-2xl border border-slate-700/50 p-4 bg-slate-800/60 flex flex-col">
                  <p className="text-xs text-slate-400 font-medium mb-3">Due vs Paid Ratio</p>
                  {billingLoading ? <div className="animate-pulse bg-slate-700/40 rounded-full w-24 h-24 mx-auto" /> : (
                    <div className="flex items-center justify-center gap-6 flex-1 py-2">
                      <DonutChart paid={totalPaidBDT} due={totalDue} size={110} />
                      <div className="text-xs space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" />
                          <div>
                            <div className="text-slate-400">Paid</div>
                            <div className="text-white font-semibold">৳{totalPaidBDT.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0" />
                          <div>
                            <div className="text-slate-400">Due</div>
                            <div className="text-white font-semibold">৳{totalDue.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
        {/* ══════ TAB: PROFILE ══════ */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold text-white">My Profile</h2>
              <p className="text-slate-500 text-sm mt-0.5">Update your profile picture and personal details</p>
            </div>

            {/* Avatar upload card */}
            <div className="rounded-2xl border border-slate-700/50 p-6" style={{ background: 'rgba(30,41,59,0.5)' }}>
              <div className="flex items-center gap-6">
                {/* Avatar display */}
                <div className="relative flex-shrink-0">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="Profile"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-orange-500/40"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white border-2 border-orange-500/30"
                      style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                    >
                      {(displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                      <svg className="animate-spin w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Upload controls */}
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{user?.name || user?.phone}</p>
                  <p className="text-slate-500 text-xs mb-3">JPG, PNG or WebP · Max 2MB</p>
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 w-fit"
                    style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={avatarUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAvatarUploading(true);
                        setProfileError('');
                        try {
                          const fd = new FormData();
                          fd.append('avatar', file);
                          const r = await fetch('/api/client/upload-avatar', { method: 'POST', body: fd });
                          const d = await r.json();
                          if (!r.ok) { setProfileError(d.message || 'Upload failed'); return; }
                          // refresh user
                          const me = await fetch('/api/auth/me');
                          if (me.ok) { const md = await me.json(); setUser(md.user); }
                        } finally {
                          setAvatarUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Profile info form */}
            <div className="rounded-2xl border border-slate-700/50 p-6 space-y-4" style={{ background: 'rgba(30,41,59,0.5)' }}>
              <h3 className="text-sm font-semibold text-white">Personal Information</h3>

              {profileError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>
                  {profileError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all"
                  />
                </div>
                {/* Gmail */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Gmail</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@gmail.com"
                    className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all"
                  />
                </div>
                {/* Phone (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone <span className="text-slate-600 font-normal">(login ID)</span></label>
                  <input
                    type="text"
                    value={user?.phone || ''}
                    disabled
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl text-slate-500 text-sm px-4 py-2.5 cursor-not-allowed"
                  />
                </div>
                {/* Business Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={profileForm.businessName}
                    onChange={e => setProfileForm(f => ({ ...f, businessName: e.target.value }))}
                    placeholder="Your business name"
                    className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all"
                  />
                </div>
                {/* Website */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Website</label>
                  <input
                    type="url"
                    value={profileForm.website}
                    onChange={e => setProfileForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="https://yoursite.com"
                    className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all"
                  />
                </div>
                {/* Facebook Page */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Facebook Page</label>
                  <input
                    type="text"
                    value={profileForm.fbPage}
                    onChange={e => setProfileForm(f => ({ ...f, fbPage: e.target.value }))}
                    placeholder="facebook.com/yourpage"
                    className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all"
                  />
                </div>
                {/* Bio */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Bio / About</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell us about you or your business..."
                    rows={3}
                    className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {profileSaved && (
                  <span className="text-emerald-400 text-sm flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </span>
                )}
                {!profileSaved && <span />}
                <button
                  disabled={profileSaving}
                  onClick={async () => {
                    setProfileSaving(true);
                    setProfileError('');
                    setProfileSaved(false);
                    try {
                      const r = await fetch('/api/client/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(profileForm),
                      });
                      const d = await r.json();
                      if (!r.ok) { setProfileError(d.message || 'Save failed'); return; }
                      setUser(prev => ({ ...prev, ...d.user }));
                      setProfileSaved(true);
                      setTimeout(() => setProfileSaved(false), 3000);
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                >
                  {profileSaving ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-16 py-6">
        <p className="text-center text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} GrowlyZ. All rights reserved.
        </p>
      </footer>

      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.22s ease-out; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
