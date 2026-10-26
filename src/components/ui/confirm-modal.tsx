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
      <DialogContent overlayClassName="z-[90]" className="max-w-sm p-6 bg-[#141717] border border-[#272b2b] text-[#f3f4f5] z-[100]">
        <DialogHeader>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
            variant === 'destructive'
              ? 'bg-red-500/10 text-red-400'
              : 'bg-[#2dd4bf]/10 text-[#2dd4bf]'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-serif font-normal text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#879292] font-sans leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4 gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            className="text-xs text-[#879292] hover:text-foreground cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`text-xs h-8 font-semibold cursor-pointer ${
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18]'
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
