'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, UserCheck, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
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
  const urlMessage = searchParams.get('message');
  const derivedSuccessMsg = urlMessage === 'signed_out' ? 'You have signed out successfully.' : null;
  const derivedErrorMsg =
    urlMessage === 'session_required'
      ? 'Please sign in with your credentials to access protected vault resources.'
      : null;

  const activeSuccessMsg = successMsg ?? derivedSuccessMsg;
  const activeErrorMsg = errorMsg ?? derivedErrorMsg;

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
      desc: 'Full control: uploads documents, grants/revokes permissions.',
    },
    {
      name: 'Bob Viewer',
      email: 'bob@trustvault.local',
      role: 'VIEWER',
      desc: 'Active READ access to Doc 1 & EDIT access to Doc 2.',
    },
    {
      name: 'Charlie Viewer',
      email: 'charlie@trustvault.local',
      role: 'VIEWER',
      desc: 'No document permissions (tests unauthorized access / DENIED logs).',
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
    <div className="min-h-screen bg-[#1A2836] flex flex-col justify-center items-center p-4 sm:p-6 text-white">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded bg-[#527C78] flex items-center justify-center text-white mx-auto mb-3 shadow-sm">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">TrustVault Authentication</h1>
          <p className="text-xs text-[#9BB1C2] mt-0.5">Enterprise Document Security Console</p>
        </div>

        {/* Status Alerts */}
        {activeSuccessMsg && (
          <div className="mb-4 p-3 bg-[#EAF3EE] border border-[#BCD5C7] rounded flex items-center space-x-2 text-[#46785C] text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
            <span>{activeSuccessMsg}</span>
          </div>
        )}

        {activeErrorMsg && (
          <div className="mb-4 p-3 bg-[#FBEBEB] border border-[#ECC7C7] rounded flex items-center space-x-2 text-[#B64B4B] text-xs">
            <AlertTriangle className="w-4 h-4 text-[#B64B4B] shrink-0" />
            <span>{activeErrorMsg}</span>
          </div>
        )}

        {/* 1-Click Demo Accounts Selector */}
        <div className="mb-4 p-5 bg-white border border-[#D0D9DF] rounded shadow-md text-[#343A40] space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#D0D9DF]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#263C50]">
              Quick Demo Personas
            </span>
            <span className="text-[10px] text-[#677582]">Click to authenticate</span>
          </div>

          <div className="space-y-1.5">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  handleLogin(account.email, 'DemoPassword123!');
                }}
                disabled={loading}
                className="w-full text-left p-2.5 rounded bg-[#F4F7F9] hover:bg-[#EAF0F4] border border-[#D0D9DF] hover:border-[#527C78] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-[#263C50]">
                      {account.name}
                    </span>
                    <Badge variant={account.role} />
                  </div>
                  <p className="text-[11px] text-[#677582] line-clamp-1">{account.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#677582] group-hover:text-[#527C78] shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Standard Credentials Form */}
        <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-md text-[#343A40]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#263C50] mb-3 pb-1 border-b border-[#D0D9DF]">
            Corporate Credentials
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="block text-xs font-medium text-[#263C50] mb-1" htmlFor="email-input">
                Corporate Email Address
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@trustvault.local"
                required
                className="w-full px-3 py-2 rounded border border-[#D0D9DF] bg-white text-xs text-[#263C50] placeholder-[#677582] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#263C50] mb-1" htmlFor="password-input">
                Password
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3 py-2 rounded border border-[#D0D9DF] bg-white text-xs text-[#263C50] placeholder-[#677582] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2 px-3 rounded bg-[#527C78] hover:bg-[#416863] text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with Vault...</span>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <p className="text-center text-xs text-[#8FA5B7] mt-4 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#527C78]" />
          <span>All login events are audited in the tamper-evident SHA-256 chain.</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1A2836] text-white flex items-center justify-center text-xs">Loading TrustVault Authentication...</div>}>
      <LoginForm />
    </Suspense>
  );
}
