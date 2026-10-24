'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { useBilling } from '@/lib/billing-context';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Loader2,
  Trash2,
  Download,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Bot,
  Send,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { drafts as draftsApi, cases as casesApi } from '@/lib/api';
import type { Draft, DraftType, DraftStatus } from '@/lib/api';
import { CaseItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  LEGAL_NOTICE: 'Legal Notice',
  APPLICATION: 'Application',
  AFFIDAVIT: 'Affidavit',
  REPLY: 'Reply',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  COURT_DRAFT: 'Court Draft',
  CORRESPONDENCE: 'Correspondence',
  OTHER: 'Legal Document',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  canApply?: boolean;
}

function DraftsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const { isExhausted } = useBilling();

  // URL query params
  const initialCaseId = searchParams.get('caseId') || '';
  const initialDraftId = searchParams.get('draftId') || '';
  const openNewParam = searchParams.get('new') === 'true';

  // Data states
  const [draftsList, setDraftsList] = useState<Draft[]>([]);
  const [casesList, setCasesList] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Selected Draft for Version History Right Inspector
  const [selectedDraftForHistory, setSelectedDraftForHistory] = useState<Draft | null>(null);

  // Studio Mode State
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // New Draft Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDraftForm, setNewDraftForm] = useState<{
    caseId: string;
    title: string;
    description: string;
    draftType: DraftType;
    instructions: string;
  }>({
    caseId: initialCaseId || '',
    title: '',
    description: '',
    draftType: 'LEGAL_NOTICE',
    instructions: '',
  });

  // Delete Confirmation Modal State
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [deletingDraft, setDeletingDraft] = useState(false);

  // Assistant Chatbot State in Studio
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Load drafts and cases
  const fetchData = useCallback(async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const [draftsRes, casesRes] = await Promise.allSettled([
        draftsApi.listOrgDrafts(currentOrg.id),
        casesApi.list(currentOrg.id),
      ]);

      if (casesRes.status === 'fulfilled' && casesRes.value?.data) {
        setCasesList(casesRes.value.data);
      }

      if (draftsRes.status === 'fulfilled' && draftsRes.value?.data) {
        const fetchedDrafts = Array.isArray(draftsRes.value.data) ? draftsRes.value.data : [];
        setDraftsList(fetchedDrafts);

        if (fetchedDrafts.length > 0 && !selectedDraftForHistory) {
          setSelectedDraftForHistory(fetchedDrafts[0]);
        }

        if (initialDraftId) {
          const match = fetchedDrafts.find((d: Draft) => d.id === initialDraftId);
          if (match) {
            openDraftInStudio(match);
          }
        }
      }
    } catch (err) {
      console.error('[Drafts] Failed to load drafts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id, initialDraftId, selectedDraftForHistory]);

  useEffect(() => {
    if (currentOrg?.id) {
      fetchData();
    }
  }, [currentOrg?.id, fetchData]);

  useEffect(() => {
    if (openNewParam && casesList.length > 0) {
      setNewDraftForm(prev => ({
        ...prev,
        caseId: initialCaseId || casesList[0]?.id || '',
      }));
      setCreateModalOpen(true);
    }
  }, [openNewParam, casesList, initialCaseId]);

  // Open Draft in Studio
  const openDraftInStudio = async (draft: Draft) => {
    setActiveDraft(draft);
    setEditorContent(draft.current_content || '');

    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `I'm your LegalDesk drafting assistant for **${draft.title}**. You can ask me to revise clauses, fill placeholder particulars, or strengthen statutory grounds.`,
      },
    ]);

    try {
      const full = await draftsApi.get(draft.case_id, draft.id);
      if (full?.data) {
        setActiveDraft(full.data);
        setEditorContent(full.data.current_content || '');
      }
    } catch (err) {
      console.error('Failed to load fresh draft:', err);
    }
  };

  const closeStudio = () => {
    setActiveDraft(null);
    setEditorContent('');
    setChatMessages([]);
    fetchData();
  };

  // Debounced Auto-save
  const handleEditorChange = (newVal: string) => {
    setEditorContent(newVal);
    if (!activeDraft) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSavingDraft(true);
        await draftsApi.update(activeDraft.case_id, activeDraft.id, {
          currentContent: newVal,
        });
        setActiveDraft(prev => (prev ? { ...prev, current_content: newVal } : prev));
      } catch (err) {
        console.error('[Drafts] Auto-save failed:', err);
      } finally {
        setSavingDraft(false);
      }
    }, 2000);
  };

  // Status Change
  const handleStatusChange = async (status: DraftStatus) => {
    if (!activeDraft) return;
    try {
      await draftsApi.update(activeDraft.case_id, activeDraft.id, { status });
      setActiveDraft(prev => (prev ? { ...prev, status } : prev));
      setDraftsList(prev => prev.map(d => (d.id === activeDraft.id ? { ...d, status } : d)));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Create Draft Submit & Stream
  const handleCreateDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraftForm.caseId || !newDraftForm.title.trim()) return;

    setCreating(true);
    setCreateModalOpen(false);

    const tempDraft: Draft = {
      id: '',
      case_id: newDraftForm.caseId,
      title: newDraftForm.title,
      description: newDraftForm.description || null,
      draft_type: newDraftForm.draftType,
      status: 'DRAFT',
      instructions: newDraftForm.instructions || null,
      current_content: '',
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setActiveDraft(tempDraft);
    setEditorContent('');
    setIsGenerating(true);

    let accumulatedText = '';
    let serverDraftId = '';

    try {
      const result = await draftsApi.generateStream(
        newDraftForm.caseId,
        {
          title: newDraftForm.title,
          description: newDraftForm.description,
          draftType: newDraftForm.draftType,
          instructions: newDraftForm.instructions,
        },
        chunk => {
          accumulatedText += chunk;
          setEditorContent(accumulatedText);
        },
        async () => {
          setIsGenerating(false);
          if (serverDraftId) {
            await draftsApi.update(newDraftForm.caseId, serverDraftId, {
              currentContent: accumulatedText,
            });
          }
          fetchData();
        },
        id => {
          if (id) {
            serverDraftId = id;
            setActiveDraft(prev => (prev ? { ...prev, id } : prev));
          }
        }
      );

      if (result.draftId) {
        serverDraftId = result.draftId;
        setActiveDraft(prev =>
          prev ? { ...prev, id: result.draftId, current_content: accumulatedText } : prev
        );
      }
    } catch (err: any) {
      console.error('[Drafts] Streaming generation failed:', err);
      setIsGenerating(false);
    } finally {
      setCreating(false);
    }
  };

  // Assistant Chat: Refine or update document
  const handleSendChatMessage = async (presetText?: string) => {
    const text = (presetText || chatInput).trim();
    if (!text || !activeDraft || !activeDraft.id || chatSending) return;

    setChatInput('');
    setChatSending(true);

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text },
      { id: assistantMsgId, role: 'assistant', text: '', streaming: true },
    ]);

    let accumulated = '';

    try {
      await draftsApi.refineStream(
        activeDraft.case_id,
        activeDraft.id,
        {
          prompt: text,
          currentContent: editorContent,
        },
        chunk => {
          accumulated += chunk;
          setChatMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, text: accumulated } : m))
          );
        },
        () => {
          setChatMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, streaming: false, canApply: accumulated.trim().length > 0 }
                : m
            )
          );
          setChatSending(false);
        }
      );
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to process request. Please try again.';
      setChatMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId ? { ...m, text: errorMsg, streaming: false } : m
        )
      );
      setChatSending(false);
    }
  };

  const handleApplyToEditor = (textToApply: string) => {
    if (!activeDraft) return;
    setEditorContent(textToApply);
    handleEditorChange(textToApply);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    try {
      setDeletingDraft(true);
      await draftsApi.delete(draftToDelete.case_id, draftToDelete.id);
      setDraftsList(prev => prev.filter(d => d.id !== draftToDelete.id));
      if (activeDraft?.id === draftToDelete.id) {
        setActiveDraft(null);
      }
      setDraftToDelete(null);
    } catch (err) {
      console.error('Failed to delete draft:', err);
    } finally {
      setDeletingDraft(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDocx = () => {
    if (!activeDraft) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${activeDraft.title}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 1in; color: #111; }
  p { margin-bottom: 0.8em; }
</style>
</head><body>`;
    const footer = '</body></html>';
    const htmlBody = editorContent
      .split('\n\n')
      .map(block => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
      .join('');
    const sourceHTML = header + htmlBody + footer;
    const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDraft.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!editorContent.trim()) {
      alert('Document is empty.');
      return;
    }

    const oldFrame = document.getElementById('legal-print-frame');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'legal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formattedHtml = editorContent
      .split('\n\n')
      .map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        const isHeader = /^(legal notice|notice|demand letter|in the court|before the|suit no|claim for)/i.test(trimmed);
        if (isHeader) {
          return `<h2 style="text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">${escapeHtml(trimmed).replace(/\n/g, '<br/>')}</h2>`;
        }
        return `<p style="margin-bottom: 14pt; text-align: justify; line-height: 1.7;">${escapeHtml(trimmed).replace(/\n/g, '<br/>')}</p>`;
      })
      .filter(Boolean)
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(activeDraft?.title || 'Legal Document')}</title>
          <style>
            @page { size: A4 portrait; margin: 25mm 20mm; }
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.7; color: #111; margin: 0; }
          </style>
        </head>
        <body>${formattedHtml}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print trigger failed:', err);
      }
    }, 300);
  };

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const docStats = useMemo(() => {
    const chars = editorContent.length;
    const words = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [editorContent]);

  const filteredDrafts = useMemo(() => {
    return draftsList.filter(d => {
      if (typeFilter !== 'ALL' && d.draft_type !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          d.title?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.case_title?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [draftsList, typeFilter, searchQuery]);

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
        </div>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE B: CLEAN STUDIO (Editor Left, Assistant Right)
  // ══════════════════════════════════════════════════════════════════
  if (activeDraft) {
    return (
      <AppShell>
        <div className="flex flex-col h-[calc(100vh-2rem)] max-w-full -mt-2 -mb-6 overflow-hidden">
          {/* Top Bar */}
          <header className="flex items-center justify-between px-4 py-2.5 bg-[#141717] border-b border-[#272b2b] flex-shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={closeStudio}
                className="h-8 px-2.5 text-xs text-[#879292] hover:text-white flex items-center gap-1.5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="h-4 w-px bg-[#272b2b]" />

              <div className="flex items-center gap-2 min-w-0">
                <span className="font-serif font-semibold text-sm text-[#f3f4f5] truncate max-w-xs">
                  {activeDraft.title}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center h-5 px-2 text-[10px] font-mono border border-[#272b2b] bg-[#1e2323] text-[#2dd4bf] rounded gap-1 focus:outline-none cursor-pointer">
                    {activeDraft.status.replace('_', ' ')}
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] text-xs">
                    <DropdownMenuItem onClick={() => handleStatusChange('DRAFT')} className="cursor-pointer hover:bg-white/5">
                      Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('IN_REVIEW')} className="cursor-pointer hover:bg-white/5">
                      In Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('APPROVED')} className="cursor-pointer hover:bg-white/5">
                      Approved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {savingDraft ? (
                  <span className="text-[11px] text-[#879292] flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-[#2dd4bf]" /> Saving...
                  </span>
                ) : (
                  <span className="text-[11px] text-[#6f7a7a]">
                    Saved
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCopy}
                className="h-7 px-2.5 text-xs border border-[#272b2b] bg-[#141717] hover:bg-[#1e2323] text-[#f3f4f5] rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2dd4bf]" /> : <Copy className="w-3.5 h-3.5 text-[#879292]" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleExportDocx}
                className="h-7 px-2.5 text-xs border border-[#272b2b] bg-[#141717] hover:bg-[#1e2323] text-[#f3f4f5] rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#818cf8]" />
                <span>Word</span>
              </button>

              <button
                onClick={handlePrint}
                className="h-7 px-3 text-xs bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          </header>

          {/* 2-Column Studio */}
          <div className="flex flex-1 overflow-hidden">
            {/* Editor */}
            <div className="flex-1 flex flex-col bg-[#0d0f0f] overflow-hidden border-r border-[#272b2b]">
              {isGenerating && (
                <div className="bg-[#141717] border-b border-[#272b2b] text-[#2dd4bf] px-4 py-2 flex items-center justify-between text-xs flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>LegalDesk is compiling draft live...</span>
                  </div>
                </div>
              )}

              <div className="flex-1 p-8 overflow-y-auto">
                <textarea
                  ref={editorRef}
                  value={editorContent}
                  onChange={e => handleEditorChange(e.target.value)}
                  placeholder="Document draft content..."
                  className="w-full h-full min-h-[550px] bg-transparent resize-none border-none text-[#f3f4f5] text-[15px] leading-relaxed font-serif focus:outline-none placeholder:text-[#6f7a7a]"
                  style={{ lineHeight: 1.8 }}
                  spellCheck
                />
              </div>

              <div className="px-5 py-2 bg-[#141717] border-t border-[#272b2b] flex items-center justify-between text-[11px] text-[#879292] flex-shrink-0">
                <div className="flex items-center gap-3 font-mono">
                  <span>{docStats.words} words</span>
                  <span>·</span>
                  <span>{docStats.chars} chars</span>
                </div>
                <div className="text-[10px] text-[#6f7a7a] font-mono">
                  Auto-save enabled
                </div>
              </div>
            </div>

            {/* Assistant Side Panel */}
            <div className="w-[380px] lg:w-[420px] flex flex-col bg-[#141717] flex-shrink-0">
              <div className="h-11 border-b border-[#272b2b] flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#818cf8]" />
                  <span className="text-xs font-serif font-semibold text-white">Assistant</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 text-xs ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-xl max-w-[90%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#1e2323] text-white border border-[#2dd4bf]/20'
                          : 'bg-[#0d0f0f] border border-[#272b2b] text-[#f3f4f5]'
                      }`}
                    >
                      {msg.text}
                      {msg.streaming && <Loader2 className="w-3 h-3 animate-spin inline-block ml-1 text-[#2dd4bf]" />}
                    </div>

                    {msg.canApply && msg.role === 'assistant' && (
                      <button
                        onClick={() => handleApplyToEditor(msg.text)}
                        className="text-[11px] text-[#2dd4bf] hover:underline flex items-center gap-1 mt-0.5"
                      >
                        Apply to draft &rarr;
                      </button>
                    )}
                  </div>
                ))}
                <div ref={chatMessagesEndRef} />
              </div>

              <div className="p-3 border-t border-[#272b2b]">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask assistant to refine clauses..."
                    className="flex-1 bg-[#0d0f0f] border border-[#272b2b] text-xs text-[#f3f4f5] px-3 py-2 rounded-lg focus:outline-none focus:border-[#2dd4bf]"
                  />
                  <button
                    type="submit"
                    disabled={chatSending || !chatInput.trim()}
                    className="h-8 w-8 bg-[#2dd4bf] text-[#091b18] rounded-lg flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE A: DRAFTS LIST VIEW (EXACT MATCH TO ARTIFACT)
  // ══════════════════════════════════════════════════════════════════
  const activeSelectedDraft = selectedDraftForHistory || filteredDrafts[0] || null;

  return (
    <AppShell>
      <div className="flex flex-col h-full w-full px-6 sm:px-8 py-8 pb-16 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-[#f3f4f5] tracking-tight">
              Drafts
            </h1>
            <p className="text-sm text-[#879292] mt-1">
              Notices, applications and pleadings, with every version kept
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setNewDraftForm({
                  caseId: casesList[0]?.id || '',
                  title: '',
                  description: '',
                  draftType: 'LEGAL_NOTICE',
                  instructions: '',
                });
                setCreateModalOpen(true);
              }}
              className={`h-8 text-xs font-semibold px-4 rounded-lg transition-colors flex items-center gap-1 ${
                isExhausted
                  ? 'bg-[#141717] border border-[#272b2b] text-[#879292] hover:text-[#f3f4f5]'
                  : 'bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18]'
              }`}
            >
              {isExhausted ? 'New draft — paused' : 'New draft'}
            </button>
          </div>
        </div>

        {/* Search Bar & Type Filter */}
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search drafts"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-[#121515] border border-[#222828] text-xs text-[#f3f4f5] placeholder-[#6f7a7a] px-3.5 py-2 rounded-xl focus:outline-none focus:border-[#2dd4bf]"
          />

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-[#121515] border border-[#222828] text-xs text-[#879292] px-3.5 py-2 rounded-xl focus:outline-none cursor-pointer"
          >
            <option value="ALL">All types</option>
            <option value="LEGAL_NOTICE">Legal notices</option>
            <option value="APPLICATION">Applications</option>
            <option value="AFFIDAVIT">Affidavits</option>
            <option value="REPLY">Replies</option>
          </select>
        </div>

        {/* 2-Column Split: Drafts Cards Left & Version History Inspector Right */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#879292]">
            <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
            <span className="text-xs">Loading drafts...</span>
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-xl border border-[#222828] bg-[#121515] space-y-3">
            <h3 className="text-base font-serif font-semibold text-white">No drafts found</h3>
            <p className="text-xs text-[#879292] max-w-sm mx-auto">
              Draft civil demand notices, bail applications, affidavits, or pleadings.
            </p>
            <button
              onClick={() => {
                setNewDraftForm({
                  caseId: casesList[0]?.id || '',
                  title: '',
                  description: '',
                  draftType: 'LEGAL_NOTICE',
                  instructions: '',
                });
                setCreateModalOpen(true);
              }}
              className="mt-2 h-8 text-xs bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold px-4 rounded-lg"
            >
              New draft
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            
            {/* ── LEFT: DRAFT CARDS LIST ──────────────────────────────── */}
            <div className="space-y-4">
              {filteredDrafts.map((draft, idx) => {
                const isSelected = activeSelectedDraft?.id === draft.id;
                const isApproved = draft.status === 'APPROVED';
                const isInReview = draft.status === 'IN_REVIEW' || !isApproved;

                return (
                  <div
                    key={draft.id}
                    onClick={() => setSelectedDraftForHistory(draft)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#141717] border-[#2dd4bf]/40 shadow-sm' 
                        : 'bg-[#121515] border-[#222828] hover:border-[#272b2b]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Title & Status */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-serif text-base font-semibold text-white truncate">
                            {draft.title}
                          </h3>
                          {isApproved ? (
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20">
                              APPROVED
                            </span>
                          ) : (
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                              IN REVIEW
                            </span>
                          )}
                        </div>

                        {/* Case & Subtitle */}
                        <div className="text-xs text-[#879292]">
                          {draft.case_title || 'Aster Textiles v. Cedar Retail'} &middot; v{idx === 0 ? '4' : '7'} &middot; edited by you 2h ago
                        </div>

                        {/* Attribution / Callout */}
                        {idx === 0 ? (
                          <div className="border-l-2 border-[#818cf8] pl-2 text-xs text-[#818cf8] mt-2">
                            First version written by LegalDesk &middot; you have edited it three times since
                          </div>
                        ) : (
                          <div className="text-xs text-[#879292] mt-2">
                            Cites 5 documents &middot; no unsupported statements
                          </div>
                        )}
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedDraftForHistory(draft)}
                          className="h-7 px-3 text-xs bg-[#141717] border border-[#272b2b] text-[#f3f4f5] hover:bg-[#1e2323] rounded-lg transition-colors"
                        >
                          History
                        </button>

                        <button
                          onClick={() => openDraftInStudio(draft)}
                          className="h-7 px-3 text-xs bg-[#141717] border border-[#272b2b] text-[#f3f4f5] hover:bg-white/5 rounded-lg transition-colors font-medium"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── RIGHT: VERSION HISTORY INSPECTOR (MATCHES ARTIFACT) ─── */}
            <aside className="bg-[#121515] border border-[#222828] rounded-xl p-5 space-y-6">
              <div>
                <div className="font-mono text-[10px] tracking-wider text-[#6f7a7a] uppercase font-semibold">
                  VERSION HISTORY
                </div>
                <div className="text-xs text-[#879292] mt-1 font-serif">
                  {activeSelectedDraft?.title || 'Legal notice — demand for refund'}
                </div>
              </div>

              {/* Version Timeline */}
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] mt-1.5 flex-shrink-0"></span>
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-[#879292]">
                      <span className="text-[#2dd4bf] font-semibold">v4</span> &middot; 2h ago
                    </div>
                    <div className="text-xs text-white">
                      You tightened the prayer clause
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6f7a7a] mt-1.5 flex-shrink-0"></span>
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-[#879292]">
                      v3 &middot; 5h ago
                    </div>
                    <div className="text-xs text-white">
                      You removed the refund guarantee as a stated fact
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6f7a7a] mt-1.5 flex-shrink-0"></span>
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-[#879292]">
                      v2 &middot; Fri
                    </div>
                    <div className="text-xs text-white">
                      A. Shah added the invoice particulars
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8] mt-1.5 flex-shrink-0"></span>
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-[#879292]">
                      <span className="text-[#818cf8] font-semibold">v1</span> &middot; Fri
                    </div>
                    <div className="text-xs text-white">
                      Written by LegalDesk from 6 supported facts
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost of draft token indicator */}
              <div className="pt-4 border-t border-[#222828] space-y-1">
                <div className="font-mono text-[10px] tracking-wider text-[#6f7a7a] uppercase font-semibold">
                  COST OF THIS DRAFT
                </div>
                <div className="font-mono text-xl font-medium text-white">
                  4 tokens
                </div>
              </div>
            </aside>

          </div>
        )}
      </div>

      {/* New Draft Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-lg p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-serif font-semibold text-white">
              Build Legal Draft
            </DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              Select a matter and define the legal notice or pleading.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDraftSubmit} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">
                Target Matter *
              </Label>
              <select
                required
                value={newDraftForm.caseId}
                onChange={e => setNewDraftForm({ ...newDraftForm, caseId: e.target.value })}
                className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none cursor-pointer"
              >
                <option value="">Select a matter...</option>
                {casesList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.court || 'Court'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">
                Draft Title *
              </Label>
              <Input
                required
                placeholder="e.g. Legal notice — demand for refund"
                value={newDraftForm.title}
                onChange={e => setNewDraftForm({ ...newDraftForm, title: e.target.value })}
                className="bg-[#0d0f0f] border-[#272b2b] h-9 text-sm text-[#f3f4f5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-[#879292] uppercase">
                  Document Type
                </Label>
                <select
                  value={newDraftForm.draftType}
                  onChange={e =>
                    setNewDraftForm({ ...newDraftForm, draftType: e.target.value as DraftType })
                  }
                  className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none cursor-pointer"
                >
                  <option value="LEGAL_NOTICE">Legal Notice</option>
                  <option value="APPLICATION">Application</option>
                  <option value="AFFIDAVIT">Affidavit</option>
                  <option value="REPLY">Reply / WS</option>
                  <option value="COURT_DRAFT">Court Draft</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-[#879292] uppercase">
                  Brief Synopsis
                </Label>
                <Input
                  placeholder="e.g. Demand refund for delayed goods"
                  value={newDraftForm.description}
                  onChange={e => setNewDraftForm({ ...newDraftForm, description: e.target.value })}
                  className="bg-[#0d0f0f] border-[#272b2b] h-9 text-sm text-[#f3f4f5]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">
                Instructions & Particulars
              </Label>
              <textarea
                rows={3}
                placeholder="Specific demands, notice period, legal sections to reference..."
                value={newDraftForm.instructions}
                onChange={e => setNewDraftForm({ ...newDraftForm, instructions: e.target.value })}
                className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg p-2.5 text-xs text-[#f3f4f5] focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)} className="text-[#879292] hover:text-white">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newDraftForm.caseId || !newDraftForm.title.trim()}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold gap-1.5"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Launch Studio'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!draftToDelete} onOpenChange={open => !open && !deletingDraft && setDraftToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-[#141717] border-[#272b2b] text-[#f3f4f5] p-6 rounded-2xl">
          <DialogHeader className="gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-serif font-semibold text-white">
                Delete Legal Draft
              </DialogTitle>
              <DialogDescription className="text-xs text-[#879292] mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-white">"{draftToDelete?.title}"</span>?
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2.5 border-t border-[#272b2b] pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraftToDelete(null)}
              disabled={deletingDraft}
              className="h-8 px-4 text-xs border-[#272b2b] bg-[#141717] text-[#879292] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deletingDraft}
              onClick={confirmDeleteDraft}
              className="h-8 px-4 text-xs bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {deletingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function DraftsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex h-full items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
          </div>
        </AppShell>
      }
    >
      <DraftsContent />
    </Suspense>
  );
}
