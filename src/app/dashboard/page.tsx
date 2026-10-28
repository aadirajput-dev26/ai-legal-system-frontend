'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { 
  Check, 
  Loader2, 
  Plus, 
  ArrowRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Gavel, 
  CheckCircle2, 
  ListTodo, 
  ExternalLink, 
  Users, 
  Video, 
  MapPin, 
  Zap,
  Bell,
  CheckCheck,
  RefreshCw,
  Trash2,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { cases as casesApi, tasks as tasksApi, hearings as hearingsApi, calendar as calendarApi, legalUpdates as legalUpdatesApi, notifications as notificationsApi } from '@/lib/api';
import { RotatingLegalUpdate, LegalUpdateItem } from '@/components/chat/RotatingLegalUpdate';
import { CaseItem, TaskItem, CalendarDocket, NotificationItem } from '@/lib/types';
import { 
  format, 
  isToday, 
  isTomorrow, 
  isPast, 
  parseISO, 
  differenceInCalendarDays,
  formatDistanceToNow,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────
export interface PracticeMeeting {
  id: string;
  title: string;
  date: Date;
  timeStr?: string;
  caseTitle?: string;
  caseId?: string;
  clientName?: string;
  location: string;
  isVirtual?: boolean;
  type?: string;
  attendees?: string;
  notes?: string;
}

export interface PracticeEvent {
  id: string;
  title: string;
  date: Date;
  type: 'HEARING' | 'MEETING' | 'TASK';
  caseId?: string | null;
  caseTitle?: string | null;
  caseNumber?: string | null;
  court?: string | null;
  courtroom?: string | null;
  itemNumber?: string | null;
  stage?: string | null;
  judge?: string | null;
  clientName?: string | null;
  status?: string | null;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  isOverdue?: boolean;
  location?: string | null;
  isVirtual?: boolean;
  attendees?: string | null;
  notes?: string | null;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();

  // Real Database State (No static mock data)
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetings, setMeetings] = useState<PracticeMeeting[]>([]);
  const [docket, setDocket] = useState<CalendarDocket>({ hearings: [], tasks: [], cases: [] });
  const [legalUpdates, setLegalUpdates] = useState<LegalUpdateItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsFilter, setNotificationsFilter] = useState<'ALL' | 'UNREAD' | 'HEARING_ALERT' | 'TASK_DUE'>('ALL');
  const [syncingAlerts, setSyncingAlerts] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarFilter, setCalendarFilter] = useState<'ALL' | 'HEARINGS' | 'MEETINGS' | 'TASKS'>('ALL');

  // Modals
  const [newHearingModalOpen, setNewHearingModalOpen] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newMeetingModalOpen, setNewMeetingModalOpen] = useState(false);

  // Forms
  const [hearingForm, setHearingForm] = useState({
    caseId: '',
    date: new Date().toISOString().slice(0, 16),
    notes: ''
  });
  const [taskForm, setTaskForm] = useState({
    caseId: '',
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'HIGH'
  });
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    caseId: '',
    date: new Date().toISOString().slice(0, 16),
    location: 'Chambers Conference Room A',
    isVirtual: false,
    attendees: 'Counsel, Client',
    notes: ''
  });
  const [submittingModal, setSubmittingModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Load Real Data from Backend API
  const fetchData = async () => {
    if (!currentOrg?.id) return;
    try {
      setDataLoading(true);
      const [casesRes, calendarRes, updatesRes, notifsRes] = await Promise.allSettled([
        casesApi.list(currentOrg.id),
        calendarApi.get(currentOrg.id),
        legalUpdatesApi.get(),
        notificationsApi.list({ orgId: currentOrg.id })
      ]);

      const loadedCases: CaseItem[] = casesRes.status === 'fulfilled' ? casesRes.value.data || [] : [];
      setCases(loadedCases);

      if (calendarRes.status === 'fulfilled' && calendarRes.value.data) {
        setDocket(calendarRes.value.data);
      } else {
        setDocket({ hearings: [], tasks: [], cases: [] });
      }

      if (updatesRes.status === 'fulfilled' && updatesRes.value.updates) {
        setLegalUpdates(updatesRes.value.updates);
      }

      if (notifsRes.status === 'fulfilled' && notifsRes.value.data) {
        setNotifications(notifsRes.value.data.notifications || []);
        setUnreadNotificationCount(notifsRes.value.data.unreadCount || 0);
      }

      // Collect real tasks across all organization cases
      let allTasks: TaskItem[] = [];
      if (loadedCases.length > 0) {
        const taskResults = await Promise.allSettled(
          loadedCases.map(c => tasksApi.list(c.id))
        );
        taskResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value.data) {
            allTasks = [...allTasks, ...(res.value.data || [])];
          }
        });
      }
      setTasks(allTasks);

      // Load user-created meetings from localStorage for this organization
      try {
        const storedMeetings = localStorage.getItem(`legaldesk_meetings_${currentOrg.id}`);
        if (storedMeetings) {
          const parsed = JSON.parse(storedMeetings);
          setMeetings(parsed.map((m: any) => ({ ...m, date: new Date(m.date) })));
        } else {
          setMeetings([]);
        }
      } catch {
        setMeetings([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setCases([]);
      setTasks([]);
      setMeetings([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) fetchData();
  }, [currentOrg?.id]);

  // Handle Task Completion Toggle
  const handleToggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await tasksApi.update(task.case_id, task.id, { status: newStatus });
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  // Submit New Hearing to Backend
  const handleCreateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hearingForm.caseId || !hearingForm.date) return;
    try {
      setSubmittingModal(true);
      await hearingsApi.create(hearingForm.caseId, {
        date: new Date(hearingForm.date).toISOString(),
        notes: hearingForm.notes
      });
      setNewHearingModalOpen(false);
      setHearingForm({ caseId: '', date: new Date().toISOString().slice(0, 16), notes: '' });
      await fetchData();
    } catch (err) {
      console.error('Failed to schedule hearing:', err);
    } finally {
      setSubmittingModal(false);
    }
  };

  // Submit New Task to Backend
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.caseId || !taskForm.title) return;
    try {
      setSubmittingModal(true);
      await tasksApi.create(taskForm.caseId, {
        title: taskForm.title,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
        status: 'PENDING'
      });
      setNewTaskModalOpen(false);
      setTaskForm({ caseId: '', title: '', dueDate: new Date().toISOString().split('T')[0], priority: 'HIGH' });
      await fetchData();
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setSubmittingModal(false);
    }
  };

  // Submit New Meeting
  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.date || !currentOrg?.id) return;
    const parentCase = cases.find(c => c.id === meetingForm.caseId);
    const newMeeting: PracticeMeeting = {
      id: `meet-${Date.now()}`,
      title: meetingForm.title,
      date: new Date(meetingForm.date),
      timeStr: format(new Date(meetingForm.date), 'hh:mm a'),
      caseTitle: parentCase?.title,
      caseId: meetingForm.caseId || undefined,
      clientName: parentCase?.client_name || undefined,
      location: meetingForm.location,
      isVirtual: meetingForm.isVirtual,
      type: 'CLIENT_CONFERENCE',
      attendees: meetingForm.attendees,
      notes: meetingForm.notes
    };
    const updated = [newMeeting, ...meetings];
    setMeetings(updated);
    try {
      localStorage.setItem(`legaldesk_meetings_${currentOrg.id}`, JSON.stringify(updated));
    } catch {}
    setNewMeetingModalOpen(false);
    setMeetingForm({
      title: '',
      caseId: '',
      date: new Date().toISOString().slice(0, 16),
      location: 'Chambers Conference Room A',
      isVirtual: false,
      attendees: 'Counsel, Client',
      notes: ''
    });
  };

  // ── Practice Alerts Handlers ────────────────────────────────────────
  const handleSyncAlerts = async () => {
    if (!currentOrg?.id) return;
    try {
      setSyncingAlerts(true);
      const res = await notificationsApi.sync(currentOrg.id);
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadNotificationCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to sync alerts:', err);
    } finally {
      setSyncingAlerts(false);
    }
  };

  const handleToggleNotificationRead = async (item: NotificationItem) => {
    try {
      if (item.is_read) {
        await notificationsApi.markUnread(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: false } : n));
        setUnreadNotificationCount(c => c + 1);
      } else {
        await notificationsApi.markRead(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
        setUnreadNotificationCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to toggle notification read state:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentOrg?.id) return;
    try {
      await notificationsApi.markAllRead(currentOrg.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const target = notifications.find(n => n.id === id);
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (target && !target.is_read) {
        setUnreadNotificationCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // ── Unified Practice Events from Real Data ──────────────────────────
  const allEvents = useMemo(() => {
    const list: PracticeEvent[] = [];

    // 1. Real hearings from docket
    docket.hearings.forEach(h => {
      if (!h.date) return;
      try {
        const d = parseISO(h.date);
        list.push({
          id: `h-${h.id}`,
          title: h.case_title || 'Court Hearing',
          date: d,
          type: 'HEARING',
          caseId: h.case_id,
          caseTitle: h.case_title,
          caseNumber: h.case_number,
          court: h.court,
          stage: h.stage || 'Court Appearance',
          judge: h.judge,
          clientName: h.client_name
        });
      } catch {}
    });

    // Also include next_hearing_date from real cases if not in docket hearings
    cases.forEach(c => {
      if (!c.next_hearing_date) return;
      const alreadyAdded = list.some(e => e.type === 'HEARING' && e.caseId === c.id);
      if (!alreadyAdded) {
        try {
          list.push({
            id: `case-h-${c.id}`,
            title: c.title,
            date: parseISO(c.next_hearing_date),
            type: 'HEARING',
            caseId: c.id,
            caseTitle: c.title,
            caseNumber: c.case_number,
            court: c.court,
            stage: c.stage || 'Hearing',
            judge: c.judge,
            clientName: c.client_name
          });
        } catch {}
      }
    });

    // 2. Real user meetings
    meetings.forEach(m => {
      list.push({
        id: `m-${m.id}`,
        title: m.title,
        date: m.date,
        type: 'MEETING',
        caseId: m.caseId,
        caseTitle: m.caseTitle,
        clientName: m.clientName,
        location: m.location,
        isVirtual: m.isVirtual,
        attendees: m.attendees,
        notes: m.notes
      });
    });

    // 3. Real tasks from database
    tasks.forEach(t => {
      if (!t.due_date) return;
      try {
        const d = parseISO(t.due_date);
        const parentCase = cases.find(c => c.id === t.case_id);
        const overdue = t.status !== 'COMPLETED' && isPast(d) && !isToday(d);
        list.push({
          id: `t-${t.id}`,
          title: t.title,
          date: d,
          type: 'TASK',
          caseId: t.case_id,
          caseTitle: parentCase?.title,
          caseNumber: parentCase?.case_number,
          court: parentCase?.court,
          status: t.status,
          isOverdue: overdue
        });
      } catch {}
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [docket.hearings, cases, tasks, meetings]);

  // ── Slices for Lawyer Workflow ──────────────────────────────────────
  const hearingsToday = useMemo(() => {
    return allEvents.filter(e => e.type === 'HEARING' && isToday(e.date));
  }, [allEvents]);

  const meetingsToday = useMemo(() => {
    return allEvents.filter(e => e.type === 'MEETING' && isToday(e.date));
  }, [allEvents]);

  const upcomingHearings = useMemo(() => {
    return allEvents.filter(e => e.type === 'HEARING' && !isToday(e.date) && differenceInCalendarDays(e.date, new Date()) >= 1);
  }, [allEvents]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'COMPLETED' || !t.due_date) return false;
      const d = parseISO(t.due_date);
      return isPast(d) && !isToday(d);
    });
  }, [tasks]);

  const pendingTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'COMPLETED');
  }, [tasks]);

  const currentMonthEvents = useMemo(() => {
    return allEvents.filter(e => isSameMonth(e.date, calendarDate));
  }, [allEvents, calendarDate]);

  const monthHearingsCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'HEARING').length;
  }, [currentMonthEvents]);

  const monthMeetingsCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'MEETING').length;
  }, [currentMonthEvents]);

  const monthTasksCount = useMemo(() => {
    return currentMonthEvents.filter(e => e.type === 'TASK').length;
  }, [currentMonthEvents]);

  const filteredEvents = useMemo(() => {
    if (calendarFilter === 'ALL') return allEvents;
    if (calendarFilter === 'HEARINGS') return allEvents.filter(e => e.type === 'HEARING');
    if (calendarFilter === 'MEETINGS') return allEvents.filter(e => e.type === 'MEETING');
    if (calendarFilter === 'TASKS') return allEvents.filter(e => e.type === 'TASK');
    return allEvents;
  }, [allEvents, calendarFilter]);

  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter(e => isSameDay(e.date, selectedDate));
  }, [filteredEvents, selectedDate]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (notificationsFilter === 'UNREAD') return !n.is_read;
      if (notificationsFilter === 'HEARING_ALERT') return n.type === 'HEARING_ALERT';
      if (notificationsFilter === 'TASK_DUE') return n.type === 'TASK_DUE';
      return true;
    });
  }, [notifications, notificationsFilter]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [calendarDate]);

  if (authLoading || !user) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center gap-4 text-foreground">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="w-full px-5 sm:px-8 py-7 space-y-7 max-w-[1720px] mx-auto text-foreground">
        
        {/* ── Top Command Bar ───────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-muted-foreground mb-1.5">
              <span>{format(new Date(), 'EEEE, d MMMM yyyy').toUpperCase()}</span>
              <span>·</span>
              <span className="text-primary font-semibold">{currentOrg?.name || 'Workspace'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-foreground">
              {greeting}, {user.name?.split(' ')[0] || 'Counsel'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Lawyer Command Center · You have <strong className="text-amber-500 dark:text-amber-400 font-mono">{hearingsToday.length} court {hearingsToday.length === 1 ? 'hearing' : 'hearings'}</strong>, <strong className="text-indigo-500 dark:text-indigo-400 font-mono">{meetingsToday.length} {meetingsToday.length === 1 ? 'conference' : 'conferences'}</strong>, and <strong className="text-red-500 dark:text-red-400 font-mono">{overdueTasks.length} urgent {overdueTasks.length === 1 ? 'deadline' : 'deadlines'}</strong> today.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={() => {
                setHearingForm(prev => ({
                  ...prev,
                  date: new Date().toISOString().slice(0, 16)
                }));
                setNewHearingModalOpen(true);
              }}
              className="h-9 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold text-xs rounded-lg px-3.5 cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
            >
              <Gavel className="w-3.5 h-3.5" /> Schedule hearing
            </Button>

            <Button
              onClick={() => {
                setMeetingForm(prev => ({
                  ...prev,
                  date: new Date().toISOString().slice(0, 16)
                }));
                setNewMeetingModalOpen(true);
              }}
              className="h-9 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-lg px-3.5 cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Schedule meeting
            </Button>

            <Button
              onClick={() => setNewTaskModalOpen(true)}
              className="h-9 bg-card hover:bg-muted border border-border text-foreground text-xs font-medium rounded-lg px-3.5 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
            >
              <ListTodo className="w-3.5 h-3.5 text-primary" /> Add task
            </Button>

            <Link
              href="/cases"
              className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> New matter
            </Link>
          </div>
        </div>

        {/* ── 4 KPI Status Chips ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Today's Court Listings */}
          <div className={`p-4 rounded-xl border transition-all ${
            hearingsToday.length > 0 
              ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40 shadow-sm' 
              : 'bg-card border-border'
          }`}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground">TODAY&apos;S HEARINGS</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Gavel className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
            <div className="text-3xl font-serif text-foreground">
              {hearingsToday.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {hearingsToday.length > 0 ? `First listing at ${format(hearingsToday[0].date, 'hh:mm a')}` : 'No appearances today'}
            </p>
          </div>

          {/* Overdue Work */}
          <div className={`p-4 rounded-xl border transition-all ${
            overdueTasks.length > 0 
              ? 'bg-red-500/10 dark:bg-red-950/20 border-red-500/40 shadow-sm' 
              : 'bg-card border-border'
          }`}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground">OVERDUE WORK</span>
              <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              </div>
            </div>
            <div className={`text-3xl font-serif ${overdueTasks.length > 0 ? 'text-red-500 font-bold' : 'text-foreground'}`}>
              {overdueTasks.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {overdueTasks.length > 0 ? `${overdueTasks.length} ${overdueTasks.length === 1 ? 'filing requires' : 'filings require'} attention` : 'All filings on schedule'}
            </p>
          </div>

          {/* Today's Meetings */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground">TODAY&apos;S MEETINGS</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
              </div>
            </div>
            <div className="text-3xl font-serif text-foreground">
              {meetingsToday.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {meetingsToday.length > 0 ? `${meetingsToday.length} ${meetingsToday.length === 1 ? 'session' : 'sessions'} scheduled` : 'No meetings today'}
            </p>
          </div>

          {/* Pending Tasks */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground">PENDING TASKS</span>
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <ListTodo className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-serif text-foreground">
              {pendingTasks.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {tasks.filter(t => t.status === 'COMPLETED').length} resolved · {pendingTasks.length} actionable
            </p>
          </div>
        </div>

        {/* ── LIVE LEGAL INTELLIGENCE UPDATES DIGEST (Real-time /legal-updates API) ── */}
        {legalUpdates && legalUpdates.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <RotatingLegalUpdate
              updates={legalUpdates}
              onInquire={(item) => {
                if (cases.length > 0) {
                  router.push(`/cases/${cases[0].id}`);
                } else {
                  router.push('/cases');
                }
              }}
            />
          </div>
        )}

        {/* ── DYNAMIC LAWYER ACTION CENTER (Computed from real data) ─── */}
        <div className="rounded-2xl border border-teal-500/35 bg-teal-500/5 dark:bg-teal-950/20 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5">
                <Zap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/30">
                    Lawyer Action Center
                  </span>
                  <span className="text-xs text-muted-foreground">Today&apos;s status</span>
                </div>
                <h3 className="text-base sm:text-lg font-serif text-foreground font-semibold">
                  {hearingsToday.length > 0 && overdueTasks.length > 0
                    ? `${hearingsToday.length} court ${hearingsToday.length === 1 ? 'appearance' : 'appearances'} today · ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'filing requires' : 'filings require'} attention`
                    : hearingsToday.length > 0
                    ? `${hearingsToday.length} court ${hearingsToday.length === 1 ? 'appearance' : 'appearances'} listed for today`
                    : overdueTasks.length > 0
                    ? `Court docket clear · ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'item requires' : 'items require'} immediate submission`
                    : pendingTasks.length > 0
                    ? `Court docket clear · ${pendingTasks.length} active ${pendingTasks.length === 1 ? 'task' : 'tasks'} in progress`
                    : 'All matters, appearances, and filings are currently up to date'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  {hearingsToday.length > 0
                    ? `Next listing at ${format(hearingsToday[0].date, 'hh:mm a')} in ${hearingsToday[0].court || hearingsToday[0].caseTitle || 'court'}. ${overdueTasks.length > 0 ? `Please resolve the ${overdueTasks.length} overdue filings before the registry cutoff.` : ''}`
                    : overdueTasks.length > 0
                    ? `Review and complete the ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'filing' : 'filings'} listed below to maintain compliance.`
                    : pendingTasks.length > 0
                    ? `No court hearings listed today. Continue work on your ${pendingTasks.length} pending drafting tasks and matter milestones.`
                    : 'No immediate deadlines or hearings. Use the action buttons above to schedule upcoming hearings, add tasks, or register new matters.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              {hearingsToday.length > 0 && hearingsToday[0].caseId ? (
                <Link
                  href={`/cases/${hearingsToday[0].caseId}`}
                  className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  Open Brief <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : overdueTasks.length > 0 ? (
                <a
                  href="#overdue-section"
                  className="h-8 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  View Overdue Work <ArrowRight className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Link
                  href="/cases"
                  className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  View Matters <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              <a
                href="#calendar-section"
                className="h-8 bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-medium px-3.5 rounded-lg flex items-center gap-1.5 transition-all"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-primary" /> View Calendar
              </a>
            </div>
          </div>
        </div>

        {/* ── Main Two-Column Layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* ════ LEFT COLUMN (7 Cols): Today, Overdue, Meetings, Upcoming, Tasks ═══ */}
          <div className="xl:col-span-7 space-y-7">
            
            {/* 1. OVERDUE WORK SECTION (Only rendered when real overdue tasks exist) */}
            {overdueTasks.length > 0 && (
              <div id="overdue-section" className="rounded-2xl border border-red-500/40 bg-red-500/5 dark:bg-[#1b1213] p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-red-500/20">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-xs tracking-wider uppercase font-mono">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>Overdue Court & Registry Filings ({overdueTasks.length})</span>
                  </div>
                  <span className="text-[11px] font-mono text-red-500 font-semibold">URGENT REMEDIATION</span>
                </div>

                <div className="space-y-2.5">
                  {overdueTasks.map((task) => {
                    const daysAgo = differenceInCalendarDays(new Date(), parseISO(task.due_date!));
                    const parentCase = cases.find(c => c.id === task.case_id);
                    return (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-red-500/30 hover:border-red-500/50 shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(task)}
                            className="mt-0.5 w-4 h-4 rounded border border-red-500 hover:bg-red-500/10 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                            title="Mark completed"
                          >
                            <span className="sr-only">Mark complete</span>
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{task.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {parentCase?.title || 'Matter'} {parentCase?.case_number ? `· ${parentCase.case_number}` : ''} · Due {format(parseISO(task.due_date!), 'dd MMM yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-bold">
                            {daysAgo}d overdue
                          </span>
                          {parentCase && (
                            <Link
                              href={`/cases/${parentCase.id}`}
                              className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                              title="Open case brief"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. TODAY'S HEARINGS SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-amber-500" />
                  <span>TODAY&apos;S COURT DOCKET</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {hearingsToday.length} listed appearances today
                </span>
              </div>

              {hearingsToday.length > 0 ? (
                <div className="space-y-3">
                  {hearingsToday.map((item) => (
                    <div 
                      key={item.id}
                      className="rounded-2xl bg-card border border-amber-500/40 p-5 shadow-sm space-y-3 relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold flex-wrap">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format(item.date, 'hh:mm a')}</span>
                            <span>·</span>
                            <span className="uppercase">{item.court || 'Court Appearance'}</span>
                            {item.caseNumber && (
                              <>
                                <span>·</span>
                                <span className="text-muted-foreground">{item.caseNumber}</span>
                              </>
                            )}
                          </div>
                          <h3 className="text-xl font-serif text-foreground tracking-tight">
                            {item.caseTitle || item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {[item.stage, item.judge ? `Bench: ${item.judge}` : '']
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>

                        {item.caseId && (
                          <Link
                            href={`/cases/${item.caseId}`}
                            className="self-start bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                          >
                            Open brief <ArrowRight className="w-3.5 h-3.5 text-primary" />
                          </Link>
                        )}
                      </div>

                      {item.clientName && (
                        <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                          <span>Client: <strong className="text-foreground">{item.clientName}</strong></span>
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">Daily Court Board Item</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-border bg-card text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-muted border border-border text-primary flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium text-foreground">No appearances listed for today</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {upcomingHearings.length > 0 
                      ? `Your next court listing is ${format(upcomingHearings[0].date, 'EEEE, d MMMM')} in ${upcomingHearings[0].caseTitle || 'your active matter'}.`
                      : 'All matters are currently on schedule. Click "Schedule hearing" above to record upcoming dates.'}
                  </p>
                </div>
              )}
            </div>

            {/* 3. TODAY'S MEETINGS & CONFERENCES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>TODAY&apos;S CLIENT & CHAMBER CONFERENCES ({meetingsToday.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewMeetingModalOpen(true)}
                  className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add conference
                </button>
              </div>

              {meetingsToday.length > 0 ? (
                <div className="space-y-3">
                  {meetingsToday.map((m) => (
                    <div 
                      key={m.id}
                      className="rounded-2xl bg-card border border-indigo-500/35 p-4 space-y-2.5 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{format(m.date, 'hh:mm a')}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              {m.isVirtual ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                              {m.location || 'Chambers'}
                            </span>
                          </div>
                          <h4 className="text-sm font-serif font-semibold text-foreground">
                            {m.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {m.caseTitle || 'General Client Session'} · Attendees: {m.attendees || 'Counsel, Client'}
                          </p>
                        </div>

                        {m.caseId && (
                          <Link
                            href={`/cases/${m.caseId}`}
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Open case brief"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                          </Link>
                        )}
                      </div>

                      {m.notes && (
                        <p className="text-[11px] text-muted-foreground bg-muted/60 p-2.5 rounded-lg border border-border">
                          <strong>Agenda:</strong> {m.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-border bg-card text-center space-y-1">
                  <p className="text-xs text-muted-foreground">No client meetings or chamber conferences scheduled for today.</p>
                </div>
              )}
            </div>

            {/* 4. UPCOMING HEARINGS (Next 14 Days) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>UPCOMING COURT HEARINGS</span>
                </div>
                <Link href="/cases" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                  All matters &rarr;
                </Link>
              </div>

              {upcomingHearings.length > 0 ? (
                <div className="rounded-2xl border border-border bg-card p-4 divide-y divide-border">
                  {upcomingHearings.slice(0, 5).map((h) => {
                    const daysAway = differenceInCalendarDays(h.date, new Date());
                    const daysBadge = daysAway === 1 
                      ? 'Tomorrow' 
                      : daysAway <= 7 
                      ? `In ${daysAway} days` 
                      : format(h.date, 'EEE, d MMM');

                    return (
                      <div key={h.id} className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="text-center min-w-[50px] p-2 rounded-xl bg-muted border border-border flex-shrink-0">
                            <div className="text-[10px] font-mono uppercase text-muted-foreground">{format(h.date, 'MMM')}</div>
                            <div className="text-base font-serif font-bold text-foreground leading-none mt-0.5">{format(h.date, 'dd')}</div>
                          </div>

                          <div className="min-w-0">
                            <Link 
                              href={h.caseId ? `/cases/${h.caseId}` : '/cases'}
                              className="text-sm font-serif text-foreground hover:text-primary transition-colors truncate block font-medium"
                            >
                              {h.caseTitle || h.title}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {[h.court, h.stage || 'Hearing', h.judge ? `Bench: ${h.judge}` : '']
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                            daysAway === 1 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                              : 'bg-primary/10 text-primary border-primary/25'
                          }`}>
                            {daysBadge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-border bg-card text-center space-y-1">
                  <p className="text-xs text-muted-foreground">No upcoming court listings scheduled in the next 14 days.</p>
                </div>
              )}
            </div>

            {/* 5. PENDING ACTION ITEMS & TASKS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono tracking-wider uppercase text-muted-foreground font-semibold flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-primary" />
                  <span>ACTIONABLE TASKS & FILINGS ({pendingTasks.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewTaskModalOpen(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" /> Quick task
                </button>
              </div>

              {pendingTasks.length > 0 ? (
                <div className="rounded-2xl border border-border bg-card p-4 divide-y divide-border">
                  {pendingTasks.slice(0, 8).map((task) => {
                    const parentCase = cases.find(c => c.id === task.case_id);
                    const isDone = task.status === 'COMPLETED';
                    const isDueSoon = task.due_date && differenceInCalendarDays(parseISO(task.due_date), new Date()) <= 2;

                    return (
                      <div 
                        key={task.id}
                        onClick={() => handleToggleTaskStatus(task)}
                        className="py-3 first:pt-1 last:pb-1 flex items-start gap-3 cursor-pointer group"
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isDone 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'border-muted-foreground/40 group-hover:border-primary'
                        }`}>
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${isDone ? 'line-through text-muted-foreground' : 'text-foreground font-medium group-hover:text-primary transition-colors'}`}>
                            {task.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {parentCase ? parentCase.title : 'General Matter'} · {task.due_date ? `Due ${format(parseISO(task.due_date), 'EEE d MMM')}` : 'No due date'}
                          </p>
                        </div>

                        {task.due_date && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isDueSoon 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35 font-semibold' 
                              : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {format(parseISO(task.due_date), 'dd MMM')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-border bg-card text-center space-y-1">
                  <p className="text-xs text-muted-foreground">All tasks completed! Click &quot;Quick task&quot; to add new work items.</p>
                </div>
              )}
            </div>

          </div>

          {/* ════ RIGHT COLUMN (5 Cols): Embedded Interactive Calendar ═══ */}
          <div id="calendar-section" className="xl:col-span-5 space-y-6">
            
            {/* Interactive Calendar Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              
              {/* Calendar Month Navigation Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-serif text-foreground tracking-tight">
                    {format(calendarDate, 'MMMM yyyy')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {allEvents.filter(e => isSameMonth(e.date, calendarDate)).length} total events this month
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setCalendarDate(prev => subMonths(prev, 1))}
                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarDate(new Date());
                      setSelectedDate(new Date());
                    }}
                    className="px-2 h-7 text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground hover:bg-card rounded transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarDate(prev => addMonths(prev, 1))}
                    className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event Type Filters (Current Month Metrics Only) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCalendarFilter('ALL')}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    calendarFilter === 'ALL'
                      ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({currentMonthEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarFilter('HEARINGS')}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    calendarFilter === 'HEARINGS'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/35 font-semibold'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Hearings ({monthHearingsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarFilter('MEETINGS')}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    calendarFilter === 'MEETINGS'
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/35 font-semibold'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Meetings ({monthMeetingsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarFilter('TASKS')}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    calendarFilter === 'TASKS'
                      ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tasks ({monthTasksCount})
                </button>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center border-b border-border pb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <span key={day} className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Grid (Days) */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const dayEvents = filteredEvents.filter(e => isSameDay(e.date, day));
                  const hasHearing = dayEvents.some(e => e.type === 'HEARING');
                  const hasMeeting = dayEvents.some(e => e.type === 'MEETING');
                  const hasTask = dayEvents.some(e => e.type === 'TASK');
                  const hasOverdue = dayEvents.some(e => e.isOverdue);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, calendarDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`h-11 rounded-xl p-1 flex flex-col items-center justify-between transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'bg-primary/15 border border-primary text-primary font-bold shadow-sm'
                          : isCurrentDay
                          ? 'border border-primary/50 bg-muted text-foreground font-semibold'
                          : isCurrentMonth
                          ? 'hover:bg-muted text-foreground'
                          : 'text-muted-foreground/40 hover:bg-muted/40'
                      }`}
                    >
                      <span className="text-xs leading-none pt-0.5">
                        {format(day, 'd')}
                      </span>

                      {/* Event Indicator Dots */}
                      <div className="flex items-center gap-0.5 pb-0.5">
                        {hasHearing && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Court hearing" />
                        )}
                        {hasMeeting && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Meeting" />
                        )}
                        {hasTask && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" title="Task" />
                        )}
                        {hasOverdue && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Overdue deadline" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Hearings
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" /> Meetings
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-400" /> Tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> Overdue
                  </span>
                </div>
              </div>

            </div>

            {/* Selected Date Agenda Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <div className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                    AGENDA FOR
                  </div>
                  <h4 className="text-lg font-serif text-foreground">
                    {isToday(selectedDate) ? 'Today' : isTomorrow(selectedDate) ? 'Tomorrow' : format(selectedDate, 'EEEE, d MMM yyyy')}
                  </h4>
                </div>

                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-semibold">
                  {selectedDayEvents.length} items
                </span>
              </div>

              {/* Items List for Selected Day */}
              {selectedDayEvents.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedDayEvents.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        item.type === 'HEARING'
                          ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/35'
                          : item.type === 'MEETING'
                          ? 'bg-indigo-500/5 dark:bg-indigo-950/20 border-indigo-500/35'
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                              item.type === 'HEARING' 
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300' 
                                : item.type === 'MEETING'
                                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
                                : 'bg-primary/20 text-primary'
                            }`}>
                              {item.type}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {format(item.date, 'hh:mm a')}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-foreground leading-snug">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.court || item.location || item.caseTitle || 'General practice agenda'}
                          </p>
                          {item.attendees && (
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">
                              With: {item.attendees}
                            </p>
                          )}
                        </div>

                        {item.caseId && (
                          <Link 
                            href={`/cases/${item.caseId}`}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Open case"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    No hearings or tasks scheduled for {format(selectedDate, 'd MMM')}.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setHours(10, 30);
                        setHearingForm(prev => ({
                          ...prev,
                          date: d.toISOString().slice(0, 16)
                        }));
                        setNewHearingModalOpen(true);
                      }}
                      className="h-7 text-[11px] border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                    >
                      + Schedule hearing
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setHours(11, 45);
                        setMeetingForm(prev => ({
                          ...prev,
                          date: d.toISOString().slice(0, 16)
                        }));
                        setNewMeetingModalOpen(true);
                      }}
                      className="h-7 text-[11px] border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20"
                    >
                      + Meeting
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTaskForm(prev => ({
                          ...prev,
                          dueDate: format(selectedDate, 'yyyy-MM-dd')
                        }));
                        setNewTaskModalOpen(true);
                      }}
                      className="h-7 text-[11px] border-border bg-card text-foreground hover:bg-muted"
                    >
                      + Task
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ── Schedule Hearing Modal ────────────────────────────────────── */}
      <Dialog open={newHearingModalOpen} onOpenChange={setNewHearingModalOpen}>
        <DialogContent className="max-w-lg p-6 bg-card border border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-foreground tracking-tight">Schedule Court Hearing</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Record a listing date, bench, and hearing notes for your matter.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHearing} className="space-y-4 mt-2 font-sans">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Matter / Case *</Label>
              <select
                value={hearingForm.caseId}
                onChange={e => setHearingForm(prev => ({ ...prev, caseId: e.target.value }))}
                required
                className="w-full h-9 rounded-lg bg-background border border-input px-3 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a matter...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.case_number || 'No number'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Hearing Date & Time *</Label>
              <Input
                type="datetime-local"
                value={hearingForm.date}
                onChange={e => setHearingForm(prev => ({ ...prev, date: e.target.value }))}
                required
                className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Hearing Notes / Bench Instructions</Label>
              <Input
                value={hearingForm.notes}
                onChange={e => setHearingForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Final arguments on Interim Relief, Item #12"
                className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
              />
            </div>

            <DialogFooter className="mt-4 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewHearingModalOpen(false)}
                className="text-xs h-9 px-4 font-medium border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingModal}
                className="text-xs h-9 px-4 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm"
              >
                {submittingModal ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Schedule Hearing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Meeting Modal ────────────────────────────────────── */}
      <Dialog open={newMeetingModalOpen} onOpenChange={setNewMeetingModalOpen}>
        <DialogContent className="max-w-lg p-6 bg-card border border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-foreground tracking-tight">Schedule Client / Chamber Meeting</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Set up pre-trial strategy conferences, client depositions, or settlement discussions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMeeting} className="space-y-4 mt-2 font-sans">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Meeting Title *</Label>
              <Input
                value={meetingForm.title}
                onChange={e => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="e.g. Pre-Trial Cross-Examination Briefing"
                className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Related Matter (Optional)</Label>
              <select
                value={meetingForm.caseId}
                onChange={e => setMeetingForm(prev => ({ ...prev, caseId: e.target.value }))}
                className="w-full h-9 rounded-lg bg-background border border-input px-3 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">General Chamber Consultation</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground font-sans">Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={meetingForm.date}
                  onChange={e => setMeetingForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground font-sans">Location</Label>
                <Input
                  value={meetingForm.location}
                  onChange={e => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Chamber 402 / Virtual"
                  className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Attendees</Label>
              <Input
                value={meetingForm.attendees}
                onChange={e => setMeetingForm(prev => ({ ...prev, attendees: e.target.value }))}
                placeholder="e.g. Senior Counsel, Lead Partner, Client"
                className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Agenda Notes</Label>
              <Input
                value={meetingForm.notes}
                onChange={e => setMeetingForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Key documents to review or strategy goals"
                className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
              />
            </div>

            <DialogFooter className="mt-4 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewMeetingModalOpen(false)}
                className="text-xs h-9 px-4 font-medium border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs h-9 px-4 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm"
              >
                Schedule Meeting
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Task Modal ────────────────────────────────────── */}
      <Dialog open={newTaskModalOpen} onOpenChange={setNewTaskModalOpen}>
        <DialogContent className="max-w-lg p-6 bg-card border border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-foreground tracking-tight">Add Matter Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Track drafting deadlines, paper book filings, and process fee submissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 mt-2 font-sans">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Matter *</Label>
              <select
                value={taskForm.caseId}
                onChange={e => setTaskForm(prev => ({ ...prev, caseId: e.target.value }))}
                required
                className="w-full h-9 rounded-lg bg-background border border-input px-3 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a matter...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Task Title *</Label>
              <Input
                value={taskForm.title}
                onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                required
                placeholder="e.g. File Rejoinder with Condonation of Delay"
                className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground font-sans">Due Date</Label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="h-9 bg-background border-input text-xs font-sans text-foreground rounded-lg"
              />
            </div>

            <DialogFooter className="mt-4 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewTaskModalOpen(false)}
                className="text-xs h-9 px-4 font-medium border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingModal}
                className="text-xs h-9 px-4 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm"
              >
                {submittingModal ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
