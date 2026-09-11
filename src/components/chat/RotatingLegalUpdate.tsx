'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface LegalUpdateItem {
  id?: string;
  type: string;
  title: string;
  summary: string;
  source?: string;
  date?: string | null;
}

interface RotatingLegalUpdateProps {
  updates: LegalUpdateItem[];
}

export function RotatingLegalUpdate({ updates }: RotatingLegalUpdateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-cycle through the updates one by one every 3.5 seconds
  useEffect(() => {
    if (!updates || updates.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % updates.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [updates]);

  if (!updates || updates.length === 0) return null;

  const current = updates[currentIndex % updates.length];

  return (
    <div className="my-2.5 p-3.5 bg-gradient-to-br from-[#1a162b] to-[#12111a] border border-[#A855F7]/30 rounded-xl shadow-lg relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-[#A855F7] via-[#EC4899] to-[#A855F7] w-full animate-pulse" />
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C084FC]">
          <Sparkles className="w-3.5 h-3.5 text-[#A855F7] animate-spin" style={{ animationDuration: '4s' }} />
          <span>Legal Intelligence &middot; Daily Digest</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/30 py-0 h-4 font-semibold">
            {current.type || 'Update'}
          </Badge>
          {updates.length > 1 && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {currentIndex + 1}/{updates.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[52px] transition-all duration-300 ease-in-out">
        <div className="text-xs font-semibold text-foreground/95 mb-1 flex items-start gap-1.5 leading-snug">
          <Scale className="w-3.5 h-3.5 text-[#A855F7] flex-shrink-0 mt-0.5" />
          <span>{current.title}</span>
        </div>
        <p className="text-[11px] text-muted-foreground/90 leading-relaxed line-clamp-3 pl-5">
          {current.summary}
        </p>
      </div>

      {/* Footer / Meta & Navigation dots */}
      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
          {current.source && <span className="text-muted-foreground/70 truncate">{current.source}</span>}
          {current.date && <span>&bull; {current.date}</span>}
        </div>
        
        {updates.length > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {updates.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentIndex % updates.length
                    ? 'bg-[#A855F7] w-3.5'
                    : 'bg-white/20 hover:bg-white/40 w-1.5'
                }`}
                title={`Legal Update ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
