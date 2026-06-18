'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GrowlyZLogo from '@/components/GrowlyZLogo';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What city were you born in?",
  "What is your favorite childhood movie?",
  "What was your childhood nickname?",
];

const EyeIcon = ({ open }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {open
      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
    }
  </svg>
);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  // Step 1
  const [identity, setIdentity] = useState('');
  const [email, setEmail] = useState('');
  // Step 2
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [answer, setAnswer] = useState('');
  // Step 3
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const passwordStrength = (() => {
    if (!newPassword) return null;
    if (newPassword.length < 6) return { label: 'Too short', color: 'text-red-400', bar: 'bg-red-500', width: '33%' };
    if (newPassword.length < 10) return { label: 'Fair', color: 'text-yellow-400', bar: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'text-green-400', bar: 'bg-green-500', width: '100%' };
  })();

  // Step 1: verify Gmail or Phone matches an account
  async function handleVerifyIdentity(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: identity.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setEmail(data.email); // store resolved email for later steps
      setStep(2);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: verify security question + answer
  async function handleVerifyAnswer(e) {
    e.preventDefault();
    if (!selectedQuestion) { setError('Please select your security question'); return; }
    if (!answer.trim()) { setError('Please enter your answer'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), securityQuestion: selectedQuestion, securityAnswer: answer }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setStep(3);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: reset password
  async function handleReset(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), securityQuestion: selectedQuestion, securityAnswer: answer, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setStep(4);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const STEPS = ['Verify Identity', 'Security Question', 'New Password'];

  const Spinner = () => (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,85,0,0.15) 0%, transparent 70%), #0f172a' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <GrowlyZLogo size={44} boxed />
            <span className="text-2xl font-bold gradient-text">GrowlyZ</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">
            {step === 4 ? 'Password Reset!' : 'Forgot Password?'}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {step === 1 && 'Enter your Gmail address or phone number'}
            {step === 2 && 'Answer your security question'}
            {step === 3 && 'Set your new password'}
            {step === 4 && 'You can now sign in with your new password'}
          </p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">

          {/* Step indicator */}
          {step < 4 && (
            <div className="flex items-start justify-between mb-6">
              {STEPS.map((label, i) => {
                const s = i + 1;
                const done = step > s;
                const active = step === s;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${done || active ? 'text-white' : 'bg-slate-700 text-slate-500'}`}
                        style={done || active ? { background: 'linear-gradient(135deg, #FF5500, #FF9200)' } : {}}>
                        {done
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          : s}
                      </div>
                      <span className={`text-xs mt-1.5 text-center leading-tight ${active ? 'text-orange-400 font-medium' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                        {label}
                      </span>
                    </div>
                    {s < STEPS.length && (
                      <div className={`flex-1 h-px mx-2 mt-[-14px] ${step > s ? 'bg-orange-500/50' : 'bg-slate-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* ── Step 1: Gmail or Phone ── */}
          {step === 1 && (
            <form onSubmit={handleVerifyIdentity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Gmail or Phone Number <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={identity}
                  onChange={e => setIdentity(e.target.value)}
                  placeholder="yourname@gmail.com  or  01XXXXXXXXX"
                  required
                  autoComplete="off"
                  className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                {loading ? <><Spinner />Checking...</> : 'Continue'}
              </button>
            </form>
          )}

          {/* ── Step 2: Security Question ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyAnswer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Security Question</label>
                <div className="relative" ref={dropdownRef}>
                  <button type="button" onClick={() => setShowDropdown(!showDropdown)}
                    className={`w-full bg-slate-700/40 border rounded-xl px-4 py-3 text-left text-sm flex items-center justify-between transition-all focus:outline-none ${showDropdown ? 'border-orange-500 ring-2 ring-orange-500/50' : 'border-slate-600'}`}>
                    <span className={selectedQuestion ? 'text-white' : 'text-slate-500'}>
                      {selectedQuestion || 'Select your security question...'}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden">
                      {SECURITY_QUESTIONS.map(q => (
                        <button key={q} type="button"
                          onClick={() => { setSelectedQuestion(q); setShowDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-700 ${selectedQuestion === q ? 'text-orange-400 bg-orange-500/10' : 'text-slate-300'}`}>
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Answer</label>
                <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
                  placeholder="Enter your answer" required autoComplete="off"
                  className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(1); setError(''); setAnswer(''); setSelectedQuestion(''); }}
                  className="flex-1 py-3 rounded-xl font-semibold text-slate-400 text-sm border border-slate-700 hover:bg-slate-700/40 hover:text-white transition-all">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-70 shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                  {loading ? <><Spinner />Verifying...</> : 'Verify'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 3 && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" required autoComplete="new-password"
                    className="w-full bg-slate-700/40 border border-slate-600 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm" />
                  <button type="button" onClick={() => setShowNew(!showNew)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    <EyeIcon open={showNew} />
                  </button>
                </div>
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-500">Strength</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                    </div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${passwordStrength.bar}`} style={{ width: passwordStrength.width }} />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required autoComplete="new-password"
                    className={`w-full bg-slate-700/40 border rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500/60' : 'border-slate-600'}`} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(2); setError(''); }}
                  className="flex-1 py-3 rounded-xl font-semibold text-slate-400 text-sm border border-slate-700 hover:bg-slate-700/40 hover:text-white transition-all">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-70 shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                  {loading ? <><Spinner />Resetting...</> : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 4: Success ── */}
          {step === 4 && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">Password reset successfully. Sign in with your new password.</p>
              <button onClick={() => router.push('/login')}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 transition-all"
                style={{ background: 'linear-gradient(135deg, #FF5500, #FF9200)' }}>
                Back to Sign In
              </button>
            </div>
          )}

          {step < 4 && (
            <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-400 text-sm">
                Remember your password?{' '}
                <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">Sign in</Link>
              </p>
            </div>
          )}
        </div>
        <p className="text-center text-slate-600 text-xs mt-8">&copy; {new Date().getFullYear()} GrowlyZ. All rights reserved.</p>
      </div>
    </div>
  );
}
