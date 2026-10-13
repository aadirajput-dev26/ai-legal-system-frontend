'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sparkles, 
  FolderClosed, 
  Calendar, 
  FileText, 
  Bell, 
  Settings, 
  LogOut, 
  Scale,
  LayoutDashboard,
  Cpu,
  FileEdit,
  CreditCard,
  Plus,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { useBilling } from '@/lib/billing-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppShellProps {
  children: React.ReactNode;
  caseId?: string;
  customBreadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AppShell({ children, customBreadcrumbs }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { currentOrg, orgs, switchOrg } = useOrg();
  const { isExhausted, state: billingState } = useBilling();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (currentOrg?.id) {
      import('@/lib/api').then(({ notifications }) => {
        notifications.list({ orgId: currentOrg.id, limit: 1 })
          .then(res => {
            if (res.data?.unreadCount !== undefined) {
              setUnreadCount(res.data.unreadCount);
            }
          })
          .catch(() => {});
      });
    }
  }, [currentOrg?.id]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'DS';

  const navItems = [
    { icon: LayoutDashboard, href: '/dashboard', label: 'Dashboard' },
    { icon: FolderClosed, href: '/cases', label: 'Matters' },
    { icon: Calendar, href: '/calendar', label: 'Calendar' },
    { icon: FileText, href: '/documents', label: 'Documents' },
    { icon: FileEdit, href: '/drafts', label: 'Drafts' },
    { icon: Cpu, href: '/tools', label: 'Tools' },
  ];

  // Derive breadcrumbs based on pathname if not provided
  const getBreadcrumbs = () => {
    if (customBreadcrumbs && customBreadcrumbs.length > 0) {
      return customBreadcrumbs;
    }
    const orgName = currentOrg?.name || 'Test Law Chambers';
    if (pathname === '/dashboard' || pathname === '/') {
      return [{ label: orgName }];
    }
    if (pathname?.startsWith('/cases')) {
      if (pathname === '/cases') {
        return [{ label: orgName, href: '/dashboard' }, { label: 'Matters' }];
      }
      return [{ label: orgName, href: '/dashboard' }, { label: 'Matters', href: '/cases' }, { label: 'Hearing brief' }];
    }
    if (pathname?.startsWith('/calendar')) {
      return [{ label: orgName, href: '/dashboard' }, { label: 'Calendar' }];
    }
    if (pathname?.startsWith('/documents')) {
      return [{ label: orgName, href: '/dashboard' }, { label: 'Documents' }];
    }
    if (pathname?.startsWith('/drafts')) {
      return [{ label: orgName, href: '/dashboard' }, { label: 'Drafts' }];
    }
    if (pathname?.startsWith('/tools')) {
      return [{ label: orgName, href: '/dashboard' }, { label: 'Tools' }];
    }
    if (pathname?.startsWith('/billing')) {
      return [{ label: orgName, href: '/dashboard' }, { label: 'Billing' }];
    }
    if (pathname?.startsWith('/notifications')) {
      return [{ label: orgName, href: '/dashboard' }, { label: 'Notifications' }];
    }
    if (pathname?.startsWith('/settings')) {
      return [{ label: orgName, href: '/dashboard' }, { label: 'Settings' }];
    }
    return [{ label: orgName }];
  };

  const breadcrumbs = getBreadcrumbs();
  const isAiActive = !billingState?.enforcementEnabled || (billingState?.balance?.balanceCredits ?? 0) > 0;
  const tokenCredits = billingState?.balance?.balanceCredits ?? 0;

  return (
    <div className="min-h-screen bg-[#0d0f0f] text-[#f3f4f5] font-sans selection:bg-[#2dd4bf]/20 selection:text-[#2dd4bf]">
      
      {/* ── Left Vertical Icon Dock ────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-14 sm:w-16 bg-[#0c0e0e] border-r border-[#1a1e1e] flex flex-col justify-between items-center py-3.5 z-40">
        
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Logo - Mint green justice scales */}
          <Link 
            href="/dashboard" 
            className="w-10 h-10 rounded-xl bg-[#2dd4bf] text-[#091b18] flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:opacity-95 transition-all"
            title="LegalDesk Home"
          >
            <Scale className="w-5 h-5 stroke-[2.2]" />
          </Link>

          <div className="w-8 h-px bg-[#1e2323] my-0.5" />

          {/* Navigation icons */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {navItems.map((item) => {
              const isActive = 
                (item.href === '/dashboard' && (pathname === '/dashboard' || pathname === '/')) ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                    isActive
                      ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30 shadow-[0_0_12px_rgba(45,212,191,0.1)]'
                      : 'text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818]'
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Secondary icons & Profile */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {/* Notifications */}
          <Link
            href="/notifications"
            title="Notifications"
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818] transition-all"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 px-1 min-w-[14px] h-[14px] bg-[#2dd4bf] text-[#091b18] text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Billing / Tokens */}
          <Link
            href="/billing"
            title="Billing & Tokens"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              pathname?.startsWith('/billing')
                ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30'
                : 'text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818]'
            }`}
          >
            <CreditCard className="w-[18px] h-[18px]" />
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            title="Settings"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              pathname?.startsWith('/settings')
                ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30'
                : 'text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818]'
            }`}
          >
            <Settings className="w-[18px] h-[18px]" />
          </Link>

          {/* User Profile Avatar with Org Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none cursor-pointer mt-1">
              <div 
                className="w-8 h-8 rounded-full bg-[#1b2020] border border-[#2a3030] text-[#c0c8c8] text-xs font-semibold flex items-center justify-center hover:border-[#2dd4bf]/50 transition-colors"
                title={user?.name || 'Account'}
              >
                {initials}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-64 bg-[#141717] border border-[#232727] text-[#f3f4f5] shadow-2xl rounded-xl p-2 z-[60] ml-2">
              <DropdownMenuLabel className="px-2 py-2">
                <div className="font-semibold text-[#f3f4f5]">{user?.name || 'Account'}</div>
                <div className="text-xs text-[#879292] truncate">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#232727] my-1" />
              
              {orgs.length > 1 && (
                <>
                  <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase font-bold text-[#2dd4bf] tracking-wider">
                    Workspaces
                  </DropdownMenuLabel>
                  {orgs.map(org => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => switchOrg(org.id)}
                      className={`text-sm px-2 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                        currentOrg?.id === org.id 
                          ? 'bg-[#192422] text-[#2dd4bf]' 
                          : 'text-[#c0c8c8] hover:bg-[#1a1e1e] hover:text-[#f3f4f5]'
                      }`}
                    >
                      <span className="truncate">{org.name}</span>
                      {currentOrg?.id === org.id && <div className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf]" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-[#232727] my-1" />
                </>
              )}

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-sm px-2 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg cursor-pointer flex items-center gap-2 font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Top Header Bar ────────────────────────── */}
      <header className="fixed top-0 left-14 sm:left-16 right-0 h-13 bg-[#0d0f0f]/95 backdrop-blur-md border-b border-[#1a1e1e] flex items-center justify-between px-6 sm:px-8 z-30">
        
        {/* Left: Breadcrumbs & AI Status Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-sm text-[#879292] font-normal truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#3a4242]">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[#f3f4f5] transition-colors truncate">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={`truncate ${idx === breadcrumbs.length - 1 ? 'text-[#f3f4f5] font-medium' : ''}`}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* AI Status Badge */}
          {billingState && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              isAiActive
                ? 'bg-[#10241f] text-[#34d399] border-[#1d4438]'
                : 'bg-[#291414] text-[#f87171] border-[#4a2222]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAiActive ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
              <span>{isAiActive ? 'AI active' : 'AI paused'}</span>
            </div>
          )}
        </div>

        {/* Right: Tokens Display & Add Tokens Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="tracking-wider uppercase text-[#6f7a7a] font-medium">TOKENS</span>
            <span className={`font-semibold tabular-nums ${tokenCredits < 0 ? 'text-[#f87171]' : 'text-[#f3f4f5]'}`}>
              {tokenCredits.toLocaleString()}
            </span>
          </div>

          <Link
            href="/billing"
            className="text-xs font-medium bg-[#151818] hover:bg-[#1d2222] border border-[#262c2c] text-[#f3f4f5] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            Add tokens
          </Link>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────── */}
      <main className="pl-14 sm:pl-16 pt-13 min-h-screen">
        {children}
      </main>

    </div>
  );
}
