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
  History,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronDown,
  RefreshCw,
  X,
  Scale,
  Maximize2,
  Minimize2,
  ExternalLink,
  BookOpen,
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
  DropdownMenuSeparator,
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

interface DraftVersion {
  id: string;
  version_number: number;
  content: string;
  change_type: string;
  prompt_used: string | null;
  created_at: string;
}

function DraftsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();

  // URL parameters
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

  // Studio Mode State (active draft being viewed/edited)
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  // Version History State
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

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

  // Assistant Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Load all data
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

        // Check if initialDraftId is specified in URL
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

  // Handle open new draft modal from URL param
  useEffect(() => {
    if (openNewParam && casesList.length > 0) {
      setNewDraftForm(prev => ({
        ...prev,
        caseId: initialCaseId || casesList[0]?.id || '',
      }));
      setCreateModalOpen(true);
    }
  }, [openNewParam, casesList, initialCaseId]);

  // Open a draft in the Studio Workspace
  const openDraftInStudio = async (draft: Draft) => {
    setActiveDraft(draft);
    setEditorContent(draft.current_content || '');
    setLastSavedTime(draft.updated_at ? new Date(draft.updated_at) : new Date());

    // Initialize Assistant messages for this draft
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `I am your Legal Drafting Assistant for **${draft.title}**. You can instruct me to revise clauses, fill placeholder particulars (like dates, client/deceased names, addresses), adjust compensation amounts, or refine statutory citations.`,
      },
    ]);

    // Fetch full draft details including latest content from server
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

  // Close studio and return to library
  const closeStudio = () => {
    setActiveDraft(null);
    setEditorContent('');
    setChatMessages([]);
    fetchData();
  };

  // Auto-save debounced (2.5 seconds after user stops typing)
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
        console.error('[Drafts] Auto-save error:', err);
      } finally {
        setSavingDraft(false);
      }
    }, 2500);
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

  // Title Update
  const handleTitleChange = async (newTitle: string) => {
    if (!activeDraft || !newTitle.trim()) return;
    try {
      await draftsApi.update(activeDraft.case_id, activeDraft.id, { title: newTitle });
      setActiveDraft(prev => (prev ? { ...prev, title: newTitle } : prev));
      setDraftsList(prev => prev.map(d => (d.id === activeDraft.id ? { ...d, title: newTitle } : d)));
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  // Version Checkpoint
  const handleSaveCheckpoint = async () => {
    if (!activeDraft) return;
    try {
      setSavingDraft(true);
      await draftsApi.update(activeDraft.case_id, activeDraft.id, {
        currentContent: editorContent,
        saveVersion: true,
      });
      setLastSavedTime(new Date());
    } finally {
      setSavingDraft(false);
    }
  };

  // Load Version History
  const handleOpenVersions = async () => {
    if (!activeDraft) return;
    setVersionsModalOpen(true);
    setLoadingVersions(true);
    try {
      const res = await draftsApi.getVersions(activeDraft.case_id, activeDraft.id);
      setVersions(res.data || []);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRevertVersion = async (v: DraftVersion) => {
    setEditorContent(v.content);
    setVersionsModalOpen(false);
    if (activeDraft) {
      await draftsApi.update(activeDraft.case_id, activeDraft.id, {
        currentContent: v.content,
        saveVersion: true,
      });
      setActiveDraft(prev => (prev ? { ...prev, current_content: v.content } : prev));
      setLastSavedTime(new Date());
    }
  };

  // Create New Draft with initial AI streaming
  const handleCreateDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDraftForm.caseId || !newDraftForm.title.trim()) return;

    setCreating(true);
    setCreateModalOpen(false);

    // Switch directly to Studio in generating state
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
        }
      );

      serverDraftId = result.draftId;
      setActiveDraft(prev =>
        prev ? { ...prev, id: serverDraftId, current_content: accumulatedText } : prev
      );
    } catch (err: any) {
      console.error('[Drafts] Streaming generation failed:', err);
      setIsGenerating(false);
    } finally {
      setCreating(false);
    }
  };

  // Chatbot: Send instruction/query to Agent 6aa3f0a03e5db27e9a0661e4
  const handleSendChatMessage = async (presetText?: string) => {
    const text = (presetText || chatInput).trim();
    if (!text || !activeDraft || chatSending) return;

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
      const errorMsg = err?.message || 'Failed to process refinement. Please try again.';
      setChatMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId ? { ...m, text: errorMsg, streaming: false } : m
        )
      );
      setChatSending(false);
    }
  };

  // Apply Assistant message directly to editor
  const handleApplyToEditor = (textToApply: string) => {
    if (!activeDraft) return;
    setEditorContent(textToApply);
    handleEditorChange(textToApply);
    handleSaveCheckpoint();
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

  // Copy to clipboard
  const handleCopy = async () => {
    await navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export as Plain Text (.txt)
  const handleExportTxt = () => {
    if (!activeDraft) return;
    const blob = new Blob([editorContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDraft.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as Word (.doc)
  const handleExportDocx = () => {
    if (!activeDraft) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${activeDraft.title}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 1in; color: #111; }
  p { margin-bottom: 0.8em; }
  h1, h2, h3 { font-family: 'Arial', sans-serif; font-weight: bold; margin-top: 1.2em; margin-bottom: 0.5em; }
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
    window.print();
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Detect bracketed placeholders: [Date], [Accused Name], [Deceased Name], etc.
  const placeholders = useMemo(() => {
    const matches = editorContent.match(/\[([A-Za-z0-9\s/_-]+)\]/g);
    if (!matches) return [];
    return Array.from(new Set(matches));
  }, [editorContent]);

  // Statistics
  const docStats = useMemo(() => {
    const chars = editorContent.length;
    const words = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
    const lines = editorContent ? editorContent.split('\n').length : 0;
    return { chars, words, lines };
  }, [editorContent]);

  // Filtered drafts for library view
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
          d.case_title?.toLowerCase().includes(q) ||
          d.court?.toLowerCase().includes(q) ||
          d.current_content?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [draftsList, selectedCaseFilter, typeFilter, statusFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = draftsList.length;
    const notices = draftsList.filter(d => d.draft_type === 'LEGAL_NOTICE').length;
    const pleadings = draftsList.filter(d =>
      ['APPLICATION', 'AFFIDAVIT', 'REPLY', 'COURT_DRAFT'].includes(d.draft_type)
    ).length;
    const approved = draftsList.filter(d => d.status === 'APPROVED').length;
    return { total, notices, pleadings, approved };
  }, [draftsList]);

  const associatedCase = useMemo(() => {
    if (!activeDraft) return null;
    return casesList.find(c => c.id === activeDraft.case_id) || null;
  }, [activeDraft, casesList]);

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
  // MODE B: DRAFT STUDIO / WORKSPACE
  // ══════════════════════════════════════════════════════════════════
  if (activeDraft) {
    return (
      <AppShell caseId={activeDraft.case_id}>
        {/* Dedicated Print Media Styles */}
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
              margin: 0 !important;
              padding: 2.5cm 2cm !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Times New Roman', Times, serif !important;
              font-size: 12pt !important;
              line-height: 1.6 !important;
              white-space: pre-wrap !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>

        <div className="flex flex-col h-[calc(100vh-2rem)] max-w-full -mt-2 -mb-6 overflow-hidden">
          {/* ── Studio Top Navigation Bar ────────────────────────────── */}
          <header className="flex items-center justify-between px-4 py-2.5 bg-[#111116] border-b border-white/10 flex-shrink-0 z-20">
            {/* Left: Back & Document Metadata */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeStudio}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">All Drafts</span>
              </Button>

              <div className="h-4 w-px bg-white/10" />

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">
                  {DRAFT_TYPE_ICONS[activeDraft.draft_type] ?? '📄'}
                </span>

                <input
                  type="text"
                  value={activeDraft.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="font-semibold text-sm text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[#4ADE80] rounded px-1.5 py-0.5 truncate max-w-[260px] sm:max-w-md"
                  title="Click to rename draft"
                />

                {associatedCase && (
                  <Badge
                    variant="outline"
                    className="hidden md:flex text-[10px] bg-white/5 border-white/10 text-muted-foreground font-normal truncate max-w-[180px]"
                  >
                    {associatedCase.title}
                  </Badge>
                )}
              </div>
            </div>

            {/* Right: Status, Auto-save, History, Export Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Auto-save status */}
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground/60 mr-1">
                {savingDraft ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#4ADE80]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                    <span>
                      Saved {lastSavedTime ? format(lastSavedTime, 'HH:mm') : 'just now'}
                    </span>
                  </>
                )}
              </div>

              {/* Status Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger className={`inline-flex items-center justify-center h-7 px-2.5 text-xs font-mono border rounded-lg gap-1.5 focus:outline-none cursor-pointer ${STATUS_COLORS[activeDraft.status]}`}>
                  {activeDraft.status.replace('_', ' ')}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#16161a] border-white/10 text-foreground text-xs">
                  <DropdownMenuItem onClick={() => handleStatusChange('DRAFT')} className="cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2" /> Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('IN_REVIEW')} className="cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-blue-400 mr-2" /> In Review
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('APPROVED')} className="cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-[#4ADE80] mr-2" /> Approved
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Version History Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenVersions}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                title="Version History & Checkpoints"
              >
                <History className="w-4 h-4" />
              </Button>

              {/* Quick Copy */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2.5 text-xs border-white/10 bg-[#16161a] hover:bg-white/5 text-foreground rounded-lg gap-1.5"
                title="Copy entire document to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </Button>

              {/* Export Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 px-3 text-xs bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium border border-[#4ADE80]/30 rounded-lg gap-1.5 focus:outline-none cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  Export
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#16161a] border-white/10 text-foreground text-xs w-48">
                  <DropdownMenuItem onClick={handlePrint} className="cursor-pointer gap-2 py-2">
                    <Printer className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-medium">Print / Save as PDF</div>
                      <div className="text-[10px] text-muted-foreground">Standard legal print layout</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleExportDocx} className="cursor-pointer gap-2 py-2">
                    <Download className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-medium">Microsoft Word (.doc)</div>
                      <div className="text-[10px] text-muted-foreground">Editable word processor file</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportTxt} className="cursor-pointer gap-2 py-2">
                    <Copy className="w-4 h-4 text-[#4ADE80]" />
                    <div>
                      <div className="font-medium">Plain Text (.txt)</div>
                      <div className="text-[10px] text-muted-foreground">Raw markdown / text file</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Zen Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZenMode(prev => !prev)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg hidden md:flex"
                title={zenMode ? 'Show Assistant Panel' : 'Zen Focus Mode (Hide Assistant)'}
              >
                {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </header>

          {/* ── Studio Main Dual Workspace ───────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            {/* ── Center / Left: Legal Document Editor Canvas ──────────── */}
            <main className="flex-1 flex flex-col bg-[#0b0b0e] overflow-hidden relative">
              {/* Placeholders helper bar (if any detected) */}
              {placeholders.length > 0 && (
                <div className="bg-[#14141a] border-b border-white/5 px-4 py-1.5 flex items-center justify-between text-xs overflow-x-auto flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] font-mono py-0 h-4.5">
                      {placeholders.length} {placeholders.length === 1 ? 'Placeholder' : 'Placeholders'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Particulars to fill in brackets:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5">
                    {placeholders.slice(0, 5).map((ph, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-yellow-300/80 border border-white/5 whitespace-nowrap cursor-default"
                      >
                        {ph}
                      </span>
                    ))}
                    {placeholders.length > 5 && (
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                        +{placeholders.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Generating overlay notice */}
              {isGenerating && (
                <div className="absolute top-4 right-6 z-10 flex items-center gap-2 bg-[#1a231f] border border-[#2D4537] text-[#4ADE80] px-3.5 py-1.5 rounded-full shadow-2xl text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-medium animate-pulse">Streaming AI legal drafting…</span>
                </div>
              )}

              {/* Scrollable Paper Canvas Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
                <div className="w-full max-w-3xl bg-[#141419] border border-white/10 rounded-xl shadow-2xl p-6 sm:p-12 min-h-[750px] flex flex-col">
                  {/* Clean printable element representation */}
                  <textarea
                    ref={editorRef}
                    value={editorContent}
                    onChange={e => handleEditorChange(e.target.value)}
                    placeholder="Document content is being generated or type here to start drafting..."
                    className="w-full flex-1 bg-transparent resize-none border-none text-foreground/95 text-[14px] sm:text-[15px] leading-relaxed font-serif focus:outline-none placeholder:text-muted-foreground/30 min-h-[600px]"
                    style={{
                      fontFamily: "'Merriweather', 'Georgia', 'Times New Roman', serif",
                      lineHeight: 1.75,
                    }}
                    spellCheck
                  />
                  <div id="printable-legal-document" className="hidden">
                    {editorContent}
                  </div>
                </div>
              </div>

              {/* Document Statistics Footer */}
              <footer className="px-5 py-2 bg-[#111116] border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground flex-shrink-0">
                <div className="flex items-center gap-3 font-mono">
                  <span>{docStats.words} words</span>
                  <span>·</span>
                  <span>{docStats.chars} chars</span>
                  <span>·</span>
                  <span>{docStats.lines} lines</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveCheckpoint}
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2"
                  >
                    Save Checkpoint
                  </Button>
                </div>
              </footer>
            </main>

            {/* ── Right Panel: Dedicated Associate AI Drafter Chatbot ───── */}
            {!zenMode && (
              <aside className="w-80 lg:w-96 border-l border-white/10 bg-[#111116] flex flex-col flex-shrink-0">
                {/* Assistant Header */}
                <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#A855F7]/15 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-[#A855F7]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Associate AI</div>
                      <div className="text-[10px] text-muted-foreground">Drafting Agent</div>
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
                          text: `Session reset. How would you like to refine **${activeDraft.title}**?`,
                        },
                      ])
                    }
                    className="w-7 h-7 text-muted-foreground hover:text-foreground"
                    title="Reset Assistant Chat"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Quick Refinement Chips */}
                <div className="p-3 border-b border-white/5 bg-[#141419] space-y-1.5 flex-shrink-0">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                    Quick Refinements
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Fill placeholders with case facts',
                      'Make demand 75 Lakhs',
                      'Add 18% p.a. interest clause',
                      'Strengthen wrongful death legal grounds',
                      'Add strict 15-day notice period',
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={chatSending}
                        onClick={() => handleSendChatMessage(chip)}
                        className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/5 text-muted-foreground hover:text-[#A855F7] hover:border-[#A855F7]/40 hover:bg-[#A855F7]/5 transition-all text-left truncate max-w-full"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {msg.role === 'assistant' ? (
                          <>
                            <Sparkles className="w-3 h-3 text-[#A855F7]" />
                            <span>Associate Drafter</span>
                          </>
                        ) : (
                          <span>You</span>
                        )}
                      </div>

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

                        {/* Apply to Document Button */}
                        {msg.canApply && !msg.streaming && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Revision ready</span>
                            <Button
                              size="sm"
                              onClick={() => handleApplyToEditor(msg.text)}
                              className="h-6 text-[10px] bg-[#A855F7]/20 hover:bg-[#A855F7]/30 text-[#A855F7] border border-[#A855F7]/30 rounded px-2 gap-1 font-semibold"
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

                {/* Assistant Input Bar */}
                <div className="p-3 border-t border-white/10 bg-[#141419] flex-shrink-0">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    className="relative flex items-center"
                  >
                    <Input
                      placeholder="Instruct AI to edit or refine draft..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={chatSending}
                      className="bg-[#0e0e12] border-white/10 text-xs h-9 pr-10 rounded-lg focus-visible:ring-1 focus-visible:ring-[#A855F7]"
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
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
                    Powered by GTWY Drafter Agent &middot; Case Aware
                  </p>
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* ── Version History Modal ──────────────────────────────────── */}
        <Dialog open={versionsModalOpen} onOpenChange={setVersionsModalOpen}>
          <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-[#4ADE80]" />
                Version History
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Restore previous checkpoints and AI refinement snapshots.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[350px] overflow-y-auto my-2 pr-1">
              {loadingVersions ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No previous checkpoints found for this document.
                </div>
              ) : (
                versions.map(v => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-[#111111] border border-white/5 flex items-center justify-between group hover:border-white/15 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-foreground">
                          v{v.version_number}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground">
                          {v.change_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {v.prompt_used && (
                        <p className="text-[11px] text-muted-foreground/80 mt-1 truncate max-w-[260px]">
                          "{v.prompt_used}"
                        </p>
                      )}
                      <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {format(parseISO(v.created_at), 'dd MMM yyyy, HH:mm')}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevertVersion(v)}
                      className="h-7 text-xs border-white/10 text-[#4ADE80] hover:bg-[#4ADE80]/10 gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Revert
                    </Button>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setVersionsModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE A: DRAFTS LIBRARY / EXPLORER VIEW (like Documents & Tools)
  // ══════════════════════════════════════════════════════════════════
  return (
    <AppShell>
      <div className="flex flex-col h-full max-w-6xl mx-auto pb-16 space-y-6 animate-in fade-in duration-200">
        {/* ── Top Header & Actions ─────────────────────────────────── */}
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
              Author, refine, and maintain legal notices, bail applications, affidavits, and court drafts with AI intelligence.
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

        {/* ── Metrics Strip (Clickable Filter Cards) ───────────────── */}
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

        {/* ── Search & Filters Bar ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-border/50 text-xs">
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search drafts by title, instructions, or associated matter..."
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

        {/* ── Drafts Master Table / Feed ───────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-[#4ADE80]" />
            <span className="text-xs">Loading legal drafts...</span>
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-xl border border-white/5 bg-[#111111] my-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1a231f] text-[#4ADE80] flex items-center justify-center mx-auto">
              <FileEdit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No drafts found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Generate civil compensation demand notices, bail applications, affidavits, or pleadings for your cases.
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
            {/* Desktop Table Header */}
            <div className="hidden sm:grid grid-cols-[2.2fr_1fr_1.5fr_100px_90px] gap-4 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase bg-[#16161a] border-b border-white/5">
              <div>Draft & Synopsis</div>
              <div>Type & Status</div>
              <div>Associated Matter</div>
              <div>Updated</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {filteredDrafts.map(draft => (
                <div
                  key={draft.id}
                  onClick={() => openDraftInStudio(draft)}
                  className="p-3.5 hover:bg-white/[0.02] cursor-pointer transition-all flex flex-col sm:grid sm:grid-cols-[2.2fr_1fr_1.5fr_100px_90px] gap-3 sm:gap-4 items-start sm:items-center text-xs"
                >
                  {/* Title & Description */}
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

                  {/* Type & Status */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono border-white/10 bg-[#16161a]">
                      {DRAFT_TYPE_LABELS[draft.draft_type] ?? 'Draft'}
                    </Badge>
                    <Badge variant="outline" className={`text-[9px] font-mono h-4.5 ${STATUS_COLORS[draft.status]}`}>
                      {draft.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Associated Matter */}
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

                  {/* Updated Date */}
                  <div className="text-muted-foreground/70 font-mono text-[11px]">
                    {draft.updated_at ? format(parseISO(draft.updated_at), 'dd MMM yyyy') : '—'}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        openDraftInStudio(draft);
                      }}
                      className="h-7 px-2 text-xs text-[#4ADE80] hover:bg-[#4ADE80]/10"
                      title="Open in Draft Studio"
                    >
                      Studio
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

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={e => {
                        e.stopPropagation();
                        router.push(`/cases/${draft.case_id}`);
                      }}
                      className="w-7 h-7 text-muted-foreground hover:text-[#4ADE80]"
                      title="View Case Brief"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / BUILD DRAFT MODAL ─────────────────────────────── */}
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
