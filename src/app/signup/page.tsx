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
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import './signup.css';

const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'];
const GST_STATE: Record<string, string> = { Delhi:'07', Gujarat:'24', Karnataka:'29', Maharashtra:'27', Rajasthan:'08', 'Tamil Nadu':'33', Telangana:'36', 'Uttar Pradesh':'09', 'West Bengal':'19' };
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','rediffmail.com'];
const STRENGTH = ['Too short','Getting there','Good','Strong'];
const LINK_SECONDS = 30 * 60;
const RESEND_COOLDOWN = 30;

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

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

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

  /* ── navigation ─────────────────────────────────── */
  function go(to: number) {
    setDir(to > step ? 'fwd' : 'back');
    setStep(to);
    if (to === 3) setSecondsLeft(LINK_SECONDS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onDetailsContinue() {
    const next = validateDetails();
    setErrors(next);
    setNudge(n => n + 1);
    if (Object.keys(next).length) return;
    setBusy(true);
    // TODO(api): POST /auth/signup/start — create the pending signup and send
    // the verification link. No such endpoint exists yet, so this is a delay.
    setTimeout(() => { setBusy(false); go(3); }, 650);
  }

  function resend() {
    if (cooldown > 0) return;
    // TODO(api): POST /auth/signup/resend — must be rate limited per email AND per IP.
    setResentAt(Date.now());
    setCooldown(RESEND_COOLDOWN);
    setSecondsLeft(LINK_SECONDS);
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
    if (pw1.length < 12) next.pw1 = 'Use at least 12 characters.';
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
  const strength = (() => {
    let s = 0;
    if (pw1.length >= 12) s++;
    if (pw1.length >= 16) s++;
    if (/[^A-Za-z0-9]/.test(pw1) || /\s/.test(pw1)) s++;
    if (/\d/.test(pw1) && /[A-Za-z]/.test(pw1)) s++;
    return s;
  })();

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

  const stepLabels = ['Account type', 'Your details', 'Verify email', 'Password'];
  const activeStep = Math.min(step, 4);
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
        {step < 5 && (
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
            <p className="au-tiny">
              Already have an account? <Link href="/login" className="au-link">Sign in</Link>
            </p>
          </section>
        )}

        {/* 2 — details */}
        {step === 2 && (
          <section className={`au-screen ${dir}`}>
            <h1>{isFirm ? "Set up your firm's workspace." : 'Tell us about yourself.'}</h1>
            <p className="au-sub">{isFirm ? "You'll be the owner of this workspace." : "We'll use this to set up your practice."}</p>

            <div className="au-stag">
              <h2>{isFirm ? 'Administrator details' : 'Your details'}</h2>

              {field('name', 'Full name', input('name', name, setName, { autoComplete: 'name', placeholder: 'Adv. Priya Mehta' }))}

              <div className="au-row">
                {field('email', 'Email address',
                  input('email', email, setEmail, { type: 'email', autoComplete: 'email', placeholder: 'priya@example.com' }),
                  typo ? (
                    <div className="au-flag live">
                      Did you mean{' '}
                      <button type="button" onClick={() => { setEmail(typo); setTypo(''); setTouched(t => ({ ...t, email: true })); }}>{typo}</button>?
                    </div>
                  ) : null
                )}

                {field('mobile', 'Mobile number', (
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
                  {field('firmName', 'Law firm name', input('firmName', firmName, setFirmName, { autoComplete: 'organization', placeholder: 'Mehta & Associates' }))}
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
                {field('state', 'State', (
                  <select id="state" value={state} onChange={e => setState(e.target.value)}
                          onFocus={() => setFocus('state')} onBlur={() => setFocus('')}>
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                ))}
                {field('city', 'City', input('city', city, setCity, { autoComplete: 'address-level2', placeholder: 'Ahmedabad' }))}
              </div>
            </div>

            <div className="au-acts">
              <button type="button" className="au-btn au-ghost" onClick={() => go(1)}>Back</button>
              <button type="button" className={`au-btn au-primary${busy ? ' busy' : ''}`} disabled={busy} onClick={onDetailsContinue}>
                <span className="lbl">Continue</span><span className="au-spin" />
              </button>
            </div>
          </section>
        )}

        {/* 3 — verify */}
        {step === 3 && (
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
                {secondsLeft > 0 ? <>Expires in <b>{mm}:{ss}</b> · can be used once</> : <b>This link has expired.</b>}
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

        {/* 4 — password */}
        {step === 4 && (
          <section className={`au-screen ${dir}`}>
            <h1>Secure your account.</h1>
            <p className="au-sub">Choose a password you don&apos;t use anywhere else.</p>

            {serverError && (
              <div className="au-flag live" style={{ color: 'var(--err)', marginBottom: 16 }}>{serverError}</div>
            )}

            <div className={`au-f${errors.pw1 ? ' bad' : ''}`} key={`pw1-${nudge}`}>
              <label htmlFor="pw1">Create password</label>
              <div className="au-ctl au-pw">
                <input
                  id="pw1" type={showPw.pw1 ? 'text' : 'password'} value={pw1} autoComplete="new-password"
                  placeholder="At least 12 characters"
                  onChange={e => setPw1(e.target.value)}
                  onKeyUp={e => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                  onBlur={() => setCaps(false)}
                />
                <button type="button" className="au-toggle" onClick={() => setShowPw(s => ({ ...s, pw1: !s.pw1 }))}>
                  {showPw.pw1 ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="au-meter">
                {[0,1,2,3].map(i => <i key={i} className={i < strength ? 'on' : ''} />)}
              </div>
              <div className="au-hint">
                <span>{pw1 ? STRENGTH[Math.max(0, strength - 1)] : "A short phrase you'll remember works better than a complicated word."}</span>
              </div>
              <div className={`au-flag${caps ? ' live' : ''}`}>Caps Lock is on.</div>
              <div className="au-err">{errors.pw1}</div>
            </div>

            <div className={`au-f${errors.pw2 ? ' bad' : ''}`} key={`pw2-${nudge}`}>
              <label htmlFor="pw2">Confirm password</label>
              <div className={`au-ctl au-pw${pw2 && pw2 === pw1 && pw1.length >= 12 ? ' ok' : ''}`}>
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
