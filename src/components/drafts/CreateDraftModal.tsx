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
      <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#272b2b] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#2dd4bf]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[#2dd4bf]" />
          </div>
          <div>
            <DialogTitle className="text-lg font-serif font-semibold text-white leading-none">New Legal Draft</DialogTitle>
            <DialogDescription className="text-xs text-[#879292] mt-1.5">
              LegalDesk compiles case intelligence and verified facts to generate your initial draft.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">
                Document Title *
              </Label>
              <Input
                required
                autoFocus
                placeholder="e.g. Legal Notice for Recovery of ₹5L"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="bg-[#0d0f0f] border-[#272b2b] h-9 text-sm text-[#f3f4f5]"
              />
            </div>

            {/* Draft Type Library */}
            <div className="space-y-2 flex flex-col h-[280px]">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">
                  Select Draft Type *
                </Label>
                <Input
                  placeholder="Filter templates..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-[#0d0f0f] border-[#272b2b] h-7 text-xs w-48 text-[#f3f4f5]"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto bg-[#0d0f0f] border border-[#272b2b] rounded-lg p-3 space-y-4">
                {filteredLibrary.length === 0 ? (
                  <div className="text-center text-xs text-[#879292] py-8">No templates found matching "{searchTerm}"</div>
                ) : (
                  filteredLibrary.map(cat => (
                    <div key={cat.category}>
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#879292]">
                        <span>{cat.icon}</span> {cat.category}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {cat.options.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, draftType: opt.value })}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left
                              ${form.draftType === opt.value
                                ? 'border-[#2dd4bf]/60 bg-[#2dd4bf]/10 text-[#2dd4bf]'
                                : 'border-[#272b2b] bg-[#141717] text-[#f3f4f5] hover:border-[#3a4242]'
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
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">
                Instructions & Particulars <span className="text-[#6f7a7a] font-normal normal-case">(optional)</span>
              </Label>
              <textarea
                rows={3}
                placeholder="Specific demands, notice period, statutory sections to reference..."
                value={form.instructions}
                onChange={e => setForm({ ...form, instructions: e.target.value })}
                className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg p-3 text-xs text-[#f3f4f5] focus:outline-none focus:border-[#2dd4bf] resize-none leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-[#272b2b] bg-[#141717] flex-shrink-0 gap-2">
            <Button type="button" variant="ghost" className="text-xs text-[#879292] hover:text-white h-8" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isExhausted ? (
              <Button
                type="button"
                className="bg-[#f87171] hover:bg-red-600 text-white font-semibold h-8 text-xs px-4"
                onClick={() => router.push('/billing')}
              >
                AI Paused. Top Up
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitting || !form.title.trim() || !form.draftType}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold h-8 text-xs gap-1.5"
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
