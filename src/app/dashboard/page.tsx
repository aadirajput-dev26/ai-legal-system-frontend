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
                <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#6f7a7a] mb-3">
                  {currentDateHeader}
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#f3f4f5]">
                  <span>{countToWord(cases.length)} matters. </span>
                  <span className="text-[#646e6e] font-serif">
                    {hearingsToday.length === 0 ? 'Nothing listed today.' : `${countToWord(hearingsToday.length)} listed today.`}
                  </span>
                </h1>
              </div>

              <Link
                href="/cases"
                className="self-start md:self-auto bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-medium text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
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
                <div className="rounded-2xl bg-[#141818] border border-[#222828] p-6 sm:p-7 relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="text-xs font-mono tracking-wider uppercase text-[#2dd4bf] font-medium">
                        NEXT IN COURT {hearingDate ? `· ${format(hearingDate, 'EEE d MMM · HH:mm')} ${daysLabel ? `· ${daysLabel}` : ''}` : ''}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-serif text-[#f3f4f5] tracking-tight">
                        {nextCase.title}
                      </h2>

                      <p className="text-sm text-[#879292]">
                        {[nextCase.court, nextCase.stage || 'Pleadings', nextCase.judge ? `before Judge ${nextCase.judge}` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    <Link
                      href={`/cases/${nextCase.id}`}
                      className="self-start lg:self-center bg-[#1a1f1f] hover:bg-[#222828] border border-[#2b3333] text-[#f3f4f5] text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      Open brief
                      <ArrowRight className="w-4 h-4 text-[#879292]" />
                    </Link>
                  </div>

                  {/* Readiness Checklist */}
                  <div className="mt-8 pt-6 border-t border-[#1e2323]">
                    <div className="text-[11px] font-mono tracking-wider uppercase text-[#6f7a7a] mb-4">
                      READINESS — {caseTasksDone} OF {caseTasksTotal}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {/* Fixed status badges reflecting briefing progress */}
                      <div className="flex items-center gap-2.5 text-sm text-[#c5cccc]">
                        <Check className="w-4 h-4 text-[#2dd4bf] stroke-[2.5]" />
                        <span>Pleadings filed</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-[#c5cccc]">
                        <Check className="w-4 h-4 text-[#2dd4bf] stroke-[2.5]" />
                        <span>Counsel briefed</span>
                      </div>

                      {nextCaseTasks.length > 0 ? (
                        nextCaseTasks.slice(0, 2).map((task) => (
                          <div 
                            key={task.id}
                            onClick={() => handleToggleTaskStatus(task)}
                            className="flex items-center gap-2.5 text-sm text-[#f3f4f5] cursor-pointer group"
                          >
                            {task.status === 'COMPLETED' ? (
                              <Check className="w-4 h-4 text-[#2dd4bf] stroke-[2.5]" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-[#f59e0b] group-hover:border-[#2dd4bf] flex items-center justify-center" />
                            )}
                            <span className="underline decoration-[#3a4242] underline-offset-4 group-hover:text-[#2dd4bf] transition-colors truncate">
                              {task.title}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 text-sm text-[#f3f4f5] group">
                            <div className="w-4 h-4 rounded-full border border-[#f59e0b] flex items-center justify-center" />
                            <span className="underline decoration-[#3a4242] underline-offset-4 truncate">
                              Reconcile invoices against inspection
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-[#f3f4f5] group">
                            <div className="w-4 h-4 rounded-full border border-[#f59e0b] flex items-center justify-center" />
                            <span className="underline decoration-[#3a4242] underline-offset-4 truncate">
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

              <div className="relative pl-6 space-y-7 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#202626]">
                {casesWithHearing.slice(0, 4).map((c, idx) => {
                  const hDate = parseISO(c.next_hearing_date!);
                  const colorDot = idx === 0 ? 'bg-[#f59e0b]' : idx === 1 ? 'bg-[#2dd4bf]' : 'bg-[#4b5555]';
                  const textColor = idx === 0 ? 'text-[#f59e0b]' : idx === 1 ? 'text-[#2dd4bf]' : 'text-[#879292]';

                  return (
                    <div key={c.id} className="relative group">
                      <div className={`absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full ${colorDot} ring-4 ring-[#0d0f0f]`} />
                      
                      <div className="space-y-1">
                        <div className={`text-[11px] font-mono tracking-wider uppercase font-semibold ${textColor}`}>
                          {format(hDate, 'EEE d MMM · HH:mm')} · {(c.court || 'AHMEDABAD').toUpperCase()}
                        </div>

                        <Link 
                          href={`/cases/${c.id}`}
                          className="block text-lg font-serif text-[#f3f4f5] hover:text-[#2dd4bf] transition-colors"
                        >
                          {c.title}
                        </Link>

                        <div className="text-xs text-[#6f7a7a]">
                          {[c.stage || 'Pleadings', c.case_number || 'QA/CIV/2026/001', '1 task outstanding']
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {casesWithHearing.length === 0 && (
                  <p className="text-sm text-[#6f7a7a] py-4">No scheduled hearings in the next 14 days.</p>
                )}
              </div>
            </div>

            {/* ── Bottom Split: Outstanding Tasks & Lately Stream ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4 border-t border-[#1a1e1e]">
              
              {/* Outstanding Tasks */}
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">
                  OUTSTANDING <span className="text-[#879292] font-sans">{completedTasks.length} of {tasks.length}</span>
                </div>

                <div className="space-y-3">
                  {tasks.slice(0, 4).map(task => {
                    const parentCase = cases.find(c => c.id === task.case_id);
                    const isDone = task.status === 'COMPLETED';

                    return (
                      <div 
                        key={task.id}
                        onClick={() => handleToggleTaskStatus(task)}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#141717] cursor-pointer transition-colors group"
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isDone 
                            ? 'bg-[#2dd4bf] border-[#2dd4bf] text-[#091b18]' 
                            : 'border-[#424d4d] group-hover:border-[#2dd4bf]'
                        }`}>
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${isDone ? 'line-through text-[#6f7a7a]' : 'text-[#f3f4f5]'}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-[#6f7a7a]">
                            {parentCase ? parentCase.title : 'General matter'} · {task.due_date ? `due ${format(new Date(task.due_date), 'EEE d MMM')}` : 'no due date'}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {tasks.length === 0 && (
                    <p className="text-xs text-[#6f7a7a] py-3">All tasks are up to date.</p>
                  )}
                </div>
              </div>

              {/* Lately Activity Stream */}
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">
                  LATELY
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span className="text-xs text-[#6f7a7a] font-mono w-6 text-right">2h</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-[#f3f4f5] font-medium">Progressed to Preliminary hearing</p>
                      <p className="text-[#6f7a7a]">Mira Vale v. Orion Housing · you</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 border-l-2 border-[#818cf8] pl-2 -ml-2">
                    <span className="text-xs text-[#818cf8] font-mono w-6 text-right">3h</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-[#f3f4f5] font-medium">Task proposed — reconcile invoices</p>
                      <p className="text-[#818cf8]">Suggested by LegalDesk · awaiting you</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="text-xs text-[#6f7a7a] font-mono w-6 text-right">5h</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-[#f3f4f5] font-medium">Progressed to Pleadings</p>
                      <p className="text-[#6f7a7a]">Aster Textiles · A. Shah</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="text-xs text-[#6f7a7a] font-mono w-6 text-right">Fri</span>
                    <div className="text-xs space-y-0.5">
                      <p className="text-[#f3f4f5] font-medium">Exhibit C added — arbitration chronology</p>
                      <p className="text-[#6f7a7a]">Mira Vale · you</p>
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
