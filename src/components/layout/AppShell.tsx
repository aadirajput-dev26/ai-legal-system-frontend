'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sparkles, 
  FolderClosed, 
  Calendar, 
  FileText, 
  Search, 
  Bell, 
  Settings, 
  Mic, 
  Send, 
  Menu, 
  X, 
  LogOut, 
  MessageSquare,
  Scale,
  Bot,
  Loader2,
  ChevronDown,
  RefreshCw,
  Plus,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chat as chatApi } from '@/lib/api';

interface AppShellProps {
  children: React.ReactNode;
  /** Pass caseId to enable the Associate AI sidebar for that case */
  caseId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  chips?: string[];
}

export function AppShell({ children, caseId }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { currentOrg, orgs, switchOrg } = useOrg();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [associateOpen, setAssociateOpen] = useState(false);
  const [mobileAssociateOpen, setMobileAssociateOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatInput, setChatInput] = useState('');

  // Auto-open Associate panel on case detail pages
  useEffect(() => {
    if (caseId) {
      setAssociateOpen(true);
    } else {
      setAssociateOpen(false);
    }
  }, [caseId]);

  // Chat state — backed by real API
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Fetch unread notification count
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

  // Load thread history
  const loadThreadHistory = async (threadId: string) => {
    setChatLoading(true);
    try {
      const historyRes = await chatApi.getHistory(caseId!, threadId);
      const history: any[] = historyRes.data?.messages || historyRes.messages || [];

      if (history.length > 0) {
        const mapped: ChatMessage[] = history.map((m: any, i: number) => ({
          id: m.id || String(i),
          role: m.role === 'user' ? 'user' : 'assistant',
          text: m.content || m.text || m.message || '',
        }));
        setChatMessages(mapped);
      } else {
        setChatMessages([{
          id: 'welcome',
          role: 'assistant',
          text: 'Good day, Counsel. I am your case-specific Associate AI. I have access to all documents, hearings, tasks, and case intelligence for this matter. What do you need?',
          chips: ['Summarize this case', 'List next hearings', 'What tasks are pending?'],
        }]);
      }
    } catch (err) {
      console.error('Failed to load thread history:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Initialize chat thread when Associate panel is opened on a case page
  const initializeChatThread = useCallback(async () => {
    if (!caseId || chatInitialized) return;
    setChatLoading(true);
    try {
      // 1. List existing threads
      const threadsRes = await chatApi.listThreads(caseId);
      const threadsList: any[] = threadsRes.data || threadsRes.threads || [];
      setThreads(threadsList);
      
      let threadId: string;

      if (threadsList.length > 0) {
        // Use the most recent thread
        threadId = threadsList[0].id || threadsList[0].chat_id;
      } else {
        // Create a new thread
        const createRes = await chatApi.createThread(caseId, 'Chat 1');
        threadId = createRes.data?.id || createRes.chat?.id || createRes.id;
        setThreads([createRes.data || createRes.chat || createRes]);
      }

      setChatThreadId(threadId);

      // 2. Load conversation history
      await loadThreadHistory(threadId);
      setChatInitialized(true);
    } catch (err) {
      console.error('Chat init error:', err);
      setChatMessages([{
        id: 'error',
        role: 'assistant',
        text: 'Unable to connect to case intelligence. Please try again.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [caseId, chatInitialized]);

  // When associate opens and caseId is present, initialize
  useEffect(() => {
    if ((associateOpen || mobileAssociateOpen) && caseId && !chatInitialized) {
      initializeChatThread();
    }
  }, [associateOpen, mobileAssociateOpen, caseId, chatInitialized, initializeChatThread]);

  // Send a message using streaming API
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || !caseId || !chatThreadId || sending) return;

    setChatInput('');
    setSending(true);

    // Add user message immediately
    const userMsgId = Date.now().toString();
    setChatMessages(prev => [...prev, { id: userMsgId, role: 'user', text }]);

    // Add placeholder streaming assistant message
    const assistantMsgId = (Date.now() + 1).toString();
    setChatMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', text: '', streaming: true }]);

    try {
      await chatApi.sendMessageStream(
        caseId,
        chatThreadId,
        text,
        // onDelta — accumulate streamed text
        (chunk: string) => {
          setChatMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, text: m.text + chunk }
              : m
          ));
        },
        // onDone
        () => {
          setChatMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, streaming: false }
              : m
          ));
          setSending(false);
        }
      );
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to get a response. Please retry.';
      setChatMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, text: errMsg, streaming: false }
          : m
      ));
      setSending(false);
    }
  };

  // Reset + reload chat thread
  const handleNewThread = async () => {
    if (!caseId) return;
    setChatLoading(true);
    try {
      const chatNum = threads.length + 1;
      const createRes = await chatApi.createThread(caseId, `Chat ${chatNum}`);
      const newThread = createRes.data || createRes.chat || createRes;
      const threadId = newThread.id || newThread.chat_id;
      
      setThreads(prev => [newThread, ...prev]);
      setChatThreadId(threadId);
      setChatMessages([{
        id: 'welcome-new',
        role: 'assistant',
        text: 'New session started. How can I assist with this case?',
        chips: ['Summarize this case', 'List next hearings', 'What tasks are pending?'],
      }]);
    } catch (err) {
      console.error('New thread error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Switch to selected thread
  const handleSwitchThread = async (threadId: string) => {
    setChatThreadId(threadId);
    await loadThreadHistory(threadId);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const navItems = [
    { icon: LayoutDashboard, href: '/dashboard', label: 'Dashboard' },
    { icon: FolderClosed, href: '/cases', label: 'Cases' },
    { icon: Calendar, href: '/calendar', label: 'Calendar' },
    { icon: FileText, href: '/documents', label: 'Documents' },
  ];

  const bottomNavItems = [
    { icon: Bell, href: '/notifications', label: 'Notifications', unread: unreadCount },
    { icon: Settings, href: '/settings', label: 'Settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* ── Mobile Top Header ────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between p-3.5 border-b border-border bg-sidebar absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2D4537] text-[#4ADE80] flex items-center justify-center font-bold font-heading shadow-sm">
            <Scale className="w-4 h-4" />
          </div>
          <div className="text-sm font-semibold tracking-tight truncate max-w-[180px]">
            {currentOrg?.name || 'LegalDesk'}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Only show Associate button when on a case page */}
          {caseId && (
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-[#A855F7] hover:bg-white/5"
              onClick={() => setMobileAssociateOpen(true)}
              title="Open Associate"
            >
              <Bot className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* ── Mobile Menu Backdrop ────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Left Navigation Sidebar ─────────────────────────────────── */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 w-16 bg-sidebar border-r border-sidebar-border
        flex flex-col items-center py-5 transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0 !w-64 !items-stretch px-4' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between mb-6 px-1 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D4537] text-[#4ADE80] flex items-center justify-center font-bold text-lg font-heading shadow-sm flex-shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            {mobileMenuOpen && (
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{currentOrg?.name || 'LegalDesk'}</div>
                <div className="text-[11px] text-muted-foreground truncate">{user?.name || 'Law Practice'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Top Nav */}
        <nav className="flex-1 flex flex-col gap-2 w-full">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href) || (pathname === '/' && item.href === '/dashboard');
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="relative group w-full flex items-center justify-center"
              >
                <div className={`
                  p-3 rounded-xl transition-all duration-200 flex items-center gap-3 w-full
                  ${mobileMenuOpen ? 'justify-start' : 'justify-center'}
                  ${isActive
                    ? 'bg-[#1a231f] text-[#4ADE80] font-medium shadow-[inset_0_0_0_1px_rgba(74,222,128,0.2)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
                `}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {mobileMenuOpen && <span className="text-sm">{item.label}</span>}
                </div>
                {!mobileMenuOpen && (
                  <div className="absolute left-14 bg-popover text-popover-foreground text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border border-border">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Nav + Profile */}
        <div className="flex flex-col gap-2 w-full mt-auto pt-4 border-t border-white/5 flex-shrink-0">
          {bottomNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="relative group w-full flex items-center justify-center"
            >
              <div className={`
                p-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 relative flex items-center gap-3 w-full
                ${mobileMenuOpen ? 'justify-start' : 'justify-center'}
              `}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.unread !== undefined && item.unread > 0 && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.2 bg-[#4ADE80] text-black text-[10px] font-bold rounded-full shadow-sm">
                    {item.unread}
                  </span>
                )}
                {mobileMenuOpen && <span className="text-sm">{item.label}</span>}
              </div>
              {!mobileMenuOpen && (
                <div className="absolute left-14 bg-popover text-popover-foreground text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg border border-border">
                  {item.label}
                </div>
              )}
            </Link>
          ))}

          {/* User Profile Dropdown */}
          <div className="pt-2 flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger className={`w-full flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-colors text-left focus:outline-none cursor-pointer ${mobileMenuOpen ? 'justify-start' : 'justify-center'}`}>
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#4ADE80] flex items-center justify-center font-semibold text-xs border border-white/10 flex-shrink-0 shadow-sm">
                  {initials}
                </div>
                {mobileMenuOpen && (
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{user?.name || 'Counsel'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{user?.email || ''}</div>
                  </div>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 bg-[#16161a] border-white/10 text-foreground p-1.5 shadow-2xl">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground text-sm">{user?.name || 'Account'}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />

                {orgs.length > 1 && (
                  <>
                    <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Switch Firm / Org
                    </DropdownMenuLabel>
                    {orgs.map(org => (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => switchOrg(org.id)}
                        className={`text-xs px-2 py-1.5 rounded-md cursor-pointer flex items-center justify-between ${currentOrg?.id === org.id ? 'bg-[#1a231f] text-[#4ADE80] font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <span className="truncate">{org.name}</span>
                        {currentOrg?.id === org.id && <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-white/10" />
                  </>
                )}

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-xs px-2 py-2 text-destructive hover:bg-destructive/10 rounded-md cursor-pointer flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden mt-14 md:mt-0">
        <ScrollArea className="flex-1 h-full">
          <div className="p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto min-h-full">
            {children}
          </div>
        </ScrollArea>
      </main>

      {/* ── Desktop Right Sidebar - Associate ─────────────────────────
           Only shown when caseId is provided (case detail page)         */}
      {caseId && (
        associateOpen ? (
          <aside className="hidden lg:flex w-[360px] xl:w-[380px] bg-[#111111] border-l border-border flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-30">
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#111111] flex-shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="w-4 h-4 text-[#A855F7]" />
                <span>Associate AI</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {threads.length > 1 && (
                  <select
                    value={chatThreadId || ''}
                    onChange={(e) => handleSwitchThread(e.target.value)}
                    className="bg-[#16161a] text-[11px] text-muted-foreground border border-white/10 rounded px-2 py-1 max-w-[120px] focus:outline-none cursor-pointer"
                  >
                    {threads.map((t, idx) => (
                      <option key={t.id || t.chat_id} value={t.id || t.chat_id}>
                        {t.title || `Chat ${threads.length - idx}`}
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-[#A855F7]"
                  onClick={handleNewThread}
                  title="New conversation"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setAssociateOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {chatLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-[#A855F7]" />
                  <span className="text-xs">Loading case intelligence…</span>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {/* Role label */}
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {msg.role === 'assistant' ? (
                        <>
                          <Sparkles className="w-3 h-3 text-[#A855F7]" />
                          <span>Associate &middot; Contextual</span>
                        </>
                      ) : (
                        <span>You</span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`
                      text-[13px] leading-relaxed p-3 rounded-xl max-w-[92%] font-sans
                      ${msg.role === 'user'
                        ? 'bg-[#1a231f] text-[#4ADE80] border border-[#2D4537]'
                        : 'bg-[#16161a] text-foreground/90 border border-white/5'}
                    `}>
                      {msg.text || (msg.streaming ? '' : '…')}
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 bg-[#A855F7] ml-0.5 animate-pulse align-middle rounded-sm" />
                      )}
                    </div>

                    {/* Quick-action chips */}
                    {msg.chips && msg.chips.length > 0 && !msg.streaming && (
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {msg.chips.map((chip, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            onClick={() => handleSendMessage(chip)}
                            className="bg-transparent border-white/10 hover:border-[#A855F7]/50 hover:text-[#A855F7] hover:bg-[#A855F7]/5 rounded-md text-[11px] font-normal cursor-pointer py-1 text-muted-foreground transition-all select-none"
                          >
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-[#111111] border-t border-white/5 flex-shrink-0">
              <div className="text-[11px] text-muted-foreground/70 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                Live case intelligence — ask anything.
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative"
              >
                <Input
                  placeholder="Ask about this case…"
                  className="bg-[#1A1A1A] border-white/10 text-sm h-11 pl-3.5 pr-12 rounded-xl focus-visible:ring-1 focus-visible:ring-[#A855F7]/50 placeholder:text-muted-foreground/50"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={sending || chatLoading}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {sending ? (
                    <Loader2 className="w-4 h-4 text-[#A855F7] animate-spin mr-2" />
                  ) : chatInput ? (
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 rounded-lg text-[#A855F7] hover:bg-[#A855F7]/10"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-white/5"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </aside>
        ) : (
          /* Collapsed — floating pill button */
          <button
            onClick={() => setAssociateOpen(true)}
            className="hidden lg:flex fixed right-4 bottom-6 z-30 items-center gap-2 px-3.5 py-2.5 bg-[#16161a] border border-[#A855F7]/30 text-foreground rounded-full shadow-2xl hover:border-[#A855F7] hover:bg-[#1f1a2e] transition-all group"
          >
            <Sparkles className="w-4 h-4 text-[#A855F7] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Associate</span>
          </button>
        )
      )}

      {/* ── Mobile Associate Slide-Over ──────────────────────────────── */}
      {caseId && mobileAssociateOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#111111] md:hidden">
          {/* Header */}
          <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#111111] flex-shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-[#A855F7]" />
              <span>Associate AI</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {threads.length > 1 && (
                <select
                  value={chatThreadId || ''}
                  onChange={(e) => handleSwitchThread(e.target.value)}
                  className="bg-[#16161a] text-[11px] text-muted-foreground border border-white/10 rounded px-2 py-1 max-w-[100px] focus:outline-none cursor-pointer"
                >
                  {threads.map((t, idx) => (
                    <option key={t.id || t.chat_id} value={t.id || t.chat_id}>
                      {t.title || `Chat ${threads.length - idx}`}
                    </option>
                  ))}
                </select>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-[#A855F7]"
                onClick={handleNewThread}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileAssociateOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {chatLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#A855F7]" />
                <span className="text-xs">Loading case intelligence…</span>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {msg.role === 'assistant' ? 'Associate' : 'You'}
                  </div>

                  <div className={`
                    text-sm p-3 rounded-xl max-w-[90%] font-sans
                    ${msg.role === 'user' ? 'bg-[#1a231f] text-[#4ADE80]' : 'bg-[#16161a] text-foreground'}
                  `}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-[#111111]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center gap-2"
            >
              <Input
                placeholder="Ask Associate..."
                className="bg-[#1A1A1A] border-white/10 text-sm h-11 pr-12 rounded-xl"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={sending || chatLoading}
              />
              <Button type="submit" size="icon" className="bg-[#A855F7] text-white h-11 w-11 rounded-xl">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
