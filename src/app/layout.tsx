import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustVault — Secure Document Sharing with a Real Audit Trail',
  description:
    'Enterprise zero-trust document vault with centralized authorization, immediate access revocation, private storage, and a cryptographic SHA-256 tamper-evident audit trail.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
