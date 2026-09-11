'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ChevronRight, Clock, FileEdit, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { drafts as draftsApi } from '@/lib/api';
import type { Draft } from '@/lib/api';
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  IN_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  APPROVED: 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20',
};

interface CaseDraftsTabProps {
  caseId: string;
}

export function CaseDraftsTab({ caseId }: CaseDraftsTabProps) {
  const router = useRouter();
  const [draftsList, setDraftsList] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await draftsApi.list(caseId);
      setDraftsList(res.data || []);
    } catch (err) {
      console.error('[CaseDraftsTab] Failed to fetch drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [caseId]);

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    setDeleting(true);
    try {
      await draftsApi.delete(caseId, draftToDelete.id);
      setDraftsList(prev => prev.filter(d => d.id !== draftToDelete.id));
      setDraftToDelete(null);
    } catch (err) {
      console.error('[CaseDraftsTab] Failed to delete draft:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDraft = (draft: Draft) => {
    router.push(`/drafts?caseId=${caseId}&draftId=${draft.id}`);
  };

  const handleCreateNew = () => {
    router.push(`/drafts?caseId=${caseId}&new=true`);
  };

  return (
    <div className="space-y-4 max-w-5xl animate-in fade-in duration-200">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Drafts & Legal Notices</h3>
            <Badge variant="outline" className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] text-[10px] font-normal py-0.5">
              {draftsList.length} {draftsList.length === 1 ? 'Draft' : 'Drafts'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pleadings, notices, affidavits, and legal documents authored and maintained for this case.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCreateNew}
            className="h-8 text-xs bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium border border-[#4ADE80]/30 shadow-none gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Draft
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-16 rounded-xl border border-white/5 bg-[#111116] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#4ADE80]" />
          <span className="text-xs text-muted-foreground">Loading drafts for this matter...</span>
        </div>
      ) : draftsList.length === 0 ? (
        /* Empty State */
        <div className="p-16 rounded-xl border border-dashed border-white/10 bg-[#111116] flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#1a231f] text-[#4ADE80] border border-[#2D4537] flex items-center justify-center">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No drafts created yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
              Draft civil compensation notices, bail applications, affidavits, or pleadings in the Draft Studio.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleCreateNew}
            className="mt-2 h-8 text-xs bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Draft
          </Button>
        </div>
      ) : (
        /* Drafts List */
        <div className="bg-[#111116] border border-white/5 rounded-xl overflow-hidden shadow-xl divide-y divide-white/5">
          {draftsList.map(draft => (
            <div
              key={draft.id}
              onClick={() => handleOpenDraft(draft)}
              className="group flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-all cursor-pointer"
            >
              {/* Draft Icon */}
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-lg flex-shrink-0">
                {DRAFT_TYPE_ICONS[draft.draft_type] ?? '📄'}
              </div>

              {/* Draft Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-[#4ADE80] transition-colors">
                    {draft.title}
                  </p>
                  <Badge variant="outline" className={`text-[10px] font-mono h-4.5 ${STATUS_COLORS[draft.status] ?? ''}`}>
                    {draft.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {DRAFT_TYPE_LABELS[draft.draft_type] ?? 'Document'}
                  </span>
                  {draft.description && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[280px]">{draft.description}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Timestamp & Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(parseISO(draft.updated_at), { addSuffix: true })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDraft(draft);
                  }}
                  className="h-7 px-2 text-xs text-[#4ADE80] hover:bg-[#4ADE80]/10 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </Button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDraftToDelete(draft);
                  }}
                  className="text-muted-foreground hover:text-red-400 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Delete Draft"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      <Dialog open={!!draftToDelete} onOpenChange={open => !open && !deleting && setDraftToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-[#16161a] border-white/10 text-foreground p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="gap-3">
            <div className="w-11 h-11 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Delete Legal Draft
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-foreground">"{draftToDelete?.title}"</span>? This action cannot be undone and all draft history will be permanently deleted.
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2.5 bg-transparent border-t border-white/5 pt-4 -mx-6 -mb-6 px-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraftToDelete(null)}
              disabled={deleting}
              className="h-9 px-4 text-xs border-white/10 hover:bg-white/5 text-foreground rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleting}
              onClick={confirmDeleteDraft}
              className="h-9 px-4 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg gap-1.5 shadow-sm cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Draft</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
