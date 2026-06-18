'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ClientDetailModal from './ClientDetailModal';
import { useRouter } from 'next/navigation';
import { playLogout } from '@/lib/sounds';
import GrowlyZLogo from '@/components/GrowlyZLogo';

/* ─── Tiny helpers ───────────────────────────────────────────── */
function Spinner({ size = 4 }) {
  return (
    <svg className={`animate-spin w-${size} h-${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ─── Toast ──────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div
      className="fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-slide-up"
      style={{
        background:   ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        borderColor:  ok ? 'rgba(16,185,129,0.4)'  : 'rgba(239,68,68,0.4)',
        color:        ok ? '#34d399' : '#f87171',
        backdropFilter: 'blur(12px)',
      }}
    >
      {ok ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      {toast.msg}
    </div>
  );
}

/* ─── Status Badge ───────────────────────────────────────────── */
function StatusBadge({ isActive }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{
        background:  isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        color:       isActive ? '#34d399' : '#f87171',
        border:      `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {isActive ? 'Active' : 'Suspended'}
    </span>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ icon, value, label, sub, color }) {
  const palette = {
    orange: { bg: 'rgba(255,85,0,0.14)',     border: 'rgba(255,85,0,0.25)' },
    green:  { bg: 'rgba(16,185,129,0.14)',   border: 'rgba(16,185,129,0.25)' },
    blue:   { bg: 'rgba(99,102,241,0.14)',   border: 'rgba(99,102,241,0.25)' },
    red:    { bg: 'rgba(239,68,68,0.14)',    border: 'rgba(239,68,68,0.25)' },
  };
  const c = palette[color] || palette.orange;
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 card-shine hover:border-slate-600 transition-all duration-200">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-0.5 tabular-nums">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Shared text input ──────────────────────────────────────── */
function Field({ label, prefix, suffix, ...props }) {
  const baseClass = 'w-full bg-slate-700/40 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm';
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{prefix}</span>}
        {props.as === 'textarea' ? (
          <textarea className={`${baseClass} px-4 py-2.5 resize-none ${prefix ? 'pl-7' : ''}`} {...props} />
        ) : (
          <input className={`${baseClass} px-4 py-2.5 ${prefix ? 'pl-7' : ''}`} {...props} />
        )}
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs select-none">{suffix}</span>}
      </div>
    </div>
  );
}

