'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, UserCheck, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('DemoPassword123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Read message from URL parameters (e.g. redirected after secure sign out)
  useEffect(() => {
    const msg = searchParams.get('message');
    if (msg === 'signed_out') {
      setSuccessMsg('You have signed out successfully.');
    } else if (msg === 'session_required') {
      setErrorMsg('Please sign in with your credentials to access protected vault resources.');
    }
  }, [searchParams]);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail || email,
          password: loginPassword || password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      const redirectPath = searchParams.get('redirect') || '/dashboard';
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      name: 'Alice Owner',
      email: 'alice@trustvault.local',
      role: 'OWNER',
      desc: 'Uploads documents, manages access, grants and revokes permissions.',
    },
    {
      name: 'Bob Viewer',
      email: 'bob@trustvault.local',
      role: 'VIEWER',
      desc: 'Has active READ access to Document 1 & EDIT access to Document 2.',
    },
    {
      name: 'Charlie Viewer',
      email: 'charlie@trustvault.local',
      role: 'VIEWER',
      desc: 'Has NO document permissions (tests unauthorized access / DENIED audit).',
    },
    {
      name: 'Dave Admin',
      email: 'admin@trustvault.local',
      role: 'ADMIN',
      desc: 'System auditor & user manager (cannot download confidential files).',
    },
    {
      name: 'Eve Disabled',
      email: 'eve@trustvault.local',
      role: 'DISABLED',
      desc: 'Account disabled by administrator (tests account lockout).',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto mb-3 shadow-lg shadow-teal-950">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TrustVault Authentication</h1>
          <p className="text-sm text-slate-400 mt-1">Zero-Trust Enterprise Document Sharing</p>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-700/80 rounded-xl flex items-center space-x-3 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-700/80 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Demo Accounts Selector */}
        <div className="mb-8 p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              1-Click Demo Personas
            </span>
            <span className="text-[11px] text-slate-400">Click to authenticate</span>
          </div>

          <div className="space-y-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  handleLogin(account.email, 'DemoPassword123!');
                }}
                disabled={loading}
                className="w-full text-left p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors">
                      {account.name}
                    </span>
                    <Badge variant={account.role} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{account.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Standard Credentials Form */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email-input">
                Corporate Email Address
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@trustvault.local"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="password-input">
                Password
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with TrustVault...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-teal-500" />
          <span>All login events are audited in the tamper-evident SHA-256 chain.</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading TrustVault Authentication...</div>}>
      <LoginForm />
    </Suspense>
  );
}
