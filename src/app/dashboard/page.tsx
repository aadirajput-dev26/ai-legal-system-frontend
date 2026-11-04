'use client';

/**
 * LegalDesk — dashboard.
 *
 * The screen answers one question: "am I ready for what is coming?"
 * It is deliberately NOT organised around "what is scheduled today", because
 * for most advocates most days are empty and a screen full of "nothing"
 * teaches people to stop opening it.
 *
 * Four parts:
 *   1. Next in court  — the next listing as a countdown, with its readiness
 *                       drawn from that matter's tasks. Count and list agree.
 *   2. Needs you now  — ONE queue, ranked by urgency across every matter:
 *                       overdue tasks, due-soon tasks, drafts awaiting review.
 *   3. Diary          — next 14 days, or one selected day from the calendar.
 *   4. Calendar       — shape of the month and LISTING CLASHES (two matters
 *                       on one day in different courts, which nobody can attend).
 *
 * Data comes from existing endpoints only: cases, tasks (per case), hearings
 * (via org calendar), drafts (org-level). Gaps are marked TODO(api).
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import {
  cases as casesApi,
  tasks as tasksApi,
  drafts as draftsApi,
  calendar as calendarApi,
  type Draft,
} from '@/lib/api';
import { CaseItem, TaskItem } from '@/lib/types';
import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import './dashboard.css';

/* ── helpers ──────────────────────────────────────────────────────── */

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function safeDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = typeof v === 'string' && v.includes('T') ? parseISO(v) : new Date(v);
  if (!isValid(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

const daysAway = (d: Date) => differenceInCalendarDays(d, startOfToday());

function countdownLabel(n: number) {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 0) return `${Math.abs(n)} days ago`;
  return `${n} days`;
}

const Tick = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
);

type Listing = { date: Date; caseId: string; title: string; court: string | null; stage: string | null; ref: string | null };
type QueueItem = {
  id: string; kind: 'risk' | 'warn' | 'ai' | 'ok'; tag: string;
  title: string; matter: string; sub: string; href: string; sort: number;
};

