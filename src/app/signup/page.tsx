'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Lock,
  User,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  Check,
} from 'lucide-react';

function SignupForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live password requirements evaluation
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side pre-validations
    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Corporate email address is required.');
      return;
    }
    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }
    if (!confirmPassword) {
      setErrorMsg('Please confirm your password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password confirmation.');
      return;
    }
    if (!hasMinLen || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setErrorMsg('Password does not meet all required security constraints.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setSuccessMsg('Account registered successfully! Redirecting to security console...');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2836] flex flex-col justify-center items-center p-4 sm:p-6 text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded bg-[#527C78] flex items-center justify-center text-white mx-auto mb-3 shadow-sm">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Create Vault Identity</h1>
          <p className="text-xs text-[#9BB1C2] mt-0.5">
            Enterprise Zero-Trust Access & Document Security
          </p>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mb-4 p-3 bg-[#EAF3EE] border border-[#BCD5C7] rounded flex items-center space-x-2 text-[#46785C] text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FBEBEB] border border-[#ECC7C7] rounded flex items-center space-x-2 text-[#B64B4B] text-xs">
            <AlertTriangle className="w-4 h-4 text-[#B64B4B] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Form Card */}
        <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-md text-[#343A40]">
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label
                className="block text-xs font-semibold text-[#263C50] mb-1"
                htmlFor="name-input"
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name-input"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F9FA] border border-[#D0D9DF] rounded text-xs text-[#263C50] focus:bg-white focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
                />
                <User className="w-4 h-4 text-[#677582] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold text-[#263C50] mb-1"
                htmlFor="email-input"
              >
                Corporate Email Address
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F9FA] border border-[#D0D9DF] rounded text-xs text-[#263C50] focus:bg-white focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
                />
                <Mail className="w-4 h-4 text-[#677582] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold text-[#263C50] mb-1"
                htmlFor="password-input"
              >
                Master Password
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F9FA] border border-[#D0D9DF] rounded text-xs text-[#263C50] focus:bg-white focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
                />
                <Lock className="w-4 h-4 text-[#677582] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Password Security Rules Visual Check */}
            <div className="p-2.5 bg-[#F4F7F9] border border-[#D0D9DF] rounded text-[11px] space-y-1">
              <span className="font-semibold text-[#263C50] block text-[10px] uppercase tracking-wider">
                Password Security Requirements:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div
                  className={`flex items-center space-x-1 ${
                    hasMinLen ? 'text-[#46785C] font-semibold' : 'text-[#677582]'
                  }`}
                >
                  <Check className={`w-3 h-3 ${hasMinLen ? 'opacity-100' : 'opacity-40'}`} />
                  <span>8+ characters</span>
                </div>
                <div
                  className={`flex items-center space-x-1 ${
                    hasUpper ? 'text-[#46785C] font-semibold' : 'text-[#677582]'
                  }`}
                >
                  <Check className={`w-3 h-3 ${hasUpper ? 'opacity-100' : 'opacity-40'}`} />
                  <span>Uppercase letter</span>
                </div>
                <div
                  className={`flex items-center space-x-1 ${
                    hasLower ? 'text-[#46785C] font-semibold' : 'text-[#677582]'
                  }`}
                >
                  <Check className={`w-3 h-3 ${hasLower ? 'opacity-100' : 'opacity-40'}`} />
                  <span>Lowercase letter</span>
                </div>
                <div
                  className={`flex items-center space-x-1 ${
                    hasDigit ? 'text-[#46785C] font-semibold' : 'text-[#677582]'
                  }`}
                >
                  <Check className={`w-3 h-3 ${hasDigit ? 'opacity-100' : 'opacity-40'}`} />
                  <span>Number (0-9)</span>
                </div>
                <div
                  className={`flex items-center space-x-1 col-span-2 ${
                    hasSpecial ? 'text-[#46785C] font-semibold' : 'text-[#677582]'
                  }`}
                >
                  <Check className={`w-3 h-3 ${hasSpecial ? 'opacity-100' : 'opacity-40'}`} />
                  <span>Special symbol (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold text-[#263C50] mb-1"
                htmlFor="confirm-password-input"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password-input"
                  type="password"
                  required
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F9FA] border border-[#D0D9DF] rounded text-xs text-[#263C50] focus:bg-white focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
                />
                <KeyRound className="w-4 h-4 text-[#677582] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-[10px] text-[#B64B4B] mt-1">
                  Passwords do not match yet.
                </p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-[10px] text-[#46785C] font-semibold mt-1 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Passwords match.</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded bg-[#527C78] hover:bg-[#416863] text-white font-medium text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating Vault Identity...' : 'Register Corporate Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Footer Link to Login */}
          <div className="mt-4 pt-3 border-t border-[#D0D9DF] text-center text-xs text-[#677582]">
            <span>Already registered? </span>
            <Link
              href="/login"
              className="font-semibold text-[#527C78] hover:text-[#416863] transition-colors"
            >
              Sign in to your vault
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#1A2836] flex items-center justify-center text-white text-xs">
          Loading Registration...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
