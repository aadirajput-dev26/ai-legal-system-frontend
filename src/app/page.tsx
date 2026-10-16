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
  ArrowUpRight
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
    <div className="min-h-screen bg-[#0d0f0f] text-[#f3f4f5] selection:bg-[#2dd4bf]/20 selection:text-[#2dd4bf] overflow-x-hidden font-sans">
      
      {/* ── Ambient Background Glows ──────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-[#2dd4bf]/10 via-[#2dd4bf]/2 to-transparent blur-[140px]" />
        <div className="absolute top-[35%] -left-36 w-80 h-80 bg-[#2dd4bf]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] -right-36 w-96 h-96 bg-[#14b8a6]/4 rounded-full blur-[140px]" />
      </div>

      {/* ── Header Navigation ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#1e2323] bg-[#0d0f0f]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-[#2dd4bf] text-[#091b18] flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.25)] group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-lg tracking-tight text-white leading-none">
                LegalDesk
              </span>
              <span className="text-[9px] font-mono tracking-widest text-[#6f7a7a] uppercase mt-0.5">
                Litigation OS
              </span>
            </div>
          </Link>

          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[#879292]">
            <a href="#product" className="hover:text-white transition-colors">Product</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#roi" className="hover:text-white transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
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
                  className="text-xs font-medium text-[#879292] hover:text-white px-3 py-2 rounded-lg hover:bg-[#141717] transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)] flex items-center gap-1.5 group"
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

      {/* ── REAL PRODUCT SCREEN SHOWCASE (Identical to Actual Product) ── */}
      <section id="product" className="relative z-10 py-10 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-6">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#2dd4bf] bg-[#152321] px-2.5 py-1 rounded-full border border-[#2dd4bf]/20">
              Inside the Product
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-white mt-2">
              The real LegalDesk workstation.
            </h2>
            <p className="text-xs text-[#879292] mt-1">
              Click the tabs below to explore the actual interfaces used by practicing counsel.
            </p>
          </div>

          {/* Product Window Shell */}
          <div className="rounded-2xl border border-[#232727] bg-[#0c0e0e] shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden">
            
            {/* Window Chrome Header Bar */}
            <div className="h-11 border-b border-[#1c2020] bg-[#090b0b] px-4 flex items-center justify-between">
              
              {/* Left traffic dots + breadcrumbs */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/80" />
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#6f7a7a] pl-2 border-l border-[#1a1e1e]">
                  <span className="text-[#879292]">Test Law Chambers</span>
                  <span>/</span>
                  <span className="text-[#2dd4bf] capitalize">{activeScreen}</span>
                </div>
              </div>

              {/* Real Screen Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#121515] p-0.5 rounded-lg border border-[#1e2222]">
                <button
                  onClick={() => setActiveScreen('dashboard')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeScreen === 'dashboard'
                      ? 'bg-[#1a2321] text-[#2dd4bf] border border-[#2dd4bf]/20'
                      : 'text-[#879292] hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveScreen('drafts')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeScreen === 'drafts'
                      ? 'bg-[#1a2321] text-[#2dd4bf] border border-[#2dd4bf]/20'
                      : 'text-[#879292] hover:text-white'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Drafting Studio</span>
                </button>
                <button
                  onClick={() => setActiveScreen('cases')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeScreen === 'cases'
                      ? 'bg-[#1a2321] text-[#2dd4bf] border border-[#2dd4bf]/20'
                      : 'text-[#879292] hover:text-white'
                  }`}
                >
                  <FolderClosed className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Matters</span>
                </button>
                <button
                  onClick={() => setActiveScreen('billing')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeScreen === 'billing'
                      ? 'bg-[#1a2321] text-[#2dd4bf] border border-[#2dd4bf]/20'
                      : 'text-[#879292] hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Token Ledger</span>
                </button>
              </div>

              {/* Active Token Balance Badge */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#2dd4bf] bg-[#152321] px-2 py-0.5 rounded border border-[#2dd4bf]/30">
                <Zap className="w-3 h-3 text-[#2dd4bf]" />
                <span>42,850 TOKENS</span>
              </div>
            </div>

            {/* Window Body: Real AppShell Layout */}
            <div className="flex min-h-[480px]">
              
              {/* Actual Left Icon Dock */}
              <div className="w-12 sm:w-14 bg-[#0a0c0c] border-r border-[#1a1e1e] flex flex-col justify-between items-center py-3 shrink-0">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2dd4bf] text-[#091b18] flex items-center justify-center shadow-sm">
                    <Scale className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="w-5 h-px bg-[#1e2323]" />
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => setActiveScreen('dashboard')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                        activeScreen === 'dashboard' ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30' : 'text-[#6f7a7a] hover:text-white'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveScreen('cases')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                        activeScreen === 'cases' ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30' : 'text-[#6f7a7a] hover:text-white'
                      }`}
                    >
                      <FolderClosed className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveScreen('drafts')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                        activeScreen === 'drafts' ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30' : 'text-[#6f7a7a] hover:text-white'
                      }`}
                    >
                      <FileEdit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveScreen('billing')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                        activeScreen === 'billing' ? 'bg-[#152321] text-[#2dd4bf] border border-[#2dd4bf]/30' : 'text-[#6f7a7a] hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1b2020] border border-[#2a3030] text-[#c0c8c8] text-[9px] font-semibold flex items-center justify-center">
                    RS
                  </div>
                </div>
              </div>

              {/* Main Content Area: Exact UI Screen Representations */}
              <div className="flex-1 bg-[#0d0f0f] p-4 sm:p-6 overflow-hidden">
                
                {/* 1. ACTUAL DASHBOARD VIEW */}
                {activeScreen === 'dashboard' && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-end justify-between border-b border-[#1c2020] pb-3">
                      <div>
                        <p className="text-[10px] font-mono tracking-widest uppercase text-[#6f7a7a]">
                          FRIDAY, 16 OCTOBER 2026
                        </p>
                        <h3 className="text-xl sm:text-2xl font-serif text-white mt-1">
                          Four matters. <span className="text-[#646e6e]">One listed today.</span>
                        </h3>
                      </div>
                      <div className="bg-[#2dd4bf] text-[#091b18] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>New matter</span>
                      </div>
                    </div>

                    {/* Exact NEXT IN COURT Hero Card */}
                    <div className="rounded-xl bg-[#141818] border border-[#222828] p-5 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-[11px] font-mono uppercase text-[#2dd4bf] font-medium tracking-wide">
                            NEXT IN COURT · Fri 16 Oct · 10:30 · today
                          </div>
                          <h4 className="text-lg sm:text-xl font-serif text-white">
                            SLP (C) No. 18420/2025 — Union of India v. Apex Mega Infrastructure
                          </h4>
                          <p className="text-xs text-[#879292]">
                            Supreme Court of India (Court 2, Item 14) · Final Arguments · before CJI & Justice Sundaram
                          </p>
                        </div>
                        <div className="bg-[#1a1f1f] text-xs text-[#f3f4f5] px-3 py-1.5 rounded-lg border border-[#2b3333] self-start flex items-center gap-1.5 shrink-0">
                          <span>Open brief</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#879292]" />
                        </div>
                      </div>

                      {/* Interactive Readiness checklist */}
                      <div className="mt-5 pt-4 border-t border-[#1e2323]">
                        <div className="text-[10px] font-mono uppercase text-[#6f7a7a] tracking-wider mb-2.5">
                          READINESS — 2 OF 4 COMPLETED
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div 
                            onClick={() => toggleTask('pleadings')}
                            className="flex items-center gap-2 text-[#c5cccc] cursor-pointer hover:text-white"
                          >
                            <div className="w-4 h-4 rounded bg-[#2dd4bf] text-[#091b18] flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span>Pleadings filed on record</span>
                          </div>
                          <div 
                            onClick={() => toggleTask('counsel')}
                            className="flex items-center gap-2 text-[#c5cccc] cursor-pointer hover:text-white"
                          >
                            <div className="w-4 h-4 rounded bg-[#2dd4bf] text-[#091b18] flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span>Senior Counsel briefing finalized</span>
                          </div>
                          <div 
                            onClick={() => toggleTask('seniorNotes')}
                            className="flex items-center gap-2 text-[#f3f4f5] cursor-pointer group"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${tasks.seniorNotes ? 'bg-[#2dd4bf] border-[#2dd4bf] text-[#091b18]' : 'border-[#f59e0b]'}`}>
                              {tasks.seniorNotes && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="underline decoration-[#3a4242] underline-offset-4 group-hover:text-[#2dd4bf]">
                              Senior Advocate conference notes verified
                            </span>
                          </div>
                          <div 
                            onClick={() => toggleTask('invoices')}
                            className="flex items-center gap-2 text-[#f3f4f5] cursor-pointer group"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${tasks.invoices ? 'bg-[#2dd4bf] border-[#2dd4bf] text-[#091b18]' : 'border-[#f59e0b]'}`}>
                              {tasks.invoices && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="underline decoration-[#3a4242] underline-offset-4 group-hover:text-[#2dd4bf]">
                              Reconcile invoices against inspection report
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Diary timeline */}
                    <div className="space-y-3">
                      <div className="text-[10px] font-mono uppercase text-[#6f7a7a] tracking-wider">
                        THE DIARY — NEXT 14 DAYS
                      </div>
                      <div className="relative pl-5 space-y-3.5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-[#202626]">
                        <div className="relative">
                          <div className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-[#f59e0b] ring-4 ring-[#0d0f0f]" />
                          <div className="text-[10px] font-mono text-[#f59e0b] font-semibold uppercase">
                            TODAY · 10:30 · SUPREME COURT COURTROOM 2
                          </div>
                          <div className="text-sm font-serif text-white">Union of India v. Apex Mega Infrastructure Ltd.</div>
                          <div className="text-[11px] text-[#6f7a7a]">Final Arguments · Item 14</div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-[#2dd4bf] ring-4 ring-[#0d0f0f]" />
                          <div className="text-[10px] font-mono text-[#2dd4bf] font-semibold uppercase">
                            TUE 20 OCT · 14:00 · DELHI HIGH COURT
                          </div>
                          <div className="text-sm font-serif text-white">Sharma BioTech v. Drug Controller General</div>
                          <div className="text-[11px] text-[#6f7a7a]">Admission & Interim Stay · Court 18</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ACTUAL AI DRAFTING STUDIO VIEW */}
                {activeScreen === 'drafts' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1c2020] pb-3">
                      <div>
                        <div className="text-[10px] font-mono text-[#2dd4bf] uppercase">AI Drafting Studio</div>
                        <h3 className="text-lg font-serif text-white">Urgent Criminal Bail Application u/s 439 CrPC</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy('IN THE HIGH COURT OF JUDICATURE AT BOMBAY...')}
                          className="text-xs px-2.5 py-1 rounded bg-[#161919] hover:bg-[#1f2424] text-[#879292] hover:text-white border border-[#272b2b] flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-[#2dd4bf]" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="text-xs px-2.5 py-1 rounded bg-[#161919] hover:bg-[#1f2424] text-[#879292] hover:text-white border border-[#272b2b] flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print A4</span>
                        </button>
                      </div>
                    </div>

                    {/* Dual Pane Studio */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                      {/* Left: AI Prompt & Grounding */}
                      <div className="lg:col-span-4 rounded-xl bg-[#141717] border border-[#232727] p-3.5 space-y-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-[#2dd4bf]" />
                          <span className="text-xs font-semibold text-white">Associate AI</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#0d0f0f] border border-[#1e2222] text-[11px] text-[#879292]">
                          <span className="text-[#2dd4bf] font-medium">Prompt:</span> Draft regular bail petition for K. Singhania in Crime 412/2025 citing parity and absence of criminal antecedent under Satender Kumar Antil ruling.
                        </div>
                        <div className="text-[11px] text-[#b2ded8] bg-[#152321] p-2.5 rounded-lg border border-[#2dd4bf]/20">
                          <span className="text-[#2dd4bf] font-semibold">✓ Grounding Verified:</span> Cross-checked with Bombay High Court Criminal Manual rules.
                        </div>
                        <div className="text-[10px] font-mono text-[#6f7a7a] pt-2 border-t border-[#1e2222]">
                          Compute: 1,420 Tokens (~₹0.28)
                        </div>
                      </div>

                      {/* Right: Exact Court Document Preview */}
                      <div className="lg:col-span-8 rounded-xl bg-[#090b0b] border border-[#232727] p-4 text-[11px] font-mono text-[#c0c8c8] leading-relaxed max-h-[300px] overflow-y-auto">
                        <div className="text-center font-bold text-white mb-2">
                          IN THE HIGH COURT OF JUDICATURE AT BOMBAY<br />
                          CRIMINAL APPELLATE JURISDICTION<br />
                          BAIL APPLICATION NO. 1482 OF 2026
                        </div>
                        <div className="my-2 border-b border-[#1e2222]" />
                        <p className="mb-2"><strong>Mr. K. Singhania</strong> ...Applicant</p>
                        <p className="mb-2 text-center text-[#6f7a7a]">VERSUS</p>
                        <p className="mb-3"><strong>The State of Maharashtra</strong> ...Respondent</p>
                        <p className="font-semibold text-[#2dd4bf] mb-2">
                          APPLICATION UNDER SECTION 439 CR.P.C. FOR GRANT OF REGULAR BAIL
                        </p>
                        <p className="mb-2">
                          1. That the Applicant has been falsely implicated in Crime No. 412/2025; all documentary records stand in custody of the investigation agency.
                        </p>
                        <p className="mb-2">
                          2. That the Applicant satisfies all principles of law laid down by the Hon&apos;ble Supreme Court in <em>Satender Kumar Antil v. CBI (2022) 10 SCC 51</em>.
                        </p>
                        <p className="text-[#879292]">
                          PRAYER: Wherefore, it is prayed this Hon&apos;ble Court enlarge the applicant on bail.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ACTUAL MATTERS VIEW */}
                {activeScreen === 'cases' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1c2020] pb-3">
                      <div>
                        <div className="text-[10px] font-mono text-[#2dd4bf] uppercase">Matters Dossier</div>
                        <h3 className="text-lg font-serif text-white">Active Chambers Cases</h3>
                      </div>
                      <div className="text-xs text-[#879292] bg-[#141717] px-3 py-1.5 rounded-lg border border-[#232727] flex items-center gap-2">
                        <Search className="w-3 h-3 text-[#2dd4bf]" />
                        <span>Filter: All Courts</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { num: 'SLP 18420/2025', title: 'Union of India v. Apex Mega Infrastructure', court: 'Supreme Court', bench: 'CJI Bench (Court 2)', stage: 'Final Hearing', date: 'Today · 10:30' },
                        { num: 'TC-2026-08', title: 'Sharma BioTech v. Drug Controller General', court: 'Delhi High Court', bench: 'Court 18', stage: 'Interim Stay', date: '20 Oct 2026' },
                        { num: 'BA-2026-11', title: 'State of Maharashtra v. K. Singhania', court: 'Bombay High Court', bench: 'Criminal Bench', stage: 'Urgent Bail', date: '24 Oct 2026' },
                        { num: 'ARB-2026-14', title: 'Apex Logistics Ltd. v. Global Freight Corp', court: 'DIAC Arbitration', bench: 'Sole Arbitrator', stage: 'Evidence', date: '04 Nov 2026' },
                      ].map((c, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#141717] border border-[#1e2222] text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[10px] text-[#2dd4bf] bg-[#152321] px-2 py-0.5 rounded">
                              {c.num}
                            </span>
                            <span className="text-white font-medium">{c.title}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[#879292] text-[11px] font-mono mt-1 sm:mt-0">
                            <span>{c.court}</span>
                            <span className="text-[#646e6e]">•</span>
                            <span className="text-[#2dd4bf]">{c.stage}</span>
                            <span className="text-[#646e6e]">•</span>
                            <span>{c.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. ACTUAL TOKEN LEDGER VIEW */}
                {activeScreen === 'billing' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1c2020] pb-3">
                      <div>
                        <div className="text-[10px] font-mono text-[#2dd4bf] uppercase">Token Ledger</div>
                        <h3 className="text-lg font-serif text-white">Chambers Usage & Subscriptions</h3>
                      </div>
                      <span className="text-xs font-mono text-[#2dd4bf] bg-[#152321] px-2.5 py-1 rounded border border-[#2dd4bf]/20">
                        LegalDesk Professional
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#141717] border border-[#232727] flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1.5 w-full sm:w-2/3">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#879292]">Monthly Balance</span>
                          <span className="font-mono text-white font-bold">42,850 / 50,000 Tokens (85%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#1e2323] overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#2dd4bf] to-[#34d399] w-[85%]" />
                        </div>
                      </div>
                      <div className="text-center sm:text-right shrink-0">
                        <div className="text-sm font-serif font-bold text-white">₹1,799 / mo</div>
                        <div className="text-[10px] text-[#6f7a7a]">Next renewal 14 days</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-[#6f7a7a]">Recent Live Usage Entries</div>
                      {[
                        { op: 'AI Legal Drafting (Bail Application)', matter: 'BA-2026-11', tokens: '-1,420 Tokens', time: '12m ago' },
                        { op: 'OCR Exhibit Analysis (18 pages)', matter: 'SLP 18420/2025', tokens: '-650 Tokens', time: '1h ago' },
                        { op: 'Monthly Credit Subscription Allocation', matter: 'Chambers Ledger', tokens: '+50,000 Tokens', time: '16 Oct' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1010] border border-[#1e2222] text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-[#2dd4bf]" />
                            <span className="text-white">{item.op}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px]">
                            <span className={item.tokens.startsWith('+') ? 'text-[#34d399]' : 'text-[#f87171]'}>{item.tokens}</span>
                            <span className="text-[#646e6e]">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Window Footer Status */}
            <div className="h-8 border-t border-[#1c2020] bg-[#090b0b] px-4 flex items-center justify-between text-[10px] text-[#6f7a7a]">
              <span>AES-256 Vault Encryption</span>
              <span className="text-[#2dd4bf]">Zero Training Policy Active</span>
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
      <section id="roi" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 border-t border-[#1e2323] bg-[#0c0e0e]/50">
        <div className="max-w-4xl mx-auto rounded-2xl bg-[#111313] border border-[#232727] p-6 sm:p-8">
          
          <div className="mb-6">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#2dd4bf] bg-[#152321] px-2.5 py-1 rounded-full border border-[#2dd4bf]/20">
              Capacity Calculator
            </span>
            <h2 className="text-2xl font-serif text-white mt-2">
              Quantify billable hours saved in your chambers.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Sliders */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#879292]">Active Matters per Month</span>
                  <span className="font-mono text-[#2dd4bf] font-bold">{mattersCount} Matters</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={mattersCount}
                  onChange={(e) => setMattersCount(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#1a1e1e] rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#879292]">Drafting Hours per Matter</span>
                  <span className="font-mono text-[#2dd4bf] font-bold">{hoursPerMatter} Hours</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={hoursPerMatter}
                  onChange={(e) => setHoursPerMatter(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#1a1e1e] rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
                />
              </div>
            </div>

            {/* Output */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-gradient-to-br from-[#152321] to-[#141717] border border-[#2dd4bf]/30 text-center space-y-4">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#2dd4bf] tracking-widest">Monthly Hours Saved</div>
                <div className="text-3xl sm:text-4xl font-serif font-bold text-white mt-1">
                  {hoursSaved} <span className="text-sm font-sans font-normal text-[#879292]">hrs</span>
                </div>
              </div>
              <div className="pt-3 border-t border-[#2dd4bf]/20">
                <div className="text-[10px] font-mono uppercase text-[#2dd4bf] tracking-widest">Billable Capacity Returned</div>
                <div className="text-2xl font-serif font-bold text-[#2dd4bf] mt-1">
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
          <div className="mt-8 p-4 rounded-xl bg-[#0e1010] border border-[#1e2222] flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <span className="text-[#879292]">
              Need extra tokens? Top up anytime via Razorpay: <strong className="text-white">50,000 tokens for ₹500</strong>. Tokens never expire while plan is active.
            </span>
            <Link href="/billing" className="text-[#2dd4bf] hover:underline font-medium shrink-0">
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
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 border-t border-[#1e2323]">
        <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-br from-[#141d1b] via-[#141717] to-[#0c0e0e] border border-[#2dd4bf]/40 p-8 sm:p-10 text-center relative overflow-hidden shadow-[0_0_40px_rgba(45,212,191,0.12)]">
          <div className="max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-serif text-white leading-tight">
              Modernize your litigation practice today.
            </h2>
            <p className="text-xs sm:text-sm text-[#879292]">
              Join advocates and litigation chambers leveraging AI for precision pleadings, court docket automation, and spotless case dossiers.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-6 py-3 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.25)] flex items-center justify-center gap-2"
              >
                <span>Initialize Workspace Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-5 py-3 bg-[#1e2424] hover:bg-[#252c2c] text-white border border-[#272b2b] text-xs font-medium rounded-xl"
              >
                Counsel Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chambers Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#1e2323] bg-[#090b0b] pt-12 pb-8 text-xs text-[#6f7a7a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-[#1a1e1e]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#2dd4bf] text-[#091b18] flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 stroke-[2.3]" />
              </div>
              <span className="font-serif font-semibold text-base text-white">LegalDesk</span>
              <span className="text-[10px] font-mono text-[#2dd4bf] ml-3 bg-[#152321] px-2 py-0.5 rounded border border-[#2dd4bf]/20">
                All Chambers Systems Operational
              </span>
            </div>
            <div className="flex items-center gap-6 text-[11px]">
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <Link href="/cases" className="hover:text-white transition-colors">Matters</Link>
              <Link href="/drafts" className="hover:text-white transition-colors">Drafts</Link>
              <Link href="/billing" className="hover:text-white transition-colors">Billing</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px]">
            <span>© 2026 LegalDesk Systems, Inc. Sovereign Legal Operating System.</span>
            <span>Advocate-Client Privilege Protected • Zero Retention Policy</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
