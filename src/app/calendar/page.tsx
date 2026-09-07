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
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Scale, 
  Check, 
  AlertCircle, 
  FileText, 
  X, 
  Loader2, 
  ExternalLink,
  Briefcase,
  List,
  Grid,
  Columns,
  Sparkles,
  MapPin,
  User,
  Gavel
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { calendar as calendarApi, hearings as hearingsApi, tasks as tasksApi, cases as casesApi } from '@/lib/api';
import { CalendarDocket, CalendarEvent, CaseItem } from '@/lib/types';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  parseISO, 
  addDays, 
  subDays,
  startOfDay,
  isSameWeek
} from 'date-fns';

export default function CalendarPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  // Filter state
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'HEARING' | 'TASK' | 'MILESTONE'>('ALL');
  const [selectedCourt, setSelectedCourt] = useState<string>('ALL');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [docket, setDocket] = useState<CalendarDocket>({ hearings: [], tasks: [], cases: [] });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [scheduleHearingModalOpen, setScheduleHearingModalOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [eventDetailsModalOpen, setEventDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // New Hearing Form
  const [hearingForm, setHearingForm] = useState({
    caseId: '',
    date: '',
    notes: ''
  });
  const [submittingHearing, setSubmittingHearing] = useState(false);

  // New Task Form
  const [taskForm, setTaskForm] = useState({
    caseId: '',
    title: '',
    dueDate: '',
    priority: 'PENDING'
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Fetch calendar docket from backend
  const fetchDocket = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const res = await calendarApi.get(currentOrg.id);
      if (res.data) {
        setDocket(res.data);
      }
    } catch (err) {
      console.error('Failed to load calendar docket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      fetchDocket();
    }
  }, [currentOrg?.id]);

  // Normalize all hearings, tasks, and case hearing dates into a unified CalendarEvent list
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // 1. Hearings
    docket.hearings.forEach(h => {
      if (!h.date) return;
      try {
        const d = parseISO(h.date);
        events.push({
          id: `hearing-${h.id}`,
          title: h.case_title || 'Court Hearing',
          date: d,
          dateStr: h.date,
          type: 'HEARING',
          caseId: h.case_id,
          caseTitle: h.case_title,
          caseNumber: h.case_number,
          court: h.court,
          stage: h.stage || 'Court Appearance',
          judge: h.judge,
          clientName: h.client_name,
          opposingParty: h.opposing_party,
          notes: h.notes || undefined,
          status: h.status || 'SCHEDULED'
        });
      } catch (e) {
        console.error('Invalid hearing date:', h.date);
      }
    });

    // 2. Tasks / Deadlines
    docket.tasks.forEach(t => {
      if (!t.due_date) return;
      try {
        const d = parseISO(t.due_date);
        events.push({
          id: `task-${t.id}`,
          title: t.title,
          date: d,
          dateStr: t.due_date,
          type: 'TASK',
          caseId: t.case_id,
          caseTitle: t.case_title,
          caseNumber: t.case_number,
          court: t.court,
          stage: t.stage,
          notes: t.description || undefined,
          status: t.status,
          priority: t.status === 'OVERDUE' ? 'High' : 'Normal'
        });
      } catch (e) {
        console.error('Invalid task date:', t.due_date);
      }
    });

    // 3. Cases next hearing date if not already in hearings
    docket.cases.forEach(c => {
      if (!c.next_hearing_date) return;
      const alreadyIncluded = events.some(e => e.caseId === c.id && e.type === 'HEARING' && Math.abs(e.date.getTime() - new Date(c.next_hearing_date!).getTime()) < 60000);
      if (!alreadyIncluded) {
        try {
          const d = parseISO(c.next_hearing_date);
          events.push({
            id: `case-hearing-${c.id}`,
            title: c.title,
            date: d,
            dateStr: c.next_hearing_date,
            type: 'HEARING',
            caseId: c.id,
            caseTitle: c.title,
            caseNumber: c.case_number,
            court: c.court,
            stage: c.stage || 'Scheduled Hearing',
            judge: c.judge,
            clientName: c.client_name,
            opposingParty: c.opposing_party,
            status: 'SCHEDULED'
          });
        } catch {}
      }

      // 4. Case Filing Date Milestones
      if (c.filing_date) {
        try {
          const d = parseISO(c.filing_date);
          events.push({
            id: `milestone-${c.id}`,
            title: `Filing: ${c.title}`,
            date: d,
            dateStr: c.filing_date,
            type: 'MILESTONE',
            caseId: c.id,
            caseTitle: c.title,
            caseNumber: c.case_number,
            court: c.court,
            stage: 'Matter Institution',
            status: 'COMPLETED'
          });
        } catch {}
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [docket]);

  // Unique Courts
  const uniqueCourts = useMemo(() => {
    const set = new Set<string>();
    docket.cases.forEach(c => { if (c.court) set.add(c.court); });
    return Array.from(set);
  }, [docket]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      // Type filter
      if (eventTypeFilter !== 'ALL' && e.type !== eventTypeFilter) return false;

      // Court filter
      if (selectedCourt !== 'ALL' && e.court !== selectedCourt) return false;

      // Case filter
      if (selectedCaseId !== 'ALL' && e.caseId !== selectedCaseId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          e.title.toLowerCase().includes(q) ||
          (e.caseTitle?.toLowerCase().includes(q)) ||
          (e.court?.toLowerCase().includes(q)) ||
          (e.judge?.toLowerCase().includes(q)) ||
          (e.clientName?.toLowerCase().includes(q)) ||
          (e.caseNumber?.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [allEvents, eventTypeFilter, selectedCourt, selectedCaseId, searchQuery]);

  // Month Calendar Days Grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Events on selected day for Day Inspector
  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter(e => isSameDay(e.date, selectedDate));
  }, [filteredEvents, selectedDate]);

  // Events for Week View (7 days)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const thisMonth = currentDate.getMonth();
    const thisYear = currentDate.getFullYear();

    const hearingsThisMonth = filteredEvents.filter(e => e.type === 'HEARING' && e.date.getMonth() === thisMonth && e.date.getFullYear() === thisYear).length;
    const hearingsThisWeek = filteredEvents.filter(e => e.type === 'HEARING' && isSameWeek(e.date, new Date(), { weekStartsOn: 1 })).length;
    const pendingDeadlines = docket.tasks.filter(t => t.status !== 'COMPLETED').length;
    const todayAppearances = filteredEvents.filter(e => e.type === 'HEARING' && isToday(e.date)).length;

    return { hearingsThisMonth, hearingsThisWeek, pendingDeadlines, todayAppearances };
  }, [filteredEvents, currentDate, docket.tasks]);

  // Navigation handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Schedule Hearing Form Submission
  const handleScheduleHearingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hearingForm.caseId || !hearingForm.date) return;

    try {
      setSubmittingHearing(true);
      const isoDate = new Date(hearingForm.date).toISOString();
      await hearingsApi.create(hearingForm.caseId, {
        date: isoDate,
        notes: hearingForm.notes
      });
      await casesApi.update(hearingForm.caseId, {
        next_hearing_date: isoDate
      });
      setScheduleHearingModalOpen(false);
      setHearingForm({ caseId: '', date: '', notes: '' });
      await fetchDocket();
    } catch (err) {
      console.error('Failed to schedule hearing:', err);
    } finally {
      setSubmittingHearing(false);
    }
  };

  // Add Task Form Submission
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.caseId || !taskForm.title) return;

    try {
      setSubmittingTask(true);
      await tasksApi.create(taskForm.caseId, {
        title: taskForm.title,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
        status: taskForm.priority
      });
      setAddTaskModalOpen(false);
      setTaskForm({ caseId: '', title: '', dueDate: '', priority: 'PENDING' });
      await fetchDocket();
    } catch (err) {
      console.error('Failed to add task deadline:', err);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Export iCal / .ics File
  const handleExportIcs = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LegalDesk//AI Legal Case Management Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${currentOrg?.name || 'LegalDesk'} Court Calendar`,
      'X-WR-TIMEZONE:UTC'
    ];

    allEvents.forEach(e => {
      const dtStart = format(e.date, "yyyyMMdd'T'HHmmss'Z'");
      const dtEnd = format(addDays(e.date, 0), "yyyyMMdd'T'HHmmss'Z'");
      const uid = `${e.id}@legaldesk.ai`;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`);
      icsContent.push(`DTSTART:${dtStart}`);
      icsContent.push(`DTEND:${dtEnd}`);
      icsContent.push(`SUMMARY:[${e.type}] ${e.title}`);
      if (e.court) icsContent.push(`LOCATION:${e.court}`);
      icsContent.push(`DESCRIPTION:${e.stage || ''} - ${e.notes || ''} - Case: ${e.caseTitle || ''}`);
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentOrg?.name?.replace(/\s+/g, '_') || 'LegalDesk'}_Docket.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full max-w-6xl mx-auto pb-16 space-y-6">
        
        {/* ── Top Header & Action Controls ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-foreground">
                Calendar & Docket
              </h1>
              <Badge variant="outline" className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] text-xs font-normal py-0.5">
                <Scale className="w-3 h-3 mr-1" />
                {currentOrg?.name || 'Litigation Practice'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Court hearings, submission deadlines, and case milestones in one unified schedule.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportIcs}
              className="h-9 bg-[#111111] border-white/10 hover:bg-white/5 text-xs text-muted-foreground hover:text-foreground"
              title="Download .ics file to sync with Google Calendar, Apple Calendar, or Outlook"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export iCal
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTaskForm({ caseId: docket.cases[0]?.id || '', title: '', dueDate: format(selectedDate, 'yyyy-MM-dd'), priority: 'PENDING' });
                setAddTaskModalOpen(true);
              }}
              className="h-9 bg-[#111111] border-white/10 hover:bg-white/5 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Deadline
            </Button>

            <Button 
              size="sm"
              onClick={() => {
                setHearingForm({ caseId: docket.cases[0]?.id || '', date: `${format(selectedDate, 'yyyy-MM-dd')}T10:30`, notes: '' });
                setScheduleHearingModalOpen(true);
              }}
              className="h-9 bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium text-xs border border-[#4ADE80]/30 shadow-none"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Schedule Hearing
            </Button>
          </div>
        </div>

        {/* ── KPI Metric Summary Row (Clickable filter cards) ────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div 
            onClick={() => setEventTypeFilter('HEARING')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              eventTypeFilter === 'HEARING'
                ? 'bg-[#1a231f] border-[#2D4537] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Month Hearings</div>
              <div className="text-xl font-bold font-heading text-emerald-400 mt-0.5">{metrics.hearingsThisMonth}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Gavel className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => setEventTypeFilter('ALL')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              eventTypeFilter === 'ALL'
                ? 'bg-[#1f1624] border-purple-500/40 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">All Docket Items</div>
              <div className="text-xl font-bold font-heading text-purple-400 mt-0.5">{allEvents.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => setEventTypeFilter('TASK')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              eventTypeFilter === 'TASK'
                ? 'bg-[#261c14] border-orange-500/40 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Pending Deadlines</div>
              <div className="text-xl font-bold font-heading text-orange-400 mt-0.5">{metrics.pendingDeadlines}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => setEventTypeFilter('HEARING')}
            className="p-3.5 bg-[#111111] border border-white/5 hover:border-white/15 rounded-xl transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Today Appearances</div>
              <div className="text-xl font-bold font-heading text-[#4ADE80] mt-0.5">{metrics.todayAppearances}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 text-[#4ADE80] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── Calendar Toolbar & View Switcher ────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] border border-white/5 p-3 rounded-xl">
          
          {/* Month / Date Navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#16161a] border border-white/10 rounded-lg p-0.5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevMonth}
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleToday}
                className="h-7 text-xs font-semibold px-2 text-foreground hover:bg-white/5"
              >
                Today
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth}
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-base sm:text-lg font-heading font-semibold text-foreground ml-2">
              {format(currentDate, 'MMMM yyyy')}
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-[#16161a] border border-white/10 p-1 rounded-lg self-start md:self-auto">
            {(['month', 'week', 'day', 'agenda'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                  viewMode === mode 
                    ? 'bg-[#1a231f] text-[#4ADE80] shadow-sm font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'day' ? 'Cause List' : mode}
              </button>
            ))}
          </div>

        </div>

        {/* ── Search Bar (Left) & Court/Matter Filters (Right) ─────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-border/50 text-xs">
          {/* Left: Wide Search Input */}
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Search docket by case title, matter number, or appearance notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border-white/10 pl-9 pr-4 h-9 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#4ADE80] placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Right: Matter & Court Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-[#111111] border border-white/10 rounded-xl px-2.5 h-9 text-xs">
              <span className="text-muted-foreground">Matter:</span>
              <select 
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL" className="bg-[#16161a]">All Matters</option>
                {docket.cases.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#16161a]">{c.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#111111] border border-white/10 rounded-xl px-2.5 h-9 text-xs">
              <span className="text-muted-foreground">Court:</span>
              <select 
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="ALL" className="bg-[#16161a]">All Courts</option>
                {uniqueCourts.map(c => (
                  <option key={c} value={c} className="bg-[#16161a]">{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Main View Container ─────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs">Loading court docket...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            
            {/* ── MAIN CALENDAR VIEW AREA ──────────────────────────────── */}
            <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
              
              {/* ── VIEW: MONTH ────────────────────────────────────────── */}
              {viewMode === 'month' && (
                <div>
                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 border-b border-white/5 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase py-2.5 bg-[#16161a]">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span className="text-muted-foreground/50">Sat</span>
                    <span className="text-muted-foreground/50">Sun</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/5">
                    {calendarDays.map((day, idx) => {
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);
                      const isSelected = isSameDay(day, selectedDate);

                      // Events on this day
                      const dayEvents = filteredEvents.filter(e => isSameDay(e.date, day));

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={`
                            min-h-[105px] p-2 flex flex-col justify-between cursor-pointer transition-all relative group
                            ${isCurrentMonth ? 'bg-transparent' : 'bg-black/30 opacity-40'}
                            ${isSelected ? 'ring-1 ring-inset ring-[#4ADE80] bg-[#1a231f]/40' : 'hover:bg-white/[0.02]'}
                          `}
                        >
                          {/* Day Number Header */}
                          <div className="flex items-center justify-between">
                            <span className={`
                              text-xs font-mono font-medium w-6 h-6 rounded-full flex items-center justify-center
                              ${isTodayDate 
                                ? 'bg-[#4ADE80] text-black font-bold shadow-[0_0_10px_rgba(74,222,128,0.4)]' 
                                : isSelected ? 'text-[#4ADE80]' : 'text-muted-foreground'}
                            `}>
                              {format(day, 'd')}
                            </span>

                            {dayEvents.length > 0 && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          {/* Event Pills List */}
                          <div className="space-y-1 my-1 overflow-hidden">
                            {dayEvents.slice(0, 2).map((event) => {
                              const isHearing = event.type === 'HEARING';
                              const isTask = event.type === 'TASK';

                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                    setEventDetailsModalOpen(true);
                                  }}
                                  className={`
                                    text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 transition-all
                                    ${isHearing 
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25' 
                                      : isTask 
                                        ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20 hover:bg-orange-500/25' 
                                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/20'}
                                  `}
                                  title={`${event.title} (${event.court || ''})`}
                                >
                                  <span className="font-mono text-[9px] opacity-75">
                                    {format(event.date, 'HH:mm')}
                                  </span>
                                  <span className="truncate">{event.title}</span>
                                </div>
                              );
                            })}

                            {dayEvents.length > 2 && (
                              <div className="text-[9px] text-muted-foreground/80 font-mono px-1">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>

                          {/* Quick hover add shortcut */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                            <span className="text-[9px] text-muted-foreground">+ Add</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── VIEW: WEEK ─────────────────────────────────────────── */}
              {viewMode === 'week' && (
                <div className="divide-y divide-white/5">
                  <div className="grid grid-cols-7 border-b border-white/5 text-center text-xs py-3 bg-[#16161a]">
                    {weekDays.map(day => {
                      const isTodayDate = isToday(day);
                      const isSelected = isSameDay(day, selectedDate);
                      const dayEvents = filteredEvents.filter(e => isSameDay(e.date, day));

                      return (
                        <div 
                          key={day.toISOString()} 
                          onClick={() => setSelectedDate(day)}
                          className="cursor-pointer p-1"
                        >
                          <div className="text-[11px] text-muted-foreground uppercase font-semibold">{format(day, 'EEE')}</div>
                          <div className={`
                            text-sm font-mono font-bold w-7 h-7 mx-auto mt-1 rounded-full flex items-center justify-center
                            ${isTodayDate ? 'bg-[#4ADE80] text-black' : isSelected ? 'border border-[#4ADE80] text-[#4ADE80]' : 'text-foreground'}
                          `}>
                            {format(day, 'd')}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{dayEvents.length} items</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                    {weekDays.map(day => {
                      const dayEvents = filteredEvents.filter(e => isSameDay(e.date, day));
                      if (dayEvents.length === 0) return null;

                      return (
                        <div key={day.toISOString()} className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                            <span>{format(day, 'EEEE, dd MMMM')}</span>
                            <span className="h-px flex-1 bg-white/5"></span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setEventDetailsModalOpen(true);
                                }}
                                className="p-3 rounded-xl bg-[#16161a] border border-white/5 hover:border-white/15 cursor-pointer transition-all flex items-start justify-between gap-3"
                              >
                                <div>
                                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                    <span>{format(event.date, 'HH:mm')}</span>
                                    <span>&middot;</span>
                                    <Badge variant="outline" className={`text-[10px] py-0 h-4 ${event.type === 'HEARING' ? 'text-emerald-400 border-emerald-500/20' : 'text-orange-400 border-orange-500/20'}`}>
                                      {event.type}
                                    </Badge>
                                  </div>
                                  <div className="text-sm font-medium text-foreground mt-1">{event.title}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{event.court} {event.stage ? `· ${event.stage}` : ''}</div>
                                </div>
                                <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── VIEW: DAY / CAUSE LIST ─────────────────────────────── */}
              {viewMode === 'day' && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <div>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daily Cause List</div>
                      <h2 className="text-xl font-heading font-semibold text-foreground mt-0.5">
                        {format(selectedDate, 'EEEE, dd MMMM yyyy')}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm"
                        onClick={() => {
                          setHearingForm({ caseId: docket.cases[0]?.id || '', date: `${format(selectedDate, 'yyyy-MM-dd')}T10:30`, notes: '' });
                          setScheduleHearingModalOpen(true);
                        }}
                        className="h-8 text-xs bg-[#4ADE80] text-black font-semibold"
                      >
                        + Add to Today's List
                      </Button>
                    </div>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground border border-white/5 rounded-xl bg-[#16161a]">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No court appearances or deadlines listed for {format(selectedDate, 'dd MMMM')}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayEvents.map((event, idx) => (
                        <div 
                          key={event.id}
                          className="p-4 bg-[#16161a] border border-white/5 rounded-xl hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-center font-mono w-14 flex-shrink-0 pt-0.5">
                              <div className="text-base font-bold text-foreground">{format(event.date, 'HH:mm')}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">{event.type}</div>
                            </div>

                            <div>
                              <div className="text-base font-medium text-foreground">{event.title}</div>
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-foreground/90 font-medium">{event.court || 'Court'}</span>
                                {event.judge && (
                                  <>
                                    <span>&middot;</span>
                                    <span>Before {event.judge}</span>
                                  </>
                                )}
                                {event.stage && (
                                  <>
                                    <span>&middot;</span>
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-purple-500/20 text-purple-400">
                                      {event.stage}
                                    </Badge>
                                  </>
                                )}
                              </div>
                              {event.notes && (
                                <p className="text-xs text-muted-foreground/80 mt-2 font-serif bg-white/[0.02] p-2 rounded border border-white/5">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => router.push(`/cases/${event.caseId}`)}
                              className="h-8 text-xs bg-transparent border-white/10 hover:border-[#4ADE80]/40 hover:text-[#4ADE80]"
                            >
                              Open Case Brief &rarr;
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── VIEW: AGENDA / LIST ────────────────────────────────── */}
              {viewMode === 'agenda' && (
                <div className="p-5 space-y-4 max-h-[650px] overflow-y-auto">
                  {filteredEvents.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <p className="text-sm">No upcoming events match the filters.</p>
                    </div>
                  ) : (
                    filteredEvents.map((event) => (
                      <div 
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setEventDetailsModalOpen(true);
                        }}
                        className="p-3.5 bg-[#16161a] border border-white/5 rounded-xl hover:border-white/15 cursor-pointer transition-all flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 text-center font-mono flex-shrink-0">
                            <div className="text-xs font-bold text-foreground">{format(event.date, 'dd MMM')}</div>
                            <div className="text-[10px] text-muted-foreground">{format(event.date, 'HH:mm')}</div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {event.court || 'Court'} &middot; {event.stage || event.type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${
                            event.type === 'HEARING' ? 'text-emerald-400 border-emerald-500/20' : 'text-orange-400 border-orange-500/20'
                          }`}>
                            {event.type}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/cases/${event.caseId}`);
                            }}
                            className="w-7 h-7 text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

            {/* ── RIGHT DAY INSPECTOR SIDEBAR ──────────────────────────── */}
            <aside className="bg-[#111111] border border-white/5 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected Date</div>
                  <div className="text-base font-heading font-semibold text-foreground mt-0.5">
                    {format(selectedDate, 'EEEE, dd MMM')}
                  </div>
                </div>

                {isToday(selectedDate) && (
                  <Badge className="bg-[#4ADE80] text-black font-semibold text-[10px]">Today</Badge>
                )}
              </div>

              {/* Items on this day */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Listed Events &middot; {selectedDayEvents.length}
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 py-2">
                    No hearings or deadlines on this day.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(event => (
                      <div 
                        key={event.id}
                        className="p-3 bg-[#16161a] border border-white/5 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-foreground">
                            {format(event.date, 'HH:mm')}
                          </span>
                          <Badge variant="outline" className="text-[9px] py-0 h-4 border-white/10">
                            {event.type}
                          </Badge>
                        </div>
                        <div className="font-medium text-foreground">{event.title}</div>
                        <div className="text-[11px] text-muted-foreground">{event.court} {event.stage ? `· ${event.stage}` : ''}</div>
                        
                        <div className="pt-2 flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/cases/${event.caseId}`)}
                            className="h-6 text-[10px] bg-transparent border-white/10 hover:border-[#4ADE80]/40 hover:text-[#4ADE80]"
                          >
                            Open Brief &rarr;
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick action buttons for selected day */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <Button 
                  size="sm"
                  onClick={() => {
                    setHearingForm({ caseId: docket.cases[0]?.id || '', date: `${format(selectedDate, 'yyyy-MM-dd')}T10:30`, notes: '' });
                    setScheduleHearingModalOpen(true);
                  }}
                  className="w-full h-8 text-xs bg-[#4ADE80] text-black font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Hearing on this Date
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTaskForm({ caseId: docket.cases[0]?.id || '', title: '', dueDate: format(selectedDate, 'yyyy-MM-dd'), priority: 'PENDING' });
                    setAddTaskModalOpen(true);
                  }}
                  className="w-full h-8 text-xs bg-transparent border-white/10 hover:bg-white/5"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Task Deadline
                </Button>
              </div>
            </aside>

          </div>
        )}

      </div>

      {/* ── SCHEDULE HEARING DIALOG ──────────────────────────────────── */}
      <Dialog open={scheduleHearingModalOpen} onOpenChange={setScheduleHearingModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Schedule Court Hearing</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add upcoming court date and agenda to docket.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleHearingSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Case *</Label>
              <select 
                required
                value={hearingForm.caseId}
                onChange={(e) => setHearingForm({ ...hearingForm, caseId: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
              >
                <option value="">Select a case...</option>
                {docket.cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.court})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Hearing Date & Time *</Label>
              <Input 
                required
                type="datetime-local"
                value={hearingForm.date}
                onChange={(e) => setHearingForm({ ...hearingForm, date: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Agenda / Notes</Label>
              <Input 
                placeholder="e.g. Final arguments on bail plea" 
                value={hearingForm.notes}
                onChange={(e) => setHearingForm({ ...hearingForm, notes: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setScheduleHearingModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingHearing} className="bg-[#4ADE80] text-black font-semibold">
                {submittingHearing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save to Docket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADD TASK DEADLINE DIALOG ─────────────────────────────────── */}
      <Dialog open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Add Filing Deadline / Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add task deadline for case preparation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTaskSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Case *</Label>
              <select 
                required
                value={taskForm.caseId}
                onChange={(e) => setTaskForm({ ...taskForm, caseId: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
              >
                <option value="">Select a case...</option>
                {docket.cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.court})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Deadline Title *</Label>
              <Input 
                required
                placeholder="e.g. File written arguments with registry" 
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</Label>
              <Input 
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddTaskModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingTask} className="bg-[#4ADE80] text-black font-semibold">
                {submittingTask ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Deadline
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EVENT DETAILS DIALOG ─────────────────────────────────────── */}
      {selectedEvent && (
        <Dialog open={eventDetailsModalOpen} onOpenChange={setEventDetailsModalOpen}>
          <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${selectedEvent.type === 'HEARING' ? 'text-emerald-400 border-emerald-500/20' : 'text-orange-400 border-orange-500/20'}`}>
                  {selectedEvent.type}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">{format(selectedEvent.date, 'dd MMM yyyy · HH:mm')}</span>
              </div>
              <DialogTitle className="text-lg font-heading font-semibold mt-2">{selectedEvent.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs bg-[#111111] border border-white/5 rounded-xl p-3.5 my-2">
              {selectedEvent.court && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Court</span>
                  <span className="font-medium text-foreground">{selectedEvent.court}</span>
                </div>
              )}
              {selectedEvent.judge && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Judge</span>
                  <span className="text-foreground">{selectedEvent.judge}</span>
                </div>
              )}
              {selectedEvent.stage && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stage</span>
                  <span className="text-foreground">{selectedEvent.stage}</span>
                </div>
              )}
              {selectedEvent.caseNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Case Number</span>
                  <span className="font-mono text-foreground">{selectedEvent.caseNumber}</span>
                </div>
              )}
              {selectedEvent.notes && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-muted-foreground block mb-1">Notes / Agenda:</span>
                  <p className="text-foreground/90 font-serif leading-relaxed">{selectedEvent.notes}</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button variant="ghost" onClick={() => setEventDetailsModalOpen(false)}>Close</Button>
              <Button 
                onClick={() => {
                  setEventDetailsModalOpen(false);
                  router.push(`/cases/${selectedEvent.caseId}`);
                }}
                className="bg-[#4ADE80] text-black font-semibold"
              >
                Open Case Dashboard &rarr;
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </AppShell>
  );
}
