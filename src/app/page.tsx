import Link from 'next/link';
import { Shield, Lock, FileCheck2, ArrowRight, CheckCircle2, UserCheck, KeyRound } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#EDF2F4] text-[#343A40] flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-[#25394B] bg-[#1A2836] px-6 py-3 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-[#527C78] flex items-center justify-center text-white">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-sm tracking-tight text-white">
              TrustVault
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#253748] text-[#CBD5E1] border border-[#374E63] rounded">
              ENTERPRISE
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/signup"
            className="px-3 py-1.5 text-xs font-medium text-[#CBD5E1] hover:text-white transition-colors"
          >
            <span>Create Account</span>
          </Link>
          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#527C78] hover:bg-[#416863] rounded transition-colors flex items-center space-x-1.5"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section - Executive Depth */}
      <section className="bg-[#1E2E3E] border-b border-[#2B4054] text-white py-14 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-[#293D50] border border-[#3D566E] text-[#E9EFEC] text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-[#527C78]" />
            <span>Zero-Trust Architecture & Immediate Access Revocation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-3xl mx-auto">
            Enterprise Document Security with Cryptographic Audit Integrity
          </h1>

          <p className="text-xs sm:text-sm text-[#B3C5D3] leading-relaxed max-w-2xl mx-auto">
            Centralized authorization, isolated private storage, role boundaries (OWNER, VIEWER, ADMIN), and an append-only SHA-256 hash-chained audit trail designed for enterprise compliance and security governance.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-4 py-2.5 text-xs font-medium text-white bg-[#527C78] hover:bg-[#416863] rounded shadow-sm transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Create Vault Account</span>
            </Link>

            <Link
              href="/login"
              className="px-4 py-2.5 text-xs font-medium text-[#E9EFEC] bg-[#273B4D] hover:bg-[#314A61] border border-[#43627E] rounded transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/security"
              className="px-4 py-2.5 text-xs font-medium text-[#B3C5D3] hover:text-white transition-colors flex items-center space-x-1.5"
            >
              <Shield className="w-4 h-4 text-[#527C78]" />
              <span>Inspect Security Center</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Structured Architecture Cards (Crisp White on Cool Slate Canvas) */}
      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full space-y-8">
        <div className="bg-white border border-[#D0D9DF] rounded overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#D0D9DF]">
            <div className="p-6 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#263C50]">
                <div className="w-6 h-6 rounded bg-[#EAF3EE] flex items-center justify-center text-[#527C78]">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <span>Centralized Authorization</span>
              </div>
              <p className="text-xs text-[#677582] leading-relaxed">
                Every sensitive action enforces active Supabase session verification, document ownership, and explicit permission grants. Administrators cannot download confidential files simply by being administrators.
              </p>
            </div>

            <div className="p-6 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#263C50]">
                <div className="w-6 h-6 rounded bg-[#EAF3EE] flex items-center justify-center text-[#527C78]">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span>Immediate Access Revocation</span>
              </div>
              <p className="text-xs text-[#677582] leading-relaxed">
                Zero long-lived signed URLs. File downloads are server-mediated and evaluated per request. When an owner revokes permission, subsequent download requests fail immediately with 403 Forbidden.
              </p>
            </div>

            <div className="p-6 space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#263C50]">
                <div className="w-6 h-6 rounded bg-[#EAF3EE] flex items-center justify-center text-[#527C78]">
                  <FileCheck2 className="w-3.5 h-3.5" />
                </div>
                <span>Tamper-Evident Audit Trail</span>
              </div>
              <p className="text-xs text-[#677582] leading-relaxed">
                Append-only log chained with canonical SHA-256 cryptographic hashes. Altered, missing, or out-of-order records are flagged immediately by the integrity verification engine.
              </p>
            </div>
          </div>
        </div>

        {/* Security Controls Checklist */}
        <div className="p-6 bg-white border border-[#D0D9DF] rounded shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#263C50] mb-3.5 pb-2 border-b border-[#D0D9DF]">
            Core Security Controls & Defensive Safeguards
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#343A40]">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
              <span>Private storage with magic-byte validation and sanitized file paths</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
              <span>Automated test matrix covering 24+ vulnerability scenarios</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
              <span>Defensive security headers: no-cache, nosniff, safe Content-Disposition</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
              <span>Dual-path telemetry logging both ALLOWED and DENIED operations</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#25394B] py-5 px-6 text-center text-xs text-[#7B90A0] bg-[#1A2836]">
        TrustVault — Enterprise Secure Document Sharing & Cryptographic Audit Verification System.
      </footer>
    </div>
  );
}
