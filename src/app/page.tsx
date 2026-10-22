import Link from 'next/link';
import { Shield, Lock, FileCheck2, ArrowRight, CheckCircle2, UserCheck, KeyRound, Database } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              TrustVault
              <span className="text-xs font-mono px-2 py-0.5 bg-teal-950 text-teal-400 border border-teal-800 rounded">
                ENTERPRISE
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-lg shadow-teal-950 transition-all flex items-center space-x-2"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-6 py-16 max-w-6xl mx-auto">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-800/80 text-teal-300 text-xs font-medium tracking-wide">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            <span>Zero-Trust Architecture & Immediate Access Revocation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Secure Document Sharing with a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
              Real Audit Trail
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Enterprise document vault with centralized authorization (<code className="text-teal-300">canAccessDocument</code>),
            strict role boundaries (ADMIN, OWNER, VIEWER), server-mediated file delivery, and an append-only
            cryptographic SHA-256 hash-chained audit trail.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3.5 text-base font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-xl shadow-teal-950 transition-all flex items-center space-x-2"
            >
              <UserCheck className="w-5 h-5" />
              <span>Enter Demo Console</span>
            </Link>

            <Link
              href="/security"
              className="px-6 py-3.5 text-base font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all flex items-center space-x-2"
            >
              <Shield className="w-5 h-5 text-teal-400" />
              <span>Inspect Security Center</span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Centralized Authorization</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every sensitive endpoint enforces verified Supabase sessions, document ownership, and active READ/EDIT
              grants. Admins cannot download confidential files simply by being administrators.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Immediate Access Revocation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Server-mediated file delivery means zero long-lived signed URLs. When an owner revokes permission, the
              user&apos;s next request is immediately blocked (403 Forbidden).
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Tamper-Evident Audit Trail</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Append-only audit trail chained via SHA-256 cryptographic hashes. Altered, removed, or reordered records
              are immediately flagged by the verification utility.
            </p>
          </div>
        </div>

        {/* Verification Checkpoints */}
        <div className="mt-16 p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl max-w-4xl mx-auto">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-4">
            Security Guarantee Highlights
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Private bucket storage with MIME & Magic Bytes inspection</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Full automated test suite with 24+ vulnerability scenarios</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>No-cache, nosniff, and safe Content-Disposition headers</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Auditing on both ALLOWED and DENIED execution paths</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        TrustVault — Enterprise Secure Document Sharing & Tamper-Evident Audit System.
      </footer>
    </div>
  );
}
