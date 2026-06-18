'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GrowlyZLogo from '@/components/GrowlyZLogo';

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function AdminPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Search
  const [searchPhone, setSearchPhone] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Selected user
  const [selectedUser, setSelectedUser] = useState(null);

  // Metrics form
  const [metricDate, setMetricDate] = useState(todayISO());
  const [adCost, setAdCost] = useState('');
  const [messages, setMessages] = useState('');
  const [results, setResults] = useState('');
  const [notes, setNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });

  // User metrics history
  const [userMetrics, setUserMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Create client modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ phone: '', password: '', name: '', email: '', pkg: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState({ type: '', text: '' });

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user || data.user.role !== 'admin') {
          router.push('/dashboard');
        } else {
          setAdminUser(data.user);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError('');
    setSearchLoading(true);
    setHasSearched(true);
    setSelectedUser(null);

    try {
      const params = searchPhone.trim() ? `?phone=${encodeURIComponent(searchPhone.trim())}` : '';
      const res = await fetch(`/api/admin/users${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSearchResults(data.users || []);
    } catch (err) {
      setSearchError(err.message || 'Search failed.');
    } finally {
      setSearchLoading(false);
    }
  }

  const loadUserMetrics = useCallback(async (userId) => {
    setMetricsLoading(true);
    setUserMetrics([]);
    try {
      const res = await fetch(`/api/admin/metrics?userId=${userId}`);
      const data = await res.json();
      if (res.ok) setUserMetrics(data.metrics || []);
    } catch {}
    finally { setMetricsLoading(false); }
  }, []);

  async function handleSelectUser(u) {
    setSelectedUser(u);
    setAdCost('');
    setMessages('');
    setResults('');
    setNotes('');
    setMetricDate(todayISO());
    setSaveMsg({ type: '', text: '' });
    await loadUserMetrics(u._id);
  }

  // Pre-fill form if a metric entry exists for selected date
  useEffect(() => {
    if (!selectedUser || !metricDate) return;
    const existing = userMetrics.find(m => m.date === metricDate);
    if (existing) {
      setAdCost(existing.adCost?.toString() ?? '');
      setMessages(existing.messages?.toString() ?? '');
      setResults(existing.results?.toString() ?? '');
      setNotes(existing.notes ?? '');
    } else {
      setAdCost('');
      setMessages('');
      setResults('');
      setNotes('');
    }
  }, [metricDate, userMetrics, selectedUser]);

  async function handleSave(e) {
    e.preventDefault();
    if (!selectedUser || !metricDate) return;
    setSaveLoading(true);
    setSaveMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser._id,
          date: metricDate,
          adCost: parseFloat(adCost) || 0,
          messages: parseInt(messages) || 0,
          results: parseInt(results) || 0,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSaveMsg({ type: 'success', text: 'Metrics saved successfully!' });
      await loadUserMetrics(selectedUser._id);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Save failed.' });
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleCreateClient(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCreateMsg({ type: 'success', text: 'Client created successfully!' });
      setCreateForm({ phone: '', password: '', name: '', email: '', pkg: '' });
    } catch (err) {
      setCreateMsg({ type: 'error', text: err.message || 'Failed to create client.' });
    } finally {
      setCreateLoading(false);
    }
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-900"
      style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(255,85,0,0.08) 0%, transparent 60%), #0f172a' }}
    >
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GrowlyZLogo size={32} />
            <span className="text-lg font-bold gradient-text">GrowlyZ</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold text-orange-300 border border-orange-500/40 bg-orange-500/10 ml-1">
              Admin Panel
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-slate-400 hover:text-white text-sm hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50"
            >
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page heading */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 mt-1 text-sm">Search clients and update their daily metrics.</p>
        </div>

        {/* Search section */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Clients
            </h2>
            <button
              onClick={() => { setShowCreate(true); setCreateMsg({ type: '', text: '' }); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Client
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              placeholder="Search by phone number..."
              className="flex-1 bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-5 py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-70 flex items-center gap-2 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
            >
              {searchLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Search
            </button>
          </form>

          {searchError && (
            <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {searchError}
            </div>
          )}

          {/* Results */}
          {hasSearched && !searchLoading && (
            <div className="mt-4 space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No clients found.</p>
              ) : (
                <>
                  <p className="text-slate-500 text-xs mb-3">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
                  {searchResults.map(u => (
                    <button
                      key={u._id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                        selectedUser?._id === u._id
                          ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                          : 'bg-slate-700/30 border-slate-700 text-slate-300 hover:bg-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                      >
                        {(u.name || u.phone).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{u.phone}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {u.name ? `${u.name} · ` : ''}Joined {formatDateDisplay(u.createdAt?.split('T')[0])}
                        </div>
                      </div>
                      {u.role === 'admin' && (
                        <span className="ml-auto text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/30 flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Selected user panel */}
        {selectedUser && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
            {/* Metrics form */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              {/* User info header */}
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-700/50">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                >
                  {(selectedUser.name || selectedUser.phone).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-white">{selectedUser.phone}</div>
                  {selectedUser.name && (
                    <div className="text-sm text-slate-400">{selectedUser.name}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">
                    User since {formatDateDisplay(selectedUser.createdAt?.split('T')[0])}
                  </div>
                </div>
              </div>

              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Update Metrics
              </h3>

              {/* Success/error */}
              {saveMsg.text && (
                <div
                  className={`mb-4 px-4 py-3 rounded-xl text-sm border flex items-start gap-2 ${
                    saveMsg.type === 'success'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  {saveMsg.type === 'success' ? (
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  {saveMsg.text}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={metricDate}
                    onChange={e => setMetricDate(e.target.value)}
                    required
                    className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                  />
                </div>

                {/* Ad Cost */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Ad Cost (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                    <input
                      type="number"
                      value={adCost}
                      onChange={e => setAdCost(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-slate-700/40 border border-slate-600 rounded-xl pl-7 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Messages */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Messages Received
                  </label>
                  <input
                    type="number"
                    value={messages}
                    onChange={e => setMessages(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                  />
                </div>

                {/* Results */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Results</label>
                  <input
                    type="number"
                    value={results}
                    onChange={e => setResults(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notes <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add a note for the client..."
                    rows={3}
                    className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                >
                  {saveLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Metrics
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Metrics history for this user */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Metrics History
                <span className="text-xs text-slate-500 font-normal ml-1">(last 30 days)</span>
              </h3>

              {metricsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-700/40 rounded-xl" />
                  ))}
                </div>
              ) : userMetrics.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-500 text-sm">No metrics found for this user.</p>
                  <p className="text-slate-600 text-xs mt-1">Use the form to add the first entry.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2">Date</th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2">Cost</th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2">Msgs</th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2">Results</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 pl-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {userMetrics.map((m, i) => (
                        <tr
                          key={m._id || m.date}
                          className={`transition-colors hover:bg-slate-700/20 cursor-pointer ${
                            m.date === metricDate ? 'bg-orange-500/5 border-l-2 border-orange-500' : ''
                          }`}
                          onClick={() => setMetricDate(m.date)}
                        >
                          <td className="py-2.5 pr-2 text-slate-300 whitespace-nowrap text-xs">
                            {formatDateDisplay(m.date)}
                          </td>
                          <td className="py-2.5 text-right text-orange-400 font-medium text-xs whitespace-nowrap">
                            ${(m.adCost ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right text-slate-300 text-xs">
                            {m.messages ?? 0}
                          </td>
                          <td className="py-2.5 text-right text-green-400 text-xs">
                            {m.results ?? 0}
                          </td>
                          <td className="py-2.5 pl-3 text-slate-500 text-xs max-w-[100px] truncate">
                            {m.notes || '—'}
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
      </main>

      {/* Create Client Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create New Client
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createMsg.text && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm border flex items-start gap-2 ${
                createMsg.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {createMsg.type === 'success' ? (
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {createMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone <span className="text-orange-400">*</span></label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+8801XXXXXXXXX"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password <span className="text-orange-400">*</span></label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Client full name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="client@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Package</label>
                <select
                  value={createForm.pkg}
                  onChange={e => setCreateForm(f => ({ ...f, pkg: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                >
                  <option value="">Select package...</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-slate-300 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}
                >
                  {createLoading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  {createLoading ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16 py-6">
        <p className="text-center text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} GrowlyZ Admin Panel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
