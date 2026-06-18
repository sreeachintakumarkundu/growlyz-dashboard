'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────────
   UTILITY HELPERS
───────────────────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtShortDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_COLORS = {
  active:    { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  color: '#34d399',  label: 'Active' },
  paused:    { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  color: '#fbbf24',  label: 'Paused' },
  suspended: { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171',  label: 'Suspended' },
  vip:       { bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.3)',  color: '#c084fc',  label: 'VIP' },
};

/* ─────────────────────────────────────────────────────────────────
   SVG CHARTS
───────────────────────────────────────────────────────────────── */
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

function AreaChart({ data = [], labels = [], color = '#FF7A00', height = 100 }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-slate-600 text-sm" style={{ height }}>
        No data
      </div>
    );
  }
  const w = 500, h = height, padL = 40, padR = 12, padT = 10, padB = 24;
  const max = Math.max(...data, 1);
  const cw = w - padL - padR;
  const ch = h - padT - padB;
  const pts = data.map((v, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * cw;
    const y = padT + ch - (v / max) * ch;
    return { x, y, v };
  });
  const lineD = `M${pts.map(p => `${p.x},${p.y}`).join(' L')}`;
  const fillD = `M${pts[0].x},${padT + ch} L${pts.map(p => `${p.x},${p.y}`).join(' L')} L${pts[pts.length - 1].x},${padT + ch} Z`;
  const gid = `ac-${color.replace('#', '')}-${height}`;

  // Y grid lines
  const yLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: padT + ch - f * ch,
    val: (max * f).toFixed(0),
  }));

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yLines.map(({ y, val }) => (
        <g key={y}>
          <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
          <text x={padL - 4} y={y + 4} fill="rgba(148,163,184,0.5)" fontSize="9" textAnchor="end">{val}</text>
        </g>
      ))}
      <path d={fillD} fill={`url(#${gid})`} />
      <path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="rgba(15,23,42,0.8)" strokeWidth="1.5" />
      ))}
      {labels.map((lbl, i) => {
        if (!pts[i]) return null;
        const step = Math.ceil(labels.length / 7);
        if (i % step !== 0 && i !== labels.length - 1) return null;
        return (
          <text key={i} x={pts[i].x} y={h - 4} fill="rgba(148,163,184,0.5)" fontSize="9" textAnchor="middle">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}

function BarChart({ data = [], labels = [], color = '#FF7A00', height = 100 }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-slate-600 text-sm" style={{ height }}>
        No data
      </div>
    );
  }
  const max = Math.max(...data, 1);
  return (
    <div style={{ height }} className="flex items-end gap-1 px-1">
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${labels[i] || i}: ${v}`}>
            <div
              className="w-full rounded-t transition-all duration-200 group-hover:opacity-80"
              style={{
                height: `${Math.max(pct, 2)}%`,
                background: `linear-gradient(to top, ${color}cc, ${color})`,
                minHeight: 2,
              }}
            />
          </div>
        );
      })}
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
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
        />
      )}
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{Math.round(pct * 100)}%</text>
      <text x="50" y="60" textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="9">Paid</text>
    </svg>
  );
}

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

/* ─────────────────────────────────────────────────────────────────
   SMALL UI COMPONENTS
───────────────────────────────────────────────────────────────── */
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
    <div
      className="rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.01] group"
      style={{
        background: 'rgba(30,41,59,0.5)',
        borderColor: 'rgba(51,65,85,0.5)',
        boxShadow: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 18px ${color}18`; e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
    >
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

function EditField({ label, value, onChange, type = 'text', placeholder = '', prefix = '', disabled = false }) {
  const base = 'w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>}
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{prefix}</span>}
        {type === 'textarea' ? (
          <textarea
            className={`${base} px-4 py-2.5 resize-none ${prefix ? 'pl-8' : ''}`}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
          />
        ) : (
          <input
            type={type}
            className={`${base} px-4 py-2.5 ${prefix ? 'pl-8' : ''}`}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

function TabBtn({ id, label, icon, activeTab, onClick, badge }) {
  const active = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
        active
          ? 'text-white bg-orange-500/20 border border-orange-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-0.5 text-xs bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded-full border border-orange-500/20 leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

function SectionHead({ title, sub, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

function Spinner({ size = 4 }) {
  return (
    <svg className={`animate-spin w-${size} h-${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function OrangeBtn({ children, onClick, disabled, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all ${className}`}
      style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN MODAL
───────────────────────────────────────────────────────────────── */
export default function ClientDetailModal({ client: initialClient, initialTab = 'overview', onClose, onUpdate, showToast }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [client, setClient] = useState(initialClient);

  // Data states
  const [metrics, setMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // UI states
  const [dateFilter, setDateFilter] = useState('7d');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'service-fee', subscriptionType: 'one-time',
    amount: '', dollarAmount: '', dollarRate: '', dollarSpent: '', liveBudget: '',
    commissionPercent: '', commissionAmount: '', productsSold: '', revenueGenerated: '',
    dueAmount: '', method: 'bKash', transactionId: '', notes: '', status: 'paid',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [platformTab, setPlatformTab] = useState('facebook');

  // Lead state
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadSource, setLeadSource] = useState('messenger');
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadDeleting, setLeadDeleting] = useState(null);
  const BLANK_LEAD = { name: '', phone: '', email: '', product: '', quantity: '1', price: '', status: 'new', notes: '' };
  const [leadForm, setLeadForm] = useState(BLANK_LEAD);

  const LEAD_STATUSES = [
    { id: 'new',       label: 'New',       color: '#818cf8' },
    { id: 'contacted', label: 'Contacted', color: '#fbbf24' },
    { id: 'confirmed', label: 'Confirmed', color: '#34d399' },
    { id: 'shipped',   label: 'Shipped',   color: '#06b6d4' },
    { id: 'delivered', label: 'Delivered', color: '#10b981' },
    { id: 'cancelled', label: 'Cancelled', color: '#f87171' },
  ];

  // Campaign state
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignDeleting, setCampaignDeleting] = useState(null);
  const BLANK_CAMPAIGN = { name: '', objective: '', budget: '', spend: '', ctr: '', cpc: '', messages: '', results: '', roas: '', status: 'active', startDate: '', notes: '' };
  const [campaignForm, setCampaignForm] = useState(BLANK_CAMPAIGN);

  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [subForm, setSubForm] = useState({
    planType: 'one-time', planName: '', monthlyFee: '', commissionPercent: '',
    commissionFixed: '', duration: '1', startDate: '', renewalDate: '',
    status: 'pending', dollarRate: '', notes: '',
  });
  // Payment search / filter / pagination
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [payPage, setPayPage] = useState(1);
  // Edit payment
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaySaving, setEditPaySaving] = useState(false);

  // Edit form state (pre-fill from client)
  const [editForm, setEditForm] = useState({
    name:          client.name || '',
    email:         client.email || '',
    package:       client.package || '',
    businessName:  client.businessName || '',
    website:       client.website || '',
    fbPage:        client.fbPage || '',
    adAccountId:   client.adAccountId || '',
    pixelId:       client.pixelId || '',
    notes:         client.notes || '',
    monthlyBudget: client.monthlyBudget?.toString() || '',
    country:       client.country || 'Bangladesh',
    clientStatus:  client.clientStatus || 'active',
  });

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  /* ── Data loaders ── */
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const r = await fetch(`/api/super-admin/metrics?clientId=${client._id}`);
      if (r.ok) { const d = await r.json(); setMetrics(d.metrics || []); }
    } finally { setMetricsLoading(false); }
  }, [client._id]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const r = await fetch(`/api/super-admin/payments?clientId=${client._id}`);
      if (r.ok) { const d = await r.json(); setPayments(d.payments || []); }
    } finally { setPaymentsLoading(false); }
  }, [client._id]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const r = await fetch(`/api/super-admin/activity?targetId=${client._id}&limit=30`);
      if (r.ok) { const d = await r.json(); setActivityLogs(d.logs || []); }
    } finally { setActivityLoading(false); }
  }, [client._id]);

  const loadSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    try {
      const r = await fetch(`/api/super-admin/subscriptions?clientId=${client._id}`);
      if (r.ok) {
        const d = await r.json();
        setSubscription(d.subscription || null);
        if (d.subscription) {
          setSubForm({
            planType:          d.subscription.planType || 'one-time',
            planName:          d.subscription.planName || '',
            monthlyFee:        d.subscription.monthlyFee?.toString() || '',
            commissionPercent: d.subscription.commissionPercent?.toString() || '',
            commissionFixed:   d.subscription.commissionFixed?.toString() || '',
            duration:          d.subscription.duration?.toString() || '1',
            startDate:         d.subscription.startDate ? new Date(d.subscription.startDate).toISOString().slice(0, 10) : '',
            renewalDate:       d.subscription.renewalDate ? new Date(d.subscription.renewalDate).toISOString().slice(0, 10) : '',
            status:            d.subscription.status || 'pending',
            dollarRate:        d.subscription.dollarRate?.toString() || '',
            notes:             d.subscription.notes || '',
          });
        }
      }
    } finally { setSubscriptionLoading(false); }
  }, [client._id]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const r = await fetch(`/api/super-admin/campaigns?clientId=${client._id}`);
      if (r.ok) { const d = await r.json(); setCampaigns(d.campaigns || []); }
    } finally { setCampaignsLoading(false); }
  }, [client._id]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const r = await fetch(`/api/super-admin/leads?clientId=${client._id}`);
      if (r.ok) { const d = await r.json(); setLeads(d.leads || []); }
    } finally { setLeadsLoading(false); }
  }, [client._id]);

  useEffect(() => {
    loadMetrics();
    loadPayments();
    loadActivity();
    loadSubscription();
    loadCampaigns();
    loadLeads();
  }, [loadMetrics, loadPayments, loadActivity, loadSubscription, loadCampaigns, loadLeads]);

  /* ── Computed values ── */
  const filterCount = dateFilter === '7d' ? 7 : dateFilter === '14d' ? 14 : 30;
  const filteredMetrics = metrics.slice(0, filterCount);
  const totalSpend    = metrics.reduce((s, m) => s + (m.adCost || 0), 0);
  const totalMessages = metrics.reduce((s, m) => s + (m.messages || 0), 0);
  const totalResults  = metrics.reduce((s, m) => s + (m.results || 0), 0);
  const costPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
  const convRate      = totalMessages > 0 ? (totalResults / totalMessages) * 100 : 0;
  const activeDays    = metrics.filter(m => (m.adCost || 0) > 0).length;

  const last7  = metrics.slice(0, 7);
  const prev7  = metrics.slice(7, 14);
  const last7Spend = last7.reduce((s, m) => s + (m.adCost || 0), 0);
  const prev7Spend = prev7.reduce((s, m) => s + (m.adCost || 0), 0);
  const spendTrend = prev7Spend > 0 ? ((last7Spend - prev7Spend) / prev7Spend) * 100 : 0;

  const totalPaidBDT    = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalDollarPurchased = payments.reduce((s, p) => s + (p.dollarAmount || 0), 0);

  // Sparkline data
  const spendSpark    = [...last7].reverse().map(m => m.adCost || 0);
  const messageSpark  = [...last7].reverse().map(m => m.messages || 0);
  const resultSpark   = [...last7].reverse().map(m => m.results || 0);

  // Chart data (filtered, reversed for chronological)
  const chartMetrics  = [...filteredMetrics].reverse();
  const chartLabels   = chartMetrics.map(m => fmtShortDate(m.date));
  const chartSpend    = chartMetrics.map(m => m.adCost || 0);
  const chartMessages = chartMetrics.map(m => m.messages || 0);
  const chartResults  = chartMetrics.map(m => m.results || 0);

  // AI Insights
  const insights = [];
  if (spendTrend > 20)  insights.push({ type: 'success', message: `Ad spend increased ${spendTrend.toFixed(0)}% vs previous 7 days — strong campaign momentum.` });
  if (spendTrend < -20) insights.push({ type: 'warning', message: `Ad spend dropped ${Math.abs(spendTrend).toFixed(0)}% vs previous 7 days — review campaign budget.` });
  if (convRate > 15)    insights.push({ type: 'success', message: `Conversion rate at ${convRate.toFixed(1)}% — excellent lead quality from ads.` });
  if (convRate > 0 && convRate < 5) insights.push({ type: 'warning', message: `Conversion rate at ${convRate.toFixed(1)}% — consider improving landing page or targeting.` });
  if (client.clientStatus === 'paused')    insights.push({ type: 'info', message: 'Client campaigns are currently paused.' });
  if (client.clientStatus === 'suspended') insights.push({ type: 'danger', message: 'Account is suspended — immediate attention required.' });
  if (client.clientStatus === 'vip')       insights.push({ type: 'info', message: 'VIP client — prioritize support and reporting.' });
  if (!insights.length) insights.push({ type: 'info', message: 'Performance looks stable. Keep monitoring daily metrics.' });

  // Extended payment computed values
  const totalDollarSpent  = payments.reduce((s, p) => s + (p.dollarSpent || 0), 0);
  const totalDue          = payments.reduce((s, p) => s + (p.dueAmount || 0), 0);
  const totalCommission   = payments.reduce((s, p) => s + (p.commissionAmount || 0), 0);
  const currentLiveBudget = payments[0]?.liveBudget || 0;
  const totalProductsSold = payments.reduce((s, p) => s + (p.productsSold || 0), 0);
  const totalRevenue      = payments.reduce((s, p) => s + (p.revenueGenerated || 0), 0);

  // Monthly chart data (chronological, last 6 months)
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
  const PAY_PER_PAGE = 10;
  const filteredPayments = payments.filter(p => {
    const q = paymentSearch.toLowerCase();
    const matchSearch = !q ||
      (p.transactionId || '').toLowerCase().includes(q) ||
      (p.method || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      (p.paymentType || '').toLowerCase().includes(q);
    const matchStatus = paymentStatusFilter === 'all' || p.status === paymentStatusFilter;
    return matchSearch && matchStatus;
  });
  const totalPayPages = Math.ceil(filteredPayments.length / PAY_PER_PAGE);
  const paginatedPayments = filteredPayments.slice((payPage - 1) * PAY_PER_PAGE, payPage * PAY_PER_PAGE);

  function exportPaymentsCSV() {
    const headers = ['Date','Payment Type','Amount BDT','Dollar Purchased','Dollar Spent','Live Budget','Dollar Rate','Method','Transaction ID','Sub Type','Commission %','Notes','Status'];
    const rows = payments.map(p => [
      fmtDate(p.createdAt), p.paymentType || '', p.amount || 0, p.dollarAmount || 0,
      p.dollarSpent || 0, p.liveBudget || 0, p.dollarRate || 0, p.method || '',
      p.transactionId || '', p.subscriptionType || '', p.commissionPercent || 0,
      (p.notes || '').replace(/"/g, '""'), p.status || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${(client.name || client.phone || 'client').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Handlers ── */
  async function handleSaveDetails() {
    setDetailsSaving(true);
    try {
      const r = await fetch(`/api/super-admin/clients/${client._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          name:          editForm.name,
          email:         editForm.email,
          package:       editForm.package,
          businessName:  editForm.businessName,
          website:       editForm.website,
          fbPage:        editForm.fbPage,
          adAccountId:   editForm.adAccountId,
          pixelId:       editForm.pixelId,
          notes:         editForm.notes,
          monthlyBudget: editForm.monthlyBudget,
          country:       editForm.country,
          clientStatus:  editForm.clientStatus,
        }),
      });
      if (!r.ok) { showToast('error', 'Failed to save changes.'); return; }
      const d = await r.json();
      setClient(d.client);
      showToast('success', 'Changes saved!');
      onUpdate();
    } finally {
      setDetailsSaving(false);
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    setPaymentSaving(true);
    try {
      const r = await fetch('/api/super-admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:          client._id,
          paymentType:       paymentForm.paymentType,
          subscriptionType:  paymentForm.subscriptionType,
          amount:            parseFloat(paymentForm.amount) || 0,
          dollarAmount:      parseFloat(paymentForm.dollarAmount) || 0,
          dollarRate:        parseFloat(paymentForm.dollarRate) || 0,
          dollarSpent:       parseFloat(paymentForm.dollarSpent) || 0,
          liveBudget:        parseFloat(paymentForm.liveBudget) || 0,
          commissionPercent: parseFloat(paymentForm.commissionPercent) || 0,
          commissionAmount:  parseFloat(paymentForm.commissionAmount) || 0,
          productsSold:      parseInt(paymentForm.productsSold) || 0,
          revenueGenerated:  parseFloat(paymentForm.revenueGenerated) || 0,
          dueAmount:         parseFloat(paymentForm.dueAmount) || 0,
          method:            paymentForm.method,
          transactionId:     paymentForm.transactionId,
          notes:             paymentForm.notes,
          status:            paymentForm.status,
        }),
      });
      if (!r.ok) { showToast('error', 'Failed to add payment.'); return; }
      showToast('success', 'Payment recorded!');
      setShowPaymentForm(false);
      setPaymentForm({
        paymentType: 'service-fee', subscriptionType: 'one-time',
        amount: '', dollarAmount: '', dollarRate: '', dollarSpent: '', liveBudget: '',
        commissionPercent: '', commissionAmount: '', productsSold: '', revenueGenerated: '',
        dueAmount: '', method: 'bKash', transactionId: '', notes: '', status: 'paid',
      });
      await loadPayments();
      await loadActivity();
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleSaveEditPayment() {
    if (!editingPayment) return;
    setEditPaySaving(true);
    try {
      const r = await fetch(`/api/super-admin/payments/${editingPayment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPayment),
      });
      if (r.ok) {
        showToast('success', 'Payment updated!');
        setEditingPayment(null);
        await loadPayments();
      } else {
        showToast('error', 'Failed to update payment.');
      }
    } finally { setEditPaySaving(false); }
  }

  async function handleDeletePayment(paymentId) {
    if (!window.confirm('Delete this payment? This cannot be undone.')) return;
    try {
      const r = await fetch(`/api/super-admin/payments/${paymentId}`, { method: 'DELETE' });
      if (r.ok) {
        showToast('success', 'Payment deleted.');
        await loadPayments();
        await loadActivity();
      } else {
        showToast('error', 'Failed to delete payment.');
      }
    } catch { showToast('error', 'Error deleting payment.'); }
  }

  async function handleSaveSubscription() {
    setSubSaving(true);
    try {
      const r = await fetch('/api/super-admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client._id, ...subForm }),
      });
      if (r.ok) {
        const d = await r.json();
        setSubscription(d.subscription);
        showToast('success', 'Subscription saved!');
        setShowSubscriptionForm(false);
        loadActivity();
      } else {
        showToast('error', 'Failed to save subscription.');
      }
    } finally { setSubSaving(false); }
  }

  async function handleStatusChange(newStatus) {
    const updated = { ...editForm, clientStatus: newStatus };
    setEditForm(updated);
    setDetailsSaving(true);
    try {
      const r = await fetch(`/api/super-admin/clients/${client._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', clientStatus: newStatus }),
      });
      if (!r.ok) { showToast('error', 'Status update failed.'); return; }
      const d = await r.json();
      setClient(d.client);
      showToast('success', `Status set to ${newStatus}.`);
      onUpdate();
      loadActivity();
    } finally {
      setDetailsSaving(false);
    }
  }

  /* ── Status label & color ── */
  const cs = STATUS_COLORS[client.clientStatus || 'active'] || STATUS_COLORS.active;
  const clientInitial = (client.name || client.phone || '?').charAt(0).toUpperCase();

  /* ── JSX ── */
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/90"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Modal box */}
      <div
        className="relative flex flex-col w-full max-w-7xl mx-auto my-0 sm:my-3 bg-slate-900 sm:rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden"
        style={{
          height: '100vh',
          maxHeight: '100vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── STICKY HEADER ── */}
        <div className="flex-shrink-0 border-b border-slate-700/50" style={{ background: 'rgba(15,23,42,0.95)' }}>
          {/* Top row: avatar + info + actions */}
          <div className="px-4 sm:px-6 pt-4 pb-3 flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)', boxShadow: '0 0 20px rgba(255,85,0,0.3)' }}
            >
              {clientInitial}
            </div>

            {/* Name + badges + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {client.name || client.phone}
                </h2>
                {/* Status badge */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ background: cs.bg, border: `1px solid ${cs.border}`, color: cs.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cs.color }} />
                  {cs.label}
                </span>
                {/* Package badge */}
                {client.package && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/70 text-slate-300 border border-slate-600/50 flex-shrink-0">
                    {client.package}
                  </span>
                )}
              </div>
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {client.phone && <span>{client.phone}</span>}
                {client.email && <span>{client.email}</span>}
                {client.businessName && <span className="text-slate-400">{client.businessName}</span>}
                <span className="text-slate-700">ID: {client._id?.toString().slice(-8)}</span>
                {client.createdAt && <span>Joined {fmtDate(client.createdAt)}</span>}
                {client.country && <span>{client.country}</span>}
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* WhatsApp */}
              {client.phone && (
                <a
                  href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  title="WhatsApp"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              )}
              {/* Email */}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  title="Send Email"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              )}
              {/* Add Payment shortcut */}
              <button
                onClick={() => { setActiveTab('payments'); setShowPaymentForm(true); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                title="Add Payment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="px-4 sm:px-6 pb-0 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 pb-3">
              <TabBtn id="overview"   label="Overview"   icon="📊" activeTab={activeTab} onClick={setActiveTab} />
              <TabBtn id="analytics"  label="Analytics"  icon="📈" activeTab={activeTab} onClick={setActiveTab} />
              <TabBtn id="campaigns"  label="Campaigns"  icon="📣" activeTab={activeTab} onClick={setActiveTab} />
              <TabBtn id="leads"      label="Leads"      icon="🎯" activeTab={activeTab} onClick={setActiveTab} />
              <TabBtn id="payments"   label="Payments"   icon="💳" activeTab={activeTab} onClick={setActiveTab} badge={payments.length} />
              <TabBtn id="details"    label="Details"    icon="✏️" activeTab={activeTab} onClick={setActiveTab} />
              <TabBtn id="activity"   label="Activity"   icon="🕐" activeTab={activeTab} onClick={setActiveTab} badge={activityLogs.length} />
            </div>
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">

            {/* ══════════════════ TAB: OVERVIEW ══════════════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Cards — Row 1 */}
                <div>
                  <SectionHead title="Performance Summary" sub="All-time metrics" />
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <KPICard
                      icon="💰" label="Total Spend" color="#FF7A00"
                      value={`$${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      sub="All campaigns"
                      trend={spendTrend > 0 ? 'up' : spendTrend < 0 ? 'down' : undefined}
                      trendValue={spendTrend !== 0 ? `${Math.abs(spendTrend).toFixed(0)}%` : undefined}
                      sparkData={spendSpark}
                      loading={metricsLoading}
                    />
                    <KPICard
                      icon="💬" label="Total Messages" color="#818cf8"
                      value={totalMessages.toLocaleString()}
                      sub="Inbound leads"
                      sparkData={messageSpark}
                      loading={metricsLoading}
                    />
                    <KPICard
                      icon="🎯" label="Total Results" color="#34d399"
                      value={totalResults.toLocaleString()}
                      sub="Conversions"
                      sparkData={resultSpark}
                      loading={metricsLoading}
                    />
                  </div>
                  {/* KPI Cards — Row 2 */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <KPICard
                      icon="📉" label="Cost / Result" color="#f59e0b"
                      value={costPerResult > 0 ? `$${costPerResult.toFixed(2)}` : '—'}
                      sub="Per conversion"
                      loading={metricsLoading}
                    />
                    <KPICard
                      icon="%" label="Conv Rate" color="#ec4899"
                      value={`${convRate.toFixed(1)}%`}
                      sub="Messages → Results"
                      loading={metricsLoading}
                    />
                    <KPICard
                      icon="📅" label="Active Days" color="#06b6d4"
                      value={activeDays}
                      sub={`of ${metrics.length} recorded`}
                      loading={metricsLoading}
                    />
                  </div>
                </div>

                {/* Payment summary row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Paid BDT', value: `৳${totalPaidBDT.toLocaleString()}`, color: '#34d399' },
                    { label: 'Dollar Purchased', value: `$${totalDollarPurchased.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: '#818cf8' },
                    { label: 'Payments Made', value: payments.length, color: '#fbbf24' },
                    { label: 'Package', value: client.package || '—', color: '#FF7A00' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-slate-700/40 p-3 text-center" style={{ background: 'rgba(30,41,59,0.4)' }}>
                      <div className="text-base font-bold tabular-nums" style={{ color }}>{value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                {/* 7-Day Charts */}
                <div>
                  <SectionHead title="7-Day Performance" sub="Last 7 days trend" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                      <p className="text-xs text-slate-400 font-medium mb-3">Ad Spend (USD)</p>
                      {metricsLoading ? (
                        <div className="animate-pulse bg-slate-700/40 rounded h-24" />
                      ) : (
                        <AreaChart
                          data={[...last7].reverse().map(m => m.adCost || 0)}
                          labels={[...last7].reverse().map(m => fmtShortDate(m.date))}
                          color="#FF7A00"
                          height={100}
                        />
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                      <p className="text-xs text-slate-400 font-medium mb-3">Messages Received</p>
                      {metricsLoading ? (
                        <div className="animate-pulse bg-slate-700/40 rounded h-24" />
                      ) : (
                        <AreaChart
                          data={[...last7].reverse().map(m => m.messages || 0)}
                          labels={[...last7].reverse().map(m => fmtShortDate(m.date))}
                          color="#818cf8"
                          height={100}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                <div>
                  <SectionHead title="AI Insights" sub="Auto-generated based on your data" />
                  <div className="space-y-2">
                    {insights.map((ins, i) => <InsightCard key={i} type={ins.type} message={ins.message} />)}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════ TAB: ANALYTICS ══════════════════ */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <SectionHead title="Analytics" sub="Performance over time" />
                  <div className="flex items-center gap-1 ml-auto">
                    {['7d', '14d', '30d'].map(f => (
                      <button
                        key={f}
                        onClick={() => setDateFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          dateFilter === f
                            ? 'text-orange-300 bg-orange-500/15 border-orange-500/25'
                            : 'text-slate-400 bg-slate-800/40 border-slate-700/40 hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spend area chart */}
                <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <p className="text-xs text-slate-400 font-medium mb-3">Ad Spend (USD) — {dateFilter}</p>
                  {metricsLoading ? (
                    <div className="animate-pulse bg-slate-700/40 rounded h-28" />
                  ) : (
                    <AreaChart data={chartSpend} labels={chartLabels} color="#FF7A00" height={120} />
                  )}
                </div>

                {/* Messages + Results bar charts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                    <p className="text-xs text-slate-400 font-medium mb-3">Messages</p>
                    {metricsLoading ? (
                      <div className="animate-pulse bg-slate-700/40 rounded h-20" />
                    ) : (
                      <BarChart data={chartMessages} labels={chartLabels} color="#818cf8" height={100} />
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                    <p className="text-xs text-slate-400 font-medium mb-3">Results</p>
                    {metricsLoading ? (
                      <div className="animate-pulse bg-slate-700/40 rounded h-20" />
                    ) : (
                      <BarChart data={chartResults} labels={chartLabels} color="#34d399" height={100} />
                    )}
                  </div>
                </div>

                {/* Full daily table */}
                <div>
                  <SectionHead title="Daily Breakdown" sub={`Showing ${chartMetrics.length} days`} />
                  <div className="rounded-2xl border border-slate-700/40 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ minWidth: 560 }}>
                        <thead>
                          <tr className="border-b border-slate-700/50" style={{ background: 'rgba(15,23,42,0.5)' }}>
                            {['Date', 'Ad Spend', 'Messages', 'Results', 'Cost/Result', 'Conv%'].map(h => (
                              <th key={h} className={`px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-xs ${h === 'Date' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                          {metricsLoading ? (
                            [...Array(5)].map((_, i) => (
                              <tr key={i}>
                                {[...Array(6)].map((_, j) => (
                                  <td key={j} className="px-4 py-3">
                                    <div className="h-3 bg-slate-700/40 rounded animate-pulse" />
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : chartMetrics.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No data for this period</td>
                            </tr>
                          ) : chartMetrics.map(m => {
                            const cpr = m.results > 0 ? (m.adCost / m.results).toFixed(2) : '—';
                            const cr  = m.messages > 0 ? ((m.results / m.messages) * 100).toFixed(1) : '—';
                            return (
                              <tr key={m._id || m.date} className="hover:bg-slate-700/15 transition-colors">
                                <td className="px-4 py-2.5 text-slate-300">{fmtShortDate(m.date)}</td>
                                <td className="px-4 py-2.5 text-right text-orange-400 font-semibold">${(m.adCost || 0).toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-300">{m.messages || 0}</td>
                                <td className="px-4 py-2.5 text-right text-emerald-400">{m.results || 0}</td>
                                <td className="px-4 py-2.5 text-right text-slate-400">{cpr !== '—' ? `$${cpr}` : '—'}</td>
                                <td className="px-4 py-2.5 text-right text-slate-400">{cr !== '—' ? `${cr}%` : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════ TAB: CAMPAIGNS ══════════════════ */}
            {activeTab === 'campaigns' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <SectionHead title="Campaigns" sub="Ad campaign management" />
                  <OrangeBtn
                    className="text-xs px-3 py-1.5"
                    onClick={() => {
                      setCampaignForm({ ...BLANK_CAMPAIGN });
                      setEditingCampaign(null);
                      setShowCampaignForm(true);
                    }}
                  >
                    + Add Campaign
                  </OrangeBtn>
                </div>

                {/* Platform selector */}
                <div className="flex items-center gap-2">
                  {[
                    { id: 'facebook', label: 'Facebook Ads', icon: '📘' },
                    { id: 'google',   label: 'Google Ads',   icon: '🔍' },
                    { id: 'tiktok',   label: 'TikTok Ads',   icon: '🎵' },
                  ].map(p => {
                    const cnt = campaigns.filter(c => c.platform === p.id).length;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPlatformTab(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          platformTab === p.id
                            ? 'text-orange-300 bg-orange-500/15 border-orange-500/25'
                            : 'text-slate-400 bg-slate-800/40 border-slate-700/40 hover:text-white'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                        {cnt > 0 && <span className="ml-0.5 text-xs bg-slate-700 text-slate-300 px-1.5 rounded-full">{cnt}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Summary KPIs for current platform */}
                {(() => {
                  const pc = campaigns.filter(c => c.platform === platformTab);
                  if (!pc.length) return null;
                  const totBudget = pc.reduce((s, c) => s + (c.budget || 0), 0);
                  const totSpend  = pc.reduce((s, c) => s + (c.spend  || 0), 0);
                  const totMsg    = pc.reduce((s, c) => s + (c.messages || 0), 0);
                  const totRes    = pc.reduce((s, c) => s + (c.results  || 0), 0);
                  const avgROAS   = pc.filter(c => c.roas > 0).length
                    ? (pc.reduce((s, c) => s + (c.roas || 0), 0) / pc.filter(c => c.roas > 0).length).toFixed(2)
                    : '—';
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { label: 'Total Budget',  value: `$${totBudget.toFixed(2)}`,   color: '#818cf8' },
                        { label: 'Total Spend',   value: `$${totSpend.toFixed(2)}`,    color: '#f97316' },
                        { label: 'Messages',      value: totMsg,                        color: '#06b6d4' },
                        { label: 'Results',       value: totRes,                        color: '#34d399' },
                        { label: 'Avg ROAS',      value: avgROAS !== '—' ? `${avgROAS}x` : '—', color: '#fbbf24' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl border border-slate-700/40 p-3 text-center" style={{ background: 'rgba(30,41,59,0.4)' }}>
                          <div className="text-base font-bold tabular-nums" style={{ color }}>{value}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Campaign table */}
                <div className="rounded-2xl border border-slate-700/40 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ minWidth: 900 }}>
                      <thead>
                        <tr className="border-b border-slate-700/50" style={{ background: 'rgba(15,23,42,0.5)' }}>
                          {['Campaign', 'Objective', 'Budget', 'Spend', 'CTR', 'CPC', 'Messages', 'Results', 'ROAS', 'Status', ''].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {campaignsLoading ? (
                          [...Array(3)].map((_, i) => (
                            <tr key={i} className="border-b border-slate-700/20 animate-pulse">
                              {[...Array(11)].map((__, j) => (
                                <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-700/50 rounded w-full" /></td>
                              ))}
                            </tr>
                          ))
                        ) : campaigns.filter(c => c.platform === platformTab).length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-4 py-14 text-center">
                              <div className="text-slate-600 text-sm mb-2">No campaigns yet</div>
                              <p className="text-slate-700 text-xs">Click "+ Add Campaign" to start tracking</p>
                            </td>
                          </tr>
                        ) : (
                          campaigns.filter(c => c.platform === platformTab).map(c => {
                            const stColors = {
                              active: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: '#34d399' },
                              paused: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24' },
                              ended:  { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)', color: '#9ca3af' },
                            };
                            const sc = stColors[c.status] || stColors.active;
                            return (
                              <tr key={c._id} className="border-b border-slate-700/20 hover:bg-slate-700/10 transition-colors">
                                <td className="px-3 py-3 font-medium text-white max-w-[140px] truncate">{c.name}</td>
                                <td className="px-3 py-3 text-slate-400">{c.objective || '—'}</td>
                                <td className="px-3 py-3 text-indigo-400 font-semibold">${(c.budget || 0).toFixed(2)}</td>
                                <td className="px-3 py-3 text-orange-400 font-semibold">${(c.spend || 0).toFixed(2)}</td>
                                <td className="px-3 py-3 text-slate-300">{c.ctr > 0 ? `${c.ctr}%` : '—'}</td>
                                <td className="px-3 py-3 text-slate-300">{c.cpc > 0 ? `$${c.cpc}` : '—'}</td>
                                <td className="px-3 py-3 text-cyan-400">{c.messages || 0}</td>
                                <td className="px-3 py-3 text-emerald-400">{c.results || 0}</td>
                                <td className="px-3 py-3 text-yellow-400">{c.roas > 0 ? `${c.roas}x` : '—'}</td>
                                <td className="px-3 py-3">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: sc.bg, borderColor: sc.border, color: sc.color }}>
                                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingCampaign(c);
                                        setCampaignForm({
                                          name: c.name, objective: c.objective || '', budget: c.budget?.toString() || '',
                                          spend: c.spend?.toString() || '', ctr: c.ctr?.toString() || '',
                                          cpc: c.cpc?.toString() || '', messages: c.messages?.toString() || '',
                                          results: c.results?.toString() || '', roas: c.roas?.toString() || '',
                                          status: c.status, startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0,10) : '',
                                          notes: c.notes || '',
                                        });
                                        setShowCampaignForm(true);
                                      }}
                                      className="text-slate-500 hover:text-orange-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-orange-500/10"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      disabled={campaignDeleting === c._id}
                                      onClick={async () => {
                                        if (!confirm('Delete this campaign?')) return;
                                        setCampaignDeleting(c._id);
                                        await fetch(`/api/super-admin/campaigns/${c._id}`, { method: 'DELETE' });
                                        await loadCampaigns();
                                        setCampaignDeleting(null);
                                        showToast?.('Campaign deleted');
                                      }}
                                      className="text-slate-500 hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10 disabled:opacity-40"
                                    >
                                      {campaignDeleting === c._id ? '...' : 'Del'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add / Edit Campaign Modal */}
                {showCampaignForm && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 overflow-hidden" style={{ background: '#0f172a' }}>
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                        <h3 className="text-sm font-semibold text-white">{editingCampaign ? 'Edit Campaign' : 'Add Campaign'}</h3>
                        <button onClick={() => setShowCampaignForm(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
                      </div>
                      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                        {/* Platform (only for new) */}
                        {!editingCampaign && (
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Platform</label>
                            <div className="flex gap-2">
                              {[{ id: 'facebook', label: 'Facebook', icon: '📘' }, { id: 'google', label: 'Google', icon: '🔍' }, { id: 'tiktok', label: 'TikTok', icon: '🎵' }].map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setCampaignForm(f => ({ ...f, _platform: p.id }))}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all flex-1 justify-center ${
                                    (campaignForm._platform || platformTab) === p.id
                                      ? 'text-orange-300 bg-orange-500/15 border-orange-500/30'
                                      : 'text-slate-400 bg-slate-800/40 border-slate-700/40 hover:text-white'
                                  }`}
                                >
                                  <span>{p.icon}</span><span>{p.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <EditField label="Campaign Name *" value={campaignForm.name} onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Sale 2025" />
                          </div>
                          <div className="col-span-2">
                            <EditField label="Objective" value={campaignForm.objective} onChange={e => setCampaignForm(f => ({ ...f, objective: e.target.value }))} placeholder="e.g. Messages, Conversions, Traffic" />
                          </div>
                          <EditField label="Budget ($)" value={campaignForm.budget} onChange={e => setCampaignForm(f => ({ ...f, budget: e.target.value }))} type="number" placeholder="0.00" prefix="$" />
                          <EditField label="Spend ($)" value={campaignForm.spend} onChange={e => setCampaignForm(f => ({ ...f, spend: e.target.value }))} type="number" placeholder="0.00" prefix="$" />
                          <EditField label="CTR (%)" value={campaignForm.ctr} onChange={e => setCampaignForm(f => ({ ...f, ctr: e.target.value }))} type="number" placeholder="0.00" />
                          <EditField label="CPC ($)" value={campaignForm.cpc} onChange={e => setCampaignForm(f => ({ ...f, cpc: e.target.value }))} type="number" placeholder="0.00" prefix="$" />
                          <EditField label="Messages" value={campaignForm.messages} onChange={e => setCampaignForm(f => ({ ...f, messages: e.target.value }))} type="number" placeholder="0" />
                          <EditField label="Results" value={campaignForm.results} onChange={e => setCampaignForm(f => ({ ...f, results: e.target.value }))} type="number" placeholder="0" />
                          <EditField label="ROAS" value={campaignForm.roas} onChange={e => setCampaignForm(f => ({ ...f, roas: e.target.value }))} type="number" placeholder="0.00" />
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                            <select
                              value={campaignForm.status}
                              onChange={e => setCampaignForm(f => ({ ...f, status: e.target.value }))}
                              className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                            >
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="ended">Ended</option>
                            </select>
                          </div>
                          <EditField label="Start Date" value={campaignForm.startDate} onChange={e => setCampaignForm(f => ({ ...f, startDate: e.target.value }))} type="date" />
                          <div className="col-span-2">
                            <EditField label="Notes" value={campaignForm.notes} onChange={e => setCampaignForm(f => ({ ...f, notes: e.target.value }))} type="textarea" placeholder="Optional notes..." />
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                        <button onClick={() => setShowCampaignForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-slate-700/50 hover:text-white transition-all">
                          Cancel
                        </button>
                        <OrangeBtn
                          disabled={campaignSaving || !campaignForm.name?.trim()}
                          onClick={async () => {
                            setCampaignSaving(true);
                            try {
                              const platform = editingCampaign ? editingCampaign.platform : (campaignForm._platform || platformTab);
                              if (editingCampaign) {
                                const r = await fetch(`/api/super-admin/campaigns/${editingCampaign._id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ...campaignForm }),
                                });
                                if (!r.ok) { const d = await r.json(); showToast?.(d.message || 'Error', 'error'); return; }
                              } else {
                                const r = await fetch('/api/super-admin/campaigns', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ...campaignForm, clientId: client._id, platform }),
                                });
                                if (!r.ok) { const d = await r.json(); showToast?.(d.message || 'Error', 'error'); return; }
                              }
                              await loadCampaigns();
                              setShowCampaignForm(false);
                              showToast?.(editingCampaign ? 'Campaign updated' : 'Campaign added');
                            } finally {
                              setCampaignSaving(false);
                            }
                          }}
                        >
                          {campaignSaving ? <Spinner size={4} /> : (editingCampaign ? 'Save Changes' : 'Add Campaign')}
                        </OrangeBtn>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════ TAB: LEADS ══════════════════ */}
            {activeTab === 'leads' && (
              <div className="space-y-6">
                <SectionHead title="Lead Pipeline" sub="Track leads through your sales funnel" />

                {/* Pipeline stage KPI cards */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {LEAD_STATUSES.map(({ id, label, color }) => {
                    const count = leads.filter(l => l.status === id).length;
                    return (
                      <div key={id} className="rounded-xl border border-slate-700/40 p-3 text-center" style={{ background: 'rgba(30,41,59,0.4)' }}>
                        <div className="text-xl font-bold tabular-nums" style={{ color }}>{count}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Revenue summary */}
                {leads.length > 0 && (() => {
                  const confirmed = leads.filter(l => ['confirmed','shipped','delivered'].includes(l.status));
                  const revenue = confirmed.reduce((s, l) => s + (l.price || 0) * (l.quantity || 1), 0);
                  const delivered = leads.filter(l => l.status === 'delivered').length;
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-slate-700/40 p-3 text-center" style={{ background: 'rgba(30,41,59,0.4)' }}>
                        <div className="text-lg font-bold text-white tabular-nums">{leads.length}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Total Leads</div>
                      </div>
                      <div className="rounded-xl border border-slate-700/40 p-3 text-center" style={{ background: 'rgba(30,41,59,0.4)' }}>
                        <div className="text-lg font-bold text-emerald-400 tabular-nums">{delivered}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Delivered</div>
                      </div>
                      <div className="rounded-xl border border-slate-700/40 p-3 text-center" style={{ background: 'rgba(30,41,59,0.4)' }}>
                        <div className="text-lg font-bold text-orange-400 tabular-nums">৳{revenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Est. Revenue</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Lead sections by source */}
                {[
                  { source: 'messenger', title: 'Messenger Leads', icon: '💬' },
                  { source: 'whatsapp',  title: 'WhatsApp Leads',  icon: '📱' },
                  { source: 'website',   title: 'Website Orders',  icon: '🛒' },
                ].map(({ source, title, icon }) => {
                  const sourceLeads = leads.filter(l => l.source === source);
                  return (
                    <div key={source}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span>{icon}</span>
                          <span className="text-sm font-semibold text-white">{title}</span>
                          {sourceLeads.length > 0 && (
                            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full border border-slate-600/50">{sourceLeads.length}</span>
                          )}
                        </div>
                        <OrangeBtn
                          className="text-xs px-3 py-1.5"
                          onClick={() => {
                            setLeadSource(source);
                            setLeadForm({ ...BLANK_LEAD });
                            setEditingLead(null);
                            setShowLeadForm(true);
                          }}
                        >
                          + Add Lead
                        </OrangeBtn>
                      </div>

                      <div className="rounded-2xl border border-slate-700/40 overflow-hidden" style={{ background: 'rgba(30,41,59,0.3)' }}>
                        {leadsLoading ? (
                          <div className="p-6 animate-pulse space-y-2">
                            {[...Array(2)].map((_, i) => <div key={i} className="h-4 bg-slate-700/40 rounded" />)}
                          </div>
                        ) : sourceLeads.length === 0 ? (
                          <div className="py-10 text-center">
                            <div className="text-slate-600 text-sm">No leads yet</div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs" style={{ minWidth: 700 }}>
                              <thead>
                                <tr className="border-b border-slate-700/40" style={{ background: 'rgba(15,23,42,0.4)' }}>
                                  {['Customer', 'Phone', 'Product', 'Qty', 'Price', 'Status', 'Date', ''].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sourceLeads.map(l => {
                                  const st = LEAD_STATUSES.find(s => s.id === l.status) || LEAD_STATUSES[0];
                                  return (
                                    <tr key={l._id} className="border-b border-slate-700/20 last:border-0 hover:bg-slate-700/10 transition-colors">
                                      <td className="px-3 py-2.5">
                                        <div className="font-medium text-white">{l.name || '—'}</div>
                                        {l.email && <div className="text-slate-500 text-xs">{l.email}</div>}
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-400 font-mono">{l.phone || '—'}</td>
                                      <td className="px-3 py-2.5 text-slate-300">{l.product || '—'}</td>
                                      <td className="px-3 py-2.5 text-slate-400 text-center">{l.quantity || 1}</td>
                                      <td className="px-3 py-2.5 text-emerald-400 font-semibold">
                                        {l.price > 0 ? `৳${(l.price * (l.quantity || 1)).toLocaleString()}` : '—'}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        {/* Inline status change dropdown */}
                                        <select
                                          value={l.status}
                                          onChange={async e => {
                                            const newStatus = e.target.value;
                                            await fetch(`/api/super-admin/leads/${l._id}`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ ...l, status: newStatus }),
                                            });
                                            await loadLeads();
                                          }}
                                          className="text-xs rounded-lg px-2 py-1 border focus:outline-none focus:ring-1 focus:ring-orange-500/40 cursor-pointer"
                                          style={{
                                            background: `${st.color}18`,
                                            borderColor: `${st.color}40`,
                                            color: st.color,
                                          }}
                                        >
                                          {LEAD_STATUSES.map(s => (
                                            <option key={s.id} value={s.id} style={{ background: '#0f172a', color: '#e2e8f0' }}>{s.label}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                                        {new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => {
                                              setEditingLead(l);
                                              setLeadSource(l.source);
                                              setLeadForm({
                                                name: l.name || '', phone: l.phone || '', email: l.email || '',
                                                product: l.product || '', quantity: l.quantity?.toString() || '1',
                                                price: l.price?.toString() || '', status: l.status, notes: l.notes || '',
                                              });
                                              setShowLeadForm(true);
                                            }}
                                            className="text-slate-500 hover:text-orange-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-orange-500/10"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            disabled={leadDeleting === l._id}
                                            onClick={async () => {
                                              if (!confirm('Delete this lead?')) return;
                                              setLeadDeleting(l._id);
                                              await fetch(`/api/super-admin/leads/${l._id}`, { method: 'DELETE' });
                                              await loadLeads();
                                              setLeadDeleting(null);
                                              showToast?.('Lead deleted');
                                            }}
                                            className="text-slate-500 hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10 disabled:opacity-40"
                                          >
                                            {leadDeleting === l._id ? '...' : 'Del'}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add / Edit Lead Modal */}
                {showLeadForm && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div className="w-full max-w-md rounded-2xl border border-slate-700/60 overflow-hidden" style={{ background: '#0f172a' }}>
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{editingLead ? 'Edit Lead' : 'Add Lead'}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {leadSource === 'messenger' ? '💬 Messenger' : leadSource === 'whatsapp' ? '📱 WhatsApp' : '🛒 Website'}
                          </p>
                        </div>
                        <button onClick={() => setShowLeadForm(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
                      </div>

                      <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <EditField label="Customer Name" value={leadForm.name} onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                          </div>
                          <EditField label="Phone" value={leadForm.phone} onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
                          <EditField label="Email" value={leadForm.email} onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="optional" />
                          <div className="col-span-2">
                            <EditField label="Product / Service" value={leadForm.product} onChange={e => setLeadForm(f => ({ ...f, product: e.target.value }))} placeholder="e.g. Baby Dress" />
                          </div>
                          <EditField label="Quantity" value={leadForm.quantity} onChange={e => setLeadForm(f => ({ ...f, quantity: e.target.value }))} type="number" placeholder="1" />
                          <EditField label="Price (৳)" value={leadForm.price} onChange={e => setLeadForm(f => ({ ...f, price: e.target.value }))} type="number" placeholder="0" prefix="৳" />
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {LEAD_STATUSES.map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setLeadForm(f => ({ ...f, status: s.id }))}
                                  className="px-2 py-1.5 rounded-lg text-xs font-medium border transition-all"
                                  style={leadForm.status === s.id
                                    ? { background: `${s.color}20`, borderColor: `${s.color}50`, color: s.color }
                                    : { background: 'rgba(30,41,59,0.5)', borderColor: 'rgba(51,65,85,0.5)', color: '#64748b' }
                                  }
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <EditField label="Notes" value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} type="textarea" placeholder="Optional notes..." />
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                        <button onClick={() => setShowLeadForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-slate-700/50 hover:text-white transition-all">
                          Cancel
                        </button>
                        <OrangeBtn
                          disabled={leadSaving}
                          onClick={async () => {
                            setLeadSaving(true);
                            try {
                              let r;
                              if (editingLead) {
                                r = await fetch(`/api/super-admin/leads/${editingLead._id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(leadForm),
                                });
                              } else {
                                r = await fetch('/api/super-admin/leads', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ...leadForm, clientId: client._id, source: leadSource }),
                                });
                              }
                              if (!r.ok) { const d = await r.json(); showToast?.(d.message || 'Error', 'error'); return; }
                              await loadLeads();
                              setShowLeadForm(false);
                              showToast?.(editingLead ? 'Lead updated' : 'Lead added');
                            } finally { setLeadSaving(false); }
                          }}
                        >
                          {leadSaving ? <Spinner size={4} /> : (editingLead ? 'Save Changes' : 'Add Lead')}
                        </OrangeBtn>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════ TAB: PAYMENTS ══════════════════ */}
            {activeTab === 'payments' && (
              <div className="space-y-5">

                {/* ── 7 KPI SUMMARY CARDS ── */}
                <div>
                  <SectionHead title="Payment Summary" sub="Auto-calculated from all payment records" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <KPICard icon="৳" label="Total Paid BDT" value={`৳${totalPaidBDT.toLocaleString()}`} sub="All payments" color="#34d399" loading={paymentsLoading} />
                    <KPICard icon="$" label="Dollar Purchased" value={`$${totalDollarPurchased.toFixed(2)}`} sub="USD bought for ads" color="#818cf8" loading={paymentsLoading} />
                    <KPICard icon="📊" label="Dollar Spent" value={`$${totalDollarSpent.toFixed(2)}`} sub="Total ad spend" color="#FF7A00" loading={paymentsLoading} />
                    <KPICard icon="🟢" label="Live Ad Budget" value={`$${currentLiveBudget.toFixed(2)}`} sub="Currently running" color="#06b6d4" loading={paymentsLoading} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <KPICard icon="⚠️" label="Due Amount" value={`৳${totalDue.toLocaleString()}`} sub="Outstanding balance" color="#f87171" loading={paymentsLoading} />
                    {/* Active Subscription card */}
                    <div className="rounded-2xl border p-4 transition-all duration-200"
                      style={{ background: 'rgba(30,41,59,0.5)', borderColor: 'rgba(51,65,85,0.5)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">📋</span>
                        <span className="text-xs text-slate-400 font-medium">Active Subscription</span>
                      </div>
                      {subscriptionLoading ? (
                        <div className="h-5 w-28 bg-slate-700 rounded animate-pulse" />
                      ) : subscription ? (
                        <>
                          <div className="text-sm font-bold text-white leading-snug">{subscription.planName || PLAN_LABELS[subscription.planType] || 'Custom'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{PLAN_LABELS[subscription.planType]}</div>
                        </>
                      ) : (
                        <div className="text-sm text-slate-500">No plan set</div>
                      )}
                    </div>
                    {/* Subscription status card */}
                    <div className="rounded-2xl border p-4 transition-all duration-200"
                      style={{ background: 'rgba(30,41,59,0.5)', borderColor: 'rgba(51,65,85,0.5)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">✅</span>
                        <span className="text-xs text-slate-400 font-medium">Sub Status</span>
                      </div>
                      {subscriptionLoading ? (
                        <div className="h-5 w-20 bg-slate-700 rounded animate-pulse" />
                      ) : subscription ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).bg,
                            border: `1px solid ${(SUB_STATUS[subscription.status] || SUB_STATUS.pending).border}`,
                            color: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).color,
                          }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).color }} />
                          {(SUB_STATUS[subscription.status] || SUB_STATUS.pending).label}
                        </span>
                      ) : (
                        <div className="text-sm text-slate-500">—</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── SUBSCRIPTION MANAGEMENT PANEL ── */}
                <div className="rounded-2xl border border-slate-700/40 overflow-hidden" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <span>📋</span>
                      <span className="text-sm font-semibold text-white">Subscription Plan</span>
                      {subscription && !subscriptionLoading && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).bg,
                            color: (SUB_STATUS[subscription.status] || SUB_STATUS.pending).color,
                            border: `1px solid ${(SUB_STATUS[subscription.status] || SUB_STATUS.pending).border}`,
                          }}>
                          {(SUB_STATUS[subscription.status] || SUB_STATUS.pending).label}
                        </span>
                      )}
                    </div>
                    <OrangeBtn onClick={() => setShowSubscriptionForm(p => !p)} className="text-xs px-3 py-1.5">
                      {showSubscriptionForm ? 'Cancel' : subscription ? '✏️ Edit Plan' : '+ Set Plan'}
                    </OrangeBtn>
                  </div>

                  {!showSubscriptionForm && subscription && (
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
                        {(subscription.planType === 'commission' || subscription.planType === 'hybrid') && subscription.commissionFixed > 0 && (
                          <div><span className="text-slate-500 block mb-0.5">Fixed/Product</span><span className="text-purple-400 font-bold">৳{subscription.commissionFixed}</span></div>
                        )}
                        <div><span className="text-slate-500 block mb-0.5">Duration</span><span className="text-white font-medium">{subscription.duration || 1} month{subscription.duration !== 1 ? 's' : ''}</span></div>
                        <div><span className="text-slate-500 block mb-0.5">Renewal Date</span><span className="text-white font-medium">{fmtDate(subscription.renewalDate)}</span></div>
                        <div><span className="text-slate-500 block mb-0.5">Dollar Rate</span><span className="text-white font-medium">{subscription.dollarRate ? `${subscription.dollarRate} BDT/$` : '—'}</span></div>
                      </div>
                      {subscription.notes && (
                        <div className="mt-3 text-xs text-slate-400 bg-slate-700/30 rounded-lg px-3 py-2 border border-slate-700/40">{subscription.notes}</div>
                      )}
                      {(subscription.planType === 'commission' || subscription.planType === 'hybrid') && (
                        <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/40">
                          <div className="text-center rounded-xl bg-slate-700/30 py-3">
                            <div className="text-lg font-bold text-white">{totalProductsSold.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 mt-0.5">Products Sold</div>
                          </div>
                          <div className="text-center rounded-xl bg-slate-700/30 py-3">
                            <div className="text-lg font-bold text-white">৳{totalRevenue.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 mt-0.5">Total Revenue</div>
                          </div>
                          <div className="text-center rounded-xl bg-slate-700/30 py-3">
                            <div className="text-lg font-bold text-emerald-400">৳{totalCommission.toLocaleString()}</div>
                            <div className="text-xs text-slate-500 mt-0.5">Commission Earned</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!showSubscriptionForm && !subscription && !subscriptionLoading && (
                    <div className="px-5 py-8 text-center text-slate-500 text-sm">No subscription plan set. Click "+ Set Plan" to configure.</div>
                  )}

                  {showSubscriptionForm && (
                    <div className="px-5 py-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan Type</label>
                          <select value={subForm.planType} onChange={e => setSubForm(p => ({ ...p, planType: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            <option value="one-time">One-Time Package</option>
                            <option value="commission">Commission Based</option>
                            <option value="hybrid">Hybrid Plan</option>
                          </select>
                        </div>
                        <EditField label="Plan Name" value={subForm.planName} onChange={e => setSubForm(p => ({ ...p, planName: e.target.value }))} placeholder="e.g. Starter Monthly" />
                        {(subForm.planType === 'one-time' || subForm.planType === 'hybrid') && (
                          <EditField label="Monthly Fee (BDT)" type="number" prefix="৳" value={subForm.monthlyFee} onChange={e => setSubForm(p => ({ ...p, monthlyFee: e.target.value }))} placeholder="5000" />
                        )}
                        {(subForm.planType === 'commission' || subForm.planType === 'hybrid') && (
                          <EditField label="Commission %" type="number" value={subForm.commissionPercent} onChange={e => setSubForm(p => ({ ...p, commissionPercent: e.target.value }))} placeholder="20" />
                        )}
                        {(subForm.planType === 'commission' || subForm.planType === 'hybrid') && (
                          <EditField label="Fixed / Product (BDT)" type="number" prefix="৳" value={subForm.commissionFixed} onChange={e => setSubForm(p => ({ ...p, commissionFixed: e.target.value }))} placeholder="0" />
                        )}
                        <EditField label="Duration (months)" type="number" value={subForm.duration} onChange={e => setSubForm(p => ({ ...p, duration: e.target.value }))} placeholder="1" />
                        <EditField label="Start Date" type="date" value={subForm.startDate} onChange={e => setSubForm(p => ({ ...p, startDate: e.target.value }))} />
                        <EditField label="Renewal Date" type="date" value={subForm.renewalDate} onChange={e => setSubForm(p => ({ ...p, renewalDate: e.target.value }))} />
                        <EditField label="Dollar Rate (BDT/$)" type="number" value={subForm.dollarRate} onChange={e => setSubForm(p => ({ ...p, dollarRate: e.target.value }))} placeholder="110" />
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                          <select value={subForm.status} onChange={e => setSubForm(p => ({ ...p, status: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                            <option value="expired">Expired</option>
                          </select>
                        </div>
                        <EditField label="Notes" value={subForm.notes} onChange={e => setSubForm(p => ({ ...p, notes: e.target.value }))} placeholder="Subscription notes..." />
                      </div>
                      <div className="flex items-center gap-3">
                        <OrangeBtn onClick={handleSaveSubscription} disabled={subSaving}>
                          {subSaving ? <><Spinner /><span>Saving…</span></> : '💾 Save Subscription'}
                        </OrangeBtn>
                        <button type="button" onClick={() => setShowSubscriptionForm(false)} className="text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ADD PAYMENT FORM ── */}
                {showPaymentForm && (
                  <div className="rounded-2xl border border-orange-500/25 p-5 animate-slide-up" style={{ background: 'rgba(255,85,0,0.04)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#FF5500,#FF9200)' }}>+</span>
                        Add New Payment
                      </h4>
                      <button onClick={() => setShowPaymentForm(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
                    </div>
                    <form onSubmit={handleAddPayment}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Type</label>
                          <select value={paymentForm.paymentType} onChange={e => setPaymentForm(p => ({ ...p, paymentType: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            <option value="service-fee">Service Fee</option>
                            <option value="ad-spend">Ad Spend</option>
                            <option value="commission">Commission</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Subscription Type</label>
                          <select value={paymentForm.subscriptionType} onChange={e => setPaymentForm(p => ({ ...p, subscriptionType: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            <option value="one-time">One-Time Package</option>
                            <option value="monthly">Monthly</option>
                            <option value="commission">Commission Based</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                          <select value={paymentForm.status} onChange={e => setPaymentForm(p => ({ ...p, status: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="partial">Partial</option>
                          </select>
                        </div>
                        <EditField label="Amount BDT *" type="number" prefix="৳" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                        <EditField label="Dollar Purchased" type="number" prefix="$" value={paymentForm.dollarAmount} onChange={e => setPaymentForm(p => ({ ...p, dollarAmount: e.target.value }))} placeholder="0" />
                        <EditField label="Dollar Rate (BDT/$)" type="number" value={paymentForm.dollarRate} onChange={e => setPaymentForm(p => ({ ...p, dollarRate: e.target.value }))} placeholder="110" />
                        <EditField label="Ad Spend (USD)" type="number" prefix="$" value={paymentForm.dollarSpent} onChange={e => setPaymentForm(p => ({ ...p, dollarSpent: e.target.value }))} placeholder="0" />
                        <EditField label="Live Budget (USD)" type="number" prefix="$" value={paymentForm.liveBudget} onChange={e => setPaymentForm(p => ({ ...p, liveBudget: e.target.value }))} placeholder="0" />
                        <EditField label="Commission %" type="number" value={paymentForm.commissionPercent} onChange={e => setPaymentForm(p => ({ ...p, commissionPercent: e.target.value }))} placeholder="0" />
                        <EditField label="Commission Amount (BDT)" type="number" prefix="৳" value={paymentForm.commissionAmount} onChange={e => setPaymentForm(p => ({ ...p, commissionAmount: e.target.value }))} placeholder="0" />
                        <EditField label="Products Sold" type="number" value={paymentForm.productsSold} onChange={e => setPaymentForm(p => ({ ...p, productsSold: e.target.value }))} placeholder="0" />
                        <EditField label="Revenue Generated (BDT)" type="number" prefix="৳" value={paymentForm.revenueGenerated} onChange={e => setPaymentForm(p => ({ ...p, revenueGenerated: e.target.value }))} placeholder="0" />
                        <EditField label="Due Amount (BDT)" type="number" prefix="৳" value={paymentForm.dueAmount} onChange={e => setPaymentForm(p => ({ ...p, dueAmount: e.target.value }))} placeholder="0" />
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Method</label>
                          <select value={paymentForm.method} onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            {['bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Cash', 'USDT', 'Card'].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <EditField label="Transaction ID" value={paymentForm.transactionId} onChange={e => setPaymentForm(p => ({ ...p, transactionId: e.target.value }))} placeholder="TXN123..." />
                        <EditField label="Notes" value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional note" />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <OrangeBtn type="submit" disabled={paymentSaving} className="px-8">
                          {paymentSaving ? <><Spinner /><span>Saving…</span></> : '💾 Save Payment'}
                        </OrangeBtn>
                        <button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ── PAYMENT HISTORY TABLE ── */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Payment History</p>
                      <p className="text-xs text-slate-500">{filteredPayments.length} transaction{filteredPayments.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      {/* Search */}
                      <div className="relative">
                        <input value={paymentSearch}
                          onChange={e => { setPaymentSearch(e.target.value); setPayPage(1); }}
                          placeholder="Search…"
                          className="bg-slate-700/40 border border-slate-600/60 rounded-lg text-white text-xs px-3 py-2 pl-8 focus:outline-none focus:ring-1 focus:ring-orange-500/50 w-32"
                        />
                        <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      {/* Status filter */}
                      <select value={paymentStatusFilter} onChange={e => { setPaymentStatusFilter(e.target.value); setPayPage(1); }}
                        className="bg-slate-700/40 border border-slate-600/60 rounded-lg text-white text-xs px-3 py-2 focus:outline-none">
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="partial">Partial</option>
                      </select>
                      {/* Export CSV */}
                      <button onClick={exportPaymentsCSV}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white border border-slate-700/60 hover:border-slate-600 bg-slate-800/40 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV
                      </button>
                      {/* Add Payment button */}
                      <OrangeBtn onClick={() => setShowPaymentForm(p => !p)} className="text-xs px-3 py-2">
                        {showPaymentForm ? '✕ Cancel' : '+ Add Payment'}
                      </OrangeBtn>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700/40 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ minWidth: 1000 }}>
                        <thead>
                          <tr className="border-b border-slate-700/50" style={{ background: 'rgba(15,23,42,0.6)' }}>
                            {['Date','Type','Amount BDT','$ Bought','$ Spent','Live $','Rate','Method','Txn ID','Sub Type','Comm%','Notes','Status',''].map(h => (
                              <th key={h} className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-xs whitespace-nowrap text-left">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                          {paymentsLoading ? (
                            [...Array(3)].map((_, i) => (
                              <tr key={i}>
                                {[...Array(14)].map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-700/40 rounded animate-pulse" /></td>)}
                              </tr>
                            ))
                          ) : paginatedPayments.length === 0 ? (
                            <tr>
                              <td colSpan={14} className="px-4 py-12 text-center text-slate-500">
                                {paymentSearch || paymentStatusFilter !== 'all' ? 'No payments match your filter.' : 'No payments recorded yet.'}
                              </td>
                            </tr>
                          ) : paginatedPayments.map(p => {
                            const ps = PAY_STATUS[p.status] || PAY_STATUS.pending;
                            return (
                              <tr key={p._id} className="hover:bg-slate-700/15 transition-colors group">
                                <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                                <td className="px-3 py-2.5 text-slate-400 capitalize whitespace-nowrap">{(p.paymentType || '—').replace('-', ' ')}</td>
                                <td className="px-3 py-2.5 text-emerald-400 font-semibold whitespace-nowrap">৳{(p.amount || 0).toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{p.dollarAmount ? `$${p.dollarAmount}` : '—'}</td>
                                <td className="px-3 py-2.5 text-orange-400 whitespace-nowrap">{p.dollarSpent ? `$${p.dollarSpent}` : '—'}</td>
                                <td className="px-3 py-2.5 text-cyan-400 whitespace-nowrap">{p.liveBudget ? `$${p.liveBudget}` : '—'}</td>
                                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{p.dollarRate || '—'}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/40">{p.method || '—'}</span>
                                </td>
                                <td className="px-3 py-2.5 text-slate-400 font-mono whitespace-nowrap text-xs">{p.transactionId || '—'}</td>
                                <td className="px-3 py-2.5 text-slate-500 capitalize whitespace-nowrap">{(p.subscriptionType || '—').replace('-', ' ')}</td>
                                <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{p.commissionPercent ? `${p.commissionPercent}%` : '—'}</td>
                                <td className="px-3 py-2.5 text-slate-500 max-w-[90px]"><span className="truncate block">{p.notes || '—'}</span></td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                    style={{ background: ps.bg, border: `1px solid ${ps.border}`, color: ps.color }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ps.color }} />
                                    {ps.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingPayment({ ...p })}
                                      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleDeletePayment(p._id)}
                                      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
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
                        {[...Array(Math.min(totalPayPages, 5))].map((_, i) => {
                          const pg = i + 1;
                          return (
                            <button key={pg} onClick={() => setPayPage(pg)}
                              className={`w-7 h-6 rounded border transition-all ${payPage === pg ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' : 'bg-slate-800 border-slate-700/60 hover:bg-slate-700'}`}>
                              {pg}
                            </button>
                          );
                        })}
                        <button onClick={() => setPayPage(p => Math.min(totalPayPages, p + 1))} disabled={payPage === totalPayPages}
                          className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 disabled:opacity-40 hover:bg-slate-700 transition-colors">›</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ANALYTICS CHARTS ── */}
                <div>
                  <SectionHead title="Payment Analytics" sub="Visual breakdown of payment activity" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                      <p className="text-xs text-slate-400 font-medium mb-3">Monthly Payments (BDT)</p>
                      {paymentsLoading ? <div className="animate-pulse bg-slate-700/40 rounded h-24" /> : (
                        <BarChart data={monthlyPayData.paid} labels={monthlyPayData.labels} color="#34d399" height={100} />
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                      <p className="text-xs text-slate-400 font-medium mb-3">Monthly Ad Spend (USD)</p>
                      {paymentsLoading ? <div className="animate-pulse bg-slate-700/40 rounded h-24" /> : (
                        <AreaChart data={monthlyPayData.spent} labels={monthlyPayData.labels} color="#FF7A00" height={100} />
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-700/40 p-4" style={{ background: 'rgba(30,41,59,0.4)' }}>
                      <p className="text-xs text-slate-400 font-medium mb-3">Commission Earnings (BDT)</p>
                      {paymentsLoading ? <div className="animate-pulse bg-slate-700/40 rounded h-24" /> : (
                        <BarChart data={monthlyPayData.commission} labels={monthlyPayData.labels} color="#c084fc" height={100} />
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-700/40 p-4 flex flex-col" style={{ background: 'rgba(30,41,59,0.4)' }}>
                      <p className="text-xs text-slate-400 font-medium mb-3">Due vs Paid Ratio</p>
                      {paymentsLoading ? <div className="animate-pulse bg-slate-700/40 rounded-full w-24 h-24 mx-auto" /> : (
                        <div className="flex items-center justify-center gap-6 flex-1">
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

                {/* ── EDIT PAYMENT MODAL ── */}
                {editingPayment && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setEditingPayment(null)}>
                    <div className="absolute inset-0 bg-slate-950/85" style={{ backdropFilter: 'blur(8px)' }} />
                    <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700/60 shadow-2xl overflow-y-auto max-h-[90vh] p-6"
                      onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-white">Edit Payment</h3>
                        <button onClick={() => setEditingPayment(null)} className="text-slate-500 hover:text-white text-xl leading-none transition-colors">×</button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Type</label>
                          <select value={editingPayment.paymentType || 'service-fee'} onChange={e => setEditingPayment(p => ({ ...p, paymentType: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            <option value="service-fee">Service Fee</option>
                            <option value="ad-spend">Ad Spend</option>
                            <option value="commission">Commission</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                          <select value={editingPayment.status || 'paid'} onChange={e => setEditingPayment(p => ({ ...p, status: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="partial">Partial</option>
                          </select>
                        </div>
                        <EditField label="Amount BDT" type="number" prefix="৳" value={editingPayment.amount?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, amount: e.target.value }))} />
                        <EditField label="Dollar Purchased" type="number" prefix="$" value={editingPayment.dollarAmount?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, dollarAmount: e.target.value }))} />
                        <EditField label="Dollar Rate (BDT/$)" type="number" value={editingPayment.dollarRate?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, dollarRate: e.target.value }))} />
                        <EditField label="Ad Spend (USD)" type="number" prefix="$" value={editingPayment.dollarSpent?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, dollarSpent: e.target.value }))} />
                        <EditField label="Live Budget (USD)" type="number" prefix="$" value={editingPayment.liveBudget?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, liveBudget: e.target.value }))} />
                        <EditField label="Commission %" type="number" value={editingPayment.commissionPercent?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, commissionPercent: e.target.value }))} />
                        <EditField label="Commission Amt (BDT)" type="number" prefix="৳" value={editingPayment.commissionAmount?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, commissionAmount: e.target.value }))} />
                        <EditField label="Due Amount (BDT)" type="number" prefix="৳" value={editingPayment.dueAmount?.toString() || ''} onChange={e => setEditingPayment(p => ({ ...p, dueAmount: e.target.value }))} />
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Method</label>
                          <select value={editingPayment.method || 'bKash'} onChange={e => setEditingPayment(p => ({ ...p, method: e.target.value }))}
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                            {['bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Cash', 'USDT', 'Card'].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <EditField label="Transaction ID" value={editingPayment.transactionId || ''} onChange={e => setEditingPayment(p => ({ ...p, transactionId: e.target.value }))} />
                        <EditField label="Notes" value={editingPayment.notes || ''} onChange={e => setEditingPayment(p => ({ ...p, notes: e.target.value }))} />
                      </div>
                      <div className="flex items-center gap-3">
                        <OrangeBtn onClick={handleSaveEditPayment} disabled={editPaySaving}>
                          {editPaySaving ? <><Spinner /><span>Saving…</span></> : '💾 Save Changes'}
                        </OrangeBtn>
                        <button onClick={() => setEditingPayment(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ══════════════════ TAB: DETAILS ══════════════════ */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Save button (top) */}
                <div className="flex items-center justify-between">
                  <SectionHead title="Client Details" sub="Edit profile and account settings" />
                  <OrangeBtn onClick={handleSaveDetails} disabled={detailsSaving}>
                    {detailsSaving ? <><Spinner /><span>Saving…</span></> : 'Save Changes'}
                  </OrangeBtn>
                </div>

                {/* Account Status */}
                <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Account Status</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STATUS_COLORS).map(([key, s]) => {
                      const selected = editForm.clientStatus === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selected ? 'scale-105' : 'opacity-60 hover:opacity-90'}`}
                          style={{
                            background: selected ? s.bg : 'transparent',
                            border: `1px solid ${selected ? s.border : 'rgba(51,65,85,0.5)'}`,
                            color: s.color,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                          {s.label}
                          {key === 'vip' && ' ⭐'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Contact Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditField label="Full Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Client name" />
                    <EditField label="Phone (cannot change)" value={client.phone || ''} disabled />
                    <EditField label="Email" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
                    <EditField label="Package / Plan" value={editForm.package} onChange={e => setEditForm(p => ({ ...p, package: e.target.value }))} placeholder="e.g. Starter, Pro" />
                  </div>
                </div>

                {/* Business Info */}
                <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Business Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditField label="Business Name" value={editForm.businessName} onChange={e => setEditForm(p => ({ ...p, businessName: e.target.value }))} placeholder="ABC Traders" />
                    <EditField label="Website" value={editForm.website} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} placeholder="https://example.com" />
                    <EditField label="Facebook Page URL" value={editForm.fbPage} onChange={e => setEditForm(p => ({ ...p, fbPage: e.target.value }))} placeholder="https://facebook.com/page" />
                    <EditField label="Monthly Budget (BDT)" type="number" prefix="৳" value={editForm.monthlyBudget} onChange={e => setEditForm(p => ({ ...p, monthlyBudget: e.target.value }))} placeholder="0" />
                    <EditField label="Country" value={editForm.country} onChange={e => setEditForm(p => ({ ...p, country: e.target.value }))} placeholder="Bangladesh" />
                  </div>
                </div>

                {/* Ad Account */}
                <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Ad Account Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditField label="Facebook Ad Account ID" value={editForm.adAccountId} onChange={e => setEditForm(p => ({ ...p, adAccountId: e.target.value }))} placeholder="act_123456789" />
                    <EditField label="Facebook Pixel ID" value={editForm.pixelId} onChange={e => setEditForm(p => ({ ...p, pixelId: e.target.value }))} placeholder="1234567890" />
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Internal Notes</p>
                  <EditField
                    type="textarea"
                    value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Private notes about this client (not visible to client)…"
                  />
                </div>

                {/* Save button (bottom) */}
                <div className="flex justify-end">
                  <OrangeBtn onClick={handleSaveDetails} disabled={detailsSaving} className="px-8">
                    {detailsSaving ? <><Spinner /><span>Saving…</span></> : 'Save Changes'}
                  </OrangeBtn>
                </div>
              </div>
            )}

            {/* ══════════════════ TAB: ACTIVITY ══════════════════ */}
            {activeTab === 'activity' && (
              <div className="space-y-5">
                <SectionHead title="Activity Timeline" sub={`${activityLogs.length} events for this client`} />

                {/* Timeline */}
                <div className="rounded-2xl border border-slate-700/40 overflow-hidden" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  {activityLoading ? (
                    <div className="p-5 space-y-4 animate-pulse">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-700 flex-shrink-0" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 bg-slate-700 rounded w-3/4" />
                            <div className="h-2.5 bg-slate-700/60 rounded w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-slate-500 text-sm">No activity for this client yet.</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-0.5">
                      {activityLogs.map((log, i) => {
                        const isDel  = log.action?.includes('delete');
                        const isSus  = log.action?.includes('suspend');
                        const isAct  = log.action?.includes('activate');
                        const isMet  = log.action?.includes('metric');
                        const isPay  = log.action?.includes('payment');
                        const dotClr = isDel ? '#f87171' : isSus ? '#fbbf24' : isAct ? '#34d399' : isPay ? '#c084fc' : '#FF7A00';
                        const icon   = isDel ? '🗑️' : isSus ? '⏸️' : isAct ? '▶️' : isMet ? '📊' : isPay ? '💳' : '✏️';
                        return (
                          <div key={log._id || i} className="flex gap-3 px-2 py-3 rounded-xl hover:bg-slate-700/15 transition-colors">
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                                style={{ background: `${dotClr}18`, border: `1px solid ${dotClr}30` }}>
                                {icon}
                              </div>
                              {i < activityLogs.length - 1 && <div className="w-px flex-1 bg-slate-700/40 min-h-[10px]" />}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <p className="text-sm text-slate-300 leading-snug">{log.details || log.action}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500">{timeAgo(log.createdAt)}</span>
                                {log.createdAt && (
                                  <span className="text-xs text-slate-700">
                                    · {new Date(log.createdAt).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add note */}
                <div className="rounded-2xl border border-slate-700/40 p-5" style={{ background: 'rgba(30,41,59,0.4)' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Note</p>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add a note about this client…"
                    rows={3}
                    className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 transition-all text-sm px-4 py-2.5 resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <OrangeBtn
                      disabled={!noteText.trim()}
                      onClick={async () => {
                        // Notes save to the client notes field
                        const r = await fetch(`/api/super-admin/clients/${client._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'edit', notes: noteText.trim() }),
                        });
                        if (r.ok) {
                          showToast('success', 'Note saved!');
                          setNoteText('');
                          setEditForm(p => ({ ...p, notes: noteText.trim() }));
                          loadActivity();
                        } else {
                          showToast('error', 'Failed to save note.');
                        }
                      }}
                      className="px-6 text-xs"
                    >
                      Save Note
                    </OrangeBtn>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.22s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
