import Link from 'next/link';
import { Scale, Home, LayoutDashboard, ArrowLeft, FolderKanban, FileText, CalendarDays } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0d0f0f] text-[#f3f4f5] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Decorative Ambient Gradients */}
      <div 
        aria-hidden="true" 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"
      />
      <div 
        aria-hidden="true" 
        className="absolute bottom-10 right-1/4 w-[350px] h-[250px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"
      />

      <div className="max-w-xl w-full text-center relative z-10 space-y-8">
        
        {/* Emblem / Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-[#141717] border border-[#272b2b] flex items-center justify-center shadow-xl shadow-black/40 group">
            <Scale className="w-8 h-8 text-[#2dd4bf] transition-transform duration-300 group-hover:scale-110" />
          </div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-400 font-mono text-[11px] tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            404 // Jurisdiction Unresolved
          </div>
        </div>

        {/* Heading & Subtext */}
        <div className="space-y-3">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[#f3f4f5]">
            Matter Not Found in Registry
          </h1>
          <p className="text-sm sm:text-base text-[#879292] leading-relaxed max-w-md mx-auto">
            The document, case docket, or courtroom workspace you are searching for does not exist, has been archived, or has been moved to another registry.
          </p>
        </div>

        {/* Primary Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2dd4bf] text-[#0d0f0f] font-semibold text-sm hover:bg-[#20b8a3] transition-colors shadow-lg shadow-teal-950/40 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Return to Dashboard
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#141717] hover:bg-[#1e2222] text-[#f3f4f5] border border-[#272b2b] font-medium text-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-[#879292]" />
            Visit Homepage
          </Link>
        </div>

        {/* Quick Registry Directory Strip */}
        <div className="pt-6 border-t border-[#1e2222]">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6f7a7a] mb-3">
            Quick Directory Access
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
            <Link
              href="/cases"
              className="p-3 rounded-lg border border-[#1e2222] bg-[#141717]/60 hover:bg-[#141717] hover:border-teal-500/30 transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f3f4f5] group-hover:text-teal-400">
                <FolderKanban className="w-3.5 h-3.5 text-teal-400" />
                Matters & Cases
              </div>
              <div className="text-[11px] text-[#6f7a7a] mt-0.5">
                Litigation dockets
              </div>
            </Link>

            <Link
              href="/drafts"
              className="p-3 rounded-lg border border-[#1e2222] bg-[#141717]/60 hover:bg-[#141717] hover:border-teal-500/30 transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f3f4f5] group-hover:text-teal-400">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                Drafts Studio
              </div>
              <div className="text-[11px] text-[#6f7a7a] mt-0.5">
                AI pleadings & notices
              </div>
            </Link>

            <Link
              href="/calendar"
              className="p-3 rounded-lg border border-[#1e2222] bg-[#141717]/60 hover:bg-[#141717] hover:border-teal-500/30 transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f3f4f5] group-hover:text-teal-400">
                <CalendarDays className="w-3.5 h-3.5 text-teal-400" />
                Hearing Diary
              </div>
              <div className="text-[11px] text-[#6f7a7a] mt-0.5">
                Listings & cause list
              </div>
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-[11px] text-[#6f7a7a] font-mono">
          LegalDesk Chambers Platform &middot; In case of missing records, contact your chambers administrator.
        </div>

      </div>
    </main>
  );
}
