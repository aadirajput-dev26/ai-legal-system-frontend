'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="h-screen w-full bg-background flex flex-col items-center justify-center gap-3 text-foreground">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground font-mono">Redirecting to Dashboard...</p>
    </div>
  );
}
