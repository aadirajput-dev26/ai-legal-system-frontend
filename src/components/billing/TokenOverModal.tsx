'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, ArrowRight, Lock } from 'lucide-react';

interface TokenOverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function TokenOverModal({
  open,
  onOpenChange,
  feature = 'AI operations',
}: TokenOverModalProps) {
  const router = useRouter();

  const handleGoToBilling = () => {
    onOpenChange(false);
    router.push('/billing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border text-foreground p-6 rounded-2xl shadow-2xl font-sans">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <DialogTitle className="text-lg font-serif font-semibold text-foreground">
              Tokens are over
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-sans">
              Your AI token balance is <span className="font-semibold text-destructive font-mono">0</span>. {feature} is disabled until your balance is recharged.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 text-foreground font-medium text-[11px]">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            Why am I seeing this?
          </div>
          <p className="leading-relaxed font-sans">
            AI draft generation, document indexing, and the AI Chambers Assistant consume real-time platform tokens. Top up your balance to immediately unlock all AI capabilities.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs border-border text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleGoToBilling}
            className="h-9 px-4 text-xs font-semibold bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            Add Tokens
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