/* ── page ─────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [cursor, setCursor] = useState(() => {
    const t = startOfToday(); return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    setFailed(false);
    try {
      const caseRes = await casesApi.list(currentOrg.id);
      const caseList: CaseItem[] = caseRes.data || [];
      setCases(caseList);

      // Tasks are per-case, so this is N+1.
      // TODO(api): an org-level /organisations/:id/tasks would remove it.
      const taskResults = await Promise.allSettled(caseList.map(c => tasksApi.list(c.id)));
      setTasks(
        taskResults.flatMap(r => (r.status === 'fulfilled' ? (r.value.data || []) : [])) as TaskItem[]
      );

      const [draftRes, calRes] = await Promise.allSettled([
        draftsApi.listOrgDrafts(currentOrg.id),
        calendarApi.get(currentOrg.id),
      ]);

      setDrafts(draftRes.status === 'fulfilled' ? (draftRes.value.data || []) : []);

      // Prefer the org calendar; fall back to each case's next_hearing_date.
      const byId = new Map(caseList.map(c => [c.id, c]));
      let rows: Listing[] = [];
      if (calRes.status === 'fulfilled') {
        const raw = (calRes.value as any)?.data ?? (calRes.value as any)?.events ?? [];
        rows = (Array.isArray(raw) ? raw : [])
          .map((e: any) => {
            const d = safeDate(e.date || e.hearing_date || e.start);
            const c = byId.get(e.case_id);
            if (!d) return null;
            return {
              date: d,
              caseId: e.case_id ?? '',
              title: c?.title ?? e.title ?? e.case_title ?? 'Matter',
              court: c?.court ?? e.court ?? null,
              stage: c?.stage ?? null,
              ref: c?.case_number ?? null,
            } as Listing;
          })
          .filter(Boolean) as Listing[];
      }
      if (!rows.length) {
        rows = caseList
          .map(c => {
            const d = safeDate(c.next_hearing_date);
            return d ? { date: d, caseId: c.id, title: c.title, court: c.court ?? null, stage: c.stage ?? null, ref: c.case_number ?? null } : null;
          })
          .filter(Boolean) as Listing[];
      }
      rows.sort((a, b) => a.date.getTime() - b.date.getTime());
      setListings(rows);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id]);

  useEffect(() => { load(); }, [load]);

  /* ── derived ───────────────────────────────────────────────────── */

  const upcoming = useMemo(() => listings.filter(l => daysAway(l.date) >= 0), [listings]);
  const next = upcoming[0] ?? null;

  const readiness = useMemo(() => {
    if (!next) return [];
    return tasks
      .filter(t => t.case_id === next.caseId)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  }, [tasks, next]);

  const queue = useMemo<QueueItem[]>(() => {
    const titleOf = (id: string) => cases.find(c => c.id === id)?.title ?? 'Matter';
    const items: QueueItem[] = [];

    tasks.forEach(t => {
      if (t.status === 'COMPLETED') return;
      const due = safeDate(t.due_date);
      const n = due ? daysAway(due) : null;
      const overdue = t.status === 'OVERDUE' || (n !== null && n < 0);
      if (!overdue && (n === null || n > 7)) return;
      items.push({
        id: `t-${t.id}`,
        kind: overdue ? 'risk' : 'warn',
        tag: overdue ? 'Overdue' : n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : `Due ${format(due!, 'EEE')}`,
        title: t.title,
        matter: titleOf(t.case_id),
        sub: overdue && due ? `${Math.abs(n!)} day${Math.abs(n!) === 1 ? '' : 's'} late` : 'Assigned to you',
        href: `/cases/${t.case_id}`,
        sort: overdue ? -1000 + (n ?? 0) : (n ?? 99),
      });
    });

    drafts.forEach(d => {
      if (d.status !== 'IN_REVIEW') return;
      items.push({
        id: `d-${d.id}`,
        kind: 'ai',
        tag: 'Needs review',
        title: `${d.title} — awaiting your approval`,
        matter: d.case_title ?? titleOf(d.case_id),
        sub: 'Review before it is filed or sent',
        href: `/drafts`,
        sort: 5,
      });
    });

    return items.sort((a, b) => a.sort - b.sort).slice(0, 8);
  }, [tasks, drafts, cases]);

  /* day → events, for the calendar */
  const dayMap = useMemo(() => {
    const m = new Map<string, { hear: Listing[]; tasks: TaskItem[]; late: boolean; courts: Set<string> }>();
    const get = (k: string) => {
      if (!m.has(k)) m.set(k, { hear: [], tasks: [], late: false, courts: new Set() });
      return m.get(k)!;
    };
    listings.forEach(l => {
      const e = get(dayKey(l.date));
      e.hear.push(l);
      if (l.court) e.courts.add(l.court.trim());
    });
    tasks.forEach(t => {
      if (t.status === 'COMPLETED') return;
      const d = safeDate(t.due_date);
      if (!d) return;
      const e = get(dayKey(d));
      e.tasks.push(t);
      if (t.status === 'OVERDUE' || daysAway(d) < 0) e.late = true;
    });
    return m;
  }, [listings, tasks]);

  /* A clash is two listings on one day in DIFFERENT courts — nobody can attend both. */
  const clash = useMemo(() => {
    for (const [k, v] of dayMap) {
      const d = safeDate(k);
      if (d && daysAway(d) >= 0 && v.courts.size > 1) return { key: k, date: d, courts: [...v.courts] };
    }
    return null;
  }, [dayMap]);

  const openTasks = tasks.filter(t => t.status !== 'COMPLETED');
  const overdueCount = openTasks.filter(t => {
    const d = safeDate(t.due_date);
    return t.status === 'OVERDUE' || (d !== null && daysAway(d) < 0);
  }).length;

  async function toggleTask(t: TaskItem) {
    const nextStatus = t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTasks(prev => prev.map(x => (x.id === t.id ? { ...x, status: nextStatus as TaskItem['status'] } : x)));
    try {
      await tasksApi.update(t.case_id, t.id, { status: nextStatus });
    } catch {
      setTasks(prev => prev.map(x => (x.id === t.id ? { ...x, status: t.status } : x)));
    }
  }

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  const firstName = (user?.name || '').trim().split(' ')[0] || 'Counsel';

  /* ── render ────────────────────────────────────────────────────── */

  if (authLoading || !user) {
    return <AppShell><div data-ld-dash><div className="ld-page"><div className="ld-skel" style={{ width: 220 }} /></div></div></AppShell>;
  }

  return (
    <AppShell>
      <div data-ld-dash>
        <div className="ld-page">
          <header className="ld-hello">
            <div className="ld-eyebrow ld-num">
              {format(new Date(), 'EEEE, d MMMM yyyy')}
              {currentOrg?.name ? ` · ${currentOrg.name}` : ''}
            </div>
            <h1 className="ld-h1">{greeting}, {firstName}.</h1>
            <p className="ld-lede">
              {loading ? 'Loading your practice…'
                : failed ? 'Some of your practice data could not be loaded.'
                : overdueCount > 0
                  ? <b style={{ color: 'var(--risk)' }}>
                      {overdueCount} item{overdueCount === 1 ? '' : 's'} overdue
                      {next ? ' before your next hearing.' : '.'}
                    </b>
                  : next
                    ? `Nothing overdue. Your next hearing is ${countdownLabel(daysAway(next.date)).toLowerCase()}.`
                    : 'Nothing overdue.'}
            </p>
          </header>

          {failed && (
            <section className="ld-card" style={{ marginBottom: 20 }}>
              <div className="ld-empty">
                <div className="ld-eh">We could not load everything.</div>
                <p className="ld-ep">Your data is safe — this is a connection problem on our side.</p>
                <button type="button" className="ld-btn ld-primary" onClick={load}>Try again</button>
              </div>
            </section>
          )}

          <div className="ld-grid">
            <div>
              {/* 1 — NEXT IN COURT */}
              <section className="ld-card">
                <div className="ld-chead">
                  <span className="ld-ctitle">Next in court</span>
                  <Link href="/calendar" className="ld-cact">Full diary →</Link>
                </div>
                {loading ? (
                  <div className="ld-next">
                    <div className="ld-skel" style={{ width: 120, marginBottom: 12 }} />
                    <div className="ld-skel" style={{ width: '60%' }} />
                  </div>
                ) : next ? (
                  <NextInCourt
                    listing={next}
                    tasks={readiness}
                    onToggle={toggleTask}
                  />
                ) : (
                  <>
                    <div className="ld-empty">
                      <div className="ld-eh">{cases.length ? 'No hearing dates recorded.' : 'No matters yet.'}</div>
                      <p className="ld-ep">
                        {cases.length
                          ? 'Add a hearing date to a matter and it will appear here with a countdown and a readiness checklist.'
                          : 'Add your first matter and LegalDesk starts tracking its hearing dates, filings and deadlines for you.'}
                      </p>
                      <div className="ld-nacts">
                        <Link href="/cases" className="ld-btn ld-primary">
                          {cases.length ? 'Open matters' : 'Add your first matter'}
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* 2 — ONE RANKED QUEUE */}
              <section className="ld-card">
                <div className="ld-chead">
                  <span className="ld-ctitle">Needs you now</span>
                  {queue.length > 0 && (
                    <span className="ld-num" style={{ fontSize: 13, color: 'var(--t3)' }}>
                      {queue.length} item{queue.length === 1 ? '' : 's'}
                    </span>
                  )}
                  <Link href="/cases" className="ld-cact">All work →</Link>
                </div>
                {loading ? (
                  <div className="ld-empty"><div className="ld-skel" style={{ width: '70%' }} /></div>
                ) : queue.length ? (
                  queue.map(i => (
                    <div className="ld-q" key={i.id}>
                      <span className={`ld-kind ${i.kind}`} />
                      <div className="ld-qbody">
                        <div className="ld-qt">{i.title}</div>
                        <div className="ld-qm">
                          <span className="ld-mt">{i.matter}</span> · {i.sub}
                        </div>
                      </div>
                      <span className={`ld-tag ld-t-${i.kind}`}>{i.tag}</span>
                      <Link href={i.href} className="ld-qgo">Open</Link>
                    </div>
                  ))
                ) : (
                  <div className="ld-empty">
                    <div className="ld-eh">You are clear.</div>
                    <p className="ld-ep">
                      {next
                        ? <>Nothing is outstanding. Your next hearing is <b>{next.title}</b> {countdownLabel(daysAway(next.date)).toLowerCase()}
                          {readiness.filter(t => t.status !== 'COMPLETED').length
                            ? ` — ${readiness.filter(t => t.status !== 'COMPLETED').length} items still to prepare.` : '.'}</>
                        : 'Filings, tasks and drafts awaiting your approval all collect here in one list.'}
                    </p>
                    {next && (
                      <Link href={`/cases/${next.caseId}`} className="ld-btn ld-ghost">Prepare for it now</Link>
                    )}
                  </div>
                )}
              </section>

              {/* 3 — DIARY / SELECTED DAY */}
              <Diary
                listings={upcoming}
                dayMap={dayMap}
                selectedDay={selectedDay}
                onClear={() => setSelectedDay(null)}
                readinessFor={(caseId) => {
                  const t = tasks.filter(x => x.case_id === caseId);
                  return t.length ? `${t.filter(x => x.status === 'COMPLETED').length} of ${t.length} ready` : '';
                }}
              />
            </div>

            <aside>
              {/* 4 — CALENDAR */}
              <section className="ld-card">
                <div className="ld-chead">
                  <span className="ld-ctitle">Diary</span>
                  <Link href="/calendar" className="ld-cact">Open calendar →</Link>
                </div>
                {clash && (
                  <div className="ld-clashwarn">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 9v4.5M12 17v.1" />
                      <path d="M10.3 4.3 2.8 17.2a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
                    </svg>
                    <span>
                      <b>Listing clash on {format(clash.date, 'd MMM')}.</b>{' '}
                      Two matters listed at {clash.courts.join(' and ')}. One will need an appearance arranged.
                    </span>
                  </div>
                )}
                <MiniCalendar
                  cursor={cursor}
                  setCursor={setCursor}
                  dayMap={dayMap}
                  selected={selectedDay}
                  onSelect={k => setSelectedDay(prev => (prev === k ? null : k))}
                />
              </section>

              {/* practice */}
              <section className="ld-card">
                <div className="ld-chead"><span className="ld-ctitle">Practice</span></div>
                <div className="ld-stat">
                  <span className="ld-sv ld-num">{cases.filter(c => c.status === 'OPEN').length}</span>
                  <span className="ld-sl">Active matters</span>
                </div>
                <div className="ld-stat">
                  <span className="ld-sv ld-num">{openTasks.length}</span>
                  <span className="ld-sl">Open tasks</span>
                  {overdueCount > 0 && <span className="ld-sn">{overdueCount} overdue</span>}
                </div>
                <div className="ld-stat">
                  <span className="ld-sv ld-num">{drafts.filter(d => d.status === 'IN_REVIEW').length}</span>
                  <span className="ld-sl">Drafts in review</span>
                </div>
                {/* TODO(api): fees are per-case only (/cases/:id/fees), so an
                    org-level outstanding figure would be N+1. Needs
                    /organisations/:id/fees/summary before it belongs here. */}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── next in court ────────────────────────────────────────────────── */

function NextInCourt({ listing, tasks, onToggle }: {
  listing: Listing; tasks: TaskItem[]; onToggle: (t: TaskItem) => void;
}) {
  const n = daysAway(listing.date);
  const done = tasks.filter(t => t.status === 'COMPLETED').length;
  const total = tasks.length;

  return (
    <div className="ld-next">
      <div className="ld-nhead">
        <div className="ld-when">
          <div className={`ld-cd${n <= 3 ? ' soon' : ''}`}>{countdownLabel(n)}</div>
          <div className="ld-cdl ld-num">{format(listing.date, 'EEE d MMM')}</div>
        </div>
        <div className="ld-nmeta">
          <p className="ld-mname">{listing.title}</p>
          {listing.court && <div className="ld-mline"><b>{listing.court}</b></div>}
          {(listing.ref || listing.stage) && (
            <div className="ld-mline ld-num" style={{ color: 'var(--t3)' }}>
              {[listing.ref, listing.stage].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className="ld-ready">
          <div className="ld-rhead">
            {/* The count is derived from the same list rendered below, so the
                two can never disagree. */}
            <span className="ld-rcount ld-num">{done} of {total} ready</span>
            <span className="ld-bar"><i style={{ width: `${Math.round((done / total) * 100)}%` }} /></span>
          </div>
          {tasks.map(t => {
            const due = safeDate(t.due_date);
            const late = t.status !== 'COMPLETED' && (t.status === 'OVERDUE' || (due !== null && daysAway(due) < 0));
            return (
              <button
                type="button"
                key={t.id}
                className={`ld-ritem${t.status === 'COMPLETED' ? ' done' : ''}${late ? ' late' : ''}`}
                onClick={() => onToggle(t)}
                aria-pressed={t.status === 'COMPLETED'}
              >
                <span className="ld-box"><Tick /></span>
                <span className="ld-rt">{t.title}</span>
                {due && (
                  <span className="ld-rdue">
                    {late ? 'overdue' : daysAway(due) === 0 ? 'due today' : `due ${format(due, 'd MMM')}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="ld-nacts">
        <Link href={`/cases/${listing.caseId}`} className="ld-btn ld-primary">Open matter</Link>
        <Link href={`/cases/${listing.caseId}`} className="ld-btn ld-ghost">Hearing brief</Link>
      </div>
    </div>
  );
}

/* ── diary ────────────────────────────────────────────────────────── */

function Diary({ listings, dayMap, selectedDay, onClear, readinessFor }: {
  listings: Listing[];
  dayMap: Map<string, { hear: Listing[]; tasks: TaskItem[]; late: boolean; courts: Set<string> }>;
  selectedDay: string | null;
  onClear: () => void;
  readinessFor: (caseId: string) => string;
}) {
  if (selectedDay) {
    const d = safeDate(selectedDay)!;
    const e = dayMap.get(selectedDay);
    return (
      <section className="ld-card">
        <div className="ld-chead">
          <span className="ld-ctitle">Selected day</span>
          <b className="ld-num" style={{ fontSize: 13 }}>{format(d, 'EEEE d MMMM')}</b>
          <button type="button" className="ld-cact" onClick={onClear}>Back to 14 days</button>
        </div>
        {e && (e.hear.length || e.tasks.length) ? (
          <>
            {e.hear.map(h => (
              <Link href={`/cases/${h.caseId}`} className="ld-d" key={`h-${h.caseId}`}>
                <div className="ld-dwhen"><b>Hearing</b></div>
                <div className="ld-dwhat">
                  <span className="ld-serif">{h.title}</span>
                  <div className="ld-dsub">{[h.court, h.stage].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="ld-din">{readinessFor(h.caseId)}</div>
              </Link>
            ))}
            {e.tasks.map(t => (
              <Link href={`/cases/${t.case_id}`} className="ld-d" key={`t-${t.id}`}>
                <div className="ld-dwhen"><b>Task</b></div>
                <div className="ld-dwhat">{t.title}</div>
                <div className="ld-din">{t.status === 'COMPLETED' ? 'done' : ''}</div>
              </Link>
            ))}
          </>
        ) : (
          <div className="ld-empty">
            <div className="ld-eh">Nothing listed on this day.</div>
            <p className="ld-ep">A clear day. You could use it to prepare for what is coming.</p>
          </div>
        )}
      </section>
    );
  }

  const fortnight = listings.filter(l => daysAway(l.date) <= 14);
  return (
    <section className="ld-card">
      <div className="ld-chead">
        <span className="ld-ctitle">Next 14 days</span>
        <Link href="/calendar" className="ld-cact">Calendar →</Link>
      </div>
      {fortnight.length ? (
        fortnight.map(l => (
          <Link href={`/cases/${l.caseId}`} className="ld-d" key={`${l.caseId}-${dayKey(l.date)}`}>
            <div className="ld-dwhen"><b>{format(l.date, 'EEE d MMM')}</b></div>
            <div className="ld-dwhat">
              <span className="ld-serif">{l.title}</span>
              <div className="ld-dsub">{[l.court, l.stage].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="ld-din">{readinessFor(l.caseId)}</div>
          </Link>
        ))
      ) : (
        <div className="ld-empty">
          <div className="ld-eh">Nothing listed in the next fortnight.</div>
          <p className="ld-ep">
            {listings.length
              ? 'Your diary is clear for two weeks. The next listing is further out — it is on the calendar.'
              : 'Hearing dates appear here as soon as a matter has one.'}
          </p>
        </div>
      )}
    </section>
  );
}

/* ── mini calendar ────────────────────────────────────────────────── */

function MiniCalendar({ cursor, setCursor, dayMap, selected, onSelect }: {
  cursor: Date;
  setCursor: (d: Date) => void;
  dayMap: Map<string, { hear: Listing[]; tasks: TaskItem[]; late: boolean; courts: Set<string> }>;
  selected: string | null;
  onSelect: (k: string) => void;
}) {
  const today = startOfToday();
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday-first

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return d;
  });

  return (
    <div className="ld-cal">
      <div className="ld-calbar">
        <span className="ld-calm ld-num">{format(first, 'MMMM yyyy')}</span>
        <button type="button" className="ld-calnav" aria-label="Previous month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <button type="button" className="ld-calnav" aria-label="Next month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </div>

      <div className="ld-calgrid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => (
          <div className="ld-cdow" key={i}>{x}</div>
        ))}
        {cells.map(d => {
          const k = dayKey(d);
          const e = dayMap.get(k);
          const out = d.getMonth() !== first.getMonth();
          const count = e ? e.hear.length + e.tasks.length : 0;
          const classes = [
            'ld-cday',
            out ? 'out' : '',
            count >= 3 ? 'load2' : count > 0 ? 'load1' : '',
            k === dayKey(today) ? 'today' : '',
            k === selected ? 'sel' : '',
          ].filter(Boolean).join(' ');
          return (
            <button type="button" key={k} className={classes} onClick={() => onSelect(k)}
              aria-pressed={k === selected}
              aria-label={`${format(d, 'EEEE d MMMM')}${count ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}>
              {d.getDate()}
              <span className="ld-cdot">
                {e?.late && <i className="ld-i-late" />}
                {e && e.hear.length > 0 && <i className="ld-i-hear" />}
                {e && e.tasks.length > 0 && !e.late && <i className="ld-i-task" />}
              </span>
              {e && e.courts.size > 1 && <span className="ld-clash" />}
            </button>
          );
        })}
      </div>

      <div className="ld-legend">
        <span><i className="ld-i-hear" />Hearing</span>
        <span><i className="ld-i-task" />Task due</span>
        <span><i className="ld-i-late" />Overdue</span>
      </div>
    </div>
  );
}
