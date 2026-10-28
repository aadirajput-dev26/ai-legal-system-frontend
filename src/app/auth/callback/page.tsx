'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      localStorage.setItem('accessToken', token);
      // Hard navigation ensures contexts (auth, org, billing) reinitialize cleanly
      window.location.href = '/dashboard';
    } else if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`);
    } else {
      router.push('/login');
    }
  }, [searchParams, router]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-[#0d0f0f] text-[#879292] text-xs gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#2dd4bf]" />
      <p className="font-mono text-[11px] tracking-wider uppercase text-[#c9d1d1]">
        Authenticating with Google...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[#0d0f0f] text-[#879292] text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#2dd4bf]" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
