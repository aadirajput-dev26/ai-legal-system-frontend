'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard#calendar-section');
  }, [router]);

  return (
    <div className="h-screen w-full bg-[#0d0f0f] flex flex-col items-center justify-center gap-3 text-[#f3f4f5]">
      <Loader2 className="w-6 h-6 animate-spin text-[#2dd4bf]" />
      <p className="text-xs text-[#879292]">Redirecting to Dashboard Calendar...</p>
    </div>
  );
}
