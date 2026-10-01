'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles, Check } from 'lucide-react';
import type { DraftType } from '@/lib/api';
import { useBilling } from '@/lib/billing-context';
import { useRouter } from 'next/navigation';
import { LEGAL_DRAFT_LIBRARY } from '@/lib/draft-types';

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
    draftType: '',
    instructions: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isExhausted } = useBilling();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.draftType) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: form.title, description: '', draftType: form.draftType, instructions: form.instructions });
      setForm({ title: '', draftType: '', instructions: '' });
      setSearchTerm('');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLibrary = LEGAL_DRAFT_LIBRARY.map(cat => ({
    ...cat,
    options: cat.options.filter(opt => 
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      cat.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.options.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Compact header */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5 flex-shrink-0">
          <div className="w-8 h-8 rounded-md bg-[#4ADE80]/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[#4ADE80]" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-foreground leading-none">New Legal Draft</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5">
              AI uses the full case facts, context, and legal formatting to generate your document.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                Document Title *
              </Label>
              <Input
                required
                autoFocus
                placeholder="e.g. Legal Notice for Recovery of ₹5L"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-10 text-sm"
              />
            </div>

            {/* Draft Type Library */}
            <div className="space-y-3 flex flex-col h-[300px]">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  Select Draft Type *
                </Label>
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-[#111111] border-white/10 h-8 text-xs w-48"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto bg-[#111111] border border-white/10 rounded-lg p-3 space-y-4">
                {filteredLibrary.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">No templates found matching "{searchTerm}"</div>
                ) : (
                  filteredLibrary.map(cat => (
                    <div key={cat.category}>
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground">
                        <span>{cat.icon}</span> {cat.category}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.options.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, draftType: opt.value })}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left group
                              ${form.draftType === opt.value
                                ? 'border-[#4ADE80]/50 bg-[#4ADE80]/10 text-[#4ADE80]'
                                : 'border-white/5 bg-white/[0.02] text-foreground hover:border-white/15 hover:bg-white/[0.04]'
                              }`}
                          >
                            <span className="truncate pr-2">{opt.label}</span>
                            {form.draftType === opt.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                Additional Instructions <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
              </Label>
              <textarea
                rows={3}
                placeholder="Any specific demands, amounts, notice period, legal sections to reference..."
                value={form.instructions}
                onChange={e => setForm({ ...form, instructions: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-white/20 resize-none placeholder:text-muted-foreground/40 leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-white/5 bg-[#16161a] flex-shrink-0 gap-2">
            <Button type="button" variant="ghost" className="text-sm h-9" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isExhausted ? (
              <Button
                type="button"
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold h-9 text-sm px-4"
                onClick={() => router.push('/billing')}
              >
                AI Paused. Top Up
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting || !form.title.trim() || !form.draftType}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold h-9 text-sm gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Draft</>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
