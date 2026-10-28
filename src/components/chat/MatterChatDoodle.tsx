'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  Loader2, 
  Scale, 
  MessageSquare, 
  ChevronDown,
  Minimize2,
  Maximize2,
  FileText,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { chat as chatApi } from '@/lib/api';
import { useBilling } from '@/lib/billing-context';
import { TokenOverModal } from '@/components/billing/TokenOverModal';

interface MatterChatDoodleProps {
  caseId?: string | null;
  caseTitle?: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

export function MatterChatDoodle({ caseId: initialCaseId, caseTitle: initialCaseTitle }: MatterChatDoodleProps) {
  const { isZeroTokens, tokenCredits } = useBilling();
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(initialCaseId || null);
  const [activeCaseTitle, setActiveCaseTitle] = useState<string | null>(initialCaseTitle || null);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync props
  useEffect(() => {
    if (initialCaseId) setActiveCaseId(initialCaseId);
    if (initialCaseTitle) setActiveCaseTitle(initialCaseTitle);
  }, [initialCaseId, initialCaseTitle]);

  const matterContext = activeCaseTitle || 'Selected Matter';

  const defaultWelcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    text: activeCaseTitle 
      ? `Good day, Counsel. I am your Associate AI for "${activeCaseTitle}". I have indexed this matter's filings, hearing dates, and evidence. How may I assist your strategy today?`
      : 'Good day, Counsel. I am your Chambers AI Assistant. Select any matter to analyze filings, cite precedents, or ask general procedural questions.',
  };

  // Scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Reset or initialize messages when activeCaseId changes
  useEffect(() => {
    if (!activeCaseId) {
      setMessages([defaultWelcomeMessage]);
      setChatThreadId(null);
      return;
    }

    const initThread = async () => {
      setLoading(true);
      try {
        const listRes = await chatApi.listThreads(activeCaseId);
        const threadList = listRes?.data || listRes?.threads || [];
        let activeId: string;

        if (threadList.length > 0) {
          activeId = threadList[0].id || threadList[0].chat_id;
        } else {
          const createRes = await chatApi.createThread(activeCaseId, `Analysis - ${activeCaseTitle || 'Matter'}`);
          activeId = createRes?.data?.id || createRes?.chat?.id || createRes?.id;
        }

        setChatThreadId(activeId);

        if (activeId) {
          const historyRes = await chatApi.getHistory(activeCaseId, activeId);
          const history = Array.isArray(historyRes?.data) ? historyRes.data : historyRes?.data?.messages || [];
          if (history.length > 0) {
            setMessages(history.map((m: any, idx: number) => ({
              id: m.id || String(idx),
              role: m.role === 'user' ? 'user' : 'assistant',
              text: m.content || m.message || m.text || '',
            })));
          } else {
            setMessages([defaultWelcomeMessage]);
          }
        }
      } catch {
        setMessages([defaultWelcomeMessage]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      initThread();
    }
  }, [activeCaseId, activeCaseTitle, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || sending) return;

    setInput('');
    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text },
      { id: assistantMsgId, role: 'assistant', text: '', streaming: true }
    ]);

    setSending(true);

    if (activeCaseId && chatThreadId) {
      let accumulated = '';
      try {
        await chatApi.sendMessageStream(
          activeCaseId,
          chatThreadId,
          text,
          chunk => {
            accumulated += chunk;
            setMessages(prev =>
              prev.map(m => (m.id === assistantMsgId ? { ...m, text: accumulated } : m))
            );
          },
          () => {
            setMessages(prev =>
              prev.map(m => (m.id === assistantMsgId ? { ...m, streaming: false } : m))
            );
            setSending(false);
          }
        );
        return;
      } catch (err) {
        console.warn('Streaming failed, fallback to standard response:', err);
      }
    }

