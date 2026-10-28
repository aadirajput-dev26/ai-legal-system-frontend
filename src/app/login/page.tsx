'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Loader2, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      if (err === 'google_cancelled') {
        setError('Google sign-in was cancelled.');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    window.location.href = `${apiBase}/auth/google/login`;
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center relative bg-[#0d0f0f]">
      {/* Ambient background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2dd4bf]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#818cf8]/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md mx-4 border-[#272b2b] bg-[#141717] shadow-2xl rounded-2xl my-auto">
        <CardHeader className="text-center space-y-2.5 pb-2 pt-6">
          <div className="mx-auto w-11 h-11 rounded-xl bg-[#1e2424] border border-[#272b2b] flex items-center justify-center text-[#2dd4bf] shadow-sm">
            <Scale className="w-5 h-5 text-[#2dd4bf]" />
          </div>
          <CardTitle className="text-2xl font-serif font-normal tracking-tight text-white">Welcome back</CardTitle>
          <CardDescription className="text-xs text-[#879292]">
            Sign in to your LegalDesk workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                EMAIL ADDRESS<span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="counsel@chambers.legal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#0f1212] border-[#272b2b] hover:border-[#384040] text-[#f3f4f5] placeholder:text-[#6f7a7a] focus:border-[#2dd4bf]/70 focus:ring-1 focus:ring-[#2dd4bf]/30 h-10 text-sm transition-all rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                PASSWORD<span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[#0f1212] border-[#272b2b] hover:border-[#384040] text-[#f3f4f5] placeholder:text-[#6f7a7a] focus:border-[#2dd4bf]/70 focus:ring-1 focus:ring-[#2dd4bf]/30 h-10 text-sm transition-all rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f7a7a] hover:text-[#c9d1d1] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold h-10 text-sm rounded-lg mt-2 cursor-pointer shadow-[0_0_15px_rgba(45,212,191,0.15)] hover:shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>

            {/* Divider */}
            <div className="relative flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-border dark:bg-[#272b2b]" />
              <span className="text-[10px] text-slate-500 dark:text-[#879292] font-mono uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border dark:bg-[#272b2b]" />
            </div>

            {/* Google Sign In Button (Pure Backend Redirect) */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-3 rounded-lg border border-border dark:border-[#272b2b] bg-white dark:bg-[#1a1d1d] hover:bg-slate-50 dark:hover:bg-[#1e2424] hover:border-slate-300 dark:hover:border-[#384040] text-slate-800 dark:text-[#c9d1d1] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm dark:shadow-none"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-xs text-[#879292] pt-1">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#2dd4bf] hover:text-[#5eead4] hover:underline font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[#0d0f0f] text-[#879292] text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#2dd4bf]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
