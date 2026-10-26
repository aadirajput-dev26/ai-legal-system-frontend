'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { 
  Search, 
  Plus, 
  Sparkles, 
  Filter, 
  ChevronDown, 
  ListFilter, 
  Loader2, 
  Calendar, 
  Clock, 
  Check, 
  Trash2, 
  Edit3, 
  ExternalLink,
  Scale,
  X,
  FileText,
  AlertTriangle,
  Building,
  User,
  Gavel,
  ArrowUpDown
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
import { useOrg } from '@/lib/org-context';
import { CaseItem } from '@/lib/types';
import { format, formatDistanceToNow, isSameWeek, parseISO, differenceInCalendarDays } from 'date-fns';

export default function CasesPage() {
  const router = useRouter();
  const { currentOrg } = useOrg();

  const [activeTab, setActiveTab] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'hearing' | 'updated' | 'filing' | 'title'>('hearing');
  
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [editCaseModalOpen, setEditCaseModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [quickTaskModalOpen, setQuickTaskModalOpen] = useState(false);
  const [quickHearingModalOpen, setQuickHearingModalOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // New Case Form
  const [newCaseForm, setNewCaseForm] = useState({
    title: '',
    case_number: '',
    court: 'Gujarat HC',
    stage: 'Final Arguments',
    client_name: '',
    opposing_party: '',
    judge: '',
    case_type: 'Criminal Appeal',
    description: '',
    instructions: '',
    filing_date: new Date().toISOString().split('T')[0],
    next_hearing_date: ''
  });
  const [submittingNewCase, setSubmittingNewCase] = useState(false);

  // Edit Case Form
  const [editCaseForm, setEditCaseForm] = useState({
    title: '',
    case_number: '',
    status: 'OPEN',
    court: '',
    stage: '',
    judge: '',
    client_name: '',
    opposing_party: '',
    case_type: '',
    description: '',
    instructions: '',
    next_hearing_date: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Quick Task Form for selected case
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDue, setQuickTaskDue] = useState('');
  const [submittingQuickTask, setSubmittingQuickTask] = useState(false);

  // Quick Hearing Form for selected case
  const [quickHearingDate, setQuickHearingDate] = useState('');
  const [quickHearingNotes, setQuickHearingNotes] = useState('');
  const [submittingQuickHearing, setSubmittingQuickHearing] = useState(false);

  // Fetch Cases for active org
  const fetchCases = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const res = await casesApi.list(currentOrg.id);
      const list: CaseItem[] = res.data || [];
      setCases(list);
      
      if (list.length > 0) {
        // Keep current selected case if still exists, or default to first
        setSelectedCaseId(prev => {
          if (prev && list.some(c => c.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setSelectedCaseId(null);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      fetchCases();
    }
  }, [currentOrg?.id]);

  const selectedCase = useMemo(() => {
    return cases.find(c => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  // Extract unique courts and stages for dropdown filters
  const uniqueCourts = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.court) set.add(c.court); });
    return Array.from(set);
  }, [cases]);

  const uniqueStages = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.stage) set.add(c.stage); });
    return Array.from(set);
  }, [cases]);

  // Date formatters
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return '—';
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = parseISO(dateStr);
      // If date string has no specific time or is 00:00 UTC (renders as 05:30 IST), show date only
      if (dateStr.length <= 10 || (d.getUTCHours() === 0 && d.getUTCMinutes() === 0)) {
        return format(d, 'dd MMM yyyy');
      }
      return format(d, 'dd MMM · HH:mm');
    } catch {
      return '—';
    }
  };

  const formatRelativeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const target = parseISO(dateStr);
      const days = differenceInCalendarDays(target, new Date());
      if (days === 0) return 'today';
      if (days === 1) return 'tomorrow';
      if (days === -1) return 'yesterday';
      if (days > 1) return `in ${days} days`;
      return `${Math.abs(days)} days ago`;
    } catch {
      return '';
    }
  };

  // Filtered & Sorted Cases
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Tab filter
      if (activeTab === 'Active') {
        const s = (c.status || '').toLowerCase();
        if (s === 'closed' || s === 'archived') return false;
      } else if (activeTab === 'This week') {
        if (!c.next_hearing_date) return false;
        try {
          if (!isSameWeek(parseISO(c.next_hearing_date), new Date())) return false;
        } catch {
          return false;
        }
      } else if (activeTab === 'Needs attention') {
        // e.g. open cases with upcoming hearings or missing instructions
        if (!c.next_hearing_date && !c.description) return false;
      }

      // Court filter
      if (selectedCourt !== 'ALL' && c.court !== selectedCourt) {
        return false;
      }

      // Stage filter
      if (selectedStage !== 'ALL' && c.stage !== selectedStage) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          (c.title?.toLowerCase().includes(q)) ||
          (c.case_number?.toLowerCase().includes(q)) ||
          (c.court?.toLowerCase().includes(q)) ||
          (c.judge?.toLowerCase().includes(q)) ||
          (c.client_name?.toLowerCase().includes(q)) ||
          (c.opposing_party?.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'hearing') {
        if (!a.next_hearing_date) return 1;
        if (!b.next_hearing_date) return -1;
        return new Date(a.next_hearing_date).getTime() - new Date(b.next_hearing_date).getTime();
      } else if (sortBy === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === 'filing') {
        if (!a.filing_date) return 1;
        if (!b.filing_date) return -1;
        return new Date(b.filing_date).getTime() - new Date(a.filing_date).getTime();
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [cases, activeTab, selectedCourt, selectedStage, searchQuery, sortBy]);

  // Handle New Case Creation
  const handleCreateNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !newCaseForm.title) return;

    try {
      setSubmittingNewCase(true);
      const payload: any = {
        title: newCaseForm.title,
        case_number: newCaseForm.case_number,
        court: newCaseForm.court,
        stage: newCaseForm.stage,
        client_name: newCaseForm.client_name,
        opposing_party: newCaseForm.opposing_party,
        judge: newCaseForm.judge,
        case_type: newCaseForm.case_type,
        description: newCaseForm.description,
        instructions: newCaseForm.instructions,
        filing_date: newCaseForm.filing_date
      };

      if (newCaseForm.next_hearing_date) {
        payload.next_hearing_date = new Date(newCaseForm.next_hearing_date).toISOString();
      }

      const res = await casesApi.create(currentOrg.id, payload);
      if (res.data) {
        setNewCaseModalOpen(false);
        setNewCaseForm({
          title: '',
          case_number: '',
          court: 'Gujarat HC',
          stage: 'Final Arguments',
          client_name: '',
          opposing_party: '',
          judge: '',
          case_type: 'Criminal Appeal',
          description: '',
          instructions: '',
          filing_date: new Date().toISOString().split('T')[0],
          next_hearing_date: ''
        });
        await fetchCases();
        setSelectedCaseId(res.data.id);
      }
    } catch (err) {
      console.error('Failed to create case:', err);
    } finally {
      setSubmittingNewCase(false);
    }
  };

  // Open Edit Dialog with prefilled data
  const handleOpenEdit = () => {
    if (!selectedCase) return;
    setEditCaseForm({
      title: selectedCase.title || '',
      case_number: selectedCase.case_number || '',
      status: selectedCase.status || 'OPEN',
      court: selectedCase.court || '',
      stage: selectedCase.stage || '',
      judge: selectedCase.judge || '',
      client_name: selectedCase.client_name || '',
      opposing_party: selectedCase.opposing_party || '',
      case_type: selectedCase.case_type || 'Civil Suit',
      description: selectedCase.description || '',
      instructions: selectedCase.instructions || '',
      next_hearing_date: selectedCase.next_hearing_date 
        ? new Date(selectedCase.next_hearing_date).toISOString().slice(0, 16) 
        : ''
    });
    setEditCaseModalOpen(true);
  };

  // Handle Edit Case Submission
  const handleEditCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase?.id) return;

    try {
      setSubmittingEdit(true);
      const updates: any = {
        title: editCaseForm.title,
        case_number: editCaseForm.case_number,
        status: editCaseForm.status,
        court: editCaseForm.court,
        stage: editCaseForm.stage,
        judge: editCaseForm.judge,
        client_name: editCaseForm.client_name,
        opposing_party: editCaseForm.opposing_party,
        case_type: editCaseForm.case_type,
        description: editCaseForm.description,
        instructions: editCaseForm.instructions,
      };

      if (editCaseForm.next_hearing_date) {
        updates.next_hearing_date = new Date(editCaseForm.next_hearing_date).toISOString();
      }

      await casesApi.update(selectedCase.id, updates);
      setEditCaseModalOpen(false);
      await fetchCases();
    } catch (err) {
      console.error('Failed to update case:', err);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle Delete Case
  const handleDeleteCase = async () => {
    if (!selectedCase?.id) return;

    try {
      await casesApi.delete(selectedCase.id);
      setDeleteConfirmModalOpen(false);
      await fetchCases();
    } catch (err) {
      console.error('Failed to delete case:', err);
    }
  };

  // Handle Quick Task Submission
  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase?.id || !quickTaskTitle.trim()) return;

    try {
      setSubmittingQuickTask(true);
      await tasksApi.create(selectedCase.id, {
        title: quickTaskTitle,
        dueDate: quickTaskDue ? new Date(quickTaskDue).toISOString() : undefined,
        status: 'PENDING'
      });
      setQuickTaskModalOpen(false);
      setQuickTaskTitle('');
      setQuickTaskDue('');
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmittingQuickTask(false);
    }
  };

  // Handle Quick Hearing Submission
  const handleCreateQuickHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase?.id || !quickHearingDate) return;

    try {
      setSubmittingQuickHearing(true);
      const isoDate = new Date(quickHearingDate).toISOString();
      await hearingsApi.create(selectedCase.id, {
        date: isoDate,
        notes: quickHearingNotes
      });
      await casesApi.update(selectedCase.id, {
        next_hearing_date: isoDate
      });
      setQuickHearingModalOpen(false);
      setQuickHearingDate('');
      setQuickHearingNotes('');
      await fetchCases();
    } catch (err) {
      console.error('Failed to create hearing:', err);
    } finally {
      setSubmittingQuickHearing(false);
    }
  };

  return (
    <AppShell caseId={selectedCase?.id}>
      <div className="flex h-[calc(100vh-3.25rem)] overflow-hidden">
        
        {/* ── Main Left Pane: Matters List & Filters ──────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 pr-0 lg:pr-6 pl-6 sm:pl-8 py-8 overflow-y-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-4 gap-4">
            <div>
              <h1 className="text-3xl font-serif tracking-tight text-[#f3f4f5]">Matters</h1>
              <p className="text-xs text-[#879292] mt-1">
                {cases.filter(c => c.status?.toLowerCase() !== 'closed').length} active · {cases.filter(c => c.next_hearing_date).length} listed in the next 14 days
              </p>
            </div>

            {/* Actions: New Matter */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button 
                onClick={() => setNewCaseModalOpen(true)}
                className="h-9 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold rounded-lg shadow-none text-xs flex-shrink-0 self-start sm:self-auto px-4 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1 stroke-[2.5]" /> New matter
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5 my-3 pb-3 border-b border-[#1e2323]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a7a]" />
              <Input 
                placeholder="Search by matter, judge, client or number" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 bg-[#121515] border-[#222828] h-9 rounded-lg text-xs text-[#f3f4f5] placeholder:text-[#6f7a7a] focus:border-[#2dd4bf]/40" 
              />
            </div>

            {/* Court filter */}
            <div className="flex items-center gap-1.5 bg-[#121515] border border-[#222828] rounded-lg px-2.5 h-9">
              <select 
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="bg-transparent text-[#c5cccc] focus:outline-none text-xs cursor-pointer"
              >
                <option value="ALL" className="bg-[#141717] text-[#f3f4f5]">All courts</option>
                {uniqueCourts.map(ct => (
                  <option key={ct} value={ct} className="bg-[#141717] text-[#f3f4f5]">{ct}</option>
                ))}
              </select>
            </div>

            {/* Next hearing / Sort filter */}
            <div className="flex items-center gap-1.5 bg-[#121515] border border-[#222828] rounded-lg px-2.5 h-9">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[#c5cccc] focus:outline-none text-xs cursor-pointer"
              >
                <option value="hearing" className="bg-[#141717] text-[#f3f4f5]">By next hearing</option>
                <option value="updated" className="bg-[#141717] text-[#f3f4f5]">Recently updated</option>
                <option value="filing" className="bg-[#141717] text-[#f3f4f5]">Filing date</option>
                <option value="title" className="bg-[#141717] text-[#f3f4f5]">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Matters List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 pb-16">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#879292]">
                <Loader2 className="w-7 h-7 animate-spin text-[#2dd4bf]" />
                <span className="text-xs">Loading matters...</span>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-xl border border-[#222828] bg-[#121515] my-4">
                <Scale className="w-8 h-8 text-[#6f7a7a] mx-auto mb-3" />
                <p className="text-sm text-[#879292] font-medium">No matters found.</p>
                <Button 
                  onClick={() => setNewCaseModalOpen(true)}
                  className="mt-4 h-8 bg-[#2dd4bf] text-[#091b18] text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> New matter
                </Button>
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCaseId === c.id;
                const hearingDate = c.next_hearing_date ? parseISO(c.next_hearing_date) : null;
                const daysDiff = hearingDate ? differenceInCalendarDays(hearingDate, new Date()) : null;

                return (
                  <div 
                    key={c.id}
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      setMobilePreviewOpen(true);
                    }}
                    className={`
                      px-4 py-3.5 rounded-lg cursor-pointer transition-all text-xs border-l-2
                      ${isSelected 
                        ? 'bg-amber-500/10 dark:bg-[#151919] border-[#f59e0b]' 
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-[#141717]/80 hover:border-slate-300 dark:hover:border-[#2a3030]'}
                    `}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Title and Ref */}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {[c.case_number, c.court].filter(Boolean).join(' · ')}
                        </div>
                      </div>

                      {/* Middle: Hearing date with days relative */}
                      {hearingDate ? (
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-semibold text-[#f59e0b]">
                            {format(hearingDate, 'EEE d MMM')}
                          </div>
                          <div className="text-[11px] text-[#f59e0b]/80">
                            {daysDiff === 0 ? 'today' : daysDiff === 1 ? 'in 1 day' : daysDiff !== null && daysDiff > 0 ? `in ${daysDiff} days` : 'past'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-right text-muted-foreground text-[11px] flex-shrink-0">
                          No date
                        </div>
                      )}

                      {/* Right: Stage */}
                      <div className="text-right w-24 flex-shrink-0 text-xs text-muted-foreground truncate">
                        {c.stage || 'Pleadings'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Desktop Right Pane: Selected Case Preview (Matches Artifact) ──────────────── */}
        {selectedCase ? (
          <aside className="hidden lg:flex w-[400px] xl:w-[440px] flex-col bg-card dark:bg-[#0f1212] border-l border-border dark:border-[#1a1e1e] h-full overflow-hidden flex-shrink-0">
            <div className="p-7 flex-1 overflow-y-auto space-y-6">
              
              {/* Header Label */}
              <div className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">
                PREVIEW
              </div>

              {/* Title & Case Number */}
              <div>
                <h2 className="text-2xl font-serif text-foreground tracking-tight leading-snug">
                  {selectedCase.title}
                </h2>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  {selectedCase.case_number || 'QA/CIV/2026/001'}
                </div>
              </div>

              {/* AI Summary Card: Written by LegalDesk */}
              <div className="bg-indigo-50/90 dark:bg-[#121422] border border-indigo-200 dark:border-[#2b3360] rounded-xl p-4.5 space-y-2 relative shadow-sm">
                <div className="text-[10px] font-mono tracking-wider uppercase text-indigo-700 dark:text-[#818cf8] font-bold">
                  SUMMARY — WRITTEN BY LEGALDESK
                </div>
                <p className="text-xs leading-relaxed text-indigo-950 dark:text-[#c5c8e0]">
                  {selectedCase.description || 'Commercial fit-out dispute. Pleadings registered, reconciliation in progress. All initial filings verified by LegalDesk.'}
                </p>
              </div>

              {/* Metadata Table */}
              <div className="border-t border-border dark:border-[#1e2323] pt-4">
                <div className="grid grid-cols-[80px_1fr] gap-y-3 text-xs">
                  <div className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">COURT</div>
                  <div className="text-foreground font-medium">{selectedCase.court || 'Commercial Court'}</div>
                  
                  <div className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">JUDGE</div>
                  <div className="text-foreground">{selectedCase.judge || 'Judge Mira Sen'}</div>
                  
                  <div className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">CLIENT</div>
                  <div className="text-foreground">{selectedCase.client_name || 'Aster Textiles Pvt Ltd'}</div>
                  
                  <div className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">OPPOSING</div>
                  <div className="text-foreground">{selectedCase.opposing_party || 'Cedar Retail LLP'}</div>
                  
                  <div className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">FILED</div>
                  <div className="text-foreground">{formatDate(selectedCase.filing_date)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button 
                  onClick={() => router.push(`/cases/${selectedCase.id}?chat=true`)}
                  className="w-full bg-gradient-to-r from-teal-500/15 via-emerald-500/15 to-teal-500/15 hover:from-teal-500/25 hover:to-emerald-500/25 border border-teal-500/30 text-teal-700 dark:text-[#2dd4bf] font-semibold h-10 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Sparkles className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf]" />
                  Chat with AI about this Matter
                </Button>

                <Button 
                  onClick={() => router.push(`/cases/${selectedCase.id}`)} 
                  className="w-full bg-card hover:bg-accent border border-border text-foreground font-medium h-10 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  Open brief &rarr;
                </Button>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleOpenEdit}
                    className="flex-1 text-[#879292] hover:text-[#f3f4f5] hover:bg-[#161a1a] text-xs h-8"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit details
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDeleteConfirmModalOpen(true)}
                    className="text-[#f87171] hover:text-red-400 hover:bg-red-950/20 text-xs h-8 px-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

            </div>
          </aside>
        ) : (
          <aside className="hidden lg:flex w-[400px] xl:w-[440px] items-center justify-center p-8 text-center text-[#6f7a7a] border-l border-[#1a1e1e] bg-[#0f1212]">
            <div>
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Select a matter to view brief summary.</p>
            </div>
          </aside>
        )}
      </div>

      {/* ── Mobile Slide-Over Preview Sheet ─────────────────────────── */}
      {mobilePreviewOpen && selectedCase && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="h-14 border-b border-border flex items-center justify-between px-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Case Details</span>
            <Button variant="ghost" size="icon" onClick={() => setMobilePreviewOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <h2 className="text-xl font-heading font-semibold">{selectedCase.title}</h2>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">{selectedCase.case_number || 'No Ref'}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537]">{selectedCase.status}</Badge>
              {selectedCase.court && <Badge variant="outline" className="border-white/10">{selectedCase.court}</Badge>}
              {selectedCase.stage && <Badge variant="outline" className="border-purple-500/20 text-purple-400">{selectedCase.stage}</Badge>}
            </div>

            {selectedCase.description && (
              <div className="bg-[#14101e] border border-[#A855F7]/30 rounded-xl p-4">
                <div className="text-[10px] font-bold text-[#A855F7] tracking-widest uppercase mb-1.5">Summary</div>
                <p className="text-xs text-foreground/90 font-serif leading-relaxed">{selectedCase.description}</p>
              </div>
            )}

            <div className="grid grid-cols-[90px_1fr] gap-y-2 text-xs bg-[#16161a] border border-white/5 rounded-xl p-3.5">
              <div className="text-muted-foreground">Judge</div>
              <div>{selectedCase.judge || '—'}</div>
              <div className="text-muted-foreground">Client</div>
              <div>{selectedCase.client_name || '—'}</div>
              <div className="text-muted-foreground">Opposing</div>
              <div>{selectedCase.opposing_party || '—'}</div>
              <div className="text-muted-foreground">Filed</div>
              <div>{formatDate(selectedCase.filing_date)}</div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-[#111111] flex gap-2">
            <Button 
              onClick={() => {
                setMobilePreviewOpen(false);
                router.push(`/cases/${selectedCase.id}`);
              }} 
              className="flex-1 bg-[#4ADE80] text-black font-semibold h-11 rounded-xl"
            >
              Open Full Case &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* ── CREATE CASE MODAL ───────────────────────────────────────── */}
      <Dialog open={newCaseModalOpen} onOpenChange={setNewCaseModalOpen}>
        <DialogContent className="bg-[#141717] border-[#232727] text-[#f3f4f5] max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-[#f3f4f5]">New legal matter</DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              Register a new matter with court, judge, and client particulars.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewCase} className="space-y-4 mt-2 max-h-[75vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Matter Title *</Label>
              <Input 
                required
                placeholder="e.g. Aster Textiles v. Cedar Retail" 
                value={newCaseForm.title}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, title: e.target.value })}
                className="bg-[#121515] border-[#222828] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Reference / Case No.</Label>
                <Input 
                  placeholder="e.g. QA/CIV/2026/001" 
                  value={newCaseForm.case_number}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, case_number: e.target.value })}
                  className="bg-[#121515] border-[#222828] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Court</Label>
                <Input 
                  placeholder="e.g. Commercial Court, Ahmedabad" 
                  value={newCaseForm.court}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, court: e.target.value })}
                  className="bg-[#121515] border-[#222828] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Stage</Label>
                <select 
                  value={newCaseForm.stage}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, stage: e.target.value })}
                  className="w-full bg-[#121515] border border-[#222828] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none focus:border-[#2dd4bf]/50"
                >
                  <option value="">Select Stage</option>
                  <option value="Pleadings">Pleadings</option>
                  <option value="Final arguments">Final arguments</option>
                  <option value="Preliminary hearing">Preliminary hearing</option>
                  <option value="Pre-Filing / Filing Stage">Pre-Filing / Filing Stage</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Judge / Bench</Label>
                <Input 
                  placeholder="e.g. Mira Sen" 
                  value={newCaseForm.judge}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, judge: e.target.value })}
                  className="bg-[#121515] border-[#222828] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Case Type</Label>
                <select 
                  value={newCaseForm.case_type}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, case_type: e.target.value })}
                  className="w-full bg-[#121515] border border-[#222828] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none focus:border-[#2dd4bf]/50"
                >
                  <option value="Commercial Dispute">Commercial Dispute</option>
                  <option value="Civil Suit">Civil Suit</option>
                  <option value="Arbitration">Arbitration</option>
                  <option value="Criminal Appeal">Criminal Appeal</option>
                  <option value="Writ Petition">Writ Petition</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Next Hearing</Label>
                <Input 
                  type="datetime-local"
                  value={newCaseForm.next_hearing_date}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, next_hearing_date: e.target.value })}
                  className="bg-[#121515] border-[#222828] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono tracking-wider uppercase text-[#6f7a7a]">Summary / Facts</Label>
              <textarea 
                rows={3}
                placeholder="Residential fit-out agreement dated..." 
                value={newCaseForm.description}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, description: e.target.value })}
                className="w-full bg-[#121515] border border-[#222828] rounded-lg p-2.5 text-sm text-[#f3f4f5] focus:outline-none focus:border-[#2dd4bf]/50 resize-none"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setNewCaseModalOpen(false)} className="text-[#879292] hover:text-[#f3f4f5]">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingNewCase}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-medium"
              >
                {submittingNewCase ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Create matter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT CASE MODAL ─────────────────────────────────────────── */}
      <Dialog open={editCaseModalOpen} onOpenChange={setEditCaseModalOpen}>
        <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-normal text-white">Edit Case Details</DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              Update case metadata, status, or next scheduled hearing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditCase} className="space-y-4 mt-2 max-h-[75vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Title</Label>
              <Input 
                required
                value={editCaseForm.title}
                onChange={(e) => setEditCaseForm({ ...editCaseForm, title: e.target.value })}
                className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Status</Label>
                <select 
                  value={editCaseForm.status}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, status: e.target.value })}
                  className="w-full bg-[#101313] border border-[#272b2b] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none focus:border-[#2dd4bf]/60"
                >
                  <option value="OPEN">OPEN / ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Stage</Label>
                <Input 
                  value={editCaseForm.stage}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, stage: e.target.value })}
                  className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Court</Label>
                <Input 
                  value={editCaseForm.court}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, court: e.target.value })}
                  className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Judge</Label>
                <Input 
                  value={editCaseForm.judge}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, judge: e.target.value })}
                  className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Client</Label>
                <Input 
                  value={editCaseForm.client_name}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, client_name: e.target.value })}
                  className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Opposing</Label>
                <Input 
                  value={editCaseForm.opposing_party}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, opposing_party: e.target.value })}
                  className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Next Hearing Date</Label>
              <Input 
                type="datetime-local"
                value={editCaseForm.next_hearing_date}
                onChange={(e) => setEditCaseForm({ ...editCaseForm, next_hearing_date: e.target.value })}
                className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Summary / Description</Label>
              <textarea 
                rows={3}
                value={editCaseForm.description}
                onChange={(e) => setEditCaseForm({ ...editCaseForm, description: e.target.value })}
                className="w-full bg-[#101313] border border-[#272b2b] rounded-lg p-2.5 text-sm text-[#f3f4f5] focus:outline-none focus:border-[#2dd4bf]/60 resize-none font-sans"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" className="text-xs text-[#879292] hover:text-white" onClick={() => setEditCaseModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingEdit}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs h-8"
              >
                {submittingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CASE CONFIRMATION DIALOG ─────────────────────────── */}
      <Dialog open={deleteConfirmModalOpen} onOpenChange={setDeleteConfirmModalOpen}>
        <DialogContent className="bg-[#141717] border-red-500/30 text-[#f3f4f5] max-w-sm p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-serif font-normal text-white">Delete Matter?</DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              Are you sure you want to delete <span className="font-semibold text-white">{selectedCase?.title}</span>? This will permanently remove all associated tasks and documents.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" className="text-xs text-[#879292] hover:text-white" onClick={() => setDeleteConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleDeleteCase}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8"
            >
              Delete Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ADD TASK MODAL (FOR SELECTED CASE) ────────────────── */}
      <Dialog open={quickTaskModalOpen} onOpenChange={setQuickTaskModalOpen}>
        <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-normal text-white">Add Task</DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              For: <span className="text-white font-medium">{selectedCase?.title}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuickTask} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Task Title *</Label>
              <Input 
                required
                placeholder="e.g. Prepare list of dates and synopsis" 
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Due Date</Label>
              <Input 
                type="date"
                value={quickTaskDue}
                onChange={(e) => setQuickTaskDue(e.target.value)}
                className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" className="text-xs text-[#879292] hover:text-white" onClick={() => setQuickTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingQuickTask}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs h-8"
              >
                {submittingQuickTask ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ADD HEARING MODAL (FOR SELECTED CASE) ─────────────── */}
      <Dialog open={quickHearingModalOpen} onOpenChange={setQuickHearingModalOpen}>
        <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-normal text-white">Schedule Next Hearing</DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              For: <span className="text-white font-medium">{selectedCase?.title}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuickHearing} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Date & Time *</Label>
              <Input 
                required
                type="datetime-local"
                value={quickHearingDate}
                onChange={(e) => setQuickHearingDate(e.target.value)}
                className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-[#879292]">Agenda / Notes</Label>
              <Input 
                placeholder="e.g. Cross examination of respondent" 
                value={quickHearingNotes}
                onChange={(e) => setQuickHearingNotes(e.target.value)}
                className="bg-[#101313] border-[#272b2b] text-[#f3f4f5] h-9 text-sm focus:border-[#2dd4bf]/60"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" className="text-xs text-[#879292] hover:text-white" onClick={() => setQuickHearingModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingQuickHearing}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs h-8"
              >
                {submittingQuickHearing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Save Hearing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM DELETE MATTER MODAL ─────────────────────────────── */}
      <ConfirmModal
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
        title="Delete Matter?"
        description={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">{selectedCase?.title}</span>? This action will permanently remove all associated hearings, tasks, drafts, and records for this matter.
          </>
        }
        confirmLabel="Delete Matter"
        onConfirm={handleDeleteCase}
      />

    </AppShell>
  );
}
