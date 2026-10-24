'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase">Email Address</Label>
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
              <Label htmlFor="password" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#0f1212] border-[#272b2b] hover:border-[#384040] text-[#f3f4f5] placeholder:text-[#6f7a7a] focus:border-[#2dd4bf]/70 focus:ring-1 focus:ring-[#2dd4bf]/30 h-10 text-sm transition-all rounded-lg"
              />
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
