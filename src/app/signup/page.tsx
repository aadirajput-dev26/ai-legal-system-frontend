'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { auth as authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Loader2, User, Building, Mail, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';

const STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'
];

type AccountKind = 'individual' | 'firm';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<AccountKind>('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('Delhi');
  const [city, setCity] = useState('');
  const [firmName, setFirmName] = useState('');
  const [gstin, setGstin] = useState('');

  // Resend cooldown timer on Step 3
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGoogleSignup = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    window.location.href = `${apiBase}/auth/google/login?mode=signup`;
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!city.trim()) {
      setError('Please enter your city.');
      return;
    }
    if (kind === 'firm' && !firmName.trim()) {
      setError('Please enter your law firm or chamber name.');
      return;
    }

    setLoading(true);

    try {
      // Normal Email Registration (No password step)
      await signup({
        name: name.trim(),
        email: email.trim(),
        accountType: kind,
        mobile: `+91${mobile.replace(/\D/g, '')}`,
        state,
        city: city.trim(),
        ...(kind === 'firm' ? { firmName: firmName.trim(), gstin: gstin.trim().toUpperCase() || undefined } : {}),
      });

      // Verification email dispatched by backend
      setCooldown(30);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Could not complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      setLoading(true);
      await authApi.sendVerificationEmail({ email: email.trim(), name: name.trim() });
      setCooldown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
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

      <Card className="w-full max-w-lg mx-4 border-[#272b2b] bg-[#141717] shadow-2xl rounded-2xl my-auto">
        {/* Step Indicator Header */}
        <CardHeader className="text-center space-y-2 pb-2 pt-6">
          <div className="mx-auto w-11 h-11 rounded-xl bg-[#1e2424] border border-[#272b2b] flex items-center justify-center text-[#2dd4bf] shadow-sm">
            <Scale className="w-5 h-5 text-[#2dd4bf]" />
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-[#2dd4bf]'
                    : s < step
                    ? 'w-4 bg-[#2dd4bf]/50'
                    : 'w-4 bg-[#272b2b]'
                }`}
              />
            ))}
          </div>

          <CardTitle className="text-2xl font-serif font-normal tracking-tight text-white">
            {step === 1 && 'Create your account'}
            {step === 2 && 'Practice details'}
            {step === 3 && 'Check your email'}
          </CardTitle>
          <CardDescription className="text-xs text-[#879292]">
            {step === 1 && 'Step 1 of 3 · Select your practice structure'}
            {step === 2 && 'Step 2 of 3 · Complete your workspace profile'}
            {step === 3 && 'Step 3 of 3 · Verification & account activation'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-6">
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          {/* ── STEP 1: Account Type Selection ────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setKind('individual')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    kind === 'individual'
                      ? 'border-[#2dd4bf] bg-teal-50 dark:bg-[#1a2322] shadow-[0_0_15px_rgba(45,212,191,0.1)]'
                      : 'border-border dark:border-[#272b2b] bg-slate-50 dark:bg-[#1a1d1d] hover:border-slate-300 dark:hover:border-[#384040]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <User className={`w-5 h-5 ${kind === 'individual' ? 'text-teal-700 dark:text-[#2dd4bf]' : 'text-slate-400 dark:text-[#879292]'}`} />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      kind === 'individual' ? 'border-[#2dd4bf] bg-[#2dd4bf]' : 'border-slate-300 dark:border-[#3a4242]'
                    }`}>
                      {kind === 'individual' && <div className="w-1.5 h-1.5 rounded-full bg-[#091b18]" />}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Individual</div>
                    <div className="text-[11px] text-slate-600 dark:text-[#879292] leading-tight mt-0.5">
                      Solo advocate, counsel, or consultant
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setKind('firm')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    kind === 'firm'
                      ? 'border-[#2dd4bf] bg-teal-50 dark:bg-[#1a2322] shadow-[0_0_15px_rgba(45,212,191,0.1)]'
                      : 'border-border dark:border-[#272b2b] bg-slate-50 dark:bg-[#1a1d1d] hover:border-slate-300 dark:hover:border-[#384040]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <Building className={`w-5 h-5 ${kind === 'firm' ? 'text-teal-700 dark:text-[#2dd4bf]' : 'text-slate-400 dark:text-[#879292]'}`} />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      kind === 'firm' ? 'border-[#2dd4bf] bg-[#2dd4bf]' : 'border-slate-300 dark:border-[#3a4242]'
                    }`}>
                      {kind === 'firm' && <div className="w-1.5 h-1.5 rounded-full bg-[#091b18]" />}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Law Firm</div>
                    <div className="text-[11px] text-slate-600 dark:text-[#879292] leading-tight mt-0.5">
                      Chambers, partnerships, or teams
                    </div>
                  </div>
                </button>
              </div>

              <Button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold h-10 text-sm rounded-lg mt-1 cursor-pointer shadow-[0_0_15px_rgba(45,212,191,0.15)] transition-all flex items-center justify-center gap-1.5"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Divider */}
              <div className="relative flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-border dark:bg-[#272b2b]" />
                <span className="text-[10px] text-slate-500 dark:text-[#879292] font-mono uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border dark:bg-[#272b2b]" />
              </div>

              {/* Google Sign Up Button (Pure Backend Redirect) */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full h-10 flex items-center justify-center gap-3 rounded-lg border border-border dark:border-[#272b2b] bg-white dark:bg-[#1a1d1d] hover:bg-slate-50 dark:hover:bg-[#1e2424] hover:border-slate-300 dark:hover:border-[#384040] text-slate-800 dark:text-[#c9d1d1] text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm dark:shadow-none"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              <p className="text-center text-xs text-[#879292] pt-1">
                Already have an account?{' '}
                <Link href="/login" className="text-[#2dd4bf] hover:text-[#5eead4] hover:underline font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: Profile Details (No Password Field) ────────── */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="name" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                    FULL NAME<span className="text-red-500 font-bold ml-1">*</span>
                  </label>
                  <Input
                    id="name"
                    placeholder="Adv. Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-[#0f1212] border-[#272b2b] text-[#f3f4f5] h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="mobile" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                    MOBILE NUMBER<span className="text-red-500 font-bold ml-1">*</span>
                  </label>
                  <Input
                    id="mobile"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="bg-[#0f1212] border-[#272b2b] text-[#f3f4f5] h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
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
                  className="bg-[#0f1212] border-[#272b2b] text-[#f3f4f5] h-9 text-xs rounded-lg"
                />
              </div>

              {kind === 'firm' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label htmlFor="firmName" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                      FIRM NAME<span className="text-red-500 font-bold ml-1">*</span>
                    </label>
                    <Input
                      id="firmName"
                      placeholder="Sharma & Partners LLP"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      required
                      className="bg-[#0f1212] border-[#272b2b] text-[#f3f4f5] h-9 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="gstin" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                      GSTIN (OPTIONAL)
                    </label>
                    <Input
                      id="gstin"
                      placeholder="07AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="bg-[#0f1212] border-[#272b2b] text-[#f3f4f5] h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="state" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                    STATE<span className="text-red-500 font-bold ml-1">*</span>
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full h-9 rounded-lg bg-[#0f1212] border border-[#272b2b] text-[#f3f4f5] px-2.5 text-xs focus:border-[#2dd4bf]/70 focus:outline-none cursor-pointer"
                  >
                    {STATES.map((st) => (
                      <option key={st} value={st} className="bg-[#141717] text-[#f3f4f5]">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="city" className="text-[#879292] font-mono text-[10px] tracking-wider uppercase inline-flex items-center">
                    CITY<span className="text-red-500 font-bold ml-1">*</span>
                  </label>
                  <Input
                    id="city"
                    placeholder="New Delhi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="bg-[#0f1212] border-[#272b2b] text-[#f3f4f5] h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-10 px-3.5 border-[#272b2b] bg-[#1a1d1d] hover:bg-[#202525] text-[#879292] hover:text-white rounded-lg text-xs cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold h-10 text-xs rounded-lg cursor-pointer shadow-[0_0_15px_rgba(45,212,191,0.15)] transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Account &amp; Verify
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Verification Sent Confirmation ──────────────── */}
          {step === 3 && (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 text-[#2dd4bf] flex items-center justify-center shadow-lg">
                <Mail className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-serif text-white font-medium">Verification link sent!</h3>
                <p className="text-xs text-[#879292] leading-relaxed max-w-sm mx-auto">
                  We have dispatched a verification email to{' '}
                  <strong className="text-white font-medium">{email}</strong>.
                </p>
              </div>

              <div className="bg-[#1a1e1e] border border-[#2a3030] rounded-xl p-3 text-left space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-white">
                  <CheckCircle2 className="w-4 h-4 text-[#2dd4bf] shrink-0" />
                  Account created &amp; 10,000 credits allocated
                </div>
                <p className="text-[11px] text-[#879292] pl-6 leading-relaxed">
                  Open the email to verify your address. You can also optionally set a password from the link in your email.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                  className="w-full h-9 border-[#272b2b] bg-[#1a1d1d] hover:bg-[#202525] text-xs text-[#c9d1d1] rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
                </Button>

                <Link
                  href="/login"
                  className="block text-center text-xs text-[#2dd4bf] hover:text-[#5eead4] hover:underline font-medium pt-1"
                >
                  Return to Sign In &rarr;
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
