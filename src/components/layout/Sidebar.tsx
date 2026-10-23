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
      ? [{ label: 'User Management', href: '/admin', icon: Users }]
      : []),
  ];

  const content = (
    <aside className="w-56 bg-[#203142] text-[#A2B5C4] flex flex-col h-[calc(100vh-3.25rem)] select-none border-r border-[#16222E]">
      <div className="p-3 flex-1 space-y-1">
        <div className="text-[10px] font-semibold tracking-wider text-[#7990A3] uppercase px-2.5 py-1.5">
          Vault Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center space-x-2.5 px-2.5 py-2 rounded text-xs transition-colors ${
                isActive
                  ? 'bg-[#14202B] text-white font-medium border-l-3 border-[#527C78]'
                  : 'text-[#A2B5C4] hover:text-white hover:bg-[#192735]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#527C78]' : 'text-[#7990A3]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Role & Storage Status Indicator */}
      <div className="p-3 border-t border-[#16222E] bg-[#16222E]/80">
        <div className="flex items-center space-x-1.5 text-xs text-[#A2B5C4] mb-0.5">
          <Lock className="w-3.5 h-3.5 text-[#527C78] shrink-0" />
          <span className="text-[11px]">Storage: <strong className="text-white font-medium">Private Bucket</strong></span>
        </div>
        <p className="text-[10px] text-[#7990A3] leading-tight">
          Server-mediated delivery with SHA-256 hash chaining.
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">{content}</div>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={onCloseMobile}
          />
          <div className="relative z-50">{content}</div>
        </div>
      )}
    </>
  );
}
