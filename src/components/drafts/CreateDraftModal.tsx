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
      <DialogContent className="max-w-2xl bg-card border border-border text-foreground p-0 overflow-hidden flex flex-col max-h-[85vh] rounded-2xl shadow-2xl font-sans">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <DialogTitle className="font-serif text-xl font-normal text-foreground tracking-tight leading-none">New Legal Draft</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans mt-1.5">
              LegalDesk compiles case intelligence and verified facts to generate your initial draft.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">
                Document Title *
              </Label>
              <Input
                required
                autoFocus
                placeholder="e.g. Legal Notice for Recovery of ₹5L"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="bg-background border-input text-foreground h-9 text-xs font-sans rounded-lg"
              />
            </div>

            {/* Draft Type Library */}
            <div className="space-y-2 flex flex-col h-[280px]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground font-sans">
                  Select Draft Type *
                </Label>
                <Input
                  placeholder="Filter templates..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-background border-input text-foreground h-8 text-xs w-48 rounded-lg font-sans"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto bg-muted/20 border border-border rounded-xl p-3 space-y-4">
                {filteredLibrary.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8 font-sans">No templates found matching "{searchTerm}"</div>
                ) : (
                  filteredLibrary.map(cat => (
                    <div key={cat.category}>
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground font-sans">
                        <span>{cat.icon}</span> {cat.category}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.options.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, draftType: opt.value })}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left font-sans
                              ${form.draftType === opt.value
                                ? 'border-primary/60 bg-primary/10 text-primary'
                                : 'border-border bg-card text-foreground hover:border-border/80'
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">
                Instructions & Particulars <span className="text-muted-foreground/70 font-normal normal-case">(optional)</span>
              </Label>
              <textarea
                rows={3}
                placeholder="Specific demands, notice period, statutory sections to reference..."
                value={form.instructions}
                onChange={e => setForm({ ...form, instructions: e.target.value })}
                className="w-full bg-background border border-input rounded-lg p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-sans leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 flex-shrink-0 gap-2.5 flex flex-col-reverse sm:flex-row sm:justify-end items-center">
            <Button type="button" variant="outline" className="h-9 px-4 text-xs font-medium rounded-lg font-sans border-border text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isExhausted ? (
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold h-9 text-xs px-4 rounded-lg font-sans"
                onClick={() => router.push('/billing')}
              >
                AI Paused. Top Up
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting || !form.title.trim() || !form.draftType}
                className="h-9 px-4 text-xs font-semibold rounded-lg font-sans bg-foreground text-background hover:bg-foreground/90 gap-1.5"
              >
                {submitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Generate Draft</>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