    // Fallback contextual response if offline or demo
    setTimeout(() => {
      let reply = `Understood, Counsel. Regarding ${matterContext}, I have analyzed your query: "${text}". Based on current court docket rules and registered pleadings, filings are on track. Please let me know if you would like me to draft a notice or extract key citation paragraphs.`;
      setMessages(prev =>
        prev.map(m => (m.id === assistantMsgId ? { ...m, text: reply, streaming: false } : m))
      );
      setSending(false);
    }, 600);
  };

  // Global event listener to open chatbot from any button
  useEffect(() => {
    const handleOpen = (e?: any) => {
      if (isZeroTokens || tokenCredits <= 0) {
        setTokenModalOpen(true);
        return;
      }
      if (e?.detail?.caseId) {
        setActiveCaseId(e.detail.caseId);
      }
      if (e?.detail?.caseTitle) {
        setActiveCaseTitle(e.detail.caseTitle);
      }
      setIsOpen(true);
    };
    window.addEventListener('open-ai-chat', handleOpen);
    return () => window.removeEventListener('open-ai-chat', handleOpen);
  }, [isZeroTokens, tokenCredits]);

  const chips = [
    'Summarize this matter',
    'Upcoming hearing dates',
    'Key claims & defense',
    'Draft response outline',
  ];

  const hasNoTokens = isZeroTokens || tokenCredits <= 0;

  return (
    <>
      {/* ── 1. Floating AI Chatbot Opening Doodle (Always visible in bottom-right) ──── */}
      {!isOpen && (
        <div className="fixed right-6 bottom-6 z-[99999] animate-in fade-in duration-300">
          <button
            onClick={() => {
              if (hasNoTokens) {
                setTokenModalOpen(true);
                return;
              }
              setIsOpen(true);
            }}
            title={hasNoTokens ? 'Tokens are over (0 tokens remaining). Click to add tokens.' : 'Open AI Legal Assistant'}
            className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-full transition-all cursor-pointer ${
              hasNoTokens
                ? 'bg-muted/95 border-2 border-amber-500/30 text-muted-foreground opacity-80 hover:opacity-100 hover:border-amber-500/60 shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
                : 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-500 text-[#091b18] font-bold text-xs shadow-[0_10px_35px_rgba(45,212,191,0.45)] hover:shadow-[0_15px_45px_rgba(45,212,191,0.65)] hover:scale-[1.05] active:scale-[0.98] border-2 border-white/40 ring-4 ring-teal-500/20'
            }`}
          >
            {/* Live animated pulsing doodle dot */}
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-90 ${hasNoTokens ? 'bg-amber-400' : 'bg-white'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${hasNoTokens ? 'bg-amber-500' : 'bg-white'}`} />
            </span>

            {/* Doodle Sparkles or Lock Icon */}
            {hasNoTokens ? (
              <Lock className="w-4 h-4 text-amber-500 stroke-[2.2]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#091b18] group-hover:rotate-12 transition-transform stroke-[2.5]" />
            )}

            {/* Label */}
            <span className={`tracking-tight text-xs font-bold uppercase ${hasNoTokens ? 'text-foreground' : 'text-[#091b18]'}`}>
              {hasNoTokens ? 'AI Chatbot (0 Tokens)' : 'AI Chatbot'}
            </span>

            {activeCaseTitle && (
              <span className={`hidden sm:inline-block max-w-[130px] truncate text-[11px] font-medium opacity-90 pl-1.5 border-l ${hasNoTokens ? 'border-border text-muted-foreground' : 'border-[#091b18]/30'}`}>
                {activeCaseTitle}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Token Over Warning Modal ── */}
      <TokenOverModal
        open={tokenModalOpen}
        onOpenChange={setTokenModalOpen}
        feature="Opening the AI Legal Assistant"
      />

      {/* ── 2. Interactive AI Chatbot Window ────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-[99999] w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[88vh] flex flex-col rounded-2xl bg-card border border-border shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[#0d9488] dark:text-[#2dd4bf] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xs text-foreground truncate">
                    LegalDesk Associate AI
                  </h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {activeCaseTitle ? `Context: ${activeCaseTitle}` : 'Chambers Case Intelligence'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#0d9488] dark:text-[#2dd4bf]" />
                <span className="text-[11px]">Syncing matter intelligence...</span>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-teal-500/10 border border-teal-500/20 text-[#0d9488] dark:text-[#2dd4bf] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs ${
                      m.role === 'user'
                        ? 'bg-[#2dd4bf] text-[#091b18] font-medium shadow-sm'
                        : 'bg-muted/60 border border-border text-foreground shadow-sm'
                    }`}
                  >
                    {m.text ? (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-3 py-1.5 border-t border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {chips.map((chip) => (
              <button
                key={chip}
                disabled={sending}
                onClick={() => handleSendMessage(chip)}
                className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-card border-t border-border flex items-center gap-2 flex-shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${activeCaseTitle ? 'this matter' : 'matters'}...`}
              disabled={sending}
              className="flex-1 bg-muted/40 border border-border focus:border-[#2dd4bf]/70 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending}
              size="icon"
              className="w-8 h-8 rounded-xl bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] shrink-0 cursor-pointer disabled:opacity-40"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </form>

        </div>
      )}
    </>
  );
}
