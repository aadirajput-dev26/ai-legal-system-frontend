'use client';

/**
 * Legal Desk — guided signup (account type → details → verify → password).
 *
 * BACKEND STATUS, as of this branch:
 *   POST /auth/signup accepts { name, email, password } only.
 *   There is no account-type, mobile, state, city, firm or GSTIN field,
 *   and no email-verification endpoint of any kind.
 *
 * So steps 3 and 4 below are UI-complete but not yet wired. Every call that
 * has no backend is marked TODO(api) and routed through submitSignup(), which
 * is the single place to change once the endpoints exist. Nothing here
 * silently discards what the user typed: the collected payload is assembled
 * in full and the unsupported fields are dropped only at the final call,
 * with a console warning, so the gap is visible in development.
 *
 * GOOGLE OAUTH:
 *   When a user signs up with Google, the flow jumps to Step 2 (details)
 *   with name/email pre-filled, then goes straight to Step 5 (done),
 *   bypassing email verification (already verified by Google) and the
 *   password step (Google users don't need a LegalDesk password).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useGoogleLogin } from '@react-oauth/google';
import './signup.css';

const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'];
const GST_STATE: Record<string, string> = { Delhi:'07', Gujarat:'24', Karnataka:'29', Maharashtra:'27', Rajasthan:'08', 'Tamil Nadu':'33', Telangana:'36', 'Uttar Pradesh':'09', 'West Bengal':'19' };
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','rediffmail.com'];
const STRENGTH_LABELS = ['Too weak','Getting there','Good','Strong'];
const LINK_SECONDS = 30 * 60;
const RESEND_COOLDOWN = 30;

// Email verification webhook
const VERIFY_WEBHOOK = 'https://flow.sokt.io/func/scriV6mk16qc';

type Kind = 'individual' | 'firm';
type Errors = Record<string, string>;

const Check = () => <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>;

function levenshtein(a: string, b: string) {
  const m: number[][] = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i-1][j] + 1, m[i][j-1] + 1, m[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return m[a.length][b.length];
}

function maskEmail(value: string) {
  const [local, domain] = value.split('@');
  if (!domain || local.length < 2) return value;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/** Password rule checkers */
const pwRules = [
  { id: 'len',     label: 'At least 8 characters',          test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A-Z)',      test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a-z)',      test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit',   label: 'One number (0-9)',                test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)',   test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/** Send verification email via webhook */
async function sendVerificationEmail(email: string, name: string) {
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://legaldesk.co.in'}/verify?email=${encodeURIComponent(email)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Verify your LegalDesk email</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;max-width:560px;width:100%;">
      <!-- Header -->
      <tr>
        <td style="background:#111111;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:bold;color:#FFFFFF;letter-spacing:-0.02em;">Legal<span style="color:#2dd4bf;">Desk</span></p>
          <p style="margin:8px 0 0;font-size:13px;color:#A1A1AA;">AI Legal Case Management</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:bold;color:#111111;letter-spacing:-0.02em;">Verify your email address</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#666666;line-height:1.6;">Hi ${name || 'there'},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#666666;line-height:1.6;">
            Welcome to LegalDesk! Click the button below to verify your email address and complete your account setup.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr>
              <td style="background:#111111;border-radius:10px;">
                <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;letter-spacing:-0.01em;">
                  Verify Email Address →
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#999999;">Or copy and paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#111111;word-break:break-all;background:#F8F9FA;padding:12px;border-radius:8px;border:1px solid #E5E7EB;">${verifyUrl}</p>
          <p style="margin:0;font-size:13px;color:#999999;line-height:1.6;">
            This link expires in <strong style="color:#111111;">30 minutes</strong> and can only be used once.<br />
            If you didn't create a LegalDesk account, you can safely ignore this email.
          </p>
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="padding:24px 40px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999999;">© ${new Date().getFullYear()} LegalDesk. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    await fetch(VERIFY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email.trim(),
        subject: 'Verify your LegalDesk email address',
        html,
      }),
    });
  } catch (err) {
    // Non-blocking — don't fail signup if webhook is unavailable
    console.warn('[signup] Verification email webhook failed:', err);
  }
}

