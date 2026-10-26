'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          Email Verified
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          {email ? (
            <>
              Your email address <strong className="text-foreground">{email}</strong> has been successfully verified.
            </>
          ) : (
            'Your email address has been successfully verified.'
          )}
        </p>

        <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-xs text-muted-foreground mb-6 text-left space-y-1">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            Verification confirmed
          </div>
          <p className="pl-6">
            You can now proceed to your LegalDesk account and continue setting up your practice.
          </p>
        </div>

        <Link
          href="/login"
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Sign in to LegalDesk
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        LegalDesk · AI Legal Case Management
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Verifying...
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
