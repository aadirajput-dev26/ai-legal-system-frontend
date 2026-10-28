'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
  onConfirm,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="z-[90]" className="max-w-md p-6 bg-card border border-border text-foreground z-[100] rounded-2xl">
        <DialogHeader>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
            variant === 'destructive'
              ? 'bg-destructive/10 text-destructive border border-destructive/20'
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-xl font-serif font-normal text-foreground tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-sans leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="text-xs h-9 px-4 font-medium border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`text-xs h-9 px-4 font-semibold cursor-pointer rounded-lg shadow-sm ${
              variant === 'destructive'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
