'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles } from 'lucide-react';
import type { DraftType } from '@/lib/api';

const DRAFT_TYPE_OPTIONS: { value: DraftType; label: string; icon: string }[] = [
  { value: 'LEGAL_NOTICE',   label: 'Legal Notice',     icon: '⚖️' },
  { value: 'APPLICATION',    label: 'Application',      icon: '📋' },
  { value: 'AFFIDAVIT',      label: 'Affidavit',        icon: '📜' },
  { value: 'REPLY',          label: 'Reply',            icon: '↩️' },
  { value: 'EMAIL',          label: 'Email',            icon: '📧' },
  { value: 'WHATSAPP',       label: 'WhatsApp',         icon: '💬' },
  { value: 'COURT_DRAFT',    label: 'Court Draft',      icon: '🏛️' },
  { value: 'CORRESPONDENCE', label: 'Correspondence',   icon: '✉️' },
  { value: 'OTHER',          label: 'Other',            icon: '📄' },
];

interface CreateDraftModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: {
    title: string;
    description: string;
    draftType: DraftType;
    instructions: string;
  }) => Promise<void>;
}

export function CreateDraftModal({ open, onOpenChange, onSubmit }: CreateDraftModalProps) {
  const [form, setForm] = useState({
    title: '',
    draftType: 'LEGAL_NOTICE' as DraftType,
    instructions: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: form.title, description: '', draftType: form.draftType, instructions: form.instructions });
      setForm({ title: '', draftType: 'LEGAL_NOTICE', instructions: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-0 overflow-hidden">
        {/* Compact header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
          <div className="w-6 h-6 rounded-md bg-[#4ADE80]/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3 h-3 text-[#4ADE80]" />
          </div>
          <div>
            <DialogTitle className="text-sm font-semibold text-foreground leading-none">New AI Draft</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
              AI uses the full case context to generate your document.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Title *
            </Label>
            <Input
              required
              autoFocus
              placeholder="e.g. Legal Notice for Recovery of ₹5L"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="bg-[#111111] border-white/10 h-9 text-sm"
            />
          </div>

          {/* Draft Type */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Type *
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {DRAFT_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, draftType: opt.value })}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-medium transition-all text-left
                    ${form.draftType === opt.value
                      ? 'border-[#4ADE80]/40 bg-[#4ADE80]/10 text-[#4ADE80]'
                      : 'border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/15 hover:text-foreground'
                    }`}
                >
                  <span className="text-sm leading-none">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special Instructions — simplified, single field */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Instructions <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
            </Label>
            <textarea
              rows={3}
              placeholder="Any specific demands, amounts, notice period, legal sections to reference..."
              value={form.instructions}
              onChange={e => setForm({ ...form, instructions: e.target.value })}
              className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-white/20 resize-none placeholder:text-muted-foreground/40 leading-relaxed"
            />
          </div>

          <DialogFooter className="pt-1 gap-2">
            <Button type="button" variant="ghost" className="text-xs h-8" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.title.trim()}
              className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold h-8 text-xs gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Generate</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
