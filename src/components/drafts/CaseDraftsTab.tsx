'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Trash2, ChevronRight, Clock } from 'lucide-react';
import { drafts as draftsApi } from '@/lib/api';
import { CreateDraftModal } from './CreateDraftModal';
import { DraftEditorModal } from './DraftEditorModal';
import type { Draft, DraftType } from '@/lib/api';
import { formatDistanceToNow, parseISO } from 'date-fns';

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

const DRAFT_TYPE_ICONS: Record<string, string> = {
  LEGAL_NOTICE: '⚖️', APPLICATION: '📋', AFFIDAVIT: '📜', REPLY: '↩️',
  EMAIL: '📧', WHATSAPP: '💬', COURT_DRAFT: '🏛️', CORRESPONDENCE: '✉️', OTHER: '📄',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  IN_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  APPROVED: 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20',
};

interface CaseDraftsTabProps {
  caseId: string;
}

export function CaseDraftsTab({ caseId }: CaseDraftsTabProps) {
  const [draftsList, setDraftsList] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await draftsApi.list(caseId);
      setDraftsList(res.data || []);
    } catch (err) {
      console.error('[Drafts] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [caseId]);

  const handleCreateDraft = async (formData: {
    title: string;
    description: string;
    draftType: DraftType;
    instructions: string;
  }) => {
    setCreateModalOpen(false);
    setStreamingContent('');
    setIsStreaming(true);

    // Create a temporary draft for the editor while streaming
    const tempDraft: Draft = {
      id: '',
      case_id: caseId,
      title: formData.title,
      description: formData.description || null,
      draft_type: formData.draftType,
      status: 'DRAFT',
      instructions: formData.instructions || null,
      current_content: '',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setActiveDraft(tempDraft);
    setEditorOpen(true);

    let accumulated = '';
    let createdDraftId = '';

    try {
      const result = await draftsApi.generateStream(
        caseId,
        {
          title: formData.title,
          description: formData.description,
          draftType: formData.draftType,
          instructions: formData.instructions,
        },
        (chunk) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
        },
        async () => {
          setIsStreaming(false);
          // Save final content
          if (createdDraftId) {
            await draftsApi.update(caseId, createdDraftId, { currentContent: accumulated });
          }
          // Refresh list and update active draft
          await fetchDrafts();
        }
      );

      createdDraftId = result.draftId;
      // Update activeDraft with real id
      setActiveDraft(prev => prev ? { ...prev, id: createdDraftId, current_content: accumulated } : prev);
    } catch (err: any) {
      console.error('[Drafts] Generation failed:', err);
      setIsStreaming(false);
    }
  };

  const handleOpenDraft = async (draft: Draft) => {
    try {
      // Fetch latest content
      const res = await draftsApi.get(caseId, draft.id);
      setActiveDraft(res.data || draft);
    } catch {
      setActiveDraft(draft);
    }
    setStreamingContent('');
    setIsStreaming(false);
    setEditorOpen(true);
  };

  const handleDeleteDraft = async (draftId: string) => {
    setDeletingId(draftId);
    try {
      await draftsApi.delete(caseId, draftId);
      setDraftsList(prev => prev.filter(d => d.id !== draftId));
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditorClose = (open: boolean) => {
    setEditorOpen(open);
    if (!open) {
      fetchDrafts();
    }
  };

  return (
    <div className="space-y-4 max-w-4xl animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Drafts</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            AI-generated, case-context-aware legal documents for this matter.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="h-8 text-xs bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Add Draft
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 rounded-xl border border-white/5 bg-[#111111] flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#4ADE80]" />
          <span className="text-xs text-muted-foreground">Loading drafts...</span>
        </div>
      ) : draftsList.length === 0 ? (
        /* Empty State */
        <div className="p-12 rounded-xl border border-dashed border-white/8 bg-[#0d0d10] flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#4ADE80]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#4ADE80]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No drafts yet</p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[300px] leading-relaxed">
              Click <strong className="text-foreground/80">+ Add Draft</strong> above — AI will auto-compile case context and generate your document.
            </p>
          </div>
        </div>
      ) : (
        /* Draft List */
        <div className="grid grid-cols-1 gap-2">
          {draftsList.map(draft => (
            <div
              key={draft.id}
              className="group flex items-center gap-4 p-3.5 rounded-xl border border-white/5 bg-[#111116] hover:border-white/10 hover:bg-[#131318] transition-all cursor-pointer"
              onClick={() => handleOpenDraft(draft)}
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-lg flex-shrink-0">
                {DRAFT_TYPE_ICONS[draft.draft_type] ?? '📄'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-foreground truncate">{draft.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/60">
                    {DRAFT_TYPE_LABELS[draft.draft_type] ?? 'Document'}
                  </span>
                  {draft.description && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[10px] text-muted-foreground/50 truncate max-w-[200px]">{draft.description}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="outline" className={`text-[9px] font-mono h-5 ${STATUS_COLORS[draft.status] ?? ''}`}>
                  {draft.status.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(parseISO(draft.updated_at), { addSuffix: true })}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteDraft(draft.id); }}
                  disabled={deletingId === draft.id}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                >
                  {deletingId === draft.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateDraftModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateDraft}
      />

      <DraftEditorModal
        open={editorOpen}
        onOpenChange={handleEditorClose}
        caseId={caseId}
        draft={activeDraft}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
      />
    </div>
  );
}
