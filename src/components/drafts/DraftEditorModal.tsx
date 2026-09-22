'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Sparkles, Copy, Check, Download,
  RotateCcw, ChevronDown, X, Wand2, FileText, Clock
} from 'lucide-react';
import { drafts as draftsApi } from '@/lib/api';
import type { Draft, DraftStatus } from '@/lib/api';
import { useBilling } from '@/lib/billing-context';
import { useRouter } from 'next/navigation';

interface DraftVersion {
  id: string;
  version_number: number;
  content: string;
  change_type: 'AI_GENERATION' | 'AI_REFINEMENT' | 'MANUAL_SAVE';
  prompt_used: string | null;
  created_at: string;
}

const DRAFT_TYPE_LABELS: Record<string, string> = {
  LEGAL_NOTICE: 'Legal Notice',
  APPLICATION: 'Application',
  AFFIDAVIT: 'Affidavit',
  REPLY: 'Reply',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  COURT_DRAFT: 'Court Draft',
  CORRESPONDENCE: 'Correspondence',
  OTHER: 'Document',
};

const STATUS_COLORS: Record<DraftStatus, string> = {
  DRAFT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  IN_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  APPROVED: 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20',
};

interface DraftEditorModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: string;
  draft: Draft | null;
  streamingContent?: string;
  isStreaming?: boolean;
}

