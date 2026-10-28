'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  Scale,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  FileEdit,
  FolderClosed,
  CreditCard,
  Zap,
  Cpu,
  ChevronDown,
  Check,
  Printer,
  Copy,
  Search,
  Bot,
  LayoutDashboard,
  Bell,
  Settings,
  Plus,
  Lock,
  Activity,
  Layers,
  ArrowUpRight,
  Wallet
} from 'lucide-react';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  // Active view in the realistic product showcase
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'drafts' | 'cases' | 'billing'>('dashboard');

  // Interactive readiness checklist in dashboard mockup
  const [tasks, setTasks] = useState({
    pleadings: true,
    counsel: true,
    seniorNotes: false,
    invoices: false,
  });

  // ROI Calculator state
  const [mattersCount, setMattersCount] = useState(25);
  const [hoursPerMatter, setHoursPerMatter] = useState(6);

  // Billing annual toggle
  const [annualBilling, setAnnualBilling] = useState(false);

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Copied indicator for draft simulation
  const [copied, setCopied] = useState(false);

  // Calculations
  const hoursSaved = Math.round(mattersCount * hoursPerMatter * 0.72);
  const revenueGained = hoursSaved * 4500;

  const toggleTask = (key: keyof typeof tasks) => {
    setTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d0f0f] text-slate-900 dark:text-[#f3f4f5] selection:bg-[#2dd4bf]/20 selection:text-[#2dd4bf] overflow-x-hidden font-sans">
      
      {/* ── Ambient Background Glows ──────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-[#2dd4bf]/10 via-[#2dd4bf]/2 to-transparent blur-[140px]" />
        <div className="absolute top-[35%] -left-36 w-80 h-80 bg-[#2dd4bf]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] -right-36 w-96 h-96 bg-[#14b8a6]/4 rounded-full blur-[140px]" />
      </div>

      {/* ── Header Navigation ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/90 dark:bg-[#0d0f0f]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-[#2dd4bf] text-[#091b18] flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.25)] group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-lg tracking-tight text-foreground dark:text-white leading-none">
                LegalDesk
              </span>
              <span className="text-[9px] font-mono tracking-widest text-[#6f7a7a] uppercase mt-0.5">
                Litigation OS
              </span>
            </div>
          </Link>

          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600 dark:text-[#879292]">
            <a href="#product" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Product</a>
            <a href="#features" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Features</a>
            <a href="#roi" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">FAQ</a>
          </nav>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3">
            {!authLoading && user ? (
              <Link
                href="/dashboard"
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)] flex items-center gap-1.5"
              >
                <span>Open Chambers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-medium text-slate-600 dark:text-[#a0abab] hover:text-foreground dark:hover:text-white px-3.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:shadow-[0_0_20px_rgba(45,212,191,0.35)] flex items-center gap-1.5 group cursor-pointer"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 sm:pt-20 pb-12 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#152321] border border-[#2dd4bf]/30 text-xs text-[#2dd4bf] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] animate-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-wider">LegalDesk 2.0</span>
          <span className="text-[#3d504b]">•</span>
          <span className="text-[#c0e6e0]">The AI Operating System for Litigation Chambers</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-serif font-normal tracking-tight text-white leading-[1.15] mb-5">
          Where legal acumen meets{' '}
          <span className="italic text-[#2dd4bf]">
            computational precision.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-[#879292] leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
          Draft courtroom-ready pleadings in minutes, track court listings with automated countdowns, and manage case dossiers with sovereign data privacy.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(45,212,191,0.25)] hover:scale-[1.02] transition-all"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#product"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#141717] hover:bg-[#1a1e1e] text-[#f3f4f5] border border-[#272b2b] text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            <span>Explore Real Screens</span>
            <ChevronDown className="w-4 h-4 text-[#879292]" />
          </a>
        </div>

        {/* Social Proof Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#1a1e1e] text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-white">3.8x</div>
            <div className="text-[11px] text-[#6f7a7a]">Faster Drafting Cycle</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-white">14,800+</div>
            <div className="text-[11px] text-[#6f7a7a]">Court Pleadings Created</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-white">99.8%</div>
            <div className="text-[11px] text-[#6f7a7a]">Statutory Citation Accuracy</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-white">100%</div>
            <div className="text-[11px] text-[#6f7a7a]">Private & Zero Retention</div>
          </div>
        </div>

      </section>

      {/* ── REAL PRODUCT SCREEN SHOWCASE (Identical to Actual Internal Product) ── */}
      <section id="product" className="relative z-10 py-10 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header & Screen Selector Tabs above the screen */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#2dd4bf] font-medium">
                  Live Workstation Interface
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">
                The actual LegalDesk workstation.
              </h2>
              <p className="text-xs text-[#879292] mt-1">
                Explore the exact interface used internally by counsel — fully interactive.
              </p>
            </div>

            {/* Screen Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121515] p-1 rounded-xl border border-slate-200 dark:border-[#222828] shadow-inner self-start md:self-auto">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'cases', label: 'Matters', icon: FolderClosed },
                { id: 'drafts', label: 'Drafting Studio', icon: FileEdit },
                { id: 'billing', label: 'Token Ledger', icon: CreditCard },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveScreen(tab.id as any)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeScreen === tab.id
                      ? 'bg-white dark:bg-[#152321] text-teal-700 dark:text-[#2dd4bf] border border-teal-500/30 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-[#879292] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#181c1c]'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Workstation Shell (100% Identical to Internal AppShell) */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#232727] bg-white dark:bg-[#0c0e0e] shadow-xl dark:shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden">
            
            {/* ── Internal Top Header Bar (AppShell Header) ── */}
            <div className="h-13 bg-slate-50 dark:bg-[#0d0f0f]/95 border-b border-slate-200 dark:border-[#1a1e1e] flex items-center justify-between px-5 sm:px-7">
              {/* Left: Breadcrumbs & AI Status Pill */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#879292] font-normal truncate">
                  <span className="truncate">Test Law Chambers</span>
                  <span className="text-[#3a4242]">/</span>
                  <span className="text-[#f3f4f5] font-medium capitalize">
                    {activeScreen === 'cases' ? 'Matters' : activeScreen === 'drafts' ? 'Drafts' : activeScreen === 'billing' ? 'Billing' : 'Dashboard'}
                  </span>
                </div>

                {/* AI Status Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-[#10241f] text-[#34d399] border-[#1d4438]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                  <span>AI active</span>
                </div>
              </div>

              {/* Right: Tokens Display & Add Tokens Button */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="tracking-wider uppercase text-[#6f7a7a] font-medium">TOKENS</span>
                  <span className="font-semibold tabular-nums text-[#f3f4f5]">42,850</span>
                </div>

                <button
                  onClick={() => setActiveScreen('billing')}
                  className="text-xs font-medium bg-[#151818] hover:bg-[#1d2222] border border-[#262c2c] text-[#f3f4f5] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Add tokens
                </button>
              </div>
            </div>

            {/* ── Internal Workstation Body: Left Dock + Main Canvas ── */}
            <div className="flex min-h-[580px]">
              
              {/* Left Icon Dock (100% Identical to AppShell Left Sidebar) */}
              <aside className="w-14 sm:w-16 bg-[#0c0e0e] border-r border-[#1a1e1e] flex flex-col justify-between items-center py-3.5 shrink-0">
                
                {/* Top: Brand Squircle & Main Nav */}
                <div className="flex flex-col items-center gap-3.5 w-full">
                  {/* Mint Scales Squircle */}
                  <div
                    onClick={() => setActiveScreen('dashboard')}
                    className="w-10 h-10 rounded-xl bg-[#2dd4bf] text-[#091b18] flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:opacity-95 transition-all cursor-pointer"
                    title="Dashboard"
                  >
                    <Scale className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <div className="w-8 h-px bg-[#1e2323] my-0.5" />

                  {/* Nav Icons */}
                  <nav className="flex flex-col items-center gap-1.5 w-full px-2">
                    {[
                      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                      { id: 'cases', icon: FolderClosed, label: 'Matters' },
                      { id: 'calendar', icon: Calendar, label: 'Calendar' },
                      { id: 'documents', icon: FileText, label: 'Documents' },
                      { id: 'drafts', icon: FileEdit, label: 'Drafts' },
                      { id: 'tools', icon: Cpu, label: 'Tools' },
                    ].map((item) => {
                      const isActive = 
                        (item.id === 'dashboard' && activeScreen === 'dashboard') ||
                        (item.id === 'cases' && activeScreen === 'cases') ||
                        (item.id === 'drafts' && activeScreen === 'drafts');

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === 'dashboard' || item.id === 'cases' || item.id === 'drafts') {
                              setActiveScreen(item.id as any);
                            }
                          }}
                          title={item.label}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30 shadow-[0_0_12px_rgba(45,212,191,0.1)]'
                              : 'text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818]'
                          }`}
                        >
                          <item.icon className="w-[18px] h-[18px]" />
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Bottom Cluster: Notifications, Billing, Settings, Profile */}
                <div className="flex flex-col items-center gap-2 w-full px-2">
                  {/* Notifications with Badge */}
                  <div
                    title="Notifications"
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818] transition-all cursor-pointer"
                  >
                    <Bell className="w-[18px] h-[18px]" />
                    <span className="absolute top-1.5 right-1.5 px-1 min-w-[14px] h-[14px] bg-[#2dd4bf] text-[#091b18] text-[9px] font-bold rounded-full flex items-center justify-center">
                      3
                    </span>
                  </div>

                  {/* Billing */}
                  <button
                    onClick={() => setActiveScreen('billing')}
                    title="Billing & Tokens"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      activeScreen === 'billing'
                        ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30 shadow-[0_0_12px_rgba(45,212,191,0.1)]'
                        : 'text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818]'
                    }`}
                  >
                    <CreditCard className="w-[18px] h-[18px]" />
                  </button>

                  {/* Settings */}
                  <div
                    title="Settings"
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6f7a7a] hover:text-[#e2e8e8] hover:bg-[#151818] transition-all cursor-pointer"
                  >
                    <Settings className="w-[18px] h-[18px]" />
                  </div>

                  {/* User Profile Avatar with Initials DS */}
                  <div
                    className="w-8 h-8 rounded-full bg-[#1b2020] border border-[#2a3030] text-[#c0c8c8] text-xs font-semibold flex items-center justify-center hover:border-[#2dd4bf]/50 transition-colors mt-1 cursor-pointer"
                    title="Senior Advocate"
                  >
                    DS
                  </div>
                </div>

              </aside>

              {/* ── Internal Main Content Area ── */}
              <div className="flex-1 bg-[#0d0f0f] p-5 sm:p-7 overflow-y-auto max-h-[720px]">
                
                {/* 1. ACTUAL INTERNAL DASHBOARD SCREEN */}
                {activeScreen === 'dashboard' && (
                  <div className="space-y-8">
                    
                    {/* Top Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
                      <div>
                        <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#6f7a7a] mb-2">
                          FRIDAY, 16 OCTOBER 2026
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-[#f3f4f5]">
                          <span>Four matters. </span>
                          <span className="text-[#646e6e] font-serif">One listed today.</span>
                        </h1>
                      </div>

                      <button
                        onClick={() => setActiveScreen('cases')}
                        className="self-start md:self-auto bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-medium text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New matter</span>
                      </button>
                    </div>

                    {/* NEXT IN COURT Hero Card */}
                    <div className="rounded-2xl bg-[#141818] border border-[#222828] p-5 sm:p-6 relative overflow-hidden">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                        <div className="space-y-1.5 flex-1">
                          <div className="text-xs font-mono tracking-wider uppercase text-[#2dd4bf] font-medium">
                            NEXT IN COURT · Fri 16 Oct · 10:30 · today
                          </div>

                          <h2 className="text-xl sm:text-2xl font-serif text-[#f3f4f5] tracking-tight">
                            SLP (C) No. 18420/2025 — Union of India v. Apex Mega Infrastructure
                          </h2>

                          <p className="text-xs sm:text-sm text-[#879292]">
                            Supreme Court of India (Court 2, Item 14) · Final Arguments · before CJI & Justice Sundaram
                          </p>
                        </div>

                        <button
                          onClick={() => setActiveScreen('cases')}
                          className="self-start lg:self-center bg-[#1a1f1f] hover:bg-[#222828] border border-[#2b3333] text-[#f3f4f5] text-xs font-medium px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                        >
                          <span>Open brief</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#879292]" />
                        </button>
                      </div>

                      {/* Readiness Checklist */}
                      <div className="mt-6 pt-5 border-t border-[#1e2323]">
                        <div className="text-[11px] font-mono tracking-wider uppercase text-[#6f7a7a] mb-3">
                          READINESS — {2 + (tasks.seniorNotes ? 1 : 0) + (tasks.invoices ? 1 : 0)} OF 4
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#c5cccc]">
                            <Check className="w-4 h-4 text-[#2dd4bf] stroke-[2.5]" />
                            <span>Pleadings filed on record</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#c5cccc]">
                            <Check className="w-4 h-4 text-[#2dd4bf] stroke-[2.5]" />
                            <span>Senior Counsel briefing finalized</span>
                          </div>

                          <div 
                            onClick={() => toggleTask('seniorNotes')}
                            className="flex items-center gap-2.5 text-xs sm:text-sm text-[#f3f4f5] cursor-pointer group"
                          >
                            {tasks.seniorNotes ? (
                              <Check className="w-4 h-4 text-[#2dd4bf] stroke-[2.5]" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-[#f59e0b] group-hover:border-[#2dd4bf] flex items-center justify-center" />
                            )}
                            <span className="underline decoration-[#3a4242] underline-offset-4 group-hover:text-[#2dd4bf] transition-colors truncate">
                              Senior Advocate conference notes verified
                            </span>
                          </div>

                          <div 
                            onClick={() => toggleTask('invoices')}
                            className="flex items-center gap-2.5 text-xs sm:text-sm text-[#f3f4f5] cursor-pointer group"
                          >
                            {tasks.invoices ? (
                              <Check className="w-4 h-4 text-[#2dd4bf] stroke-[2.5]" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-[#f59e0b] group-hover:border-[#2dd4bf] flex items-center justify-center" />
                            )}
                            <span className="underline decoration-[#3a4242] underline-offset-4 group-hover:text-[#2dd4bf] transition-colors truncate">
                              Reconcile invoices against inspection report
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* THE DIARY next 14 days Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">
                          THE DIARY <span className="text-[#879292] lowercase">next 14 days</span>
                        </div>
                        <button 
                          onClick={() => setActiveScreen('cases')} 
                          className="text-xs text-[#2dd4bf] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          All matters &rarr;
                        </button>
                      </div>

                      <div className="relative pl-6 space-y-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#202626]">
                        {/* 1. Today Supreme Court */}
                        <div className="relative group">
                          <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#f59e0b] ring-4 ring-[#0d0f0f]" />
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#f59e0b]">
                              TODAY · 10:30 · SUPREME COURT COURTROOM 2
                            </div>
                            <div className="text-base font-serif text-[#f3f4f5] group-hover:text-[#2dd4bf] transition-colors cursor-pointer">
                              Union of India v. Apex Mega Infrastructure Ltd.
                            </div>
                            <div className="text-xs text-[#6f7a7a]">
                              Final Arguments · Item 14 · 1 task outstanding
                            </div>
                          </div>
                        </div>

                        {/* 2. Tue Delhi HC */}
                        <div className="relative group">
                          <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#2dd4bf] ring-4 ring-[#0d0f0f]" />
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#2dd4bf]">
                              TUE 20 OCT · 14:00 · DELHI HIGH COURT
                            </div>
                            <div className="text-base font-serif text-[#f3f4f5] group-hover:text-[#2dd4bf] transition-colors cursor-pointer">
                              Sharma BioTech v. Drug Controller General
                            </div>
                            <div className="text-xs text-[#6f7a7a]">
                              Admission & Interim Stay · Court 18 · 2 tasks outstanding
                            </div>
                          </div>
                        </div>

                        {/* 3. Mon Bombay HC */}
                        <div className="relative group">
                          <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#4b5555] ring-4 ring-[#0d0f0f]" />
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#879292]">
                              MON 26 OCT · 11:00 · BOMBAY HIGH COURT
                            </div>
                            <div className="text-base font-serif text-[#f3f4f5] group-hover:text-[#2dd4bf] transition-colors cursor-pointer">
                              Mira Vale v. Orion Housing Infrastructure
                            </div>
                            <div className="text-xs text-[#6f7a7a]">
                              Preliminary Hearing · Arbitration Petition · 1 task outstanding
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Split: Outstanding Tasks & Lately Stream */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[#1a1e1e]">
                      
                      {/* Outstanding Tasks */}
                      <div className="space-y-3.5">
                        <div className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">
                          OUTSTANDING <span className="text-[#879292] font-sans">2 of 4</span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-100 dark:bg-[#141717]/60 border border-slate-200 dark:border-[#1e2222]">
                            <div className="mt-0.5 w-4 h-4 rounded bg-[#2dd4bf] border border-[#2dd4bf] text-[#091b18] flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs line-through text-slate-400 dark:text-[#6f7a7a]">Pleadings filed on record</p>
                              <p className="text-[11px] text-slate-400 dark:text-[#525e5e]">Union of India v. Apex Mega Infrastructure · filed 14 Oct</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-100 dark:bg-[#141717]/60 border border-slate-200 dark:border-[#1e2222]">
                            <div className="mt-0.5 w-4 h-4 rounded bg-[#2dd4bf] border border-[#2dd4bf] text-[#091b18] flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs line-through text-slate-400 dark:text-[#6f7a7a]">Senior Counsel conference brief delivered</p>
                              <p className="text-[11px] text-slate-400 dark:text-[#525e5e]">Union of India v. Apex Mega Infrastructure · completed</p>
                            </div>
                          </div>

                          <div 
                            onClick={() => toggleTask('seniorNotes')}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#141717] cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#222828] group"
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              tasks.seniorNotes ? 'bg-[#2dd4bf] border-[#2dd4bf] text-[#091b18]' : 'border-slate-300 dark:border-[#424d4d] group-hover:border-[#2dd4bf]'
                            }`}>
                              {tasks.seniorNotes && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs ${tasks.seniorNotes ? 'line-through text-slate-400 dark:text-[#6f7a7a]' : 'text-slate-800 dark:text-[#f3f4f5]'}`}>
                                Senior Advocate conference notes verified
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-[#6f7a7a]">Union of India v. Apex Mega Infrastructure · due today</p>
                            </div>
                          </div>

                          <div 
                            onClick={() => toggleTask('invoices')}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#141717] cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#222828] group"
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              tasks.invoices ? 'bg-[#2dd4bf] border-[#2dd4bf] text-[#091b18]' : 'border-slate-300 dark:border-[#424d4d] group-hover:border-[#2dd4bf]'
                            }`}>
                              {tasks.invoices && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs ${tasks.invoices ? 'line-through text-slate-400 dark:text-[#6f7a7a]' : 'text-slate-800 dark:text-[#f3f4f5]'}`}>
                                Reconcile invoices against inspection report
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-[#6f7a7a]">Sharma BioTech v. Drug Controller General · due tomorrow</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lately Activity Stream */}
                      <div className="space-y-3.5">
                        <div className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">
                          LATELY
                        </div>

                        <div className="space-y-3.5 text-xs">
                          <div className="flex items-start gap-3.5">
                            <span className="text-[#6f7a7a] font-mono w-6 text-right shrink-0">2h</span>
                            <div className="space-y-0.5">
                              <p className="text-[#f3f4f5] font-medium">Progressed to Preliminary hearing</p>
                              <p className="text-[#6f7a7a]">Mira Vale v. Orion Housing · you</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3.5 border-l-2 border-[#818cf8] pl-2.5 -ml-2.5">
                            <span className="text-[#818cf8] font-mono w-6 text-right shrink-0">3h</span>
                            <div className="space-y-0.5">
                              <p className="text-[#f3f4f5] font-medium">Task proposed — reconcile invoices</p>
                              <p className="text-[#818cf8]">Suggested by LegalDesk · awaiting you</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3.5">
                            <span className="text-[#6f7a7a] font-mono w-6 text-right shrink-0">5h</span>
                            <div className="space-y-0.5">
                              <p className="text-[#f3f4f5] font-medium">Progressed to Pleadings</p>
                              <p className="text-[#6f7a7a]">Aster Textiles · A. Shah</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3.5">
                            <span className="text-[#6f7a7a] font-mono w-6 text-right shrink-0">Fri</span>
                            <div className="space-y-0.5">
                              <p className="text-[#f3f4f5] font-medium">Exhibit C added — arbitration chronology</p>
                              <p className="text-[#6f7a7a]">Mira Vale · you</p>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* 2. ACTUAL INTERNAL MATTERS SCREEN */}
                {activeScreen === 'cases' && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-2 gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-[#f3f4f5]">Matters</h1>
                        <p className="text-xs text-[#879292] mt-1">
                          4 active · 2 listed in the next 14 days
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveScreen('drafts')}
                        className="h-9 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-medium rounded-lg text-xs flex-shrink-0 self-start sm:self-auto px-3.5 flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New matter</span>
                      </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 border-b border-[#1e2323] pb-3 text-xs">
                      <span className="px-3 py-1 rounded-md bg-[#1a2321] text-[#2dd4bf] border border-[#2dd4bf]/20 font-medium">
                        Active (4)
                      </span>
                      <span className="px-3 py-1 rounded-md text-[#879292] hover:text-white cursor-pointer">
                        Listed this week (2)
                      </span>
                      <span className="px-3 py-1 rounded-md text-[#879292] hover:text-white cursor-pointer">
                        Needs attention (1)
                      </span>
                      <span className="px-3 py-1 rounded-md text-[#879292] hover:text-white cursor-pointer">
                        All (6)
                      </span>
                    </div>

                    {/* Matters List Cards */}
                    <div className="space-y-3">
                      {[
                        {
                          num: 'SLP (C) 18420/2025',
                          title: 'Union of India v. Apex Mega Infrastructure',
                          court: 'Supreme Court of India',
                          bench: 'Court 2 · CJI & Justice Sundaram',
                          stage: 'Final Arguments',
                          date: 'Today · 10:30',
                          badgeColor: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20'
                        },
                        {
                          num: 'WP (C) 4120/2026',
                          title: 'Sharma BioTech v. Drug Controller General',
                          court: 'Delhi High Court',
                          bench: 'Court 18 · Single Bench',
                          stage: 'Admission & Interim Stay',
                          date: 'Tue 20 Oct · 14:00',
                          badgeColor: 'text-[#2dd4bf] bg-[#2dd4bf]/10 border-[#2dd4bf]/20'
                        },
                        {
                          num: 'ARB/PET/104/2026',
                          title: 'Mira Vale v. Orion Housing Infrastructure',
                          court: 'Bombay High Court',
                          bench: 'Commercial Division · Justice R. Kulkarni',
                          stage: 'Preliminary Hearing',
                          date: 'Mon 26 Oct · 11:00',
                          badgeColor: 'text-[#879292] bg-[#1a1f1f] border-[#2a3030]'
                        },
                        {
                          num: 'BA/1482/2026',
                          title: 'State of Maharashtra v. K. Singhania',
                          court: 'Bombay High Court',
                          bench: 'Criminal Appellate · Justice Deshmukh',
                          stage: 'Urgent Bail u/s 439 CrPC',
                          date: 'Fri 24 Oct · 10:30',
                          badgeColor: 'text-[#879292] bg-[#1a1f1f] border-[#2a3030]'
                        },
                      ].map((item, i) => (
                        <div 
                          key={i} 
                          className="p-4 rounded-xl bg-[#141818] border border-[#222828] hover:border-[#2dd4bf]/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-[#2dd4bf] bg-[#152321] px-2 py-0.5 rounded border border-[#2dd4bf]/20">
                                {item.num}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                                {item.stage}
                              </span>
                            </div>
                            <h3 className="text-base font-serif text-[#f3f4f5] group-hover:text-[#2dd4bf] transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs text-[#879292]">
                              {item.court} · {item.bench}
                            </p>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#1c2020]">
                            <div className="text-right">
                              <div className="text-xs font-mono text-[#f3f4f5] font-semibold">{item.date}</div>
                              <div className="text-[10px] text-[#6f7a7a]">Listed Listing</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#879292] group-hover:text-[#2dd4bf] transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. ACTUAL INTERNAL AI DRAFTING STUDIO */}
                {activeScreen === 'drafts' && (
                  <div className="space-y-4">
                    {/* Studio Top Bar */}
                    <div className="flex items-center justify-between border-b border-[#1c2020] pb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveScreen('cases')}
                          className="text-xs text-[#879292] hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          &larr; Back
                        </button>
                        <div className="h-4 w-px bg-[#222828]" />
                        <div>
                          <div className="text-[10px] font-mono text-[#2dd4bf] uppercase">AI Drafting Studio</div>
                          <h3 className="text-sm sm:text-base font-serif text-white truncate max-w-sm">
                            Urgent Criminal Bail Application u/s 439 CrPC
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-[#2dd4bf] bg-[#1e2323] px-2 py-0.5 rounded border border-[#272b2b]">
                          IN REVIEW
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy('IN THE HIGH COURT OF JUDICATURE AT BOMBAY...')}
                          className="text-xs px-2.5 py-1 rounded bg-[#161919] hover:bg-[#1f2424] text-[#879292] hover:text-white border border-[#272b2b] flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-[#2dd4bf]" /> : <Copy className="w-3 h-3 text-[#879292]" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="text-xs px-2.5 py-1 rounded bg-[#161919] hover:bg-[#1f2424] text-[#879292] hover:text-white border border-[#272b2b] flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-[#879292]" />
                          <span>Print A4</span>
                        </button>
                      </div>
                    </div>

                    {/* Dual Pane Studio */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left: AI Prompt & Legal Grounding */}
                      <div className="lg:col-span-4 rounded-xl bg-[#141717] border border-[#232727] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-[#2dd4bf]" />
                          <span className="text-xs font-semibold text-white">Associate AI</span>
                        </div>
                        <div className="p-3 rounded-lg bg-[#0d0f0f] border border-[#1e2222] text-[11px] text-[#879292] leading-relaxed">
                          <span className="text-[#2dd4bf] font-medium">Prompt:</span> Draft regular bail petition for K. Singhania in Crime 412/2025 citing parity and absence of criminal antecedent under Satender Kumar Antil ruling.
                        </div>
                        <div className="text-[11px] text-[#b2ded8] bg-[#152321] p-3 rounded-lg border border-[#2dd4bf]/20 leading-relaxed">
                          <span className="text-[#2dd4bf] font-semibold">✓ Grounding Verified:</span> Cross-checked with Bombay High Court Criminal Manual rules & Bharatiya Nagarik Suraksha Sanhita (BNSS) parity matrix.
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#0d0f0f] border border-[#1e2222] text-[10px] font-mono text-[#879292] space-y-1">
                          <div className="text-white font-semibold">Statutory Authorities Cited:</div>
                          <div>• Satender Kumar Antil v. CBI (2022) 10 SCC 51</div>
                          <div>• Arnesh Kumar v. State of Bihar (2014) 8 SCC 273</div>
                        </div>
                        <div className="text-[10px] font-mono text-[#6f7a7a] pt-1">
                          Compute: 1,420 Tokens (~₹0.28)
                        </div>
                      </div>

                      {/* Right: Exact Court Document Preview */}
                      <div className="lg:col-span-8 rounded-xl bg-[#090b0b] border border-[#232727] p-5 text-[11px] font-mono text-[#c0c8c8] leading-relaxed max-h-[360px] overflow-y-auto">
                        <div className="text-center font-bold text-white mb-2">
                          IN THE HIGH COURT OF JUDICATURE AT BOMBAY<br />
                          CRIMINAL APPELLATE JURISDICTION<br />
                          BAIL APPLICATION NO. 1482 OF 2026
                        </div>
                        <div className="my-2 border-b border-[#1e2222]" />
                        <p className="mb-1"><strong>Mr. K. Singhania</strong> ...Applicant</p>
                        <p className="mb-1 text-center text-[#6f7a7a]">VERSUS</p>
                        <p className="mb-3"><strong>The State of Maharashtra</strong> ...Respondent</p>
                        <p className="font-semibold text-[#2dd4bf] mb-2">
                          APPLICATION UNDER SECTION 439 OF THE CODE OF CRIMINAL PROCEDURE, 1973 FOR GRANT OF REGULAR BAIL
                        </p>
                        <p className="mb-2">
                          1. That the Applicant has been falsely implicated in Crime No. 412/2025; all documentary records and device logs stand in complete custody of the investigation agency.
                        </p>
                        <p className="mb-2">
                          2. That the co-accused on identical evidentiary footing has already been admitted to bail by this Hon&apos;ble Court vide Order dated 08.09.2026.
                        </p>
                        <p className="mb-2">
                          3. That the Applicant satisfies all principles of law laid down by the Hon&apos;ble Supreme Court in <em>Satender Kumar Antil v. CBI (2022) 10 SCC 51</em>.
                        </p>
                        <p className="text-[#879292]">
                          PRAYER: Wherefore, it is prayed this Hon&apos;ble Court enlarge the applicant on regular bail on such terms and conditions as deemed just and proper.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. ACTUAL INTERNAL TOKEN LEDGER / BILLING SCREEN */}
                {activeScreen === 'billing' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-serif text-[#f3f4f5] tracking-tight">Usage & Billing</h1>
                        <p className="text-xs sm:text-sm text-[#879292] mt-1">
                          Manage AI token allowances, subscriptions, and ledger balance.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#6f7a7a]">
                          Test Law Chambers
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20">
                          Professional Plan Active
                        </span>
                      </div>
                    </div>

                    {/* Balance Card */}
                    <div className="p-6 rounded-xl bg-[#121515] border border-[#222828] space-y-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-mono uppercase tracking-wider text-[#6f7a7a] flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#2dd4bf]" />
                            Available Tokens
                          </div>
                          <div className="text-xs text-[#879292] mt-1">
                            Professional Tier Chambers Allowance
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-serif font-bold text-white">₹1,799 / mo</div>
                          <div className="text-[10px] text-[#6f7a7a]">Next renewal 14 days</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-4xl sm:text-5xl font-mono font-bold text-white">
                            42,850
                          </span>
                          <span className="text-xs text-[#879292] font-mono">
                            tokens available
                          </span>
                        </div>

                        <div className="space-y-2 mt-4">
                          <div className="h-2 w-full bg-[#1c2020] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#2dd4bf] to-[#34d399] w-[85%] rounded-full" />
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-[#6f7a7a]">
                            <span>7,150 consumed this cycle (14%)</span>
                            <span className="text-[#2dd4bf]">50,000 monthly allowance</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Usage Entries Table */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-mono uppercase tracking-wider text-[#6f7a7a]">
                        Recent Live Usage Entries
                      </div>

                      {[
                        { op: 'AI Legal Drafting (Urgent Bail Application)', matter: 'BA-2026-11', tokens: '-1,420 Tokens', time: '12m ago' },
                        { op: 'OCR Exhibit Analysis & Chronology Extraction (18 pages)', matter: 'SLP 18420/2025', tokens: '-650 Tokens', time: '1h ago' },
                        { op: 'Statutory Citations Verification (Supreme Court Digest)', matter: 'WP 4120/2026', tokens: '-380 Tokens', time: '3h ago' },
                        { op: 'Monthly Chambers Subscription Allocation', matter: 'Chambers Ledger', tokens: '+50,000 Tokens', time: '16 Oct 2026' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#141818] border border-[#1e2222] text-xs font-mono">
                          <div className="flex items-center gap-2.5">
                            <Activity className="w-3.5 h-3.5 text-[#2dd4bf]" />
                            <span className="text-white font-sans text-xs">{item.op}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px]">
                            <span className="text-[#879292] hidden sm:inline">{item.matter}</span>
                            <span className={item.tokens.startsWith('+') ? 'text-[#34d399] font-semibold' : 'text-[#f87171]'}>
                              {item.tokens}
                            </span>
                            <span className="text-[#646e6e]">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── Key Capabilities Bento Grid ──────────────────────────────── */}
      <section id="features" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 border-t border-[#1e2323]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#2dd4bf] bg-[#152321] px-2.5 py-1 rounded-full border border-[#2dd4bf]/20">
              Chambers Features
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-white mt-2">
              Engineered for the demands of the Bar.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] hover:border-[#2dd4bf]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#152321] border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf] mb-4">
                <FileEdit className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-serif text-white mb-1.5">Dual-Mode AI Drafting</h3>
              <p className="text-xs text-[#879292] leading-relaxed">
                Generate court pleadings, bail petitions, legal notices, and writ grounds adhering strictly to Supreme Court and High Court formats.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] hover:border-[#2dd4bf]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#152321] border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf] mb-4">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-serif text-white mb-1.5">Automated Court Docket</h3>
              <p className="text-xs text-[#879292] leading-relaxed">
                Live countdowns to listings, daily cause-list intelligence, and automated readiness checklists so no hearing is ever missed.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] hover:border-[#2dd4bf]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#152321] border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf] mb-4">
                <Printer className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-serif text-white mb-1.5">A4 Court-Ready Print</h3>
              <p className="text-xs text-[#879292] leading-relaxed">
                Export to clean, compliant court prints with standard 1.7 line spacing, Roman pagination, legal margins, and formal title banners.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] hover:border-[#2dd4bf]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#152321] border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf] mb-4">
                <Cpu className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-serif text-white mb-1.5">Autonomous Workflows</h3>
              <p className="text-xs text-[#879292] leading-relaxed">
                Connect Viasocket agents to automatically parse client emails, send hearing reminders, and ingest daily court orders.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] hover:border-[#2dd4bf]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#152321] border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf] mb-4">
                <FolderClosed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-serif text-white mb-1.5">Evidence Vault & OCR</h3>
              <p className="text-xs text-[#879292] leading-relaxed">
                Extract chronological dates, parties, and exhibits from scanned PDFs and FIRs with semantic natural-language search.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] hover:border-[#2dd4bf]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#152321] border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf] mb-4">
                <CreditCard className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-serif text-white mb-1.5">Fair Token Economy</h3>
              <p className="text-xs text-[#879292] leading-relaxed">
                Firm-wide token pooling without per-seat penalties. Every AI operation is metered at ~₹0.20 per pleading clause.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── Interactive Chambers ROI Calculator ──────────────────────── */}
      <section id="roi" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 border-t border-border bg-slate-50/70 dark:bg-[#0c0e0e]/50">
        <div className="max-w-4xl mx-auto rounded-2xl bg-white dark:bg-[#141717] border border-border p-6 sm:p-8 shadow-xl">
          
          <div className="mb-6">
            <span className="text-[10px] font-mono tracking-widest uppercase text-teal-700 dark:text-[#2dd4bf] bg-teal-50 dark:bg-[#152321] px-2.5 py-1 rounded-full border border-teal-200 dark:border-[#2dd4bf]/20">
              Capacity Calculator
            </span>
            <h2 className="text-2xl font-serif text-slate-900 dark:text-[#f3f4f5] mt-2">
              Quantify billable hours saved in your chambers.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Sliders */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-[#879292]">Active Matters per Month</span>
                  <span className="font-mono text-teal-700 dark:text-[#2dd4bf] font-bold">{mattersCount} Matters</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={mattersCount}
                  onChange={(e) => setMattersCount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-[#1e2424] rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-[#879292]">Drafting Hours per Matter</span>
                  <span className="font-mono text-teal-700 dark:text-[#2dd4bf] font-bold">{hoursPerMatter} Hours</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={hoursPerMatter}
                  onChange={(e) => setHoursPerMatter(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-[#1e2424] rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
                />
              </div>
            </div>

            {/* Output */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-gradient-to-br from-teal-50/90 to-emerald-50/60 dark:from-[#152321] dark:to-[#141717] border border-teal-200 dark:border-[#2dd4bf]/30 text-center space-y-4 shadow-sm dark:shadow-none">
              <div>
                <div className="text-[10px] font-mono uppercase text-teal-700 dark:text-[#2dd4bf] tracking-widest font-semibold">Monthly Hours Saved</div>
                <div className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-[#f3f4f5] mt-1">
                  {hoursSaved} <span className="text-sm font-sans font-normal text-slate-600 dark:text-[#879292]">hrs</span>
                </div>
              </div>
              <div className="pt-3 border-t border-teal-200/60 dark:border-[#2dd4bf]/20">
                <div className="text-[10px] font-mono uppercase text-teal-700 dark:text-[#2dd4bf] tracking-widest font-semibold">Billable Capacity Returned</div>
                <div className="text-2xl font-serif font-bold text-teal-700 dark:text-[#2dd4bf] mt-1">
                  ₹{revenueGained.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── Transparent Chambers Pricing ─────────────────────────────── */}
      <section id="pricing" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 border-t border-[#1e2323]">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#2dd4bf] bg-[#152321] px-2.5 py-1 rounded-full border border-[#2dd4bf]/20">
              Chambers Plans
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-white mt-2">
              Straightforward pricing. No hidden fees.
            </h2>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <span className={`text-xs ${!annualBilling ? 'text-white' : 'text-[#879292]'}`}>Monthly</span>
              <button
                onClick={() => setAnnualBilling(!annualBilling)}
                className="w-10 h-5 bg-[#1e2424] rounded-full p-0.5 border border-[#232727] relative cursor-pointer"
              >
                <div className={`w-4 h-4 rounded-full bg-[#2dd4bf] transition-transform ${annualBilling ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs flex items-center gap-1 ${annualBilling ? 'text-white' : 'text-[#879292]'}`}>
                <span>Annual</span>
                <span className="text-[9px] font-mono text-[#2dd4bf] bg-[#152321] px-1.5 py-0.5 rounded">20% off</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Solo Evaluation */}
            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono uppercase text-[#879292] mb-1">Solo Advocate</div>
                <div className="text-3xl font-serif font-bold text-white mb-3">₹0</div>
                <p className="text-xs text-[#879292] mb-5">14-day full platform evaluation on real matters.</p>
                <div className="space-y-2 text-xs text-[#f3f4f5] mb-6">
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>2,500 AI tokens included</span></div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Up to 3 active case dossiers</span></div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Court docket tracking</span></div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>A4 court print export</span></div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-2.5 bg-[#1e2424] hover:bg-[#252c2c] text-white text-center text-xs font-semibold rounded-lg transition-colors">
                Start Free Trial
              </Link>
            </div>

            {/* Professional Plan (Featured) */}
            <div className="p-6 rounded-2xl bg-[#152321] border-2 border-[#2dd4bf] flex flex-col justify-between relative shadow-[0_0_30px_rgba(45,212,191,0.12)]">
              <div className="text-xs font-mono uppercase text-[#2dd4bf] font-bold mb-1">LegalDesk Professional</div>
              <div className="text-3xl font-serif font-bold text-white mb-3">
                {annualBilling ? '₹1,439' : '₹1,799'} <span className="text-xs font-sans text-[#879292]">/ month</span>
              </div>
              <p className="text-xs text-[#b2ded8] mb-5">Full platform access for active litigation advocates.</p>
              <div className="space-y-2 text-xs text-[#f3f4f5] mb-6">
                <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span className="font-semibold text-white">50,000 AI tokens each month</span></div>
                <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Unlimited active matters</span></div>
                <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Full AI Drafting Studio (Bail, Writs)</span></div>
                <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Evidence Vault with OCR</span></div>
                <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Token rollover (capped at 50,000)</span></div>
              </div>
              <Link href="/signup" className="w-full py-2.5 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] text-center text-xs font-semibold rounded-lg transition-colors">
                Launch Professional
              </Link>
            </div>

            {/* Enterprise Chambers */}
            <div className="p-6 rounded-2xl bg-[#141717] border border-[#232727] flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono uppercase text-[#879292] mb-1">Chambers Firm</div>
                <div className="text-3xl font-serif font-bold text-white mb-3">Custom</div>
                <p className="text-xs text-[#879292] mb-5">For multi-partner firms and senior chambers.</p>
                <div className="space-y-2 text-xs text-[#f3f4f5] mb-6">
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Pooled firm token credit pool</span></div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Unlimited associates & interns</span></div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Custom Viasocket agents</span></div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf]" /><span>Dedicated cause-list webhooks</span></div>
                </div>
              </div>
              <Link href="/signup" className="w-full py-2.5 bg-[#1e2424] hover:bg-[#252c2c] text-white text-center text-xs font-semibold rounded-lg transition-colors">
                Contact Chambers
              </Link>
            </div>

          </div>

          {/* Top-up Packs Strip */}
          <div className="mt-8 p-4 rounded-xl bg-slate-50 dark:bg-[#0e1010] border border-slate-200 dark:border-[#1e2222] flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <span className="text-slate-600 dark:text-[#879292]">
              Need extra tokens? Top up anytime via Razorpay: <strong className="text-slate-900 dark:text-white">50,000 tokens for ₹500</strong>. Tokens never expire while plan is active.
            </span>
            <Link href="/billing" className="text-teal-700 dark:text-[#2dd4bf] hover:underline font-medium shrink-0">
              View Token Packs &rarr;
            </Link>
          </div>

        </div>
      </section>

      {/* ── FAQ Section (Concise & Focused) ──────────────────────────── */}
      <section id="faq" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 border-t border-[#1e2323]">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-10">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#2dd4bf] bg-[#152321] px-2.5 py-1 rounded-full border border-[#2dd4bf]/20">
              Questions
            </span>
            <h2 className="text-2xl font-serif text-white mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Will confidential client files or drafts be used to train AI models?',
                a: 'Never. LegalDesk adheres to strict single-tenant enterprise privacy. All uploaded documents, OCR extracts, and drafts are isolated in your encrypted vault and never used for training.'
              },
              {
                q: 'Does LegalDesk support specific Indian High Court and Supreme Court formats?',
                a: 'Yes. Pleading templates strictly adhere to Supreme Court Rules 2013 and High Court Original and Appellate Side formats for Bail, Writs, Injunctions, and Caveats.'
              },
              {
                q: 'How do tokens work during urgent trial filings?',
                a: 'Every operation is micro-metered (~₹0.20 per pleading clause). If you ever need more, instant top-up packs can be credited with zero interruption via Razorpay.'
              },
              {
                q: 'Can multiple advocates and clerks collaborate in one chamber?',
                a: 'Yes. Chambers can invite junior advocates, interns, and clerks with role-based permissions and shared token pooling.'
              },
              {
                q: 'Can I export drafts directly to court-compliant A4 print or Microsoft Word?',
                a: 'Yes. One-click court print produces A4 layouts with standard 1.7 line spacing, Roman pagination, and formal caption margins.'
              }
            ].map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-[#232727] bg-[#141717] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-sm font-serif text-white hover:text-[#2dd4bf] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#879292] transition-transform ${openFaq === idx ? 'rotate-180 text-[#2dd4bf]' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-[#879292] leading-relaxed border-t border-[#1e2222] pt-2.5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Final Conversion Banner ──────────────────────────────────── */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-br from-teal-50/90 via-slate-50 to-emerald-50/60 dark:from-[#141d1b] dark:via-[#141717] dark:to-[#0c0e0e] border border-teal-200/80 dark:border-[#2dd4bf]/40 p-8 sm:p-10 text-center relative overflow-hidden shadow-lg dark:shadow-[0_0_40px_rgba(45,212,191,0.12)]">
          <div className="max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-serif text-slate-900 dark:text-[#f3f4f5] leading-tight">
              Modernize your litigation practice today.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#879292]">
              Join advocates and litigation chambers leveraging AI for precision pleadings, court docket automation, and spotless case dossiers.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-6 py-3 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.25)] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Initialize Workspace Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 dark:bg-[#1e2424] dark:hover:bg-[#283232] dark:text-[#f3f4f5] hover:text-[#0d9488] dark:hover:text-[#2dd4bf] border border-slate-200 dark:border-[#2a3030] text-xs font-medium rounded-xl transition-all cursor-pointer shadow-sm dark:shadow-none"
              >
                Counsel Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chambers Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border bg-slate-50 dark:bg-[#090b0b] pt-12 pb-8 text-xs text-[#6f7a7a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#2dd4bf] text-[#091b18] flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 stroke-[2.3]" />
              </div>
              <span className="font-serif font-semibold text-base text-foreground dark:text-white">LegalDesk</span>
              <span className="text-[10px] font-mono text-teal-700 dark:text-[#2dd4bf] ml-3 bg-teal-50 dark:bg-[#152321] px-2 py-0.5 rounded border border-teal-200 dark:border-[#2dd4bf]/20">
                All Chambers Systems Operational
              </span>
            </div>
            <div className="flex items-center gap-6 text-[11px] text-slate-600 dark:text-[#879292]">
              <Link href="/dashboard" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Dashboard</Link>
              <Link href="/cases" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Matters</Link>
              <Link href="/drafts" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Drafts</Link>
              <Link href="/billing" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Billing</Link>
              <Link href="/login" className="hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors">Sign In</Link>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-[#6f7a7a]">
            <span>© 2026 LegalDesk Systems, Inc. Sovereign Legal Operating System.</span>
            <span>Advocate-Client Privilege Protected • Zero Retention Policy</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
