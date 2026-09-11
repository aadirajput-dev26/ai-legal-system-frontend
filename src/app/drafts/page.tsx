'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileEdit,
  Plus,
  Search,
  Loader2,
  Trash2,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Bot,
  Send,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Scale,
  ExternalLink,
  BookOpen,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const DRAFT_TYPE_ICONS: Record<DraftType, string> = {
  LEGAL_NOTICE: '⚖️',
  APPLICATION: '📋',
  AFFIDAVIT: '📜',
  REPLY: '↩️',
  EMAIL: '📧',
  WHATSAPP: '💬',
  COURT_DRAFT: '🏛️',
  CORRESPONDENCE: '✉️',
  OTHER: '📄',
};

const STATUS_COLORS: Record<DraftStatus, string> = {
  DRAFT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  IN_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  APPROVED: 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20',
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

  // URL query params
  const initialCaseId = searchParams.get('caseId') || '';
  const initialDraftId = searchParams.get('draftId') || '';
  const openNewParam = searchParams.get('new') === 'true';

  // Data states
  const [draftsList, setDraftsList] = useState<Draft[]>([]);
  const [casesList, setCasesList] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>(initialCaseId || 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Studio Mode State
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
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

  // Assistant Chatbot State (the ONE and ONLY chatbot in the studio)
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

        // Check if initialDraftId is in URL
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
      setRefreshing(false);
    }
  }, [currentOrg?.id, initialDraftId]);

  useEffect(() => {
    if (currentOrg?.id) {
      fetchData();
    }
  }, [currentOrg?.id, fetchData]);

  // Handle open new draft from URL
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
    setLastSavedTime(draft.updated_at ? new Date(draft.updated_at) : new Date());

    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `I'm your Legal Drafting Assistant for **${draft.title}**. You can ask me to revise clauses, fill placeholder particulars (e.g. names, dates, addresses), update demands, or strengthen statutory grounds.`,
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
        setLastSavedTime(new Date());
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
    if (!text || !activeDraft || !activeDraft.id || chatSending) {
      if (!activeDraft?.id) {
        console.warn('Draft ID not set yet, please wait for draft creation to finish.');
      }
      return;
    }

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

  // Apply response to document editor
  const handleApplyToEditor = (textToApply: string) => {
    if (!activeDraft) return;
    setEditorContent(textToApply);
    handleEditorChange(textToApply);
  };

  // Delete Draft
  const handleDeleteDraft = async (draft: Draft) => {
    if (!confirm(`Are you sure you want to delete "${draft.title}"?`)) return;
    try {
      await draftsApi.delete(draft.case_id, draft.id);
      setDraftsList(prev => prev.filter(d => d.id !== draft.id));
      if (activeDraft?.id === draft.id) {
        setActiveDraft(null);
      }
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  };

  // Copy document
  const handleCopy = async () => {
    await navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export as Word (.doc)
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

  // Print / PDF Export
  const handlePrint = () => {
    if (!editorContent.trim()) {
      alert('Document is empty. Nothing to print.');
      return;
    }

    // Remove any previous print iframe
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
          return `<h2 style="text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.5px;">${escapeHtml(trimmed).replace(/\n/g, '<br/>')}</h2>`;
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
            @page {
              size: A4 portrait;
              margin: 25mm 20mm 25mm 20mm;
            }
            body {
              font-family: 'Times New Roman', Times, Georgia, serif;
              font-size: 12pt;
              line-height: 1.7;
              color: #111111;
              background: #ffffff;
              margin: 0;
              padding: 0;
            }
            p, h2 {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${formattedHtml}
        </body>
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
      if (selectedCaseFilter !== 'ALL' && d.case_id !== selectedCaseFilter) return false;
      if (typeFilter !== 'ALL' && d.draft_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

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
  }, [draftsList, selectedCaseFilter, typeFilter, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const total = draftsList.length;
    const notices = draftsList.filter(d => d.draft_type === 'LEGAL_NOTICE').length;
    const pleadings = draftsList.filter(d =>
      ['APPLICATION', 'AFFIDAVIT', 'REPLY', 'COURT_DRAFT'].includes(d.draft_type)
    ).length;
    const approved = draftsList.filter(d => d.status === 'APPROVED').length;
    return { total, notices, pleadings, approved };
  }, [draftsList]);

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE B: CLEAN 2-PANEL STUDIO (Editor on Left, Chatbot on Right)
  // ══════════════════════════════════════════════════════════════════
  if (activeDraft) {
    return (
      // CRITICAL: Notice we do NOT pass caseId to AppShell!
      // This ensures the AppShell's global Associate AI sidebar does NOT open,
      // leaving ONLY our dedicated drafting chatbot on screen!
      <AppShell>
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-legal-document, #printable-legal-document * {
              visibility: visible !important;
            }
            #printable-legal-document {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 2cm !important;
              background: #fff !important;
              color: #000 !important;
              font-family: 'Times New Roman', serif !important;
              font-size: 12pt !important;
              line-height: 1.6 !important;
              white-space: pre-wrap !important;
            }
          }
        `}</style>

        <div className="flex flex-col h-[calc(100vh-2rem)] max-w-full -mt-2 -mb-6 overflow-hidden">
          {/* ── Top Bar: Clean, Minimal with Clear Export Options ── */}
          <header className="flex items-center justify-between px-4 py-2.5 bg-[#111116] border-b border-white/10 flex-shrink-0 z-10">
            {/* Left: Back, Title, Status */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeStudio}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>

              <div className="h-4 w-px bg-white/10" />

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">
                  {DRAFT_TYPE_ICONS[activeDraft.draft_type] ?? '📄'}
                </span>
                <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-xs">
                  {activeDraft.title}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger className={`inline-flex items-center justify-center h-6 px-2 text-[11px] font-mono border rounded-md gap-1 focus:outline-none cursor-pointer ${STATUS_COLORS[activeDraft.status]}`}>
                    {activeDraft.status.replace('_', ' ')}
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-[#16161a] border-white/10 text-foreground text-xs">
                    <DropdownMenuItem onClick={() => handleStatusChange('DRAFT')} className="cursor-pointer">
                      Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('IN_REVIEW')} className="cursor-pointer">
                      In Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('APPROVED')} className="cursor-pointer">
                      Approved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {savingDraft ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 hidden sm:inline-flex">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-[#4ADE80]" /> Saving...
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/50 hidden sm:inline">
                    Saved
                  </span>
                )}
              </div>
            </div>

            {/* Right: Clear, Prominent Export Options */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Copy Document */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2.5 text-xs border-white/10 bg-[#16161a] hover:bg-white/5 text-foreground rounded-lg gap-1.5"
                title="Copy full draft text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>

              {/* Word Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDocx}
                className="h-8 px-2.5 text-xs border-white/10 bg-[#16161a] hover:bg-white/5 text-foreground rounded-lg gap-1.5"
                title="Download Microsoft Word document (.doc)"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Word</span>
              </Button>

              {/* Print / PDF Export */}
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 px-3 text-xs bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium border border-[#4ADE80]/30 rounded-lg gap-1.5"
                title="Print or export as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </Button>
            </div>
          </header>

          {/* ── 2-Column Split: Editor (Left) & Chatbot (Right) ───── */}
          <div className="flex flex-1 overflow-hidden">
            {/* ── LEFT COLUMN: Clean Document Editor ─────────────── */}
            <div className="flex-1 flex flex-col bg-[#0e0e12] overflow-hidden border-r border-white/10">
              {isGenerating && (
                <div className="bg-[#1a231f] border-b border-[#2D4537] text-[#4ADE80] px-4 py-2 flex items-center justify-between text-xs flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI is drafting your document live...</span>
                  </div>
                  <span className="text-[10px] text-[#4ADE80]/70">Agent: 6aa3f0a03e5db27e9a0661e4</span>
                </div>
              )}

              {/* Document Textarea */}
              <div className="flex-1 p-6 overflow-y-auto">
                <textarea
                  ref={editorRef}
                  value={editorContent}
                  onChange={e => handleEditorChange(e.target.value)}
                  placeholder="Document draft will appear here, or start typing directly..."
                  className="w-full h-full min-h-[550px] bg-transparent resize-none border-none text-foreground text-[14px] sm:text-[15px] leading-relaxed font-serif focus:outline-none placeholder:text-muted-foreground/30"
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    lineHeight: 1.8,
                  }}
                  spellCheck
                />
                <div id="printable-legal-document" className="hidden print:block whitespace-pre-wrap font-serif text-black bg-white p-8">
                  {editorContent}
                </div>
              </div>

              {/* Clean Footer Bar */}
              <div className="px-5 py-2 bg-[#111116] border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground flex-shrink-0">
                <div className="flex items-center gap-3 font-mono">
                  <span>{docStats.words} words</span>
                  <span>·</span>
                  <span>{docStats.chars} chars</span>
                </div>
                <div className="text-[10px] text-muted-foreground/50">
                  Auto-save enabled
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Single AI Drafter Chatbot ────────── */}
            <div className="w-[380px] lg:w-[440px] flex flex-col bg-[#111116] flex-shrink-0">
              {/* Chat Header */}
              <div className="h-11 border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0 bg-[#141419]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#A855F7]/15 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-[#A855F7]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground">AI Drafter</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">Edit with Assistant</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setChatMessages([
                      {
                        id: Date.now().toString(),
                        role: 'assistant',
                        text: `Chat reset. What would you like to update in this draft?`,
                      },
                    ])
                  }
                  className="w-7 h-7 text-muted-foreground hover:text-foreground"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="p-2.5 border-b border-white/5 bg-[#121217] flex flex-wrap gap-1 flex-shrink-0">
                {[
                  'Fill in the placeholders',
                  'Demand Rs 75 Lakhs compensation',
                  'Add 18% interest clause',
                  'Strengthen wrongful death grounds',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={chatSending}
                    onClick={() => handleSendChatMessage(chip)}
                    className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/5 text-muted-foreground hover:text-[#A855F7] hover:border-[#A855F7]/40 hover:bg-[#A855F7]/5 transition-all text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </span>

                    <div
                      className={`p-3 rounded-xl max-w-[95%] leading-relaxed font-sans ${
                        msg.role === 'user'
                          ? 'bg-[#1a231f] text-[#4ADE80] border border-[#2D4537]'
                          : 'bg-[#16161c] text-foreground/90 border border-white/10'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-[#A855F7] ml-1 animate-pulse align-middle" />
                      )}

                      {/* 1-Click Apply to Document Button */}
                      {msg.canApply && !msg.streaming && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Revision generated</span>
                          <Button
                            size="sm"
                            onClick={() => handleApplyToEditor(msg.text)}
                            className="h-6 text-[10px] bg-[#A855F7] hover:bg-[#9333ea] text-white rounded px-2.5 gap-1 font-semibold shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Apply to Editor
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Message Input Box */}
              <div className="p-3 border-t border-white/10 bg-[#141419] flex-shrink-0">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="relative flex items-center"
                >
                  <Input
                    placeholder="Tell AI how to edit this draft..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    disabled={chatSending}
                    className="bg-[#0e0e12] border-white/10 text-xs h-9 pr-9 rounded-lg focus-visible:ring-1 focus-visible:ring-[#A855F7]"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!chatInput.trim() || chatSending}
                    className="absolute right-1 w-7 h-7 rounded-md bg-[#A855F7] hover:bg-[#9333ea] text-white"
                  >
                    {chatSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE A: DRAFTS LIBRARY VIEW (like Documents & Tools)
  // ══════════════════════════════════════════════════════════════════
  return (
    <AppShell>
      <div className="flex flex-col h-full max-w-6xl mx-auto pb-16 space-y-6 animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-foreground">
                Drafts & Legal Documents
              </h1>
              <Badge
                variant="outline"
                className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] text-xs font-normal py-0.5"
              >
                <Sparkles className="w-3 h-3 mr-1 text-[#4ADE80]" />
                AI Drafter
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Create, edit, and export legal notices, petitions, and pleadings with case intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRefreshing(true);
                fetchData();
              }}
              disabled={refreshing}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Refresh Drafts"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
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
              className="h-9 bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium rounded-lg border border-[#4ADE80]/30 shadow-none text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Draft
            </Button>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div
            onClick={() => {
              setTypeFilter('ALL');
              setStatusFilter('ALL');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              typeFilter === 'ALL' && statusFilter === 'ALL'
                ? 'bg-[#1a231f] border-[#2D4537] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Total Drafts
              </div>
              <div className="text-xl font-bold font-heading text-foreground mt-0.5">
                {metrics.total}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center">
              <FileEdit className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => {
              setTypeFilter('LEGAL_NOTICE');
              setStatusFilter('ALL');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              typeFilter === 'LEGAL_NOTICE'
                ? 'bg-[#1a231f] border-[#2D4537] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Legal Notices
              </div>
              <div className="text-xl font-bold font-heading text-[#4ADE80] mt-0.5">
                {metrics.notices}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 text-[#4ADE80] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => {
              setTypeFilter('APPLICATION');
              setStatusFilter('ALL');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              typeFilter === 'APPLICATION'
                ? 'bg-[#1f1624] border-purple-500/40 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Court Pleadings
              </div>
              <div className="text-xl font-bold font-heading text-purple-400 mt-0.5">
                {metrics.pleadings}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => {
              setStatusFilter('APPROVED');
              setTypeFilter('ALL');
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              statusFilter === 'APPROVED'
                ? 'bg-[#131b26] border-blue-500/40 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Approved
              </div>
              <div className="text-xl font-bold font-heading text-blue-400 mt-0.5">
                {metrics.approved}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search & Matter Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-border/50 text-xs">
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search drafts by title, synopsis, or case name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border-white/10 pl-9 pr-4 h-9 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#4ADE80]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Matter:</span>
            <select
              value={selectedCaseFilter}
              onChange={e => setSelectedCaseFilter(e.target.value)}
              className="bg-[#111111] border border-white/10 rounded-xl h-9 px-3 text-xs text-foreground focus:outline-none cursor-pointer min-w-[170px] max-w-[240px] truncate"
            >
              <option value="ALL" className="bg-[#16161a]">All Matters</option>
              {casesList.map(c => (
                <option key={c.id} value={c.id} className="bg-[#16161a]">
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drafts List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-[#4ADE80]" />
            <span className="text-xs">Loading drafts...</span>
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-xl border border-white/5 bg-[#111111] my-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1a231f] text-[#4ADE80] flex items-center justify-center mx-auto">
              <FileEdit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No drafts found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create civil compensation notices, bail applications, affidavits, or pleadings.
            </p>
            <Button
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
              className="mt-2 h-8 text-xs bg-[#4ADE80] text-black font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create First Draft
            </Button>
          </div>
        ) : (
          <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <div className="hidden sm:grid grid-cols-[2.2fr_1fr_1.5fr_100px_90px] gap-4 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase bg-[#16161a] border-b border-white/5">
              <div>Draft & Synopsis</div>
              <div>Type & Status</div>
              <div>Associated Matter</div>
              <div>Updated</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {filteredDrafts.map(draft => (
                <div
                  key={draft.id}
                  onClick={() => openDraftInStudio(draft)}
                  className="p-3.5 hover:bg-white/[0.02] cursor-pointer transition-all flex flex-col sm:grid sm:grid-cols-[2.2fr_1fr_1.5fr_100px_90px] gap-3 sm:gap-4 items-start sm:items-center text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-[#16161a] border border-white/5 flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                      {DRAFT_TYPE_ICONS[draft.draft_type] ?? '📄'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground text-sm truncate hover:text-[#4ADE80] transition-colors">
                        {draft.title}
                      </div>
                      {draft.description && (
                        <div className="text-muted-foreground/80 truncate text-[11px] mt-0.5">
                          {draft.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono border-white/10 bg-[#16161a]">
                      {DRAFT_TYPE_LABELS[draft.draft_type] ?? 'Draft'}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] font-mono h-4.5 ${STATUS_COLORS[draft.status]}`}>
                      {draft.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="min-w-0">
                    {draft.case_title ? (
                      <div className="truncate">
                        <span className="font-medium text-foreground">{draft.case_title}</span>
                        {draft.court && (
                          <span className="text-muted-foreground text-[11px] block truncate mt-0.5">
                            {draft.court}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">Case record</span>
                    )}
                  </div>

                  <div className="text-muted-foreground/70 font-mono text-[11px]">
                    {draft.updated_at ? format(parseISO(draft.updated_at), 'dd MMM yyyy') : '—'}
                  </div>

                  <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        openDraftInStudio(draft);
                      }}
                      className="h-7 px-2 text-xs text-[#4ADE80] hover:bg-[#4ADE80]/10"
                    >
                      Open
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteDraft(draft);
                      }}
                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                      title="Delete Draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Draft Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-heading font-semibold flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#4ADE80]" />
              Build Legal Draft
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a matter and define the legal notice or pleading. The AI drafter will compile case facts and generate the initial document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDraftSubmit} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Target Matter *
              </Label>
              <select
                required
                value={newDraftForm.caseId}
                onChange={e => setNewDraftForm({ ...newDraftForm, caseId: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
              >
                <option value="">Select a matter...</option>
                {casesList.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#16161a]">
                    {c.title} ({c.court || 'Court'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Draft Title *
              </Label>
              <Input
                required
                placeholder="e.g. Civil compensation demand notice for wrongful death"
                value={newDraftForm.title}
                onChange={e => setNewDraftForm({ ...newDraftForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Document Type
                </Label>
                <select
                  value={newDraftForm.draftType}
                  onChange={e =>
                    setNewDraftForm({ ...newDraftForm, draftType: e.target.value as DraftType })
                  }
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="LEGAL_NOTICE">Legal Notice</option>
                  <option value="APPLICATION">Application</option>
                  <option value="AFFIDAVIT">Affidavit</option>
                  <option value="REPLY">Reply / Written Statement</option>
                  <option value="COURT_DRAFT">Court Draft</option>
                  <option value="EMAIL">Formal Legal Email</option>
                  <option value="OTHER">General Document</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Brief Synopsis
                </Label>
                <Input
                  placeholder="e.g. Wrongful death compensation notice"
                  value={newDraftForm.description}
                  onChange={e => setNewDraftForm({ ...newDraftForm, description: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Drafting Instructions & Particulars
              </Label>
              <textarea
                rows={3}
                placeholder="e.g. Issue formal civil compensation notice demanding Rs 50,00,000 for wrongful death within 15 days. Include placeholder fields for client name, accused name, date, and location."
                value={newDraftForm.instructions}
                onChange={e => setNewDraftForm({ ...newDraftForm, instructions: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newDraftForm.caseId || !newDraftForm.title.trim()}
                className="bg-[#4ADE80] text-black font-semibold gap-1.5"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Launching Studio...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Launch Studio & Draft
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
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
            <Loader2 className="w-8 h-8 animate-spin text-[#4ADE80]" />
          </div>
        </AppShell>
      }
    >
      <DraftsContent />
    </Suspense>
  );
}