export function DraftEditorModal({
  open,
  onOpenChange,
  caseId,
  draft: initialDraft,
  streamingContent = '',
  isStreaming = false,
}: DraftEditorModalProps) {
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<DraftStatus | null>(null);
  
  const { isExhausted } = useBilling();
  const router = useRouter();

  // AI Refinement Prompt
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineContent, setRefineContent] = useState('');

  // Version History
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft on open
  useEffect(() => {
    if (open && initialDraft) {
      setDraft(initialDraft);
      setContent(initialDraft.current_content || '');
      setRefineContent('');
      setRefinePrompt('');
      setShowVersions(false);
    }
  }, [open, initialDraft]);

  // Fill streaming content as it arrives
  useEffect(() => {
    if (isStreaming) {
      setContent(streamingContent);
    }
  }, [streamingContent, isStreaming]);

  // Auto-save manual edits (debounced 3s)
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!draft) return;
      try {
        setSaving(true);
        await draftsApi.update(caseId, draft.id, { currentContent: value });
        setDraft(prev => prev ? { ...prev, current_content: value } : prev);
      } catch (err) {
        console.error('[DraftEditor] Auto-save failed:', err);
      } finally {
        setSaving(false);
      }
    }, 3000);
  }, [caseId, draft]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (status: DraftStatus) => {
    if (!draft) return;
    setSavingStatus(status);
    try {
      const res = await draftsApi.update(caseId, draft.id, { currentContent: content, status });
      if (res.success) setDraft(prev => prev ? { ...prev, status } : prev);
    } finally {
      setSavingStatus(null);
    }
  };

  const handleManualSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await draftsApi.update(caseId, draft.id, { currentContent: content, saveVersion: true });
    } finally {
      setSaving(false);
    }
  };

  const handleAiRefine = async () => {
    if (!draft || !refinePrompt.trim() || refining) return;
    setRefining(true);
    setRefineContent('');
    let accumulated = '';

    try {
      await draftsApi.refineStream(
        caseId,
        draft.id,
        { prompt: refinePrompt, currentContent: content },
        (chunk) => { accumulated += chunk; setRefineContent(accumulated); },
        () => {
          setContent(accumulated);
          setRefineContent('');
          setRefinePrompt('');
          setRefining(false);
          draftsApi.update(caseId, draft.id, { currentContent: accumulated });
        }
      );
    } catch (err: any) {
      console.error('[DraftEditor] Refinement failed:', err);
      setRefining(false);
    }
  };

  const loadVersions = async () => {
    if (!draft) return;
    setLoadingVersions(true);
    try {
      const res = await draftsApi.getVersions(caseId, draft.id);
      setVersions(res.data || []);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRevertVersion = async (v: DraftVersion) => {
    setContent(v.content);
    setShowVersions(false);
    if (draft) {
      await draftsApi.update(caseId, draft.id, { currentContent: v.content, saveVersion: true });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft?.title || 'draft'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayContent = refining ? refineContent || content : content;
  const currentStatus = draft?.status ?? 'DRAFT';
  const typeLabel = DRAFT_TYPE_LABELS[draft?.draft_type ?? 'OTHER'] ?? 'Document';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f13] border-white/8 text-foreground max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#111116] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#4ADE80]/15 flex items-center justify-center flex-shrink-0">
              <FileText className="w-3.5 h-3.5 text-[#4ADE80]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-[300px]">{draft?.title}</p>
              <p className="text-[10px] text-muted-foreground">{typeLabel}</p>
            </div>
            <Badge variant="outline" className={`text-[10px] font-mono ml-1 flex-shrink-0 ${STATUS_COLORS[currentStatus]}`}>
              {currentStatus}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Dropdown */}
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] border-white/10 bg-transparent hover:bg-white/5 gap-1"
                disabled={!!savingStatus}
              >
                {savingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Status'}
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
              <div className="absolute right-0 top-8 z-50 hidden group-hover:flex flex-col bg-[#1a1a22] border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[130px]">
                {(['DRAFT', 'IN_REVIEW', 'APPROVED'] as DraftStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`text-[11px] px-3 py-2 text-left hover:bg-white/5 transition-colors ${s === currentStatus ? 'text-[#4ADE80]' : 'text-muted-foreground'}`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Version History */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-white/10 bg-transparent hover:bg-white/5 gap-1"
              onClick={() => { setShowVersions(v => !v); if (!showVersions) loadVersions(); }}
            >
              <Clock className="w-3 h-3" />
              History
            </Button>

            {/* Copy */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-white/10 bg-transparent hover:bg-white/5 gap-1"
              onClick={handleCopy}
            >
              {copied ? <><Check className="w-3 h-3 text-[#4ADE80]" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </Button>

            {/* Download */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-white/10 bg-transparent hover:bg-white/5 gap-1"
              onClick={handleDownload}
            >
              <Download className="w-3 h-3" />
              Export
            </Button>

            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: Editor + Sidebar ───────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {(isStreaming || refining) && (
              <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 bg-[#4ADE80]/10 border border-[#4ADE80]/20 rounded-full px-3 py-1">
                <Loader2 className="w-3 h-3 animate-spin text-[#4ADE80]" />
                <span className="text-[10px] font-semibold text-[#4ADE80]">
                  {isStreaming ? 'Generating...' : 'Refining...'}
                </span>
              </div>
            )}

            <textarea
              ref={editorRef}
              value={displayContent}
              onChange={e => handleContentChange(e.target.value)}
              disabled={isStreaming || refining}
              placeholder="AI draft will appear here..."
              spellCheck
              className="flex-1 w-full bg-transparent resize-none p-6 text-sm text-foreground leading-7 font-mono focus:outline-none placeholder:text-muted-foreground/30 overflow-y-auto"
              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
            />

            {/* Save indicator */}
            <div className="px-5 py-2 border-t border-white/5 bg-[#0d0d10] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                {saving ? (
                  <><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Saving...</span></>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">Auto-save enabled · {content.length} chars</span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] border-white/10 bg-transparent hover:bg-white/5 gap-1"
                onClick={handleManualSave}
                disabled={saving || isStreaming}
              >
                Save Checkpoint
              </Button>
            </div>
          </div>

          {/* ── Right: Version History or AI Copilot Panel ─── */}
          <div className="w-72 border-l border-white/5 bg-[#0d0d11] flex flex-col flex-shrink-0">

            {showVersions ? (
              /* Version History Panel */
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Version History</span>
                  <button onClick={() => setShowVersions(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {loadingVersions ? (
                    <div className="flex justify-center pt-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[11px] text-muted-foreground">No saved versions yet.</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Versions are created on AI refinements and manual checkpoints.</p>
                    </div>
                  ) : (
                    versions.map(v => (
                      <div key={v.id} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-muted-foreground">v{v.version_number}</span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-white/10 text-muted-foreground">
                            {v.change_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {v.prompt_used && (
                          <p className="text-[10px] text-foreground/70 leading-relaxed truncate mb-1.5">
                            "{v.prompt_used}"
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground/60">
                            {new Date(v.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleRevertVersion(v)}
                            className="text-[10px] text-[#4ADE80] font-semibold opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity"
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> Revert
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* AI Copilot Panel */
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 text-[#A855F7]" />
                    <span className="text-[11px] font-bold text-[#A855F7] uppercase tracking-wide">AI Copilot</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Refine your draft with AI instructions</p>
                </div>

                {/* Quick Actions */}
                <div className="p-3 space-y-1.5 border-b border-white/5">
                  <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wide mb-2">Quick Actions</p>
                  {[
                    { label: 'Make formal legal tone', icon: '⚖️' },
                    { label: 'Add statutory provisions', icon: '📖' },
                    { label: 'Strengthen legal grounds', icon: '💪' },
                    { label: 'Add demand and notice period', icon: '📅' },
                    { label: 'Make more concise', icon: '✂️' },
                    { label: 'Add relief/prayer section', icon: '🙏' },
                  ].map(action => (
                    <button
                      key={action.label}
                      type="button"
                      disabled={refining || isStreaming || isExhausted}
                      onClick={() => setRefinePrompt(action.label)}
                      className="w-full text-left text-[11px] px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-[#A855F7]/30 hover:bg-[#A855F7]/5 text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Custom Prompt */}
                <div className="flex-1 p-3 flex flex-col gap-2">
                  <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wide">Custom Instruction</p>
                  <textarea
                    rows={5}
                    placeholder={isExhausted ? "AI features paused. Please add funds." : "e.g. Add Section 138 Negotiable Instruments Act clause and demand cheque dishonor compensation..."}
                    value={refinePrompt}
                    onChange={e => setRefinePrompt(e.target.value)}
                    disabled={refining || isStreaming || isExhausted}
                    className="flex-1 w-full bg-[#111116] border border-white/8 rounded-lg p-2.5 text-[11px] text-foreground focus:outline-none focus:border-[#A855F7]/30 resize-none placeholder:text-muted-foreground/30 leading-relaxed disabled:opacity-40"
                  />
                  {isExhausted ? (
                    <Button
                      className="w-full bg-destructive/20 text-destructive border border-destructive/30 hover:border-destructive hover:bg-destructive/30 text-xs font-semibold gap-1.5 h-8"
                      variant="outline"
                      onClick={() => router.push('/billing')}
                    >
                      AI Paused. Top Up
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-[#A855F7]/20 hover:bg-[#A855F7]/30 text-[#A855F7] border border-[#A855F7]/30 hover:border-[#A855F7]/50 text-xs font-semibold gap-1.5 h-8"
                      variant="outline"
                      disabled={refining || isStreaming || !refinePrompt.trim()}
                      onClick={handleAiRefine}
                    >
                      {refining ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refining...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Apply Refinement</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
