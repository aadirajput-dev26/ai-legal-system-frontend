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
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { useBilling } from '@/lib/billing-context';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { MatterChatDoodle } from '@/components/chat/MatterChatDoodle';
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

export function AppShell({ children, caseId, customBreadcrumbs }: AppShellProps) {
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#2dd4bf]/20 selection:text-[#2dd4bf]">
      
      {/* ── Left Vertical Icon Dock ────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-14 sm:w-16 bg-[#0c0e0e] border-r border-[#1a1e1e] flex flex-col justify-between items-center py-3.5 z-40">
        
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Logo - Mint green justice scales */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link 
                  href="/dashboard" 
                  title="LegalDesk Home"
                  className="w-10 h-10 rounded-xl bg-[#2dd4bf] text-[#091b18] flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:opacity-95 transition-all"
                />
              }
            >
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              LegalDesk Home
            </TooltipContent>
          </Tooltip>

          <div className="w-8 h-px bg-[#1e2323] my-0.5" />

          {/* Navigation icons with Tooltips */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {navItems.map((item) => {
              const isActive = 
                (item.href === '/dashboard' && (pathname === '/dashboard' || pathname === '/')) ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger
                    render={
                      <Link
                        href={item.href}
                        title={item.label}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                          isActive
                            ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/40 shadow-[0_0_12px_rgba(45,212,191,0.15)]'
                            : 'text-[#879292] hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.08]'
                        }`}
                      />
                    }
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* AI Assistant Navigation Dock Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('open-ai-chat'));
                      }
                    }}
                    title="AI Legal Assistant"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 text-[#2dd4bf] hover:bg-[#2dd4bf]/20 hover:scale-105 active:scale-95 cursor-pointer relative group border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 shadow-[0_0_12px_rgba(45,212,191,0.2)] mt-1"
                  />
                }
              >
                <Sparkles className="w-[18px] h-[18px] text-[#2dd4bf] group-hover:rotate-12 transition-transform stroke-[2.2]" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2dd4bf] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2dd4bf]" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                AI Legal Assistant (Click to open)
              </TooltipContent>
            </Tooltip>
          </nav>
        </div>

        {/* Bottom: Secondary icons, Theme, & Profile */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/notifications"
                  title="Notifications"
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#879292] hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.08] transition-all"
                />
              }
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 px-1 min-w-[14px] h-[14px] bg-[#2dd4bf] text-[#091b18] text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}
            </TooltipContent>
          </Tooltip>

          {/* Billing / Tokens */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/billing"
                  title="Billing & Tokens"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    pathname?.startsWith('/billing')
                      ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/40'
                      : 'text-[#879292] hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.08]'
                  }`}
                />
              }
            >
              <CreditCard className="w-[18px] h-[18px]" />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              Billing & Tokens
            </TooltipContent>
          </Tooltip>

          {/* Theme Toggle Button */}
          <Tooltip>
            <TooltipTrigger render={<div />}>
              <ThemeToggle />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              Theme Mode
            </TooltipContent>
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/settings"
                  title="Settings & Administration"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    pathname?.startsWith('/settings')
                      ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/40'
                      : 'text-[#879292] hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.08]'
                  }`}
                />
              }
            >
              <Settings className="w-[18px] h-[18px]" />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              Settings & Administration
            </TooltipContent>
          </Tooltip>

          {/* User Profile Avatar - Navigates directly to Settings Profile Tab */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/settings?tab=user"
                  title={`Profile & Account: ${user?.name || user?.email || 'User'}`}
                  className={`w-8 h-8 rounded-full border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer mt-1 ${
                    pathname?.startsWith('/settings') && (typeof window !== 'undefined' && window.location.search.includes('tab=user'))
                      ? 'bg-[#152321] text-[#2dd4bf] border-[#2dd4bf]/60 shadow-[0_0_10px_rgba(45,212,191,0.2)]'
                      : 'bg-[#1b2020] border-[#2a3030] text-[#c0c8c8] hover:border-[#2dd4bf]/50 hover:text-foreground'
                  }`}
                >
                  {initials}
                </Link>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              Profile & Account ({user?.name || 'User'})
            </TooltipContent>
          </Tooltip>
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

          {/* Direct AI Chatbot Header Trigger */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-ai-chat'));
              }
            }}
            title="Open AI Legal Assistant"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2dd4bf]/10 hover:bg-[#2dd4bf]/20 text-[#0d9488] dark:text-[#2dd4bf] border border-[#2dd4bf]/30 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Chatbot</span>
          </button>
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

      {/* ── Global AI Chatbot Doodle (Visible and interactive everywhere) ──── */}
      <MatterChatDoodle caseId={caseId} />

    </div>
  );
}