export default function SignupPage() {
  const router = useRouter();
  const { signup, googleLogin } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [kind, setKind] = useState<Kind | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [nudge, setNudge] = useState(0);
  const [serverError, setServerError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cc, setCc] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [firmName, setFirmName] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState({ pw1: false, pw2: false });
  const [caps, setCaps] = useState(false);
  const [typo, setTypo] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState('');

  // Google OAuth state — tracks if user signed up via Google (skip email verify + password)
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState('');

  const [secondsLeft, setSecondsLeft] = useState(LINK_SECONDS);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const themeBtn = useRef<HTMLButtonElement>(null);

  const isFirm = kind === 'firm';

  /* ── link countdown ─────────────────────────────── */
  useEffect(() => {
    if (step !== 3) return;
    const id = setInterval(() => setSecondsLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  /* ── validation ─────────────────────────────────── */
  const fieldValid = useCallback((id: string, value: string) => {
    const v = value.trim();
    if (id === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (id === 'mobile') return v.replace(/\D/g, '').length >= 10;
    if (id === 'gstin') return v.length === 15;
    return v.length >= 2;
  }, []);

  function validateDetails(): Errors {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Enter your full name.';
    if (!fieldValid('email', email)) next.email = 'Enter a valid email address.';
    if (!fieldValid('mobile', mobile)) next.mobile = 'Enter a valid mobile number.';
    if (!state) next.state = 'Select your state.';
    if (city.trim().length < 2) next.city = 'Enter your city.';
    if (isFirm) {
      if (firmName.trim().length < 2) next.firmName = "Enter your firm's name.";
      const g = gstin.trim().toUpperCase();
      if (g) {
        if (g.length !== 15) next.gstin = 'Enter a valid 15-character GSTIN.';
        else {
          const code = GST_STATE[state];
          if (code && g.slice(0, 2) !== code)
            next.gstin = `This GSTIN starts with ${g.slice(0, 2)}, but ${state} is ${code}. Check the number or the state.`;
        }
      }
    }
    return next;
  }

  function checkTypo(value: string) {
    const v = value.trim().toLowerCase();
    const at = v.lastIndexOf('@');
    if (at < 1) return setTypo('');
    const domain = v.slice(at + 1);
    if (!domain || DOMAINS.includes(domain)) return setTypo('');
    const hit = DOMAINS.find(d => levenshtein(domain, d) <= 2);
    setTypo(hit ? `${v.slice(0, at + 1)}${hit}` : '');
  }

  /* ── password strength (new 5-rule system) ──────── */
  const pwChecks = pwRules.map(r => ({ ...r, passed: r.test(pw1) }));
  const passedCount = pwChecks.filter(r => r.passed).length;

  // Strength score 0-3: map 5 rules → 4 bars
  const strength = passedCount === 0 ? 0
    : passedCount <= 2 ? 1
    : passedCount <= 3 ? 2
    : passedCount === 4 ? 3
    : 4; // all 5 passed

  const passwordValid = pwChecks.every(r => r.passed);

  /* ── navigation ─────────────────────────────────── */
  function go(to: number) {
    setDir(to > step ? 'fwd' : 'back');
    setStep(to);
    if (to === 3) setSecondsLeft(LINK_SECONDS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDetailsContinue() {
    const next = validateDetails();
    setErrors(next);
    setNudge(n => n + 1);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      // Send verification email via webhook (non-blocking)
      await sendVerificationEmail(email, name);
    } finally {
      setBusy(false);
    }

    if (isGoogleSignup) {
      // Google users: skip email verify + password → go straight to creating account
      setBusy(true);
      setServerError('');
      try {
        await googleLogin(googleAccessToken);
        go(5);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'We could not create your account. Please try again.');
      } finally {
        setBusy(false);
      }
    } else {
      go(3);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setResentAt(Date.now());
    setCooldown(RESEND_COOLDOWN);
    setSecondsLeft(LINK_SECONDS);
    // TODO(api): POST /auth/signup/resend — must be rate limited per email AND per IP.
    await sendVerificationEmail(email, name);
  }

  /**
   * The single place where this flow meets the backend.
   * Everything collected is assembled here; only the three fields the API
   * currently accepts are sent. Replace with the activation call once
   * /auth/signup/activate exists.
   */
  async function submitSignup() {
    const payload = {
      accountType: kind,
      name: name.trim(),
      email: email.trim(),
      mobile: `${cc}${mobile.replace(/\D/g, '')}`,
      state,
      city,
      ...(isFirm ? { firmName: firmName.trim(), gstin: gstin.trim().toUpperCase() || null } : {}),
      password: pw1,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[signup] Backend accepts { name, email, password } only. Dropped for now:',
        { accountType: payload.accountType, mobile: payload.mobile, state, city,
          firmName: isFirm ? payload.firmName : undefined, gstin: isFirm ? payload.gstin : undefined }
      );
    }

    // TODO(api): replace with POST /auth/signup/activate carrying the full payload
    // and the verification token, so the organisation is created server-side.
    await signup(payload.name, payload.email, payload.password);
  }

  async function onCreateAccount() {
    const next: Errors = {};
    if (!passwordValid) next.pw1 = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.';
    if (!pw2 || pw2 !== pw1) next.pw2 = "Passwords don't match.";
    setErrors(next);
    setNudge(n => n + 1);
    if (Object.keys(next).length) return;

    setBusy(true);
    setServerError('');
    try {
      await submitSignup();
      go(5);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'We could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  /* ── Google sign-up handler ─────────────────────── */
  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleSignup(true);
      setGoogleAccessToken(tokenResponse.access_token);

      // Try to pre-fill name/email from Google userinfo
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (userInfoRes.ok) {
          const info = await userInfoRes.json();
          if (info.name) setName(info.name);
          if (info.email) setEmail(info.email);
        }
      } catch { /* non-critical */ }

      go(2);
    },
    onError: () => {
      setServerError('Google sign-in was cancelled or failed.');
    },
  });

  /* ── theme, with a circular sweep from the button ── */
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }).startViewTransition;
    if (!start || reduce) return setTheme(next);

    const r = themeBtn.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top + r.height / 2 : 0;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    start.call(document, () => setTheme(next)).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 540, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }

  /* ── small render helpers ───────────────────────── */
  function field(id: string, label: React.ReactNode, node: React.ReactNode, extra?: React.ReactNode) {
    return (
      <div className={`au-f${errors[id] ? ' bad' : ''}${focus === id ? ' focus' : ''}`} key={`${id}-${nudge}`}>
        <label htmlFor={id}>{label}</label>
        {node}
        {extra}
        <div className="au-err">{errors[id]}</div>
      </div>
    );
  }

  function input(id: string, value: string, set: (v: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    const ok = touched[id] && !errors[id] && fieldValid(id, value);
    return (
      <div className={`au-ctl${ok ? ' ok' : ''}`}>
        <input
          id={id} value={value}
          onChange={e => { set(e.target.value); if (id === 'email') setTypo(''); }}
          onFocus={() => setFocus(id)}
          onBlur={e => { setFocus(''); setTouched(t => ({ ...t, [id]: true })); if (id === 'email') checkTypo(e.target.value); }}
          {...props}
        />
        <svg className="au-good" viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
      </div>
    );
  }

  // Required asterisk helper
  const Req = () => <span className="au-req">*</span>;

  const stepLabels = isGoogleSignup
    ? ['Account type', 'Your details']
    : ['Account type', 'Your details', 'Verify email', 'Password'];
  const totalSteps = stepLabels.length;
  const activeStep = Math.min(step, totalSteps);
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div data-auth={theme} className="au-wrap">
      <div className="au-top">
        <div className="au-logo">Legal&thinsp;Desk <span>· Create account</span></div>
        <button
          ref={themeBtn} type="button" className="au-theme" onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <svg className="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" /><g className="ray"><path d="M12 2.2v2.4M12 19.4v2.4M2.2 12h2.4M19.4 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M18.9 5.1l-1.7 1.7M6.8 17.2l-1.7 1.7" /></g></svg>
          <svg className="moon" viewBox="0 0 24 24"><path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8Z" /></svg>
        </button>
      </div>

      <div className="au-card">
        {step < (isGoogleSignup ? 5 : 5) && step <= totalSteps && (
          <div className="au-steps">
            {stepLabels.map((label, i) => (
              <div key={label} className={`au-step${i === activeStep - 1 ? ' on' : ''}${i < activeStep - 1 ? ' done' : ''}`}>
                <div className="au-dot">
                  <span className="n">{i + 1}</span>
                  <svg className="ck" viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
                </div>
                <div className="au-slabel">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 1 — account type */}
        {step === 1 && (
          <section className={`au-screen ${dir}`}>
            <h1>Let&apos;s set up your workspace.</h1>
            <p className="au-sub">Choose how you&apos;ll use Legal Desk.</p>
            <div className="au-types au-stag" role="radiogroup" aria-label="Account type">
              {([
                { k: 'individual' as Kind, t: 'Individual Lawyer', d: 'Manage your personal legal practice.',
                  icon: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></> },
                { k: 'firm' as Kind, t: 'Law Firm', d: 'Manage your firm and collaborate with your team.',
                  icon: <><path d="M4 20V7l7-3 7 3v13" /><path d="M4 20h16" /><path d="M10 20v-4h4v4" /></> },
              ]).map(o => (
                <button
                  key={o.k} type="button" role="radio" className="au-type"
                  aria-checked={kind === o.k} onClick={() => setKind(o.k)}
                >
                  <div className="au-tick"><Check /></div>
                  <div className="au-ico"><svg viewBox="0 0 24 24">{o.icon}</svg></div>
                  <div className="au-tname">{o.t}</div>
                  <div className="au-tdesc">{o.d}</div>
                </button>
              ))}
            </div>

            <div className="au-acts">
              <span />
              <button type="button" className="au-btn au-primary" disabled={!kind} onClick={() => go(2)}>
                <span className="lbl">Continue</span><span className="au-spin" />
              </button>
            </div>

            {/* Google sign up option */}
            <div className="au-divider">
              <span>or</span>
            </div>

            <div className="au-google-wrap">
              <button
                type="button"
                className="au-google-btn"
                onClick={() => {
                  if (!kind) { setErrors({ kind: 'Please select an account type first.' }); return; }
                  setErrors({});
                  handleGoogleSignup();
                }}
              >
                <svg viewBox="0 0 24 24" className="au-google-ico">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>
              {errors.kind && <div className="au-flag live" style={{ textAlign: 'center', marginTop: 8 }}>{errors.kind}</div>}
            </div>

            <p className="au-tiny">
              Already have an account? <Link href="/login" className="au-link">Sign in</Link>
            </p>
          </section>
        )}

        {/* 2 — details */}
        {step === 2 && (
          <section className={`au-screen ${dir}`}>
            <h1>{isFirm ? "Set up your firm's workspace." : 'Tell us about yourself.'}</h1>
            <p className="au-sub">
              {isGoogleSignup
                ? 'We pre-filled your Google details. Confirm and continue.'
                : isFirm ? "You'll be the owner of this workspace." : "We'll use this to set up your practice."}
            </p>

            <div className="au-stag">
              <h2>{isFirm ? 'Administrator details' : 'Your details'}</h2>

              {field('name', <><span>Full name</span><Req /></>, input('name', name, setName, { autoComplete: 'name', placeholder: 'Adv. Priya Mehta' }))}

              <div className="au-row">
                {field('email', <><span>Email address</span><Req /></>,
                  input('email', email, setEmail, { type: 'email', autoComplete: 'email', placeholder: 'priya@example.com', readOnly: isGoogleSignup }),
                  typo ? (
                    <div className="au-flag live">
                      Did you mean{' '}
                      <button type="button" onClick={() => { setEmail(typo); setTypo(''); setTouched(t => ({ ...t, email: true })); }}>{typo}</button>?
                    </div>
                  ) : null
                )}

                {field('mobile', <><span>Mobile number</span><Req /></>, (
                  <div className="au-phone">
                    <select aria-label="Country code" value={cc} onChange={e => setCc(e.target.value)}>
                      {['+91','+1','+44','+971'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    {input('mobile', mobile, v => {
                      if (cc !== '+91') return setMobile(v);
                      const d = v.replace(/\D/g, '').slice(0, 10);
                      setMobile(d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);
                    }, { type: 'tel', inputMode: 'numeric', autoComplete: 'tel', placeholder: '98250 00000' })}
                  </div>
                ))}
              </div>

              {isFirm && (
                <div className="au-reveal">
                  <h2 style={{ marginTop: 32 }}>Firm details</h2>
                  {field('firmName', <><span>Law firm name</span><Req /></>, input('firmName', firmName, setFirmName, { autoComplete: 'organization', placeholder: 'Mehta & Associates' }))}
                  {field('gstin', <>GST number <span className="au-opt">— optional</span></>,
                    input('gstin', gstin, v => setGstin(v.toUpperCase()), { maxLength: 15, placeholder: '24AAACM1234F1Z5' }),
                    <div className="au-hint">
                      <span>You can add this later in firm settings.</span>
                      <span className={`au-count${gstin.length === 15 ? ' full' : ''}`}>{gstin.length}/15</span>
                    </div>
                  )}
                </div>
              )}

              <div className="au-row" style={{ marginTop: 8 }}>
                {field('state', <><span>State</span><Req /></>, (
                  <select id="state" value={state} onChange={e => setState(e.target.value)}
                          onFocus={() => setFocus('state')} onBlur={() => setFocus('')}>
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                ))}
                {field('city', <><span>City</span><Req /></>, input('city', city, setCity, { autoComplete: 'address-level2', placeholder: 'Ahmedabad' }))}
              </div>
            </div>

            {serverError && (
              <div className="au-flag live" style={{ color: 'var(--err)', marginBottom: 16 }}>{serverError}</div>
            )}

            <div className="au-acts">
              <button type="button" className="au-btn au-ghost" onClick={() => { setIsGoogleSignup(false); go(1); }}>Back</button>
              <button type="button" className={`au-btn au-primary${busy ? ' busy' : ''}`} disabled={busy} onClick={onDetailsContinue}>
                <span className="lbl">{isGoogleSignup ? 'Create Account' : 'Continue'}</span><span className="au-spin" />
              </button>
            </div>
          </section>
        )}

        {/* 3 — verify (email/password flow only) */}
        {step === 3 && !isGoogleSignup && (
          <section className={`au-screen ${dir}`}>
            <div className="au-mid">
              <div className="au-badge">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path className="path" style={{ '--len': 26 } as React.CSSProperties} d="m3 7 9 6 9-6" />
                </svg>
              </div>
              <h1>Check your inbox.</h1>
              <p className="au-sub" style={{ marginBottom: 16 }}>We&apos;ve sent a secure link to</p>
              <div className="au-mail">{maskEmail(email.trim())}</div>
              <p className={`au-timer${secondsLeft <= 120 ? ' low' : ''}`}>
                {secondsLeft > 0 ? <><b>{mm}:{ss}</b> · expires · one use only</> : <b>This link has expired.</b>}
              </p>
            </div>

            <div className="au-note">
              <strong style={{ color: 'var(--t1)' }}>Didn&apos;t get it?</strong><br />
              {resentAt ? (
                <>
                  <span className="au-sent"><Check />New link sent</span> — the previous one no longer works.{' '}
                  {cooldown > 0 ? (
                    <span className="au-cool">
                      <svg viewBox="0 0 16 16">
                        <circle className="bg" cx="8" cy="8" r="6" />
                        <circle className="fg" cx="8" cy="8" r="6"
                                style={{ strokeDashoffset: 38 * ((RESEND_COOLDOWN - cooldown) / RESEND_COOLDOWN) }} />
                      </svg>
                      {cooldown}s until you can resend
                    </span>
                  ) : (
                    <button type="button" className="au-link" onClick={resend}>Send another link</button>
                  )}
                </>
              ) : (
                <>Check your spam folder, or <button type="button" className="au-link" onClick={resend}>send a new link</button>. Sending a new link cancels the previous one.</>
              )}
            </div>

            <div className="au-acts">
              <button type="button" className="au-btn au-ghost" onClick={() => go(2)}>Back</button>
              {/* TODO(api): the real flow arrives at /activate?token=… from the email.
                  This button stands in for that hop until the endpoint exists. */}
              <button type="button" className="au-btn au-primary" onClick={() => go(4)}>
                <span className="lbl">I&apos;ve opened the link</span><span className="au-spin" />
              </button>
            </div>
          </section>
        )}

        {/* 4 — password (email/password flow only) */}
        {step === 4 && !isGoogleSignup && (
          <section className={`au-screen ${dir}`}>
            <h1>Secure your account.</h1>
            <p className="au-sub">Choose a password you don&apos;t use anywhere else.</p>

            {serverError && (
              <div className="au-flag live" style={{ color: 'var(--err)', marginBottom: 16 }}>{serverError}</div>
            )}

            <div className={`au-f${errors.pw1 ? ' bad' : ''}`} key={`pw1-${nudge}`}>
              <label htmlFor="pw1">Create password <Req /></label>
              <div className="au-ctl au-pw">
                <input
                  id="pw1" type={showPw.pw1 ? 'text' : 'password'} value={pw1} autoComplete="new-password"
                  placeholder="At least 8 characters"
                  onChange={e => setPw1(e.target.value)}
                  onKeyUp={e => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                  onBlur={() => setCaps(false)}
                />
                <button type="button" className="au-toggle" onClick={() => setShowPw(s => ({ ...s, pw1: !s.pw1 }))}>
                  {showPw.pw1 ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Strength meter */}
              <div className="au-meter">
                {[0,1,2,3].map(i => <i key={i} className={i < Math.min(strength, 4) ? 'on' : ''} />)}
              </div>
              <div className="au-hint">
                <span>{pw1 ? STRENGTH_LABELS[Math.max(0, Math.min(strength - 1, 3))] : 'Minimum 8 characters with mixed case, numbers and symbols.'}</span>
              </div>

              {/* Password checklist — shows only when user has started typing */}
              {pw1.length > 0 && (
                <div className="au-pw-checklist">
                  {pwChecks.map(r => (
                    <div key={r.id} className={`au-pw-check${r.passed ? ' pass' : ''}`}>
                      <svg viewBox="0 0 16 16">
                        {r.passed
                          ? <path d="m3 8 3.5 3.5L13 5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          : <circle cx="8" cy="8" r="3" />
                        }
                      </svg>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}

              <div className={`au-flag${caps ? ' live' : ''}`}>Caps Lock is on.</div>
              <div className="au-err">{errors.pw1}</div>
            </div>

            <div className={`au-f${errors.pw2 ? ' bad' : ''}`} key={`pw2-${nudge}`}>
              <label htmlFor="pw2">Confirm password <Req /></label>
              <div className={`au-ctl au-pw${pw2 && pw2 === pw1 && passwordValid ? ' ok' : ''}`}>
                <input
                  id="pw2" type={showPw.pw2 ? 'text' : 'password'} value={pw2} autoComplete="new-password"
                  placeholder="Re-enter password"
                  onChange={e => setPw2(e.target.value)}
                  onKeyUp={e => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                  onBlur={() => setCaps(false)}
                />
                <button type="button" className="au-toggle" onClick={() => setShowPw(s => ({ ...s, pw2: !s.pw2 }))}>
                  {showPw.pw2 ? 'Hide' : 'Show'}
                </button>
                <svg className="au-good" viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
              </div>
              <div className="au-err">{errors.pw2}</div>
            </div>

            <div className="au-acts">
              <span />
              <button type="button" className={`au-btn au-primary${busy ? ' busy' : ''}`} disabled={busy} onClick={onCreateAccount}>
                <span className="lbl">Create account</span><span className="au-spin" />
              </button>
            </div>
          </section>
        )}

        {/* 5 — done */}
        {step === 5 && (
          <section className="au-screen fwd">
            <div className="au-mid">
              <div className="au-badge">
                <svg viewBox="0 0 24 24">
                  <path className="path" style={{ '--len': 22 } as React.CSSProperties} d="m5 13 4 4L19 7" />
                </svg>
              </div>
              <h1>{isFirm ? "Your firm's workspace is ready." : 'Your workspace is ready.'}</h1>
              <p className="au-sub">
                {isFirm ? "You can invite your team whenever you're ready."
                        : 'Everything is set up. You can start adding cases straight away.'}
              </p>
            </div>
            <div className="au-acts" style={{ justifyContent: 'center', border: 0, paddingTop: 8 }}>
              <button type="button" className="au-btn au-primary" onClick={() => router.push('/dashboard')}>
                <span className="lbl">{isFirm ? 'Enter Workspace' : 'Go to Dashboard'}</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
