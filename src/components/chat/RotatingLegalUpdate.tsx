'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Scale,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  BookOpen,
  MessageSquare,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  onInquire?: (update: LegalUpdateItem) => void;
  className?: string;
}

export function RotatingLegalUpdate({ updates, onInquire, className }: RotatingLegalUpdateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Auto-cycle through the updates only when not paused or hovered
  useEffect(() => {
    if (!updates || updates.length <= 1 || isPaused || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % updates.length);
    }, 6000); // 6s gives lawyer reasonable reading time
    return () => clearInterval(timer);
  }, [updates, isPaused, isHovered]);

  if (!updates || updates.length === 0) return null;

  const current = updates[currentIndex % updates.length];

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % updates.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + updates.length) % updates.length);
  };

  const filteredUpdates = updates.filter(u => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      u.title.toLowerCase().includes(q) ||
      u.summary.toLowerCase().includes(q) ||
      u.type.toLowerCase().includes(q) ||
      (u.source && u.source.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`my-3 p-4 bg-gradient-to-br from-[#1b152e] via-[#141222] to-[#0e0d16] border border-[#A855F7]/35 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300 ${className || ''}`}
      >
        {/* Ambient Top Glow Bar */}
        <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-[#A855F7] via-[#EC4899] to-[#A855F7] w-full animate-pulse" />

        {/* Header: Title, Pause/Play, Manual Controls & "View All" */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C084FC]">
            <Sparkles className="w-3.5 h-3.5 text-[#A855F7] flex-shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Legal Intelligence Digest</span>
            <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/30 py-0 h-4 font-semibold">
              {current.type || 'Statute'}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View All Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewAllOpen(true)}
              className="h-6 px-2 text-[10px] text-[#C084FC] hover:bg-[#A855F7]/15 hover:text-white rounded-md gap-1 font-medium"
              title="View all legal updates in full"
            >
              <BookOpen className="w-3 h-3" />
              <span>All ({updates.length})</span>
            </Button>

            {/* Pause / Resume Button */}
            <button
              type="button"
              onClick={() => setIsPaused(prev => !prev)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              title={isPaused ? 'Resume auto-rotation' : 'Pause rotation to read'}
            >
              {isPaused ? <Play className="w-2.5 h-2.5 text-[#4ADE80]" /> : <Pause className="w-2.5 h-2.5" />}
            </button>

            {/* Prev / Next Arrows */}
            {updates.length > 1 && (
              <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5 border border-white/5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                  title="Previous update"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[10px] text-muted-foreground font-mono px-1">
                  {currentIndex + 1}/{updates.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                  title="Next update"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content: FULL Title & UN-TRUNCATED Summary */}
        <div className="space-y-2 py-0.5">
          <div className="text-xs sm:text-sm font-semibold text-foreground/95 flex items-start gap-2 leading-snug">
            <Scale className="w-4 h-4 text-[#A855F7] flex-shrink-0 mt-0.5" />
            <span className="text-white font-medium">{current.title}</span>
          </div>

          {/* Fully visible complete summary (no line-clamp) */}
          <p className="text-[12px] text-muted-foreground/95 leading-relaxed pl-6 whitespace-normal select-text">
            {current.summary}
          </p>
        </div>

        {/* Footer: Source, Date, and Inquire Button */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2 truncate max-w-[65%]">
            {current.source && (
              <span className="text-muted-foreground/80 font-medium truncate flex items-center gap-1">
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                {current.source}
              </span>
            )}
            {current.date && <span>&bull; {current.date}</span>}
          </div>

          {onInquire && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInquire(current)}
              className="h-6 px-2.5 text-[10px] border-[#A855F7]/30 bg-[#A855F7]/10 hover:bg-[#A855F7]/25 text-[#C084FC] hover:text-white rounded-md gap-1 font-medium transition-all"
              title="Ask AI how this law applies to your matter"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Ask in Chat</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── View All Legal Intelligence Dialog ─────────────────────────── */}
      <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#14121e] border-white/10 text-foreground p-6 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7]">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  Legal Intelligence & Statutory Updates
                  <Badge variant="outline" className="text-[10px] text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/30 py-0">
                    {updates.length} Updates
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Full text of recent statutory amendments, procedural guidelines, and legal frameworks relevant to your matters.
                </DialogDescription>
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search updates by act, keyword, or summary..."
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                className="w-full bg-[#0d0c14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#A855F7]/50"
              />
            </div>
          </DialogHeader>

          {/* Scrollable list of full updates */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
            {filteredUpdates.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No matching legal updates found.
              </div>
            ) : (
              filteredUpdates.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl bg-[#1a1727] border border-white/5 hover:border-[#A855F7]/30 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/30 py-0 h-4">
                          {item.type || 'Act'}
                        </Badge>
                        <h4 className="text-sm font-semibold text-white leading-snug">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    {onInquire && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onInquire(item);
                          setViewAllOpen(false);
                        }}
                        className="h-7 px-2.5 text-xs border-[#A855F7]/30 bg-[#A855F7]/10 hover:bg-[#A855F7]/25 text-[#C084FC] hover:text-white rounded-lg gap-1.5 flex-shrink-0"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Inquire</span>
                      </Button>
                    )}
                  </div>

                  {/* Complete Full Summary */}
                  <p className="text-xs text-muted-foreground/90 leading-relaxed whitespace-pre-wrap select-text">
                    {item.summary}
                  </p>

                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground/70">
                    <span>Source: <strong className="text-muted-foreground">{item.source || 'Legal Gazette'}</strong></span>
                    {item.date && <span>Date: {item.date}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
