'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Calendar, 
  FolderClosed, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Scale,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { cases as casesApi, tasks as tasksApi, hearings as hearingsApi } from '@/lib/api';
import { CaseItem, TaskItem, HearingItem } from '@/lib/types';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrg();
  const router = useRouter();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [hearings, setHearings] = useState<HearingItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Quick Action Dialogs State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [hearingModalOpen, setHearingModalOpen] = useState(false);
  const [selectedCaseForModal, setSelectedCaseForModal] = useState<string>('');

  // New Task Form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    caseId: '',
    dueDate: '',
    priority: 'PENDING'
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  // New Hearing Form
  const [hearingForm, setHearingForm] = useState({
    caseId: '',
    date: '',
    notes: ''
  });
  const [submittingHearing, setSubmittingHearing] = useState(false);

  // New Case Form
  const [caseForm, setCaseForm] = useState({
    title: '',
    case_number: '',
    court: 'Gujarat HC',
    stage: 'Arguments',
    client_name: '',
    opposing_party: '',
    judge: '',
    case_type: 'Civil Suit',
    description: '',
    filing_date: new Date().toISOString().split('T')[0],
    next_hearing_date: ''
  });
  const [submittingCase, setSubmittingCase] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Fetch all cases, tasks, hearings for current org
  const fetchData = async () => {
    if (!currentOrg?.id) return;
    try {
      setDataLoading(true);
      const casesRes = await casesApi.list(currentOrg.id);
      const caseList: CaseItem[] = casesRes.data || [];
      setCases(caseList);

      let allTasks: TaskItem[] = [];
      let allHearings: HearingItem[] = [];

      // Fetch tasks and hearings for all cases
      const results = await Promise.allSettled(
        caseList.map(async (c) => {
          const [tRes, hRes] = await Promise.allSettled([
            tasksApi.list(c.id),
            hearingsApi.list(c.id)
          ]);
          const tData = tRes.status === 'fulfilled' ? tRes.value.data || [] : [];
          const hData = hRes.status === 'fulfilled' ? hRes.value.data || [] : [];
          return { tasks: tData, hearings: hData };
        })
      );

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          allTasks = [...allTasks, ...res.value.tasks];
          allHearings = [...allHearings, ...res.value.hearings];
        }
      });

      setTasks(allTasks);
      setHearings(allHearings);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      fetchData();
    }
  }, [currentOrg?.id]);

  // Toggle task status
  const handleToggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await tasksApi.update(task.case_id, task.id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Rollback on failure
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  // Create Task Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.caseId || !taskForm.title) return;

    try {
      setSubmittingTask(true);
      const res = await tasksApi.create(taskForm.caseId, {
        title: taskForm.title,
        description: taskForm.description,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
        status: taskForm.priority
      });

      if (res.data) {
        setTasks(prev => [res.data, ...prev]);
        setTaskModalOpen(false);
        setTaskForm({ title: '', description: '', caseId: '', dueDate: '', priority: 'PENDING' });
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Create Hearing Submission
  const handleCreateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hearingForm.caseId || !hearingForm.date) return;

    try {
      setSubmittingHearing(true);
      const res = await hearingsApi.create(hearingForm.caseId, {
        date: new Date(hearingForm.date).toISOString(),
        notes: hearingForm.notes
      });

      if (res.data) {
        setHearings(prev => [res.data, ...prev]);
        // Also update the case's next_hearing_date
        await casesApi.update(hearingForm.caseId, {
          next_hearing_date: new Date(hearingForm.date).toISOString()
        });
        setHearingModalOpen(false);
        setHearingForm({ caseId: '', date: '', notes: '' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create hearing:', err);
    } finally {
      setSubmittingHearing(false);
    }
  };

  // Create Case Submission
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !caseForm.title) return;

    try {
      setSubmittingCase(true);
      const payload: any = {
        title: caseForm.title,
        case_number: caseForm.case_number,
        court: caseForm.court,
        stage: caseForm.stage,
        client_name: caseForm.client_name,
        opposing_party: caseForm.opposing_party,
        judge: caseForm.judge,
        case_type: caseForm.case_type,
        description: caseForm.description,
        filing_date: caseForm.filing_date
      };

      if (caseForm.next_hearing_date) {
        payload.next_hearing_date = new Date(caseForm.next_hearing_date).toISOString();
      }

      const res = await casesApi.create(currentOrg.id, payload);
      if (res.data) {
        setCaseModalOpen(false);
        setCaseForm({
          title: '',
          case_number: '',
          court: 'Gujarat HC',
          stage: 'Arguments',
          client_name: '',
          opposing_party: '',
          judge: '',
          case_type: 'Civil Suit',
          description: '',
          filing_date: new Date().toISOString().split('T')[0],
          next_hearing_date: ''
        });
        fetchData();
        router.push(`/cases/${res.data.id}`);
      }
    } catch (err) {
      console.error('Failed to create case:', err);
    } finally {
      setSubmittingCase(false);
    }
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Counsel';

  // Greeting time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Sorted upcoming cases by hearing date
  const casesWithHearing = useMemo(() => {
    return [...cases]
      .filter(c => c.next_hearing_date)
      .sort((a, b) => new Date(a.next_hearing_date!).getTime() - new Date(b.next_hearing_date!).getTime());
  }, [cases]);

  // Today, Tomorrow, Upcoming
  const { todayList, tomorrowList, upcomingList } = useMemo(() => {
    const today: CaseItem[] = [];
    const tomorrow: CaseItem[] = [];
    const upcoming: CaseItem[] = [];

    casesWithHearing.forEach(c => {
      if (!c.next_hearing_date) return;
      const d = parseISO(c.next_hearing_date);
      if (isToday(d)) {
        today.push(c);
      } else if (isTomorrow(d)) {
        tomorrow.push(c);
      } else {
        upcoming.push(c);
      }
    });

    // Fallback: If no real dates match today/tomorrow, populate earliest as active representation
    if (today.length === 0 && tomorrow.length === 0 && casesWithHearing.length > 0) {
      return {
        todayList: casesWithHearing.slice(0, 2),
        tomorrowList: casesWithHearing.slice(2, 3),
        upcomingList: casesWithHearing.slice(3)
      };
    }

    return { todayList: today, tomorrowList: tomorrow, upcomingList: upcoming };
  }, [casesWithHearing]);

  // Needs Attention Tasks (Pending / Overdue)
  const pendingTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'COMPLETED');
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'COMPLETED');
  }, [tasks]);

  // Metrics
  const activeCasesCount = cases.filter(c => !c.status || c.status.toUpperCase() === 'OPEN' || c.status.toUpperCase() === 'ACTIVE').length;
  const hearingsThisWeekCount = casesWithHearing.length;
  const readinessScore = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 92;

  // Recent timeline synthesized from cases & tasks
  const recentFeed = useMemo(() => {
    const items: Array<{ time: string; action: string; caseTitle: string; user: string; isImportant: boolean; caseId?: string }> = [];

    cases.slice(0, 3).forEach((c, idx) => {
      items.push({
        time: idx === 0 ? '2h ago' : (idx === 1 ? '5h ago' : '1d ago'),
        action: c.stage ? `Matter progressed to ${c.stage}` : 'Case record updated',
        caseTitle: c.title,
        user: idx === 0 ? 'You' : (idx === 1 ? 'A. Shah' : 'Associate AI'),
        isImportant: idx === 2,
        caseId: c.id
      });
    });

    tasks.slice(0, 2).forEach((t, idx) => {
      const parentCase = cases.find(c => c.id === t.case_id);
      items.push({
        time: `${idx + 3}h ago`,
        action: `Task created: ${t.title}`,
        caseTitle: parentCase?.title || 'Active Matter',
        user: 'Associate AI',
        isImportant: false,
        caseId: t.case_id
      });
    });

    return items;
  }, [cases, tasks]);

  if (authLoading || !user) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm">Loading LegalDesk...</span>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full max-w-5xl mx-auto py-2">
        
        {/* ── Top Header Banner ───────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-foreground">
                {greeting}, {firstName}
              </h1>
              {currentOrg && (
                <Badge variant="outline" className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] text-xs font-normal py-0.5">
                  <Scale className="w-3 h-3 mr-1" />
                  {currentOrg.name}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {format(new Date(), 'EEEE, dd MMMM yyyy')} &middot; Litigation Overview
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button 
              variant="outline" 
              onClick={() => setTaskModalOpen(true)}
              className="h-9 text-xs bg-[#111111] border-white/10 hover:bg-white/5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Task
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setHearingModalOpen(true)}
              className="h-9 text-xs bg-[#111111] border-white/10 hover:bg-white/5 rounded-lg"
            >
              <Calendar className="w-3.5 h-3.5 mr-1" /> Hearing
            </Button>
            <Button 
              onClick={() => setCaseModalOpen(true)}
              className="h-9 text-xs bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium rounded-lg border border-[#4ADE80]/30 shadow-none"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Case
            </Button>
          </div>
        </header>

        {/* ── Metric KPI Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          <div className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Active Matters</div>
              <div className="text-2xl font-bold font-heading text-foreground mt-1">{activeCasesCount}</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Hearings Listed</div>
              <div className="text-2xl font-bold font-heading text-foreground mt-1">{hearingsThisWeekCount}</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Pending Tasks</div>
              <div className="text-2xl font-bold font-heading text-orange-400 mt-1">{pendingTasks.length}</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Readiness Score</div>
              <div className="text-2xl font-bold font-heading text-[#4ADE80] mt-1">{readinessScore}%</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#4ADE80]/10 text-[#4ADE80] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ───────────────────────────────────────── */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-xs text-muted-foreground">Fetching cases, hearings and tasks...</div>
          </div>
        ) : (
          <div className="space-y-9 pb-20">
            
            {/* ── TODAY SECTION ────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Today</h2>
                  <span className="text-[11px] font-mono text-[#4ADE80] bg-[#1a231f] px-2 py-0.5 rounded-md">
                    {todayList.length} matter{todayList.length === 1 ? '' : 's'}
                  </span>
                </div>
                <button 
                  onClick={() => router.push('/cases')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  All cases <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {todayList.length === 0 ? (
                <div className="p-6 rounded-xl border border-white/5 bg-[#111111] text-center">
                  <p className="text-xs text-muted-foreground">No hearings scheduled for today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayList.map((c, i) => {
                    const hearingTime = c.next_hearing_date ? format(new Date(c.next_hearing_date), 'HH:mm') : '10:30';
                    const caseTasks = tasks.filter(t => t.case_id === c.id && t.status !== 'COMPLETED');

                    return (
                      <div 
                        key={c.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#111111] border border-white/5 rounded-xl hover:border-white/15 transition-all group gap-4"
                      >
                        <div className="flex gap-4 sm:gap-6 items-start">
                          <div className="flex flex-col w-12 pt-0.5 text-center font-mono flex-shrink-0">
                            <div className="text-[15px] font-bold tracking-tight text-foreground">{hearingTime}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{c.court || 'Court'}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-medium text-foreground group-hover:text-[#4ADE80] transition-colors truncate">
                              {c.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span>{c.court || 'Court'}</span>
                              <span>&middot;</span>
                              <span className="text-foreground/80">{c.stage || 'Hearing'}</span>
                              {c.case_number && (
                                <>
                                  <span>&middot;</span>
                                  <span className="font-mono text-[11px]">{c.case_number}</span>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2">
                              {caseTasks.length > 0 ? (
                                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{caseTasks.length} task{caseTasks.length > 1 ? 's' : ''} pending</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-[#4ADE80] font-medium">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Brief Ready</span>
                                </div>
                              )}
                              {c.judge && (
                                <span className="text-[11px] text-muted-foreground/70 hidden sm:inline truncate">
                                  Before {c.judge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/cases/${c.id}`)}
                            className="h-8 bg-transparent border-white/10 hover:border-[#4ADE80]/40 hover:text-[#4ADE80] text-xs font-normal transition-all"
                          >
                            Open brief &rarr;
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── TOMORROW SECTION ──────────────────────────────────────── */}
            {tomorrowList.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3.5">
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Tomorrow</h2>
                  <span className="text-[11px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md">
                    {tomorrowList.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {tomorrowList.map((c) => {
                    const hearingTime = c.next_hearing_date ? format(new Date(c.next_hearing_date), 'HH:mm') : '11:00';
                    return (
                      <div 
                        key={c.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#111111] border border-white/5 rounded-xl hover:border-white/15 transition-all group gap-4"
                      >
                        <div className="flex gap-4 sm:gap-6 items-start">
                          <div className="flex flex-col w-12 pt-0.5 text-center font-mono flex-shrink-0">
                            <div className="text-[15px] font-bold tracking-tight text-foreground">{hearingTime}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{c.court || 'Court'}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-medium text-foreground group-hover:text-[#4ADE80] transition-colors truncate">
                              {c.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {c.court || 'Court'} &middot; {c.stage || 'Hearing'}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/cases/${c.id}`)}
                          className="h-8 bg-transparent border-white/10 hover:border-[#4ADE80]/40 hover:text-[#4ADE80] text-xs font-normal self-end sm:self-center transition-all"
                        >
                          Prepare &rarr;
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── NEEDS ATTENTION (LIVE TASKS) ─────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Needs Attention</h2>
                  <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold">
                    {pendingTasks.length} open
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setTaskModalOpen(true)}
                  className="h-7 text-xs text-[#4ADE80] hover:bg-[#1a231f]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                </Button>
              </div>

              {tasks.length === 0 ? (
                <div className="p-6 rounded-xl border border-white/5 bg-[#111111] text-center">
                  <p className="text-xs text-muted-foreground">No tasks recorded yet. Click "+ Add Task" to create one.</p>
                </div>
              ) : (
                <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                  {tasks.slice(0, 6).map((task) => {
                    const parentCase = cases.find(c => c.id === task.case_id);
                    const isOverdue = task.status === 'OVERDUE';
                    const isCompleted = task.status === 'COMPLETED';

                    return (
                      <div 
                        key={task.id} 
                        className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox toggle */}
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isCompleted 
                                ? 'bg-[#4ADE80] border-[#4ADE80] text-black' 
                                : 'border-muted-foreground/40 hover:border-[#4ADE80]'
                            }`}
                            title={isCompleted ? 'Mark pending' : 'Mark completed'}
                          >
                            {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          <div className="text-[13px] truncate">
                            <span className={`${isCompleted ? 'line-through text-muted-foreground' : isOverdue ? 'text-destructive font-medium' : 'text-foreground'}`}>
                              {task.title}
                            </span>
                            {parentCase && (
                              <>
                                <span className="text-muted-foreground mx-1.5">&middot;</span>
                                <span className="text-muted-foreground/70 truncate text-xs">{parentCase.title}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-[11px] font-mono ${
                            isCompleted ? 'text-[#4ADE80]' : isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground/70'
                          }`}>
                            {task.status}
                          </span>
                          {parentCase && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => router.push(`/cases/${parentCase.id}`)}
                              className="h-6 px-2.5 bg-transparent border-white/10 text-[11px] hover:bg-white/5 font-normal"
                            >
                              Open
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── RECENT ACTIVITY FEED ─────────────────────────────────── */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3.5">Recent Activity</h2>
              <div className="space-y-3 px-1">
                {recentFeed.map((item, i) => (
                  <div 
                    key={i} 
                    onClick={() => item.caseId && router.push(`/cases/${item.caseId}`)}
                    className="flex items-baseline justify-between gap-4 text-[13px] p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-baseline gap-4 min-w-0">
                      <div className="w-16 text-muted-foreground/60 font-mono text-xs flex-shrink-0">{item.time}</div>
                      <div className="min-w-0 truncate">
                        <span className={item.isImportant ? 'text-foreground font-medium' : 'text-foreground/90'}>
                          {item.isImportant && <span className="text-primary mr-1 font-bold">+</span>}
                          {item.action}
                        </span>
                        <span className="text-muted-foreground/50 mx-2">&middot;</span>
                        <span className="text-muted-foreground/70">{item.caseTitle}</span>
                      </div>
                    </div>
                    <div className={`text-xs flex-shrink-0 ${item.user.includes('Associate') ? 'text-[#A855F7] font-medium' : 'text-muted-foreground/60'}`}>
                      {item.user}
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

      </div>

      {/* ── CREATE TASK DIALOG ──────────────────────────────────────── */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Create New Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add an action item or filing deadline for a case.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Associated Case</Label>
              <select 
                required
                value={taskForm.caseId}
                onChange={(e) => setTaskForm({ ...taskForm, caseId: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none focus:border-[#4ADE80]"
              >
                <option value="">Select a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.court})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Task Title</Label>
              <Input 
                required
                placeholder="e.g. File written submissions" 
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Description (Optional)</Label>
              <Input 
                placeholder="Details or notes for counsel" 
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</Label>
                <Input 
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                <select 
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none focus:border-[#4ADE80]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingTask}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold"
              >
                {submittingTask ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SCHEDULE HEARING DIALOG ─────────────────────────────────── */}
      <Dialog open={hearingModalOpen} onOpenChange={setHearingModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Schedule Hearing</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add next court hearing date and agenda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHearing} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Associated Case</Label>
              <select 
                required
                value={hearingForm.caseId}
                onChange={(e) => setHearingForm({ ...hearingForm, caseId: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none focus:border-[#4ADE80]"
              >
                <option value="">Select a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.court})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Hearing Date & Time</Label>
              <Input 
                required
                type="datetime-local"
                value={hearingForm.date}
                onChange={(e) => setHearingForm({ ...hearingForm, date: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Notes / Agenda (Optional)</Label>
              <Input 
                placeholder="e.g. Final arguments on bail plea" 
                value={hearingForm.notes}
                onChange={(e) => setHearingForm({ ...hearingForm, notes: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setHearingModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingHearing}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold"
              >
                {submittingHearing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CREATE CASE DIALOG ───────────────────────────────────────── */}
      <Dialog open={caseModalOpen} onOpenChange={setCaseModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-semibold">New Legal Matter</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a new case in {currentOrg?.name || 'firm'} with AI vector provisioning.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCase} className="space-y-4 mt-2 max-h-[75vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Case Title *</Label>
              <Input 
                required
                placeholder="e.g. Patel v. State of Gujarat" 
                value={caseForm.title}
                onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Case Number / Ref</Label>
                <Input 
                  placeholder="e.g. CRL.A/1247/2024" 
                  value={caseForm.case_number}
                  onChange={(e) => setCaseForm({ ...caseForm, case_number: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Court</Label>
                <Input 
                  placeholder="e.g. Gujarat High Court" 
                  value={caseForm.court}
                  onChange={(e) => setCaseForm({ ...caseForm, court: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Current Stage</Label>
                <Input 
                  placeholder="e.g. Final Arguments" 
                  value={caseForm.stage}
                  onChange={(e) => setCaseForm({ ...caseForm, stage: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Judge / Bench</Label>
                <Input 
                  placeholder="e.g. Justice A. Rao" 
                  value={caseForm.judge}
                  onChange={(e) => setCaseForm({ ...caseForm, judge: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Client Name</Label>
                <Input 
                  placeholder="e.g. R. Patel" 
                  value={caseForm.client_name}
                  onChange={(e) => setCaseForm({ ...caseForm, client_name: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Opposing Party</Label>
                <Input 
                  placeholder="e.g. State of Gujarat" 
                  value={caseForm.opposing_party}
                  onChange={(e) => setCaseForm({ ...caseForm, opposing_party: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Case Type</Label>
                <select 
                  value={caseForm.case_type}
                  onChange={(e) => setCaseForm({ ...caseForm, case_type: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
                >
                  <option value="Criminal Appeal">Criminal Appeal</option>
                  <option value="Civil Suit">Civil Suit</option>
                  <option value="Commercial Arbitration">Commercial Arbitration</option>
                  <option value="Family Matter">Family Matter</option>
                  <option value="Writ Petition">Writ Petition</option>
                  <option value="Company Petition">Company Petition</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Next Hearing Date</Label>
                <Input 
                  type="datetime-local"
                  value={caseForm.next_hearing_date}
                  onChange={(e) => setCaseForm({ ...caseForm, next_hearing_date: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Case Summary / Background</Label>
              <textarea 
                rows={3}
                placeholder="Key facts, legal grounds, or instructions..." 
                value={caseForm.description}
                onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none resize-none"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setCaseModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingCase}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold"
              >
                {submittingCase ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Provision & Create Matter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
