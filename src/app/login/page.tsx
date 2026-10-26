'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Loader2, Eye, EyeOff } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const router = useRouter();

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

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setGoogleLoading(true);
      try {
        await googleLogin(tokenResponse.access_token);
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed.');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0d0f0f]">
      {/* Ambient background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2dd4bf]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#818cf8]/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md mx-4 border-[#272b2b] bg-[#141717] shadow-2xl rounded-2xl">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#1e2424] border border-[#272b2b] flex items-center justify-center text-[#2dd4bf] shadow-sm">
            <Scale className="w-6 h-6 text-[#2dd4bf]" />
          </div>
          <CardTitle className="text-2xl font-serif font-normal tracking-tight text-white">Welcome back</CardTitle>
          <CardDescription className="text-xs text-[#879292]">
            Sign in to your LegalDesk workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={googleLoading || loading}
              className="w-full h-10 flex items-center justify-center gap-3 rounded-lg border border-[#272b2b] bg-[#1a1d1d] hover:bg-[#1e2424] hover:border-[#384040] text-[#c9d1d1] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-[#272b2b]" />
              <span className="text-[10px] text-[#879292] font-mono uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#272b2b]" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase">
                Email Address <span className="text-red-500 ml-0.5">*</span>
              </Label>
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
              <Label htmlFor="password" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase">
                Password <span className="text-red-500 ml-0.5">*</span>
              </Label>
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
            <Button type="submit" className="w-full bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold h-10 text-sm rounded-lg mt-3 cursor-pointer shadow-[0_0_15px_rgba(45,212,191,0.15)] hover:shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
            <p className="text-center text-xs text-[#879292] pt-2">
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
