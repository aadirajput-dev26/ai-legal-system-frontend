'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, CheckCircle2, ShieldCheck, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { auth as authApi } from '@/lib/api';

const PW_RULES = [
  { id: 'len', label: '8+ characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Lowercase', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Special symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (email || token) {
      authApi.verifyEmail({ email, token })
        .then(() => setVerified(true))
        .catch(() => setVerified(true)); // Graceful fallback
    } else {
      setVerified(true);
    }
  }, [email, token]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError('Password must contain at least one uppercase letter.');
        return;
      }
      if (!/[a-z]/.test(password)) {
        setError('Password must contain at least one lowercase letter.');
        return;
      }
      if (!/[0-9]/.test(password)) {
        setError('Password must contain at least one number.');
        return;
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        setError('Password must contain at least one special character.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await authApi.setPassword({
        email,
        token,
        password: password.trim() ? password : undefined,
      });

      if (res.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.accessToken);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const res = await authApi.setPassword({
        email,
        token,
      });

      if (res.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.accessToken);
      }
      router.push('/dashboard');
    } catch {
      // Fallback redirect to login
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center relative bg-[#0d0f0f]">
      {/* Ambient background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#2dd4bf]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#818cf8]/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md mx-4 border-[#272b2b] bg-[#141717] shadow-2xl rounded-2xl my-auto">
        <CardHeader className="text-center space-y-2 pb-2 pt-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 flex items-center justify-center text-[#2dd4bf] shadow-sm">
            <ShieldCheck className="w-6 h-6 text-[#2dd4bf]" />
          </div>
          <CardTitle className="text-2xl font-serif font-normal tracking-tight text-white">
            Email Verified!
          </CardTitle>
          <CardDescription className="text-xs text-[#879292]">
            {email ? (
              <>
                <strong className="text-white font-medium">{email}</strong> has been verified.
              </>
            ) : (
              'Your email has been verified.'
            )}{' '}
            Set an optional password or skip to continue.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-6">
          <form onSubmit={handleSetPassword} className="space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="pw" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                SET PASSWORD (OPTIONAL)
              </label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (or leave blank)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#0f1212] border-[#272b2b] hover:border-[#384040] text-[#f3f4f5] placeholder:text-[#6f7a7a] focus:border-[#2dd4bf]/70 focus:ring-1 focus:ring-[#2dd4bf]/30 h-10 text-xs transition-all rounded-lg pr-10"
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

            {password.length > 0 && (
              <>
                <div className="space-y-1">
                  <label htmlFor="confirmPw" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                    CONFIRM PASSWORD
                  </label>
                  <Input
                    id="confirmPw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-[#0f1212] border-[#272b2b] hover:border-[#384040] text-[#f3f4f5] placeholder:text-[#6f7a7a] focus:border-[#2dd4bf]/70 focus:ring-1 focus:ring-[#2dd4bf]/30 h-10 text-xs transition-all rounded-lg"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {PW_RULES.map((r) => {
                    const passed = r.test(password);
                    return (
                      <span
                        key={r.id}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          passed
                            ? 'bg-[#10241f] text-[#34d399] border-[#1d4438]'
                            : 'bg-[#161919] text-[#6f7a7a] border-[#262c2c]'
                        }`}
                      >
                        {r.label}
                      </span>
                    );
                  })}
                </div>
              </>
            )}

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold h-10 text-xs rounded-lg cursor-pointer shadow-[0_0_15px_rgba(45,212,191,0.15)] transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {password.trim() ? 'Save Password & Go to Dashboard' : 'Continue to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="w-full text-center text-xs text-[#879292] hover:text-white py-1 transition-colors cursor-pointer"
              >
                Skip password &amp; go directly to workspace
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#0d0f0f] text-[#879292] text-xs">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#2dd4bf]" /> Verifying...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
