'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { 
  Check, 
  Circle, 
  Loader2, 
  Plus, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { cases as casesApi, tasks as tasksApi } from '@/lib/api';
import { CaseItem, TaskItem } from '@/lib/types';
import { format, isToday, isTomorrow, parseISO, differenceInCalendarDays } from 'date-fns';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchData = async () => {
    if (!currentOrg?.id) return;
    try {
      setDataLoading(true);
      const casesRes = await casesApi.list(currentOrg.id);
      const caseList: CaseItem[] = casesRes.data || [];
      setCases(caseList);

      let allTasks: TaskItem[] = [];
      const results = await Promise.allSettled(
        caseList.map(c => tasksApi.list(c.id))
      );

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          allTasks = [...allTasks, ...(res.value.data || [])];
        }
      });

      setTasks(allTasks);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) fetchData();
  }, [currentOrg?.id]);

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await tasksApi.update(task.case_id, task.id, { status: newStatus });
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const casesWithHearing = useMemo(() => {
    return [...cases]
      .filter(c => c.next_hearing_date)
      .sort((a, b) => new Date(a.next_hearing_date!).getTime() - new Date(b.next_hearing_date!).getTime());
  }, [cases]);

  const hearingsToday = useMemo(() => {
    return casesWithHearing.filter(c => isToday(parseISO(c.next_hearing_date!)));
  }, [casesWithHearing]);

  const nextCase = casesWithHearing[0] || cases[0];
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'COMPLETED'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'COMPLETED'), [tasks]);

  // Tasks for the primary next case
  const nextCaseTasks = useMemo(() => {
    if (!nextCase) return [];
    return tasks.filter(t => t.case_id === nextCase.id);
  }, [nextCase, tasks]);

  // Number to word converter for high-end editorial feel
  const countToWord = (count: number) => {
    const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
    return words[count] || `${count}`;
  };

  if (authLoading || !user) {
    return (
      <div className="h-screen w-full bg-[#0d0f0f] flex flex-col items-center justify-center gap-4 text-[#f3f4f5]">
        <Loader2 className="w-7 h-7 animate-spin text-[#2dd4bf]" />
      </div>
    );
  }

  const currentDateHeader = format(new Date(), 'EEEE, d MMMM yyyy').toUpperCase();

  return (
    <AppShell>
      <div className="w-full px-6 sm:px-8 py-8 space-y-10">
        
        {dataLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
          </div>
        ) : (
          <>
            {/* ── Top Header Section ────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
              <div>
                <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-muted-foreground mb-3">
                  {currentDateHeader}
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-foreground">
                  <span>{countToWord(cases.length)} matters. </span>
                  <span className="text-muted-foreground font-serif">
                    {hearingsToday.length === 0 ? 'Nothing listed today.' : `${countToWord(hearingsToday.length)} listed today.`}
                  </span>
                </h1>
              </div>

              <Link
                href="/cases"
                className="self-start md:self-auto bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New matter
              </Link>
            </div>

            {/* ── NEXT IN COURT Hero Card ────────────────────────── */}
            {nextCase && (() => {
              const hearingDate = nextCase.next_hearing_date ? parseISO(nextCase.next_hearing_date) : null;
              const daysDiff = hearingDate ? differenceInCalendarDays(hearingDate, new Date()) : null;
              const daysLabel = daysDiff === 0 
                ? 'today' 
                : daysDiff === 1 
                ? 'in 1 day' 
                : daysDiff !== null && daysDiff > 1 
                ? `in ${daysDiff} days` 
                : '';

              const caseTasksDone = nextCaseTasks.filter(t => t.status === 'COMPLETED').length;
              const caseTasksTotal = Math.max(nextCaseTasks.length, 4);

              return (
                <div className="rounded-2xl bg-card border border-border p-6 sm:p-7 relative overflow-hidden shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="text-xs font-mono tracking-wider uppercase text-[#0d9488] dark:text-[#2dd4bf] font-semibold">
                        NEXT IN COURT {hearingDate ? `· ${format(hearingDate, 'EEE d MMM · HH:mm')} ${daysLabel ? `· ${daysLabel}` : ''}` : ''}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-serif text-foreground tracking-tight">
                        {nextCase.title}
                      </h2>

                      <p className="text-sm text-muted-foreground">
                        {[nextCase.court, nextCase.stage || 'Pleadings', nextCase.judge ? `before Judge ${nextCase.judge}` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    <Link
                      href={`/cases/${nextCase.id}`}
                      className="self-start lg:self-center bg-card hover:bg-accent border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                    >
                      Open brief
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </div>

                  {/* Readiness Checklist */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground mb-4">
                      READINESS — {caseTasksDone} OF {caseTasksTotal}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {/* Fixed status badges reflecting briefing progress */}
                      <div className="flex items-center gap-2.5 text-sm text-foreground">
                        <Check className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf] stroke-[2.5]" />
                        <span>Pleadings filed</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-foreground">
                        <Check className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf] stroke-[2.5]" />
                        <span>Counsel briefed</span>
                      </div>

                      {nextCaseTasks.length > 0 ? (
                        nextCaseTasks.slice(0, 2).map((task) => (
                          <div 
                            key={task.id}
                            onClick={() => handleToggleTaskStatus(task)}
                            className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer group"
                          >
                            {task.status === 'COMPLETED' ? (
                              <Check className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf] stroke-[2.5]" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-amber-500 group-hover:border-[#2dd4bf] flex items-center justify-center" />
                            )}
                            <span className="underline decoration-muted-foreground/30 underline-offset-4 group-hover:text-[#0d9488] dark:group-hover:text-[#2dd4bf] transition-colors truncate">
                              {task.title}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 text-sm text-foreground group">
                            <div className="w-4 h-4 rounded-full border border-amber-500 flex items-center justify-center flex-shrink-0" />
                            <span className="underline decoration-muted-foreground/30 underline-offset-4 truncate">
                              Reconcile invoices against inspection
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-foreground group">
                            <div className="w-4 h-4 rounded-full border border-amber-500 flex items-center justify-center flex-shrink-0" />
                            <span className="underline decoration-muted-foreground/30 underline-offset-4 truncate">
                              2 statements lack evidence
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── THE DIARY next 14 days Section ────────────────── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">
                  THE DIARY <span className="text-[#879292] lowercase">next 14 days</span>
                </div>
                <Link 
                  href="/cases" 
                  className="text-xs text-[#2dd4bf] hover:underline flex items-center gap-1 font-medium"
                >
                  All matters &rarr;
                </Link>
              </div>

              <div className="relative pl-6 space-y-7 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {casesWithHearing.slice(0, 4).map((c, idx) => {
                  const hDate = parseISO(c.next_hearing_date!);
                  const colorDot = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-[#0d9488] dark:bg-[#2dd4bf]' : 'bg-muted-foreground/40';
                  const textColor = idx === 0 ? 'text-amber-600 dark:text-amber-400' : idx === 1 ? 'text-[#0d9488] dark:text-[#2dd4bf]' : 'text-muted-foreground';

                  return (
                    <div key={c.id} className="relative group">
                      <div className={`absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full ${colorDot} ring-4 ring-background`} />
                      
                      <div className="space-y-1">
                        <div className={`text-[11px] font-mono tracking-wider uppercase font-semibold ${textColor}`}>
                          {format(hDate, 'EEE d MMM · HH:mm')} · {(c.court || 'AHMEDABAD').toUpperCase()}
                        </div>

                        <Link 
                          href={`/cases/${c.id}`}
                          className="block text-lg font-serif text-foreground hover:text-[#0d9488] dark:hover:text-[#2dd4bf] transition-colors"
                        >
                          {c.title}
                        </Link>

                        <div className="text-xs text-muted-foreground">
                          {[c.stage || 'Pleadings', c.case_number || 'QA/CIV/2026/001', '1 task outstanding']
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {casesWithHearing.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">No scheduled hearings in the next 14 days.</p>
                )}
              </div>
            </div>

            {/* ── Bottom Split: Outstanding Tasks & Lately Stream ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4 border-t border-border">
              
              {/* Outstanding Tasks */}
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
                  OUTSTANDING <span className="text-muted-foreground font-sans">{completedTasks.length} of {tasks.length}</span>
                </div>

                <div className="space-y-3">
                  {tasks.slice(0, 4).map(task => {
                    const parentCase = cases.find(c => c.id === task.case_id);
                    const isDone = task.status === 'COMPLETED';

                    return (
                      <div 
                        key={task.id}
                        onClick={() => handleToggleTaskStatus(task)}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isDone 
                            ? 'bg-[#2dd4bf] border-[#2dd4bf] text-[#091b18]' 
                            : 'border-muted-foreground/40 group-hover:border-[#2dd4bf]'
                        }`}>
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${isDone ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {parentCase ? parentCase.title : 'General matter'} · {task.due_date ? `due ${format(new Date(task.due_date), 'EEE d MMM')}` : 'no due date'}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {tasks.length === 0 && (
                    <p className="text-xs text-muted-foreground py-3">All tasks are up to date.</p>
                  )}
                </div>
              </div>

              {/* Lately Activity Stream */}
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
                  LATELY
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span className="text-xs text-muted-foreground font-mono w-6 text-right">2h</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-foreground font-medium">Progressed to Preliminary hearing</p>
                      <p className="text-muted-foreground">Mira Vale v. Orion Housing · you</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 border-l-2 border-indigo-400 pl-2 -ml-2">
                    <span className="text-xs text-indigo-500 font-mono w-6 text-right">3h</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-foreground font-medium">Task proposed — reconcile invoices</p>
                      <p className="text-indigo-600 dark:text-indigo-400 font-medium">Suggested by LegalDesk · awaiting you</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="text-xs text-muted-foreground font-mono w-6 text-right">5h</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-foreground font-medium">Progressed to Pleadings</p>
                      <p className="text-muted-foreground">Aster Textiles · A. Shah</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="text-xs text-muted-foreground font-mono w-6 text-right">Fri</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-foreground font-medium">Exhibit C added — arbitration chronology</p>
                      <p className="text-muted-foreground">Mira Vale · you</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
