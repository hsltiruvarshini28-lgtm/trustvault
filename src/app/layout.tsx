import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustVault — Enterprise Document Security & Audit System',
  description:
    'Zero-trust enterprise document security vault with centralized authorization, immediate access revocation, private storage, and cryptographic SHA-256 tamper-evident audit trail.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#EDF2F4] text-[#343A40] antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