/* ─── Modal wrapper ──────────────────────────────────────────── */
function Modal({ onClose, wide, children }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-slide-up w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Edit Client Modal ──────────────────────────────────────── */
function EditClientModal({ client, onClose, onSave }) {
  const [name, setName]   = useState(client.name || '');
  const [email, setEmail] = useState(client.email || '');
  const [pkg, setPkg]     = useState(client.package || '');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave({ name: name.trim(), email: email.trim(), package: pkg.trim() });
    if (!ok) setSaving(false);
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Edit Client</h3>
            <p className="text-xs text-slate-500 mt-0.5">{client.phone}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Client name" />
          <Field label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com" />
          <Field label="Package / Plan" value={pkg} onChange={e => setPkg(e.target.value)} placeholder="e.g. Starter, Pro, Enterprise" />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white transition-all text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
              {saving ? <><Spinner /><span>Saving…</span></> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ─── Update Metrics Modal ───────────────────────────────────── */
function MetricsModal({ client, onClose, onSave }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate]         = useState(todayStr);
  const [adCost, setAdCost]     = useState('');
  const [messages, setMessages] = useState('');
  const [results, setResults]   = useState('');
  const [notes, setNotes]       = useState('');
  const [history, setHistory]   = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const r = await fetch(`/api/super-admin/metrics?clientId=${client._id}`, { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); setHistory(d.metrics || []); }
    } finally { setHistLoading(false); }
  }, [client._id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Pre-fill when date changes
  useEffect(() => {
    const entry = history.find(m => m.date === date);
    if (entry) {
      setAdCost(entry.adCost?.toString() ?? '');
      setMessages(entry.messages?.toString() ?? '');
      setResults(entry.results?.toString() ?? '');
      setNotes(entry.notes ?? '');
    } else {
      setAdCost(''); setMessages(''); setResults(''); setNotes('');
    }
  }, [date, history]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const err = await onSave({
      clientId: client._id,
      date,
      adCost:   parseFloat(adCost)  || 0,
      messages: parseInt(messages)  || 0,
      results:  parseInt(results)   || 0,
      notes:    notes.trim(),
    });
    setSaving(false);
    if (err) {
      setFeedback({ ok: false, text: err });
    } else {
      setFeedback({ ok: true, text: 'Metrics saved successfully!' });
      await loadHistory();
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
              {(client.name || client.phone).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Update Metrics</h3>
              <p className="text-xs text-slate-500 mt-0.5">{client.name || ''} · {client.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div>
            {feedback && (
              <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm border flex items-center gap-2 ${
                feedback.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {feedback.ok ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {feedback.text}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              <Field label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              <Field label="Ad Cost (USD)" type="number" prefix="$" value={adCost} onChange={e => setAdCost(e.target.value)} placeholder="0.00" min="0" step="0.01" />
              <Field label="Messages Received" type="number" value={messages} onChange={e => setMessages(e.target.value)} placeholder="0" min="0" />
              <Field label="Results / Conversions" type="number" value={results} onChange={e => setResults(e.target.value)} placeholder="0" min="0" />
              <Field label="Notes (optional)" as="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note for client…" rows={2} />

              <button type="submit" disabled={saving}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                {saving ? <><Spinner /><span>Saving…</span></> : '💾 Save Metrics'}
              </button>
            </form>
          </div>

          {/* History */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Metrics History
              <span className="text-slate-600 font-normal text-xs ml-1">(click row to prefill)</span>
            </h4>
            {histLoading ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-slate-700/40 rounded-lg" />)}
              </div>
            ) : history.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No history yet</p>
            ) : (
              <div className="overflow-y-auto max-h-80 rounded-xl border border-slate-700/40">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr className="border-b border-slate-700/50">
                      {['Date','Cost','Msgs','Results'].map(h => (
                        <th key={h} className={`px-3 py-2 font-semibold text-slate-500 uppercase tracking-wider ${h === 'Date' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {history.map(m => (
                      <tr key={m._id || m.date} onClick={() => setDate(m.date)}
                        className={`cursor-pointer transition-colors hover:bg-slate-700/30 ${m.date === date ? 'bg-orange-500/10' : ''}`}>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{fmtDate(m.date + 'T00:00:00')}</td>
                        <td className="px-3 py-2 text-right text-orange-400 font-semibold">${(m.adCost ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{m.messages ?? 0}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">{m.results ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Delete Confirm Modal ───────────────────────────────────── */
function DeleteModal({ client, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Delete Client?</h3>
        <p className="text-slate-400 text-sm mb-1">
          This will permanently delete{' '}
          <span className="text-white font-semibold">{client.name || client.phone}</span>{' '}
          and <strong>all their metrics</strong>.
        </p>
        <p className="text-red-400 text-xs mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white transition-all text-sm font-medium">
            Cancel
          </button>
          <button onClick={confirm} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
            {deleting ? <><Spinner /><span>Deleting…</span></> : '🗑️ Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── View Dashboard Modal ───────────────────────────────────── */
function ViewDashboardModal({ client, onClose }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/super-admin/metrics?clientId=${client._id}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { metrics: [] })
      .then(d => setMetrics((d.metrics || []).slice(0, 7)))
      .finally(() => setLoading(false));
  }, [client._id]);

  const today = metrics[0];

  return (
    <Modal onClose={onClose} wide>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
              {(client.name || client.phone).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{client.name || client.phone}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500">{client.phone}</span>
                {client.email && <><span className="text-slate-700">·</span><span className="text-xs text-slate-500">{client.email}</span></>}
                {client.package && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/25">
                    {client.package}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={7} /></div>
        ) : (
          <>
            {/* Today snapshot */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Ad Spend', value: `$${(today?.adCost ?? 0).toFixed(2)}`, color: '#FF7A00' },
                { label: 'Messages', value: (today?.messages ?? 0).toLocaleString(), color: '#818cf8' },
                { label: 'Results',  value: (today?.results ?? 0).toLocaleString(), color: '#34d399' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/40">
                  <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mb-4 text-right">Most recent entry</p>

            {/* History table */}
            <h4 className="text-sm font-semibold text-slate-300 mb-3">7-Day History</h4>
            {metrics.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-slate-500 text-sm">No metrics recorded yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['Date','Ad Cost','Messages','Results'].map(h => (
                      <th key={h} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 ${h==='Date'?'text-left':'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {metrics.map(m => (
                    <tr key={m._id || m.date} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-2.5 text-slate-300 text-xs whitespace-nowrap">{fmtDate(m.date + 'T00:00:00')}</td>
                      <td className="py-2.5 text-right text-orange-400 font-semibold text-xs">${(m.adCost ?? 0).toFixed(2)}</td>
                      <td className="py-2.5 text-right text-slate-300 text-xs">{(m.messages ?? 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right text-emerald-400 text-xs">{(m.results ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/* ─── Create Client Modal ────────────────────────────────────── */
function CreateClientModal({ onClose, onCreated }) {
  const BLANK = { phone: '', password: '', name: '', email: '', pkg: '' };
  const [form, setForm]       = useState(BLANK);
  const [saving, setSaving]   = useState(false);
  const [feedback, setFeedback] = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/super-admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setFeedback({ ok: true, text: 'Client created successfully!' });
      setForm(BLANK);
      onCreated(data.user);
    } catch (err) {
      setFeedback({ ok: false, text: err.message || 'Failed to create client.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Create New Client</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manually add a client account</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {feedback && (
          <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm border flex items-center gap-2 ${
            feedback.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {feedback.ok ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {feedback.text}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <Field label="Phone *" type="text" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+8801XXXXXXXXX" required />
          <Field label="Password *" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" required minLength={6} />
          <Field label="Full Name" type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Client name" />
          <Field label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@example.com" />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Package</label>
            <select value={form.pkg} onChange={e => set('pkg', e.target.value)}
              className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm">
              <option value="">Select package…</option>
              <option value="Starter">Starter</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white transition-all text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
              {saving ? <><Spinner /><span>Creating…</span></> : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ─── Action icon button ─────────────────────────────────────── */
function ActionBtn({ title, onClick, hoverColor, children }) {
  return (
    <button onClick={onClick} title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 transition-all duration-150 hover:text-${hoverColor}-400 hover:bg-${hoverColor}-500/10`}>
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
/* ─────────────────────────────────────────────────────────
   BOOKINGS TAB
───────────────────────────────────────────────────────── */
const BOOKING_STATUS = {
  new:       { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)',  color: '#818cf8', label: 'New' },
  contacted: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',  color: '#fbbf24', label: 'Contacted' },
  completed: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)',  color: '#34d399', label: 'Completed' },
  cancelled: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',   color: '#f87171', label: 'Cancelled' },
};

/* ─────────────────────────────────────────────────────────
   BOOKING DETAIL VIEW  (inspired by order management UI)
───────────────────────────────────────────────────────── */
const WA_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function BookingDetailModal({ booking: initialBooking, onClose, onUpdate, showToast }) {
  const [booking, setBooking] = useState(initialBooking);
  const [notes, setNotes]     = useState(initialBooking.notes || '');
  const [saving, setSaving]   = useState(false);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied]   = useState(false);

  const STEPS = [
    { key: 'new',       label: 'Booked',    sub: 'Request received', icon: '📅' },
    { key: 'contacted', label: 'Contacted', sub: 'Reached out',      icon: '💬' },
    { key: 'completed', label: 'Audit Done', sub: 'Completed',       icon: '✅' },
  ];
  const STEP_IDX = { new: 0, contacted: 1, completed: 2 };
  const currentStep = STEP_IDX[booking.status] ?? 0;
  const isCancelled = booking.status === 'cancelled';

  const bs = BOOKING_STATUS[booking.status] || BOOKING_STATUS.new;
  const initial = (booking.name || '?').charAt(0).toUpperCase();
  const shortId = booking._id?.toString().slice(-6).toUpperCase();

  async function setStatus(newStatus) {
    setUpdating(true);
    try {
      const r = await fetch('/api/audit-booking', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking._id, status: newStatus }),
      });
      if (r.ok) {
        const d = await r.json();
        setBooking(d.booking);
        onUpdate(d.booking);
        showToast('success', `Marked as ${d.booking.status}`);
      }
    } finally { setUpdating(false); }
  }

  async function saveNotes() {
    setSaving(true);
    try {
      const r = await fetch('/api/audit-booking', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking._id, notes }),
      });
      if (r.ok) {
        const d = await r.json();
        setBooking(d.booking);
        onUpdate(d.booking);
        showToast('success', 'Notes saved');
      }
    } finally { setSaving(false); }
  }

  function copyPhone() {
    navigator.clipboard.writeText(booking.phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  // Next logical status button
  const nextAction = isCancelled ? null
    : booking.status === 'new'       ? { label: '→ Mark Contacted',  next: 'contacted' }
    : booking.status === 'contacted' ? { label: '→ Mark Completed',  next: 'completed' }
    : null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: 'rgba(2,6,23,0.97)' }}>
      <div className="max-w-5xl mx-auto px-4 py-5 min-h-screen flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-white">Booking #{shortId}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: bs.bg, border: `1px solid ${bs.border}`, color: bs.color }}>
                  {bs.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {booking.name} · {booking.phone} · {booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Two-column body ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* Status Tracker */}
            <div className="rounded-2xl border border-slate-700/50 p-5" style={{ background: 'rgba(15,23,42,0.7)' }}>
              <div className="mb-1">
                <p className="text-sm font-semibold text-white">Booking Status</p>
                <p className="text-xs text-slate-500 mt-0.5">Track the current fulfilment stage</p>
              </div>

              {isCancelled ? (
                <div className="mt-4 text-center text-sm text-red-400 bg-red-500/10 rounded-xl py-3 border border-red-500/20">
                  This booking has been cancelled
                  <button onClick={() => setStatus('new')} disabled={updating}
                    className="block mx-auto mt-2 text-xs text-slate-500 hover:text-white underline disabled:opacity-40">
                    Restore as New
                  </button>
                </div>
              ) : (
                <div className="flex items-center mt-5">
                  {STEPS.map((step, i) => {
                    const done   = i < currentStep;
                    const active = i === currentStep;
                    const future = i > currentStep;
                    return (
                      <div key={step.key} className="flex items-center flex-1 last:flex-none">
                        <button onClick={() => setStatus(step.key)} disabled={updating}
                          className="flex flex-col items-center gap-2 group disabled:cursor-default flex-shrink-0"
                          style={{ minWidth: 80 }}>
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg border-2 transition-all"
                            style={{
                              background: done || active ? 'linear-gradient(135deg,#FF5500,#FF9200)' : 'rgba(30,41,59,0.8)',
                              borderColor: done || active ? '#FF7A00' : 'rgba(51,65,85,0.6)',
                              boxShadow: active ? '0 0 20px rgba(255,122,0,0.4)' : 'none',
                              opacity: future ? 0.5 : 1,
                            }}>
                            {done ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : step.icon}
                          </div>
                          <div className="text-center">
                            <div className={`text-xs font-semibold ${done || active ? 'text-white' : 'text-slate-500'}`}>{step.label}</div>
                            <div className="text-xs text-slate-600">{step.sub}</div>
                          </div>
                        </button>
                        {i < STEPS.length - 1 && (
                          <div className="flex-1 h-0.5 mx-2 mb-6 rounded-full transition-all"
                            style={{ background: done ? 'linear-gradient(90deg,#FF5500,#FF9200)' : 'rgba(51,65,85,0.5)' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audit Details */}
            <div className="rounded-2xl border border-slate-700/50 p-5" style={{ background: 'rgba(15,23,42,0.7)' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">📋</span>
                <span className="text-sm font-semibold text-white">Audit Details</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                {[
                  { label: 'Preferred Date',  value: booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—' },
                  { label: 'Time Slot',        value: booking.timeSlot },
                  { label: 'Submitted',        value: booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                  { label: 'Source',           value: '🌐 Website Form', color: '#FF7A00' },
                  { label: 'Booking ID',       value: `#${shortId}`, mono: true },
                ].map(({ label, value, color, mono }) => (
                  <div key={label}>
                    <div className="text-xs text-slate-500 mb-1">{label}</div>
                    <div className={`text-sm font-medium ${mono ? 'font-mono text-slate-400' : 'text-white'}`} style={color ? { color } : {}}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="rounded-2xl border border-slate-700/50 p-5" style={{ background: 'rgba(15,23,42,0.7)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📝</span>
                <span className="text-sm font-semibold text-white">Admin Notes</span>
                {booking.noteHistory?.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(255,122,0,0.12)', color: '#FF7A00', border: '1px solid rgba(255,122,0,0.25)' }}>
                    {booking.noteHistory.length} saved
                  </span>
                )}
              </div>

              {/* Write new note */}
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Add follow-up notes, call outcome, next steps…"
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none" />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-600">
                  {notes !== (booking.notes || '') ? <span className="text-orange-400">● Unsaved changes</span> : 'Saved'}
                </span>
                <button onClick={saveNotes} disabled={saving || notes === (booking.notes || '')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                  {saving ? '…' : 'Save Note'}
                </button>
              </div>

              {/* Note history */}
              {booking.noteHistory?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/40">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note History</span>
                  </div>
                  <div className="space-y-2.5">
                    {[...booking.noteHistory].reverse().map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center flex-shrink-0 pt-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: i === 0 ? '#FF7A00' : '#334155' }} />
                          {i < booking.noteHistory.length - 1 && (
                            <div className="w-px flex-1 mt-1" style={{ background: 'rgba(51,65,85,0.5)', minHeight: 12 }} />
                          )}
                        </div>
                        {/* Note content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm text-slate-300 leading-relaxed">{entry.text}</p>
                          <span className="text-xs text-slate-600 mt-1 block">
                            {entry.savedAt
                              ? new Date(entry.savedAt).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">

            {/* Customer Card */}
            <div className="rounded-2xl border border-slate-700/50 p-5" style={{ background: 'rgba(15,23,42,0.7)' }}>
              {/* Avatar + name */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#FF5500,#FF9200)', boxShadow: '0 0 20px rgba(255,85,0,0.3)' }}>
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white truncate">{booking.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-mono text-slate-400">{booking.phone}</span>
                    <button onClick={copyPhone}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-white transition-all"
                      title="Copy phone">
                      {copied
                        ? <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a href={`https://wa.me/${booking.phone.replace(/\D/g,'')}?text=Hi%20${encodeURIComponent(booking.name)}%2C%20আমরা%20আপনার%20ফ্রি%20অডিট%20বুকিং%20পেয়েছি।%20আমাদের%20টিম%20শীঘ্রই%20যোগাযোগ%20করবে।`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.01] mb-2"
                style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)', color: '#34d399' }}>
                {WA_ICON}
                Contact on WhatsApp
              </a>

              {/* Next step CTA */}
              {nextAction && (
                <button onClick={() => setStatus(nextAction.next)} disabled={updating}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.01] disabled:opacity-40"
                  style={{ background: 'rgba(255,122,0,0.12)', borderColor: 'rgba(255,122,0,0.35)', color: '#FF7A00' }}>
                  {nextAction.label}
                </button>
              )}
            </div>

            {/* Status Panel */}
            <div className="rounded-2xl border border-slate-700/50 p-5" style={{ background: 'rgba(15,23,42,0.7)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🏷️</span>
                <span className="text-sm font-semibold text-white">Update Status</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(BOOKING_STATUS).map(([key, s]) => (
                  <button key={key} onClick={() => setStatus(key)} disabled={updating || booking.status === key}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:scale-[1.02] disabled:cursor-default"
                    style={{
                      background: booking.status === key ? s.bg : 'rgba(30,41,59,0.5)',
                      borderColor: booking.status === key ? s.border : 'rgba(51,65,85,0.4)',
                      color: booking.status === key ? s.color : '#64748b',
                    }}>
                    {booking.status === key && <span className="mr-1">●</span>}{s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Booking Meta */}
            <div className="rounded-2xl border border-slate-700/50 p-5" style={{ background: 'rgba(15,23,42,0.7)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">ℹ️</span>
                <span className="text-sm font-semibold text-white">Booking Info</span>
              </div>
              <div className="space-y-3">
                {[
                  { k: 'Booking ID',    v: `#${shortId}`, cls: 'font-mono text-slate-400' },
                  { k: 'Received',      v: booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', cls: 'text-slate-300' },
                  { k: 'Preferred Date',v: booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', cls: 'text-slate-300' },
                  { k: 'Time Slot',     v: booking.timeSlot, cls: 'text-slate-300' },
                  { k: 'Source',        v: '🌐 Website Form', cls: 'text-orange-400' },
                ].map(({ k, v, cls }) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 flex-shrink-0">{k}</span>
                    <span className={`text-xs ${cls} text-right`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingsTab({ bookings, loading, onRefresh, showToast, onBookingsChange, onSelectBooking }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [updatingId, setUpdatingId]     = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [editingNote, setEditingNote]   = useState(null);
  const [copiedId, setCopiedId]         = useState(null);

  const counts = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.name.toLowerCase().includes(q) || b.phone.includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleStatus(id, newStatus) {
    setUpdatingId(id);
    try {
      const r = await fetch('/api/audit-booking', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (r.ok) {
        const d = await r.json();
        onBookingsChange(prev => prev.map(b => b._id === id ? d.booking : b));
        showToast('success', `Marked as ${newStatus}`);
      }
    } finally { setUpdatingId(null); }
  }

  async function handleSaveNote(id, notes) {
    try {
      const r = await fetch('/api/audit-booking', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes }),
      });
      if (r.ok) {
        const d = await r.json();
        onBookingsChange(prev => prev.map(b => b._id === id ? d.booking : b));
        showToast('success', 'Note saved');
        setEditingNote(null);
      }
    } catch { showToast('error', 'Failed to save note'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this booking?')) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/audit-booking?id=${id}`, { method: 'DELETE' });
      if (r.ok) {
        onBookingsChange(prev => prev.filter(b => b._id !== id));
        showToast('success', 'Booking deleted');
      }
    } finally { setDeletingId(null); }
  }

  function copyPhone(id, phone) {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  }

  function timeAgoShort(d) {
    if (!d) return '';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  const STATUS_TABS = [
    { key: 'all',       label: 'All',       color: null },
    { key: 'new',       label: 'New',       color: '#818cf8' },
    { key: 'contacted', label: 'Contacted', color: '#fbbf24' },
    { key: 'completed', label: 'Completed', color: '#34d399' },
    { key: 'cancelled', label: 'Cancelled', color: '#f87171' },
  ];

  return (
    <div className="space-y-0 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Bookings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Free audit requests from the website</p>
        </div>
        <button onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition-all border border-slate-700/50">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Status tab bar (SeloraX-style) ── */}
      <div className="flex rounded-2xl overflow-hidden border border-slate-700/50 mb-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
        {STATUS_TABS.map(({ key, label, color }) => {
          const cnt = key === 'all' ? bookings.length : (counts[key] || 0);
          const active = statusFilter === key;
          return (
            <button key={key} onClick={() => setStatusFilter(key)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all relative"
              style={{
                background: active ? 'linear-gradient(135deg, #FF5500, #FF9200)' : 'transparent',
                color: active ? '#fff' : (color || '#64748b'),
              }}>
              {!active && color && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              )}
              <span>{label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                active ? 'bg-white/20 text-white' : 'bg-slate-700/60 text-slate-400'
              }`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone number…"
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-sm pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40 placeholder-slate-600 transition-all" />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-all">
            ✕
          </button>
        )}
      </div>

      {/* ── Booking cards ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-700/40 p-5 animate-pulse" style={{ background: 'rgba(15,23,42,0.6)' }}>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-700/60 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700/60 rounded w-1/3" />
                  <div className="h-3 bg-slate-700/40 rounded w-1/4" />
                </div>
                <div className="w-20 h-8 bg-slate-700/40 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/40 py-20 text-center" style={{ background: 'rgba(15,23,42,0.4)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: 'rgba(255,85,0,0.1)', border: '1px solid rgba(255,85,0,0.2)' }}>
            📅
          </div>
          <p className="text-slate-400 font-semibold">No bookings found</p>
          <p className="text-slate-600 text-xs mt-1">
            {search ? `No results for "${search}"` : statusFilter !== 'all' ? `No ${statusFilter} bookings yet` : 'Bookings from the website will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const st = BOOKING_STATUS[b.status] || BOOKING_STATUS.new;
            const initial = (b.name || '?').charAt(0).toUpperCase();
            const shortId = b._id?.toString().slice(-6).toUpperCase();
            const isUpdating = updatingId === b._id;
            const isDeleting = deletingId === b._id;
            const isCopied = copiedId === b._id;

            return (
              <div key={b._id}
                className="rounded-2xl border transition-all duration-200 overflow-hidden group"
                style={{
                  background: 'rgba(15,23,42,0.7)',
                  borderColor: 'rgba(51,65,85,0.5)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,122,0,0.25)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; e.currentTarget.style.boxShadow = 'none'; }}>

                {/* ── Card top strip ── */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-700/40"
                  style={{ background: 'rgba(2,6,23,0.4)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-400">#{shortId}</span>
                    {/* Animated "Website" badge — pulsing live indicator */}
                    <span className="relative flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                      style={{ background: 'rgba(255,122,0,0.08)', borderColor: 'rgba(255,122,0,0.28)', color: '#FF7A00' }}>
                      {/* Ping ring */}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                          style={{ background: '#FF7A00' }} />
                        <span className="relative inline-flex rounded-full h-2 w-2"
                          style={{ background: '#FF7A00' }} />
                      </span>
                      🌐 Website
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{timeAgoShort(b.createdAt)}</span>
                    <span className="hidden sm:inline text-slate-700">·</span>
                    <span className="hidden sm:inline">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>

                {/* ── Card body ── */}
                <div className="px-4 py-3">

                  {/* Top row: avatar + info + desktop controls */}
                  <div className="flex items-center gap-3">

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)', boxShadow: '0 0 12px rgba(255,85,0,0.2)' }}>
                      {initial}
                    </div>

                    {/* Customer info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-white block truncate">{b.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 mb-1.5">
                        <a href={`https://wa.me/${b.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors">
                          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          <span className="truncate max-w-[130px]">{b.phone}</span>
                        </a>
                        <button onClick={e => { e.stopPropagation(); copyPhone(b._id, b.phone); }}
                          className="w-4 h-4 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 transition-all flex-shrink-0"
                          title="Copy phone">
                          {isCopied
                            ? <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          }
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-slate-400 border border-slate-700/50"
                          style={{ background: 'rgba(30,41,59,0.5)' }}>
                          <svg className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-slate-400 border border-slate-700/50"
                          style={{ background: 'rgba(30,41,59,0.5)' }}>
                          <svg className="w-2.5 h-2.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {b.timeSlot}
                        </span>
                      </div>
                    </div>

                    {/* Note preview — large screens only */}
                    <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border w-44 flex-shrink-0"
                      style={{ background: b.notes ? 'rgba(16,185,129,0.06)' : 'rgba(30,41,59,0.3)', borderColor: b.notes ? 'rgba(16,185,129,0.2)' : 'rgba(51,65,85,0.3)' }}>
                      <svg className="w-3 h-3 flex-shrink-0" style={{ color: b.notes ? '#34d399' : '#475569' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span className="truncate" style={{ color: b.notes ? '#94a3b8' : '#475569' }}>
                        {b.notes || 'No admin notes'}
                      </span>
                    </div>

                    {/* Desktop controls — hidden on mobile, shown sm+ */}
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <select value={b.status} disabled={isUpdating}
                        onChange={e => handleStatus(b._id, e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none disabled:opacity-50 cursor-pointer font-semibold"
                        style={{ background: st.bg, borderColor: st.border, color: st.color }}>
                        <option value="new">● New</option>
                        <option value="contacted">● Contacted</option>
                        <option value="completed">● Completed</option>
                        <option value="cancelled">● Cancelled</option>
                      </select>
                      <div className="flex items-center border border-slate-700/50 rounded-lg overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)' }}>
                        <button onClick={() => setEditingNote({ id: b._id, notes: b.notes || '' })} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all" title="Note">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <a href={`https://wa.me/${b.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(b.name)}%2C%20আমরা%20আপনার%20ফ্রি%20অডিট%20বুকিং%20পেয়েছি।`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border-x border-slate-700/50" title="WhatsApp">{WA_ICON}</a>
                        <button onClick={() => handleDelete(b._id)} disabled={isDeleting} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <button onClick={() => onSelectBooking(b)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg,#FF5500,#FF9200)', boxShadow: '0 2px 10px rgba(255,85,0,0.3)' }}>
                        View Details <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Mobile action row — visible only below sm breakpoint */}
                  <div className="flex sm:hidden items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-700/30" onClick={e => e.stopPropagation()}>
                    <select value={b.status} disabled={isUpdating}
                      onChange={e => handleStatus(b._id, e.target.value)}
                      className="text-xs px-2 py-1.5 rounded-lg border focus:outline-none disabled:opacity-50 cursor-pointer font-semibold flex-shrink-0"
                      style={{ background: st.bg, borderColor: st.border, color: st.color }}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <div className="flex items-center border border-slate-700/50 rounded-lg overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)' }}>
                      <button onClick={() => setEditingNote({ id: b._id, notes: b.notes || '' })} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-yellow-400 transition-all" title="Note">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <a href={`https://wa.me/${b.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(b.name)}%2C%20আমরা%20আপনার%20ফ্রি%20অডিট%20বুকিং%20পেয়েছি।`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-all border-x border-slate-700/50" title="WhatsApp">{WA_ICON}</a>
                      <button onClick={() => handleDelete(b._id)} disabled={isDeleting} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all disabled:opacity-40" title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <button onClick={() => onSelectBooking(b)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap hover:opacity-90 transition-all flex-shrink-0" style={{ background: 'linear-gradient(135deg,#FF5500,#FF9200)', boxShadow: '0 2px 8px rgba(255,85,0,0.3)' }}>
                      View <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-slate-600 text-center pt-2">
          Showing {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Note editor modal */}
      {editingNote && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <h3 className="text-sm font-semibold text-white mb-1">Admin Note</h3>
            <p className="text-xs text-slate-500 mb-3">Follow-up notes, call outcome, next steps</p>
            <textarea value={editingNote.notes}
              onChange={e => setEditingNote(n => ({ ...n, notes: e.target.value }))}
              rows={4} autoFocus
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none placeholder-slate-600"
              placeholder="e.g. Called at 3pm, will follow up tomorrow…"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setEditingNote(null)}
                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/60">
                Cancel
              </button>
              <button onClick={() => handleSaveNote(editingNote.id, editingNote.notes)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();

  const [admin, setAdmin]         = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [stats, setStats]         = useState(null);
  const [clients, setClients]     = useState([]);
  const [activity, setActivity]   = useState([]);
  const [bookings, setBookings]   = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [tab, setTab]             = useState('overview');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]     = useState({ stats: true, clients: true, activity: true });
  const [loggingOut, setLoggingOut] = useState(false);

  const [editModal, setEditModal]       = useState(null);
  const [metricsModal, setMetricsModal] = useState(null);
  const [deleteModal, setDeleteModal]   = useState(null);
  const [viewModal, setViewModal]       = useState(null);
  const [detailModal, setDetailModal]   = useState(null);
  const [showCreateClient, setShowCreateClient] = useState(false);

  // Admins management
  const [adminsList, setAdminsList]         = useState([]);
  const [adminsLoading, setAdminsLoading]   = useState(false);
  const [showAdminForm, setShowAdminForm]   = useState(false);
  const [editingAdmin, setEditingAdmin]     = useState(null);
  const [adminSaving, setAdminSaving]       = useState(false);
  const [adminDeleting, setAdminDeleting]   = useState(null);
  const BLANK_ADMIN = { phone: '', name: '', email: '', password: '', permissions: [] };
  const [adminForm, setAdminForm]           = useState(BLANK_ADMIN);

  const ALL_PERMS = [
    { id: 'view_clients',    label: 'View Clients',    desc: 'See the client list' },
    { id: 'edit_clients',    label: 'Edit Clients',    desc: 'Edit client details' },
    { id: 'delete_clients',  label: 'Delete Clients',  desc: 'Delete clients' },
    { id: 'view_metrics',    label: 'View Metrics',    desc: 'See performance metrics' },
    { id: 'edit_metrics',    label: 'Add Metrics',     desc: 'Add/update daily metrics' },
    { id: 'view_payments',   label: 'View Payments',   desc: 'See payment history' },
    { id: 'edit_payments',   label: 'Manage Payments', desc: 'Add/edit payment records' },
    { id: 'view_campaigns',  label: 'View Campaigns',  desc: 'See ad campaigns' },
    { id: 'edit_campaigns',  label: 'Manage Campaigns',desc: 'Add/edit campaigns' },
    { id: 'view_activity',   label: 'View Activity',   desc: 'See activity log' },
  ];

  const [toast, setToast]   = useState(null);
  const toastRef            = useRef(null);

  function showToast(type, msg) {
    setToast({ type, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }

  /* Auth */
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.user || !['admin', 'super_admin'].includes(d.user.role)) {
          router.push('/dashboard');
        } else {
          setAdmin(d.user);
          setAuthChecked(true);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  /* Data loaders */
  const loadStats = useCallback(async () => {
    setLoading(p => ({ ...p, stats: true }));
    const r = await fetch('/api/super-admin/stats', { cache: 'no-store' }).catch(() => null);
    if (r?.ok) setStats(await r.json());
    setLoading(p => ({ ...p, stats: false }));
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(p => ({ ...p, clients: true }));
    const r = await fetch('/api/super-admin/clients', { cache: 'no-store' }).catch(() => null);
    if (r?.ok) { const d = await r.json(); setClients(d.clients || []); }
    setLoading(p => ({ ...p, clients: false }));
  }, []);

  const loadActivity = useCallback(async () => {
    setLoading(p => ({ ...p, activity: true }));
    const r = await fetch('/api/super-admin/activity', { cache: 'no-store' }).catch(() => null);
    if (r?.ok) { const d = await r.json(); setActivity(d.logs || []); }
    setLoading(p => ({ ...p, activity: false }));
  }, []);

  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const r = await fetch('/api/super-admin/admins', { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); setAdminsList(d.admins || []); }
    } finally { setAdminsLoading(false); }
  }, []);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const r = await fetch('/api/audit-booking', { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); setBookings(d.bookings || []); }
    } finally { setBookingsLoading(false); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    loadStats();
    loadClients();
    loadActivity();
    loadBookings();
    if (admin?.role === 'super_admin') loadAdmins();
  }, [authChecked, loadStats, loadClients, loadActivity, loadBookings, loadAdmins, admin?.role]);

  async function handleLogout() {
    setLoggingOut(true);
    playLogout();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/login');
    router.refresh();
  }

  /* Edit client */
  async function handleSaveClient(data) {
    const r = await fetch(`/api/super-admin/clients/${editModal._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', ...data }),
    });
    if (!r.ok) { showToast('error', 'Failed to update client.'); return false; }
    showToast('success', 'Client updated!');
    setEditModal(null);
    await Promise.all([loadClients(), loadActivity()]);
    return true;
  }

  /* Metrics */
  async function handleSaveMetrics(data) {
    const r = await fetch('/api/super-admin/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); return d.message || 'Save failed.'; }
    showToast('success', 'Metrics updated!');
    await Promise.all([loadClients(), loadStats(), loadActivity()]);
    return null;
  }

  /* Toggle suspend/activate */
  async function handleToggleStatus(client) {
    const r = await fetch(`/api/super-admin/clients/${client._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleStatus', isActive: !client.isActive }),
    });
    if (!r.ok) { showToast('error', 'Status update failed.'); return; }
    showToast('success', client.isActive ? 'Client suspended.' : 'Client activated.');
    await Promise.all([loadClients(), loadStats(), loadActivity()]);
  }

  /* Delete */
  async function handleDeleteClient() {
    const r = await fetch(`/api/super-admin/clients/${deleteModal._id}`, { method: 'DELETE' });
    if (!r.ok) { showToast('error', 'Delete failed.'); return; }
    showToast('success', 'Client deleted.');
    setDeleteModal(null);
    await Promise.all([loadClients(), loadStats(), loadActivity()]);
  }

  /* Filtered client list */
  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (c.name || '').toLowerCase().includes(q)
      || (c.phone || '').includes(q)
      || (c.email || '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' ? c.isActive : !c.isActive);
    return matchSearch && matchStatus;
  });

  /* Loading screen while auth check runs */
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <Spinner size={8} />
      </div>
    );
  }

  const NAV = [
    {
      id: 'overview', label: 'Overview',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    },
    {
      id: 'clients', label: 'Clients',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    },
    {
      id: 'activity', label: 'Activity',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      id: 'bookings', label: 'Bookings',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    ...(admin?.role === 'super_admin' ? [{
      id: 'admins', label: 'Admins',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    }] : []),
  ];

  const adminInitial = (admin?.name || admin?.phone || 'A').charAt(0).toUpperCase();

  /* ── JSX ── */
  return (
    <div className="min-h-screen flex overflow-x-hidden"
      style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(255,85,0,0.07) 0%, transparent 55%), #0f172a' }}>

      {/* ════ SIDEBAR (desktop) ════ */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30"
        style={{ background: 'rgba(2,6,23,0.97)', borderRight: '1px solid rgba(51,65,85,0.5)' }}>

        {/* Logo block */}
        <div className="px-5 py-5 border-b border-slate-800/70">
          <div className="flex items-center gap-3">
            <GrowlyZLogo size={36} />
            <div>
              <div className="text-white font-bold text-sm leading-tight">GrowlyZ</div>
              <div className="flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
                <span className="text-xs font-bold text-orange-400 tracking-wide">Super Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats mini-bar */}
        {stats && !loading.stats && (
          <div className="px-5 py-3 border-b border-slate-800/50 grid grid-cols-2 gap-2">
            {[
              { label: 'Clients', value: stats.totalClients },
              { label: 'Active',  value: stats.activeClients, color: '#34d399' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800/40 rounded-xl px-3 py-2 text-center">
                <div className="text-base font-bold tabular-nums" style={{ color: color || 'white' }}>{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                tab === item.id
                  ? 'text-orange-300 bg-orange-500/10 border border-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}>
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'clients' && (
                <span className="ml-auto text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-700">
                  {clients.length}
                </span>
              )}
              {item.id === 'activity' && activity.length > 0 && (
                <span className="ml-auto w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              )}
              {item.id === 'admins' && adminsList.length > 0 && (
                <span className="ml-auto text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-700">
                  {adminsList.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom admin info */}
        <div className="p-4 border-t border-slate-800/70 space-y-2">
          <button onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
              {adminInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-white font-medium truncate">{admin?.name || admin?.phone}</div>
              <div className="text-xs text-orange-400">Super Admin</div>
            </div>
            <button onClick={handleLogout} disabled={loggingOut} title="Logout"
              className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ════ MAIN AREA ════ */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Top nav */}
        <nav className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <div className="px-4 sm:px-6 h-14 flex items-center gap-3">

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 min-w-0 flex-1">
              <GrowlyZLogo size={26} />
              <span className="text-sm font-bold text-white">GrowlyZ</span>
              <span className="px-1.5 py-0.5 rounded-md text-xs font-bold text-orange-300 border border-orange-500/40 bg-orange-500/10 whitespace-nowrap">
                Super Admin
              </span>
            </div>

            {/* Desktop tab title */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-white font-semibold text-sm">
                {tab === 'overview' ? 'Overview' : tab === 'clients' ? 'Client Management' : tab === 'activity' ? 'Activity Log' : tab === 'bookings' ? 'Audit Bookings' : 'Admin Management'}
              </span>
            </div>

            {/* Mobile logout (compact icon only) */}
            <div className="lg:hidden flex-shrink-0">
              <button onClick={handleLogout} disabled={loggingOut}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50"
                title="Logout">
                {loggingOut ? <Spinner size={3} /> : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
              </button>
            </div>

            {/* Desktop logout */}
            <div className="hidden lg:flex ml-auto">
              <button onClick={handleLogout} disabled={loggingOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50">
                {loggingOut ? <Spinner /> : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                Logout
              </button>
            </div>
          </div>

          {/* Mobile tab strip — scrollable, shown below the header bar on small screens */}
          <div className="lg:hidden flex items-center gap-1 px-3 py-2 border-t border-slate-800/50 overflow-x-auto"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  tab === item.id
                    ? 'text-orange-300 bg-orange-500/15 border border-orange-500/25'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}>
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-x-hidden">

          {/* ════════ OVERVIEW TAB ════════ */}
          {tab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">Overview</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Your dashboard at a glance</p>
                </div>
                <button onClick={() => { loadStats(); loadActivity(); }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all border border-slate-700/60 hover:border-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Stats grid */}
              {loading.stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl h-28 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon="👥" value={stats?.totalClients ?? 0} label="Total Clients" color="blue" />
                  <StatCard icon="✅" value={stats?.activeClients ?? 0} label="Active" sub="Running campaigns" color="green" />
                  <StatCard
                    icon="💰"
                    value={`$${(stats?.totalSpend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    label="Total Ad Spend"
                    sub="All time"
                    color="orange"
                  />
                  <StatCard icon="💬" value={(stats?.totalMessages ?? 0).toLocaleString()} label="Total Messages" sub="All time" color="blue" />
                </div>
              )}

              {/* Quick stats row */}
              {stats && !loading.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Suspended Clients', value: stats.suspendedClients ?? 0, icon: '⏸️', dim: true },
                    { label: 'Total Results',      value: (stats.totalResults ?? 0).toLocaleString(), icon: '🎯', dim: false },
                    { label: 'Unique Campaigns',   value: stats.totalClients ?? 0, icon: '📣', dim: true },
                  ].map(({ label, value, icon, dim }) => (
                    <div key={label}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${dim ? 'bg-slate-800/30 border-slate-700/30' : 'bg-slate-800/60 border-slate-700/50'}`}>
                      <span className="text-xl">{icon}</span>
                      <div>
                        <div className="text-lg font-bold text-white tabular-nums">{value}</div>
                        <div className="text-xs text-slate-500">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-white">Recent Activity</h2>
                  <button onClick={() => setTab('activity')}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                    View all →
                  </button>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                  {loading.activity ? (
                    <div className="p-5 space-y-3 animate-pulse">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
                          <div className="flex-1 space-y-1.5 pt-0.5">
                            <div className="h-3 bg-slate-700 rounded w-3/4" />
                            <div className="h-2.5 bg-slate-700/60 rounded w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activity.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-slate-500 text-sm">No activity recorded yet.</p>
                      <p className="text-slate-600 text-xs mt-1">Actions you take will appear here.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700/30">
                      {activity.slice(0, 8).map((log, i) => {
                        const isDel = log.action.includes('delete');
                        const isSus = log.action.includes('suspend');
                        const isAct = log.action.includes('activate');
                        const icon  = isDel ? '🗑️' : isSus ? '⏸️' : isAct ? '▶️' : log.action.includes('metric') ? '📊' : '✏️';
                        const bg    = isDel ? 'rgba(239,68,68,0.12)' : isSus ? 'rgba(245,158,11,0.12)' : isAct ? 'rgba(16,185,129,0.12)' : 'rgba(255,85,0,0.12)';
                        return (
                          <div key={log._id || i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/10 transition-colors">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                              style={{ background: bg }}>
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-300 truncate">{log.details || log.action}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{timeAgo(log.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════ CLIENTS TAB ════════ */}
          {tab === 'clients' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white">Client Management</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {filteredClients.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button onClick={() => setShowCreateClient(true)}
                    className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-lg transition-all font-semibold hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Client
                  </button>
                  <button onClick={loadClients}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all border border-slate-700/60 hover:border-slate-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, phone, or email…"
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-9 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all text-sm" />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { key: 'all',       label: 'All' },
                    { key: 'active',    label: 'Active' },
                    { key: 'suspended', label: 'Suspended' },
                  ].map(f => (
                    <button key={f.key} onClick={() => setStatusFilter(f.key)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        statusFilter === f.key
                          ? 'text-orange-300 bg-orange-500/15 border-orange-500/30'
                          : 'text-slate-400 bg-slate-800/40 border-slate-700/50 hover:text-white hover:bg-slate-700/50'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client table */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                {loading.clients ? (
                  <div className="p-5 space-y-3 animate-pulse">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-700/40 rounded-xl" />)}
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: 'rgba(255,85,0,0.08)', border: '1px solid rgba(255,85,0,0.15)' }}>
                      <svg className="w-8 h-8 text-orange-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                      {search ? 'No clients match your search.' : 'No clients yet.'}
                    </p>
                    {search && (
                      <button onClick={() => setSearch('')} className="text-orange-400 text-xs mt-2 hover:text-orange-300 transition-colors">
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: '920px' }}>
                      <thead>
                        <tr className="border-b border-slate-700/50" style={{ background: 'rgba(15,23,42,0.5)' }}>
                          {['Client','Email','Package','Total Spend','Messages','Results','Status','Last Updated','Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {filteredClients.map(client => (
                          <tr key={client._id} className="hover:bg-slate-700/15 transition-colors group">

                            {/* Client */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                                  {(client.name || client.phone).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-medium text-xs truncate max-w-[110px]">
                                    {client.name || client.phone}
                                  </div>
                                  {client.name && (
                                    <div className="text-slate-600 text-xs truncate max-w-[110px]">{client.phone}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="px-4 py-3 text-slate-500 text-xs max-w-[120px]">
                              <span className="truncate block">{client.email || '—'}</span>
                            </td>

                            {/* Package */}
                            <td className="px-4 py-3">
                              {client.package ? (
                                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/50 whitespace-nowrap">
                                  {client.package}
                                </span>
                              ) : <span className="text-slate-700 text-xs">—</span>}
                            </td>

                            {/* Spend */}
                            <td className="px-4 py-3 text-orange-400 font-semibold text-xs whitespace-nowrap tabular-nums">
                              ${(client.totalSpend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Messages */}
                            <td className="px-4 py-3 text-slate-300 text-xs tabular-nums">
                              {(client.totalMessages ?? 0).toLocaleString()}
                            </td>

                            {/* Results */}
                            <td className="px-4 py-3 text-emerald-400 text-xs tabular-nums">
                              {(client.totalResults ?? 0).toLocaleString()}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <StatusBadge isActive={client.isActive} />
                            </td>

                            {/* Last Updated */}
                            <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                              {client.lastUpdated ? timeAgo(client.lastUpdated) : '—'}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">

                                {/* Edit */}
                                <button onClick={() => setDetailModal({ client, tab: 'details' })} title="Edit client"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>

                                {/* Metrics */}
                                <button onClick={() => setDetailModal({ client, tab: 'analytics' })} title="Update metrics"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                </button>

                                {/* View */}
                                <button onClick={() => setDetailModal({ client, tab: 'overview' })} title="View dashboard"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>

                                {/* Suspend / Activate */}
                                <button onClick={() => handleToggleStatus(client)}
                                  title={client.isActive ? 'Suspend client' : 'Activate client'}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 transition-all ${
                                    client.isActive
                                      ? 'hover:text-amber-400 hover:bg-amber-500/10'
                                      : 'hover:text-emerald-400 hover:bg-emerald-500/10'
                                  }`}>
                                  {client.isActive ? (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </button>

                                {/* Delete */}
                                <button onClick={() => setDeleteModal(client)} title="Delete client"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ ACTIVITY TAB ════════ */}
          {tab === 'activity' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">Activity Log</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Complete history of admin actions</p>
                </div>
                <button onClick={loadActivity}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all border border-slate-700/60 hover:border-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                {loading.activity ? (
                  <div className="p-5 space-y-4 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex-shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-3 bg-slate-700 rounded w-3/4" />
                          <div className="h-2.5 bg-slate-700/60 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-slate-500 text-sm">No activity logged yet.</p>
                    <p className="text-slate-600 text-xs mt-1">Every action you take will appear here.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-0.5">
                    {activity.map((log, i) => {
                      const isDel  = log.action.includes('delete');
                      const isSus  = log.action.includes('suspend');
                      const isAct  = log.action.includes('activate');
                      const isMet  = log.action.includes('metric');
                      const dotClr = isDel ? '#f87171' : isSus ? '#fbbf24' : isAct ? '#34d399' : '#FF7A00';
                      const icon   = isDel ? '🗑️' : isSus ? '⏸️' : isAct ? '▶️' : isMet ? '📊' : '✏️';
                      return (
                        <div key={log._id || i} className="flex gap-3 px-2 py-3 rounded-xl hover:bg-slate-700/15 transition-colors group">
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                              style={{ background: `${dotClr}18`, border: `1px solid ${dotClr}30` }}>
                              {icon}
                            </div>
                            {i < activity.length - 1 && (
                              <div className="w-px flex-1 bg-slate-700/40 min-h-[10px]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <p className="text-sm text-slate-300 leading-snug">{log.details || log.action}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            </div>
          )}

          {/* ════ TAB: BOOKINGS ════ */}
          {tab === 'bookings' && (
            <BookingsTab
              bookings={bookings}
              loading={bookingsLoading}
              onRefresh={loadBookings}
              showToast={showToast}
              onBookingsChange={setBookings}
              onSelectBooking={setSelectedBooking}
            />
          )}

          {/* ════ TAB: ADMINS ════ */}
          {tab === 'admins' && admin?.role === 'super_admin' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">Admin Management</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Create admins and assign limited permissions</p>
                </div>
                <button
                  onClick={() => { setAdminForm({ ...BLANK_ADMIN }); setEditingAdmin(null); setShowAdminForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                >
                  + Add Admin
                </button>
              </div>

              {/* Admins table */}
              <div className="rounded-2xl border border-slate-700/50 overflow-hidden bg-slate-800/60">
                {adminsLoading ? (
                  <div className="p-8 text-center animate-pulse">
                    <div className="h-4 w-40 bg-slate-700 rounded mx-auto" />
                  </div>
                ) : adminsList.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-slate-600 text-sm">No admins yet</div>
                    <p className="text-slate-700 text-xs mt-1">Add an admin to delegate access</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/50" style={{ background: 'rgba(15,23,42,0.5)' }}>
                          {['Admin', 'Phone', 'Email', 'Role', 'Permissions', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {adminsList.map(a => {
                          const isSelf = a._id === admin._id;
                          const isSA = a.role === 'super_admin';
                          return (
                            <tr key={a._id} className="hover:bg-slate-700/15 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                    style={{ background: isSA ? 'linear-gradient(135deg,#FF5500,#FF9200)' : 'rgba(99,102,241,0.3)' }}>
                                    {(a.name || a.phone || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-white font-medium text-xs">{a.name || '—'}</div>
                                    {isSelf && <div className="text-orange-400 text-xs">You</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs font-mono">{a.phone}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{a.email || '—'}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={isSA
                                    ? { background: 'rgba(255,85,0,0.15)', color: '#FF7A00', border: '1px solid rgba(255,85,0,0.3)' }
                                    : { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                                  }>
                                  {isSA ? 'Super Admin' : 'Admin'}
                                </span>
                              </td>
                              <td className="px-4 py-3 max-w-[200px]">
                                {isSA ? (
                                  <span className="text-xs text-slate-500 italic">All access</span>
                                ) : a.permissions?.length === 0 ? (
                                  <span className="text-xs text-red-400/80">No permissions</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {(a.permissions || []).slice(0, 3).map(p => (
                                      <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600/50">
                                        {ALL_PERMS.find(x => x.id === p)?.label || p}
                                      </span>
                                    ))}
                                    {(a.permissions || []).length > 3 && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-500">
                                        +{a.permissions.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {!isSA && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingAdmin(a);
                                        setAdminForm({ phone: a.phone, name: a.name || '', email: a.email || '', password: '', permissions: a.permissions || [] });
                                        setShowAdminForm(true);
                                      }}
                                      className="text-slate-500 hover:text-orange-400 transition-colors text-xs px-2 py-1 rounded hover:bg-orange-500/10"
                                    >
                                      Edit
                                    </button>
                                    {!isSelf && (
                                      <button
                                        disabled={adminDeleting === a._id}
                                        onClick={async () => {
                                          if (!confirm(`Delete admin ${a.name || a.phone}?`)) return;
                                          setAdminDeleting(a._id);
                                          const r = await fetch(`/api/super-admin/admins/${a._id}`, { method: 'DELETE' });
                                          const d = await r.json();
                                          if (!r.ok) { showToast('error', d.message || 'Delete failed'); }
                                          else { showToast('success', 'Admin removed'); await loadAdmins(); }
                                          setAdminDeleting(null);
                                        }}
                                        className="text-slate-500 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-40"
                                      >
                                        {adminDeleting === a._id ? '...' : 'Remove'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add / Edit Admin Modal */}
              {showAdminForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
                  <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 overflow-hidden" style={{ background: '#0f172a' }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                      <h3 className="text-sm font-semibold text-white">{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h3>
                      <button onClick={() => setShowAdminForm(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
                    </div>

                    <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
                      {/* Basic info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone *</label>
                          <input
                            type="tel"
                            value={adminForm.phone}
                            disabled={!!editingAdmin}
                            onChange={e => setAdminForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="01XXXXXXXXX"
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                          <input
                            type="text"
                            value={adminForm.name}
                            onChange={e => setAdminForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Admin name"
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">Gmail</label>
                          <input
                            type="email"
                            value={adminForm.email}
                            onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="admin@gmail.com"
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            {editingAdmin ? 'New Password' : 'Password *'}
                            {editingAdmin && <span className="text-slate-600 font-normal ml-1">(leave blank to keep)</span>}
                          </label>
                          <input
                            type="password"
                            value={adminForm.password}
                            onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="Min 6 characters"
                            className="w-full bg-slate-700/40 border border-slate-600/60 rounded-xl text-white placeholder-slate-500 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                        </div>
                      </div>

                      {/* Permissions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-slate-400">Permissions</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAdminForm(f => ({ ...f, permissions: ALL_PERMS.map(p => p.id) }))}
                              className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                            >
                              Select All
                            </button>
                            <span className="text-slate-700">·</span>
                            <button
                              type="button"
                              onClick={() => setAdminForm(f => ({ ...f, permissions: [] }))}
                              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-slate-700/50 p-3" style={{ background: 'rgba(15,23,42,0.5)' }}>
                          {ALL_PERMS.map(p => {
                            const checked = adminForm.permissions.includes(p.id);
                            return (
                              <label key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors">
                                <div
                                  onClick={() => setAdminForm(f => ({
                                    ...f,
                                    permissions: checked
                                      ? f.permissions.filter(x => x !== p.id)
                                      : [...f.permissions, p.id],
                                  }))}
                                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                                  style={{
                                    background: checked ? 'linear-gradient(135deg,#FF5500,#FF9200)' : 'rgba(51,65,85,0.6)',
                                    border: checked ? 'none' : '1px solid rgba(100,116,139,0.5)',
                                  }}
                                >
                                  {checked && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-white">{p.label}</div>
                                  <div className="text-xs text-slate-500">{p.desc}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5">{adminForm.permissions.length} of {ALL_PERMS.length} permissions selected</p>
                      </div>
                    </div>

                    <div className="px-5 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                      <button onClick={() => setShowAdminForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-slate-700/50 hover:text-white transition-all">
                        Cancel
                      </button>
                      <button
                        disabled={adminSaving || !adminForm.phone?.trim() || (!editingAdmin && !adminForm.password)}
                        onClick={async () => {
                          setAdminSaving(true);
                          try {
                            let r;
                            if (editingAdmin) {
                              r = await fetch(`/api/super-admin/admins/${editingAdmin._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(adminForm),
                              });
                            } else {
                              r = await fetch('/api/super-admin/admins', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(adminForm),
                              });
                            }
                            const d = await r.json();
                            if (!r.ok) { showToast('error', d.message || 'Failed'); return; }
                            showToast('success', editingAdmin ? 'Admin updated!' : 'Admin created!');
                            setShowAdminForm(false);
                            await loadAdmins();
                          } finally { setAdminSaving(false); }
                        }}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all"
                        style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                      >
                        {adminSaving && <Spinner size={4} />}
                        {editingAdmin ? 'Save Changes' : 'Create Admin'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 py-4">
          <p className="text-center text-slate-700 text-xs">
            &copy; {new Date().getFullYear()} GrowlyZ · Super Admin Panel
          </p>
        </footer>
      </div>

      {/* ════ MODALS ════ */}
      {detailModal && (
        <ClientDetailModal
          client={detailModal.client}
          initialTab={detailModal.tab}
          onClose={() => setDetailModal(null)}
          onUpdate={() => { loadClients(); loadStats(); loadActivity(); }}
          showToast={showToast}
        />
      )}
      {editModal   && <EditClientModal    client={editModal}   onClose={() => setEditModal(null)}   onSave={handleSaveClient}  />}
      {metricsModal && <MetricsModal      client={metricsModal} onClose={() => setMetricsModal(null)} onSave={handleSaveMetrics} />}
      {deleteModal  && <DeleteModal       client={deleteModal}  onClose={() => setDeleteModal(null)}  onConfirm={handleDeleteClient} />}
      {viewModal    && <ViewDashboardModal client={viewModal}   onClose={() => setViewModal(null)}   />}
      {showCreateClient && (
        <CreateClientModal
          onClose={() => setShowCreateClient(false)}
          onCreated={newClient => {
            setClients(prev => [newClient, ...prev]);
            showToast('success', `Client ${newClient.name || newClient.phone} created`);
          }}
        />
      )}

      {/* Booking detail modal — rendered at top level so z-index covers sticky nav */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={updated => {
            setBookings(prev => prev.map(b => b._id === updated._id ? updated : b));
            setSelectedBooking(updated);
          }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      <Toast toast={toast} />
    </div>
  );
}
