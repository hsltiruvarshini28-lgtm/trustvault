'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Files,
  UploadCloud,
  FileCheck2,
  ShieldAlert,
  Users,
  Lock,
} from 'lucide-react';
import { UserProfile } from '@/types';

interface SidebarProps {
  user: UserProfile | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ user, isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', href: '/documents', icon: Files },
    ...(user && user.role !== 'VIEWER'
      ? [{ label: 'Upload Document', href: '/documents/upload', icon: UploadCloud }]
      : []),
    { label: 'Audit Trail', href: '/audit', icon: FileCheck2 },
    { label: 'Security Center', href: '/security', icon: ShieldAlert },
    ...(user?.role === 'ADMIN'
      ? [{ label: 'Admin Management', href: '/admin', icon: Users }]
      : []),
  ];

  const content = (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-4rem)] select-none">
      <div className="p-4 flex-1 space-y-1">
        <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-3 py-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Role & Storage Status Indicator */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
          <Lock className="w-3.5 h-3.5 text-teal-400" />
          <span>Storage: <strong className="text-slate-300">Private Bucket</strong></span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Server-mediated delivery with SHA-256 hash chaining.
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">{content}</div>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-50">{content}</div>
        </div>
      )}
    </>
  );
}
