'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Download, 
  Clock, 
  Scale, 
  Loader2, 
  ExternalLink,
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
import { CalendarDocket, CalendarEvent } from '@/lib/types';
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
      if (eventTypeFilter !== 'ALL' && e.type !== eventTypeFilter) return false;
      if (selectedCourt !== 'ALL' && e.court !== selectedCourt) return false;
      if (selectedCaseId !== 'ALL' && e.caseId !== selectedCaseId) return false;

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

  // Upcoming hearings this week for Inspector
  const thisWeekHearings = useMemo(() => {
    return filteredEvents.filter(e => e.type === 'HEARING' && isSameWeek(e.date, currentDate, { weekStartsOn: 1 }));
  }, [filteredEvents, currentDate]);

  // Next upcoming appearance
  const nextAppearance = useMemo(() => {
    const now = new Date();
    return filteredEvents.find(e => e.type === 'HEARING' && e.date >= now);
  }, [filteredEvents]);

  // Events for Week View (7 days)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

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
          <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full w-full px-6 sm:px-8 py-8 pb-16 space-y-6">
        
        {/* ── Top Header & Action Controls ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-[#f3f4f5] tracking-tight">
              Calendar & docket
            </h1>
            <p className="text-sm text-[#879292] mt-1">
              Hearings, filing deadlines and milestones on one schedule
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              onClick={handleExportIcs}
              className="h-8 bg-[#141717] border border-[#272b2b] hover:bg-[#1a1e1e] text-[#f3f4f5] text-xs font-medium px-3.5 rounded-lg transition-colors flex items-center gap-1.5"
              title="Download .ics file"
            >
              <Download className="w-3.5 h-3.5 text-[#879292]" /> Export iCal
            </button>

            <button 
              onClick={() => {
                setHearingForm({ caseId: docket.cases[0]?.id || '', date: `${format(selectedDate, 'yyyy-MM-dd')}T10:30`, notes: '' });
                setScheduleHearingModalOpen(true);
              }}
              className="h-8 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs px-4 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule hearing
            </button>
          </div>
        </div>

        {/* ── Calendar Toolbar & View Switcher ────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Month / Date Navigator */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center bg-[#141717] border border-[#272b2b] rounded-lg overflow-hidden">
              <button 
                onClick={handlePrevMonth}
                className="px-2.5 py-1.5 text-xs text-[#879292] hover:text-white border-r border-[#272b2b] transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-medium text-[#f3f4f5] hover:bg-white/5 border-r border-[#272b2b] transition-colors"
              >
                Today
              </button>
              <button 
                onClick={handleNextMonth}
                className="px-2.5 py-1.5 text-xs text-[#879292] hover:text-white transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-lg font-serif font-medium text-white ml-2">
              {format(currentDate, 'MMMM yyyy')}
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="inline-flex items-center bg-[#141717] border border-[#272b2b] p-0.5 rounded-lg text-xs self-start sm:self-auto">
            {(['month', 'week', 'day', 'agenda'] as const).map(mode => {
              const label = mode === 'month' ? 'Month' : mode === 'week' ? 'Week' : mode === 'day' ? 'Cause list' : 'Agenda';
              const isActive = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-md transition-all font-medium ${
                    isActive 
                      ? 'bg-[#1e2323] text-white shadow-sm font-semibold' 
                      : 'text-[#879292] hover:text-[#f3f4f5]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

        </div>

        {/* ── Main View Container ─────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#879292]">
            <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
            <span className="text-xs">Loading docket...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            
            {/* ── MAIN CALENDAR VIEW AREA ──────────────────────────────── */}
            <div className="bg-[#121515] border border-[#222828] rounded-xl overflow-hidden">
              
              {/* ── VIEW: MONTH ────────────────────────────────────────── */}
              {viewMode === 'month' && (
                <div>
                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 border-b border-[#222828] text-center text-[11px] font-mono tracking-wider text-[#6f7a7a] uppercase py-2.5 bg-[#141717]/60">
                    <span>MON</span>
                    <span>TUE</span>
                    <span>WED</span>
                    <span>THU</span>
                    <span>FRI</span>
                    <span>SAT</span>
                    <span>SUN</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#222828]">
                    {calendarDays.map((day) => {
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
                            min-h-[110px] p-2 flex flex-col justify-between cursor-pointer transition-colors relative group
                            ${isCurrentMonth ? 'bg-transparent' : 'bg-black/20 opacity-30'}
                            ${isSelected ? 'bg-[#161b1a]' : 'hover:bg-white/[0.02]'}
                          `}
                        >
                          {/* Day Number Header */}
                          <div className="flex items-center justify-between">
                            {isTodayDate ? (
                              <span className="w-5 h-5 rounded-full bg-[#2dd4bf] text-black font-semibold flex items-center justify-center text-xs">
                                {format(day, 'd')}
                              </span>
                            ) : (
                              <span className={`text-xs font-mono ${isSelected ? 'text-[#2dd4bf] font-medium' : 'text-[#6f7a7a]'}`}>
                                {format(day, 'd')}
                              </span>
                            )}

                            {dayEvents.length > 0 && !isTodayDate && (
                              <span className="text-[10px] text-[#6f7a7a] font-mono">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          {/* Event Bars List */}
                          <div className="space-y-1 my-1 overflow-hidden">
                            {dayEvents.slice(0, 2).map((event, i) => {
                              const isHearing = event.type === 'HEARING';
                              const isTask = event.type === 'TASK';
                              
                              // Visual bar colors matching artifact:
                              // Coral/red for hearings, amber for tasks, mint for alternative hearings
                              const borderStyle = isTask 
                                ? 'border-l-2 border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]'
                                : i % 2 === 0
                                  ? 'border-l-2 border-[#f87171] bg-[#f87171]/10 text-[#f3f4f5]'
                                  : 'border-l-2 border-[#2dd4bf] bg-[#2dd4bf]/10 text-[#f3f4f5]';

                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                    setEventDetailsModalOpen(true);
                                  }}
                                  className={`text-[11px] pl-1.5 pr-1 py-0.5 rounded-r truncate font-normal transition-all ${borderStyle}`}
                                  title={`${event.title} (${event.court || ''})`}
                                >
                                  {isHearing && (
                                    <span className="font-mono text-[10px] opacity-75 mr-1">
                                      {format(event.date, 'HH:mm')}
                                    </span>
                                  )}
                                  <span className="truncate">{event.title}</span>
                                </div>
                              );
                            })}

                            {dayEvents.length > 2 && (
                              <div className="text-[9px] text-[#6f7a7a] font-mono px-1">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>

                          <div className="h-2"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── VIEW: WEEK ─────────────────────────────────────────── */}
              {viewMode === 'week' && (
                <div className="divide-y divide-[#222828]">
                  <div className="grid grid-cols-7 border-b border-[#222828] text-center text-xs py-3 bg-[#141717]">
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
                          <div className="text-[11px] text-[#6f7a7a] uppercase font-mono">{format(day, 'EEE')}</div>
                          <div className={`
                            text-sm font-mono font-bold w-7 h-7 mx-auto mt-1 rounded-full flex items-center justify-center
                            ${isTodayDate ? 'bg-[#2dd4bf] text-black' : isSelected ? 'border border-[#2dd4bf] text-[#2dd4bf]' : 'text-[#f3f4f5]'}
                          `}>
                            {format(day, 'd')}
                          </div>
                          <div className="text-[10px] text-[#6f7a7a] mt-0.5">{dayEvents.length} items</div>
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
                          <div className="text-xs font-serif text-[#879292] flex items-center gap-2">
                            <span>{format(day, 'EEEE, dd MMMM')}</span>
                            <span className="h-px flex-1 bg-[#222828]"></span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setEventDetailsModalOpen(true);
                                }}
                                className="p-3 rounded-lg bg-[#141717] border border-[#272b2b] hover:border-[#384040] cursor-pointer transition-all flex items-start justify-between gap-3"
                              >
                                <div>
                                  <div className="flex items-center gap-2 text-xs font-mono text-[#879292]">
                                    <span>{format(event.date, 'HH:mm')}</span>
                                    <span>&middot;</span>
                                    <span className={event.type === 'HEARING' ? 'text-[#2dd4bf]' : 'text-[#f59e0b]'}>
                                      {event.type}
                                    </span>
                                  </div>
                                  <div className="text-sm font-serif font-medium text-[#f3f4f5] mt-1">{event.title}</div>
                                  <div className="text-xs text-[#879292] mt-0.5">{event.court} {event.stage ? `· ${event.stage}` : ''}</div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-[#6f7a7a]" />
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
                  <div className="flex items-center justify-between pb-4 border-b border-[#222828]">
                    <div>
                      <div className="text-[10px] font-mono text-[#6f7a7a] uppercase tracking-wider">Cause List</div>
                      <h2 className="text-xl font-serif font-semibold text-[#f3f4f5] mt-0.5">
                        {format(selectedDate, 'EEEE, dd MMMM yyyy')}
                      </h2>
                    </div>

                    <button 
                      onClick={() => {
                        setHearingForm({ caseId: docket.cases[0]?.id || '', date: `${format(selectedDate, 'yyyy-MM-dd')}T10:30`, notes: '' });
                        setScheduleHearingModalOpen(true);
                      }}
                      className="h-8 text-xs bg-[#2dd4bf] text-[#091b18] font-semibold px-3 rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Today
                    </button>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <div className="py-16 text-center text-[#879292] border border-[#222828] rounded-xl bg-[#141717]/40">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#879292]" />
                      <p className="text-sm">No court appearances or deadlines listed for {format(selectedDate, 'dd MMMM')}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayEvents.map((event) => (
                        <div 
                          key={event.id}
                          className="p-4 bg-[#141717] border border-[#272b2b] rounded-xl hover:border-[#384040] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-center font-mono w-14 flex-shrink-0 pt-0.5">
                              <div className="text-base font-bold text-[#f3f4f5]">{format(event.date, 'HH:mm')}</div>
                              <div className="text-[10px] text-[#879292] uppercase">{event.type}</div>
                            </div>

                            <div>
                              <div className="text-base font-serif font-medium text-[#f3f4f5]">{event.title}</div>
                              <div className="text-xs text-[#879292] mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-[#f3f4f5]">{event.court || 'Court'}</span>
                                {event.judge && (
                                  <>
                                    <span>&middot;</span>
                                    <span>Before {event.judge}</span>
                                  </>
                                )}
                                {event.stage && (
                                  <>
                                    <span>&middot;</span>
                                    <span className="text-[#818cf8] font-mono text-[11px]">{event.stage}</span>
                                  </>
                                )}
                              </div>
                              {event.notes && (
                                <p className="text-xs text-[#879292] mt-2 font-serif bg-black/20 p-2 rounded border border-[#272b2b]">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <button 
                            onClick={() => router.push(`/cases/${event.caseId}`)}
                            className="h-8 text-xs bg-[#141717] border border-[#272b2b] text-[#f3f4f5] hover:border-[#2dd4bf]/40 hover:text-[#2dd4bf] px-3 rounded-lg transition-colors self-end sm:self-center"
                          >
                            Open Case Brief &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── VIEW: AGENDA / LIST ────────────────────────────────── */}
              {viewMode === 'agenda' && (
                <div className="p-5 space-y-3 max-h-[650px] overflow-y-auto">
                  {filteredEvents.length === 0 ? (
                    <div className="py-16 text-center text-[#879292]">
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
                        className="p-3.5 bg-[#141717] border border-[#272b2b] rounded-xl hover:border-[#384040] cursor-pointer transition-all flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 text-center font-mono flex-shrink-0">
                            <div className="text-xs font-bold text-[#f3f4f5]">{format(event.date, 'dd MMM')}</div>
                            <div className="text-[10px] text-[#879292]">{format(event.date, 'HH:mm')}</div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-serif font-medium text-[#f3f4f5] truncate">{event.title}</div>
                            <div className="text-xs text-[#879292] truncate mt-0.5">
                              {event.court || 'Court'} &middot; {event.stage || event.type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            event.type === 'HEARING' ? 'text-[#2dd4bf] bg-[#2dd4bf]/10' : 'text-[#f59e0b] bg-[#f59e0b]/10'
                          }`}>
                            {event.type}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/cases/${event.caseId}`);
                            }}
                            className="p-1.5 text-[#6f7a7a] hover:text-[#f3f4f5]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

            {/* ── RIGHT DAY INSPECTOR SIDEBAR (EXACT MATCH TO ARTIFACT) ─── */}
            <aside className="w-full bg-[#121515] border border-[#222828] rounded-xl p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-medium text-white">
                  {format(selectedDate, 'EEEE, d MMMM')}
                </h3>
                {isToday(selectedDate) && (
                  <span className="font-mono text-[10px] text-[#2dd4bf] tracking-widest font-semibold uppercase">
                    TODAY
                  </span>
                )}
              </div>

              {/* Status on selected day */}
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-[#879292] leading-relaxed">
                  Nothing listed. Your next appearance is on {nextAppearance ? format(nextAppearance.date, 'EEE d MMM') : 'schedule'}.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(event => (
                    <div 
                      key={event.id}
                      className="border-l-2 border-[#2dd4bf] pl-3 py-1 flex flex-col gap-0.5"
                    >
                      <span className="text-xs text-[#2dd4bf] font-mono">
                        {format(event.date, 'HH:mm')}
                      </span>
                      <span 
                        onClick={() => router.push(`/cases/${event.caseId}`)}
                        className="font-serif text-sm font-semibold text-white hover:text-[#2dd4bf] cursor-pointer"
                      >
                        {event.title}
                      </span>
                      <span className="text-xs text-[#879292]">
                        {event.stage || event.type} &middot; {event.court}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* THIS WEEK section */}
              <div className="pt-3 border-t border-[#222828] space-y-4">
                <div className="font-mono text-[10px] tracking-wider text-[#6f7a7a] uppercase font-semibold">
                  THIS WEEK
                </div>

                <div className="space-y-3.5">
                  {thisWeekHearings.length > 0 ? (
                    thisWeekHearings.slice(0, 4).map((h, idx) => {
                      const borderColor = idx % 2 === 0 ? 'border-[#f87171]' : 'border-[#2dd4bf]';
                      const textColor = idx % 2 === 0 ? 'text-[#f87171]' : 'text-[#2dd4bf]';

                      return (
                        <div key={h.id} className={`border-l-2 ${borderColor} pl-3 py-0.5 flex flex-col gap-0.5`}>
                          <span className={`text-xs ${textColor} font-mono`}>
                            {format(h.date, 'EEE d MMM')} &middot; {format(h.date, 'HH:mm')}
                          </span>
                          <span 
                            onClick={() => router.push(`/cases/${h.caseId}`)}
                            className="font-serif text-sm font-semibold text-white hover:text-[#2dd4bf] cursor-pointer"
                          >
                            {h.caseTitle || h.title}
                          </span>
                          <span className="text-xs text-[#879292]">
                            {h.stage || 'Pleadings'} &middot; {h.court || 'Court'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-[#879292]">No hearings scheduled this week.</p>
                  )}
                </div>
              </div>

              {/* Quick actions on selected date */}
              <div className="pt-3 border-t border-[#222828] space-y-2">
                <button 
                  onClick={() => {
                    setHearingForm({ caseId: docket.cases[0]?.id || '', date: `${format(selectedDate, 'yyyy-MM-dd')}T10:30`, notes: '' });
                    setScheduleHearingModalOpen(true);
                  }}
                  className="w-full h-8 text-xs bg-[#141717] border border-[#272b2b] hover:bg-[#1c2020] text-[#f3f4f5] font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2dd4bf]" /> Schedule on this date
                </button>
                <button 
                  onClick={() => {
                    setTaskForm({ caseId: docket.cases[0]?.id || '', title: '', dueDate: format(selectedDate, 'yyyy-MM-dd'), priority: 'PENDING' });
                    setAddTaskModalOpen(true);
                  }}
                  className="w-full h-8 text-xs bg-[#141717] border border-[#272b2b] hover:bg-[#1c2020] text-[#879292] hover:text-[#f3f4f5] font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-[#f59e0b]" /> Add filing deadline
                </button>
              </div>
            </aside>

          </div>
        )}

      </div>

      {/* ── SCHEDULE HEARING DIALOG ──────────────────────────────────── */}
      <Dialog open={scheduleHearingModalOpen} onOpenChange={setScheduleHearingModalOpen}>
        <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-semibold text-white">Schedule Court Hearing</DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              Add upcoming court date and agenda to docket.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleHearingSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">Case *</Label>
              <select 
                required
                value={hearingForm.caseId}
                onChange={(e) => setHearingForm({ ...hearingForm, caseId: e.target.value })}
                className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none"
              >
                <option value="">Select a case...</option>
                {docket.cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.court})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">Hearing Date & Time *</Label>
              <Input 
                required
                type="datetime-local"
                value={hearingForm.date}
                onChange={(e) => setHearingForm({ ...hearingForm, date: e.target.value })}
                className="bg-[#0d0f0f] border-[#272b2b] h-9 text-sm text-[#f3f4f5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">Agenda / Notes</Label>
              <Input 
                placeholder="e.g. Final arguments on bail plea" 
                value={hearingForm.notes}
                onChange={(e) => setHearingForm({ ...hearingForm, notes: e.target.value })}
                className="bg-[#0d0f0f] border-[#272b2b] h-9 text-sm text-[#f3f4f5]"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setScheduleHearingModalOpen(false)} className="text-[#879292] hover:text-white">Cancel</Button>
              <Button type="submit" disabled={submittingHearing} className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold">
                {submittingHearing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save to Docket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADD TASK DEADLINE DIALOG ─────────────────────────────────── */}
      <Dialog open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
        <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-semibold text-white">Add Filing Deadline / Task</DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              Add task deadline for case preparation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTaskSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">Case *</Label>
              <select 
                required
                value={taskForm.caseId}
                onChange={(e) => setTaskForm({ ...taskForm, caseId: e.target.value })}
                className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none"
              >
                <option value="">Select a case...</option>
                {docket.cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.court})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">Deadline Title *</Label>
              <Input 
                required
                placeholder="e.g. File written arguments with registry" 
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="bg-[#0d0f0f] border-[#272b2b] h-9 text-sm text-[#f3f4f5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#879292] uppercase">Due Date</Label>
              <Input 
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="bg-[#0d0f0f] border-[#272b2b] h-9 text-sm text-[#f3f4f5]"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddTaskModalOpen(false)} className="text-[#879292] hover:text-white">Cancel</Button>
              <Button type="submit" disabled={submittingTask} className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold">
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
          <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-md p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  selectedEvent.type === 'HEARING' ? 'text-[#2dd4bf] bg-[#2dd4bf]/10' : 'text-[#f59e0b] bg-[#f59e0b]/10'
                }`}>
                  {selectedEvent.type}
                </span>
                <span className="text-xs text-[#879292] font-mono">{format(selectedEvent.date, 'dd MMM yyyy · HH:mm')}</span>
              </div>
              <DialogTitle className="text-lg font-serif font-semibold mt-2 text-white">{selectedEvent.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs bg-[#0d0f0f] border border-[#272b2b] rounded-xl p-3.5 my-2">
              {selectedEvent.court && (
                <div className="flex justify-between">
                  <span className="text-[#879292]">Court</span>
                  <span className="font-medium text-[#f3f4f5]">{selectedEvent.court}</span>
                </div>
              )}
              {selectedEvent.judge && (
                <div className="flex justify-between">
                  <span className="text-[#879292]">Judge</span>
                  <span className="text-[#f3f4f5]">{selectedEvent.judge}</span>
                </div>
              )}
              {selectedEvent.stage && (
                <div className="flex justify-between">
                  <span className="text-[#879292]">Stage</span>
                  <span className="text-[#f3f4f5]">{selectedEvent.stage}</span>
                </div>
              )}
              {selectedEvent.caseNumber && (
                <div className="flex justify-between">
                  <span className="text-[#879292]">Case Number</span>
                  <span className="font-mono text-[#f3f4f5]">{selectedEvent.caseNumber}</span>
                </div>
              )}
              {selectedEvent.notes && (
                <div className="pt-2 border-t border-[#272b2b]">
                  <span className="text-[#879292] block mb-1">Notes / Agenda:</span>
                  <p className="text-[#f3f4f5] font-serif leading-relaxed">{selectedEvent.notes}</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button variant="ghost" onClick={() => setEventDetailsModalOpen(false)} className="text-[#879292] hover:text-white">Close</Button>
              <Button 
                onClick={() => {
                  setEventDetailsModalOpen(false);
                  router.push(`/cases/${selectedEvent.caseId}`);
                }}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold"
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
