'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { format, formatDistanceToNow, isSameWeek, parseISO } from 'date-fns';

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
      return format(parseISO(dateStr), 'dd MMM · HH:mm');
    } catch {
      return '—';
    }
  };

  const formatRelativeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
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
    <AppShell>
      <div className="flex h-full -mx-4 sm:-mx-6 md:-mx-8">
        
        {/* ── Main Left Pane: Cases List & Filters ──────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 pr-0 lg:pr-4 pl-4 sm:pl-6 md:pl-8 border-r border-border h-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-semibold tracking-tight text-foreground">Cases</h1>
              <span className="text-xs text-muted-foreground/80 font-mono bg-white/5 px-2 py-0.5 rounded-md mt-0.5">
                {cases.length} total
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <Input 
                  placeholder="Find a case, judge or client..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#111111] border-white/10 h-9 rounded-lg text-xs" 
                />
              </div>

              {/* New Case Button */}
              <Button 
                onClick={() => setNewCaseModalOpen(true)}
                className="h-9 bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium rounded-lg border border-[#4ADE80]/30 shadow-none text-xs flex-shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" /> New Case
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-border/50 text-[13px]">
            {/* Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
              {[
                { id: 'Active', label: 'Active', count: cases.filter(c => c.status?.toLowerCase() !== 'closed' && c.status?.toLowerCase() !== 'archived').length },
                { id: 'This week', label: 'This week', count: cases.filter(c => {
                    if (!c.next_hearing_date) return false;
                    try { return isSameWeek(parseISO(c.next_hearing_date), new Date()); } catch { return false; }
                  }).length 
                },
                { id: 'Needs attention', label: 'Needs attention', count: cases.filter(c => !c.next_hearing_date && !c.description).length },
                { id: 'All', label: 'All', count: cases.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium text-xs whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === tab.id 
                      ? 'bg-[#1a231f] text-[#4ADE80] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.2)]' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {/* Court filter */}
              <div className="flex items-center gap-1.5 bg-[#111111] border border-white/5 rounded-lg px-2 py-1">
                <span>Court:</span>
                <select 
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  className="bg-transparent text-foreground focus:outline-none text-xs cursor-pointer"
                >
                  <option value="ALL" className="bg-[#16161a]">All Courts</option>
                  {uniqueCourts.map(ct => (
                    <option key={ct} value={ct} className="bg-[#16161a]">{ct}</option>
                  ))}
                </select>
              </div>

              {/* Stage filter */}
              <div className="flex items-center gap-1.5 bg-[#111111] border border-white/5 rounded-lg px-2 py-1">
                <span>Stage:</span>
                <select 
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="bg-transparent text-foreground focus:outline-none text-xs cursor-pointer"
                >
                  <option value="ALL" className="bg-[#16161a]">All Stages</option>
                  {uniqueStages.map(st => (
                    <option key={st} value={st} className="bg-[#16161a]">{st}</option>
                  ))}
                </select>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1.5 bg-[#111111] border border-white/5 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-foreground focus:outline-none text-xs cursor-pointer"
                >
                  <option value="hearing" className="bg-[#16161a]">Next Hearing</option>
                  <option value="updated" className="bg-[#16161a]">Recently Updated</option>
                  <option value="filing" className="bg-[#16161a]">Filing Date</option>
                  <option value="title" className="bg-[#16161a]">Title (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Header (Desktop) */}
          <div className="hidden sm:grid grid-cols-[2.2fr_1fr_1.2fr_1fr_90px] gap-4 px-3.5 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
            <div>Case</div>
            <div>Court</div>
            <div>Next Hearing</div>
            <div>Stage</div>
            <div className="text-right">Updated</div>
          </div>

          {/* Cases List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pb-16">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <span className="text-xs">Loading cases...</span>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-xl border border-white/5 bg-[#111111] my-4">
                <Scale className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No cases found.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters or create a new matter.</p>
                <Button 
                  onClick={() => setNewCaseModalOpen(true)}
                  className="mt-4 h-8 bg-[#2D4537] text-[#4ADE80] text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Case
                </Button>
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCaseId === c.id;
                const statusStr = (c.status || 'OPEN').toUpperCase();

                return (
                  <div 
                    key={c.id}
                    onClick={() => {
                      router.push(`/cases/${c.id}`);
                    }}
                    className={`
                      p-3.5 rounded-xl cursor-pointer transition-all text-[13px] border
                      ${isSelected 
                        ? 'bg-[#1a231f] border-[#2D4537] shadow-[0_0_15px_rgba(45,69,55,0.4)]' 
                        : 'bg-[#111111] border-white/5 hover:border-white/15 hover:bg-white/[0.02]'}
                    `}
                  >
                    {/* Desktop Row View */}
                    <div className="hidden sm:grid grid-cols-[2.2fr_1fr_1.2fr_1fr_90px] gap-4 items-center">
                      <div className="min-w-0 pr-2">
                        <div className={`font-medium truncate ${isSelected ? 'text-[#4ADE80]' : 'text-foreground'}`}>
                          {c.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-2">
                          <span className="font-mono">{c.case_number || 'No Ref'}</span>
                          {c.client_name && (
                            <>
                              <span>&middot;</span>
                              <span className="truncate">{c.client_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-muted-foreground/80 truncate text-xs">
                        {c.court || '—'}
                      </div>

                      <div>
                        <div className={c.next_hearing_date ? 'text-foreground/90 font-medium text-xs' : 'text-muted-foreground text-xs'}>
                          {formatDateTime(c.next_hearing_date)}
                        </div>
                        {c.next_hearing_date && (
                          <div className="text-[10px] text-orange-400 font-medium mt-0.5">
                            {formatRelativeDate(c.next_hearing_date)}
                          </div>
                        )}
                      </div>

                      <div className="text-muted-foreground/80 truncate text-xs">
                        {c.stage || '—'}
                      </div>

                      <div className="text-right text-muted-foreground/60 text-xs font-mono">
                        {formatDate(c.updated_at)}
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`font-medium text-sm ${isSelected ? 'text-[#4ADE80]' : 'text-foreground'}`}>
                          {c.title}
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 flex-shrink-0">
                          {statusStr}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>{c.court || 'Court'}</span>
                        <span>&middot;</span>
                        <span className="font-mono text-[11px]">{c.case_number || 'No Ref'}</span>
                        {c.stage && (
                          <>
                            <span>&middot;</span>
                            <span className="text-foreground/80">{c.stage}</span>
                          </>
                        )}
                      </div>

                      {c.next_hearing_date && (
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                          <span className="text-muted-foreground text-[11px]">Next Hearing:</span>
                          <span className="text-orange-400 font-medium text-[11px]">
                            {formatDateTime(c.next_hearing_date)} ({formatRelativeDate(c.next_hearing_date)})
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Footer stats */}
          <div className="py-3 flex justify-between items-center text-xs text-muted-foreground border-t border-white/5 mt-auto">
            <div>Showing {filteredCases.length} of {cases.length} matters</div>
            <div className="text-[11px] text-muted-foreground/70">
              {currentOrg?.name}
            </div>
          </div>
        </div>

        {/* ── Desktop Right Pane: Selected Case Preview ──────────────── */}
        {selectedCase ? (
          <aside className="hidden lg:flex w-[380px] xl:w-[420px] flex-col bg-[#111111] border-l border-border h-full overflow-hidden flex-shrink-0">
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* Top Meta Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Case Preview</span>
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleOpenEdit}
                      className="w-7 h-7 text-muted-foreground hover:text-foreground"
                      title="Edit Case"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeleteConfirmModalOpen(true)}
                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                      title="Delete Case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <h2 className="text-xl font-heading font-semibold text-foreground leading-tight">
                  {selectedCase.title}
                </h2>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  {selectedCase.case_number || 'No Reference Number'}
                </div>

                <div className="flex flex-wrap gap-2 mt-3.5">
                  <Badge className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] hover:bg-[#1a231f] font-normal shadow-none px-2 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] mr-1.5"></span>
                    {selectedCase.status || 'OPEN'}
                  </Badge>
                  {selectedCase.case_type && (
                    <Badge variant="outline" className="border-white/10 text-muted-foreground bg-transparent font-normal px-2 rounded-md">
                      {selectedCase.case_type}
                    </Badge>
                  )}
                  {selectedCase.stage && (
                    <Badge variant="outline" className="border-purple-500/20 text-purple-400 bg-purple-500/10 font-normal px-2 rounded-md">
                      {selectedCase.stage}
                    </Badge>
                  )}
                </div>
              </div>

              {/* AI Summary / Description Block — compact */}
              <div className="bg-[#14101e] border border-[#A855F7]/30 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#A855F7]/50"></div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#A855F7]" />
                    <span className="text-[10px] font-bold text-[#A855F7] tracking-widest uppercase">Summary & Facts</span>
                  </div>
                  <button 
                    onClick={handleOpenEdit}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-foreground/80 font-serif line-clamp-3">
                  {selectedCase.description || 'No background description provided yet. Click edit to add facts and legal issues.'}
                </p>
              </div>


              {/* Metadata Key-Value Grid */}
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Matter Details</div>
                <div className="grid grid-cols-[90px_1fr] gap-y-2.5 text-[13px] bg-[#16161a] border border-white/5 rounded-xl p-4">
                  <div className="text-muted-foreground/70">Court</div>
                  <div className="font-medium text-foreground">{selectedCase.court || '—'}</div>
                  
                  <div className="text-muted-foreground/70">Judge</div>
                  <div className="text-foreground/90">{selectedCase.judge || '—'}</div>
                  
                  <div className="text-muted-foreground/70">Client</div>
                  <div className="text-foreground/90">{selectedCase.client_name || '—'}</div>
                  
                  <div className="text-muted-foreground/70">Opposing</div>
                  <div className="text-foreground/90">{selectedCase.opposing_party || '—'}</div>
                  
                  <div className="text-muted-foreground/70">Filed On</div>
                  <div className="text-foreground/90">{formatDate(selectedCase.filing_date)}</div>

                  <div className="text-muted-foreground/70">Role</div>
                  <div className="text-foreground/90">{selectedCase.role || 'ADMIN'}</div>
                </div>
              </div>

              {/* Next Hearing Countdown Banner */}
              {selectedCase.next_hearing_date ? (
                <div className="bg-[#16161a] border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Next Hearing</div>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] font-mono">
                      {formatRelativeDate(selectedCase.next_hearing_date)}
                    </Badge>
                  </div>
                  <div className="text-base font-medium text-foreground">
                    {format(parseISO(selectedCase.next_hearing_date), 'dd MMMM yyyy · HH:mm')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedCase.stage || 'Court Appearance'} &middot; {selectedCase.court}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-white/5 bg-[#16161a] flex items-center justify-between text-xs text-muted-foreground">
                  <span>No next hearing scheduled</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setQuickHearingModalOpen(true)}
                    className="h-7 text-[11px] bg-transparent border-white/10"
                  >
                    + Schedule
                  </Button>
                </div>
              )}

              {/* Quick Case Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickTaskModalOpen(true)}
                  className="bg-transparent border-white/10 hover:bg-white/5 text-xs h-9"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickHearingModalOpen(true)}
                  className="bg-transparent border-white/10 hover:bg-white/5 text-xs h-9"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Add Hearing
                </Button>
              </div>

            </div>
            
            {/* Bottom Action Footer */}
            <div className="p-4 border-t border-white/5 bg-[#111111] flex gap-3">
              <Button 
                onClick={() => router.push(`/cases/${selectedCase.id}`)} 
                className="flex-1 bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold h-10 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.2)] text-xs"
              >
                Open Case Dashboard &rarr;
              </Button>
            </div>
          </aside>
        ) : (
          <aside className="hidden lg:flex w-[380px] xl:w-[420px] items-center justify-center p-8 text-center text-muted-foreground/60 border-l border-border bg-[#111111]">
            <div>
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Select a case to view details and preview.</p>
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
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-semibold">New Legal Matter</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register a new case in {currentOrg?.name || 'firm'} with AI vector search support.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewCase} className="space-y-4 mt-2 max-h-[75vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Case Title *</Label>
              <Input 
                required
                placeholder="e.g. Patel v. State of Gujarat" 
                value={newCaseForm.title}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Reference / Case No.</Label>
                <Input 
                  placeholder="e.g. CRL.A/1247/2024" 
                  value={newCaseForm.case_number}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, case_number: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Court</Label>
                <Input 
                  placeholder="e.g. Gujarat HC" 
                  value={newCaseForm.court}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, court: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Stage</Label>
                <Input 
                  placeholder="e.g. Arguments" 
                  value={newCaseForm.stage}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, stage: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Judge / Bench</Label>
                <Input 
                  placeholder="e.g. Justice A. Rao" 
                  value={newCaseForm.judge}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, judge: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Client Name</Label>
                <Input 
                  placeholder="e.g. R. Patel" 
                  value={newCaseForm.client_name}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, client_name: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Opposing Party</Label>
                <Input 
                  placeholder="e.g. State of Gujarat" 
                  value={newCaseForm.opposing_party}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, opposing_party: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Case Type</Label>
                <select 
                  value={newCaseForm.case_type}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, case_type: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
                >
                  <option value="Criminal Appeal">Criminal Appeal</option>
                  <option value="Civil Suit">Civil Suit</option>
                  <option value="Commercial Arbitration">Commercial Arbitration</option>
                  <option value="Family Matter">Family Matter</option>
                  <option value="Writ Petition">Writ Petition</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Next Hearing</Label>
                <Input 
                  type="datetime-local"
                  value={newCaseForm.next_hearing_date}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, next_hearing_date: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Summary / Facts</Label>
              <textarea 
                rows={3}
                placeholder="Background facts, legal grounds..." 
                value={newCaseForm.description}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, description: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none resize-none"
              />
            </div>



            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setNewCaseModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingNewCase}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold"
              >
                {submittingNewCase ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Create Matter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT CASE MODAL ─────────────────────────────────────────── */}
      <Dialog open={editCaseModalOpen} onOpenChange={setEditCaseModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Edit Case Details</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update case metadata, status, or next scheduled hearing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditCase} className="space-y-4 mt-2 max-h-[75vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Title</Label>
              <Input 
                required
                value={editCaseForm.title}
                onChange={(e) => setEditCaseForm({ ...editCaseForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                <select 
                  value={editCaseForm.status}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, status: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
                >
                  <option value="OPEN">OPEN / ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Stage</Label>
                <Input 
                  value={editCaseForm.stage}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, stage: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Court</Label>
                <Input 
                  value={editCaseForm.court}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, court: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Judge</Label>
                <Input 
                  value={editCaseForm.judge}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, judge: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Client</Label>
                <Input 
                  value={editCaseForm.client_name}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, client_name: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Opposing</Label>
                <Input 
                  value={editCaseForm.opposing_party}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, opposing_party: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Next Hearing Date</Label>
              <Input 
                type="datetime-local"
                value={editCaseForm.next_hearing_date}
                onChange={(e) => setEditCaseForm({ ...editCaseForm, next_hearing_date: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Summary / Description</Label>
              <textarea 
                rows={3}
                value={editCaseForm.description}
                onChange={(e) => setEditCaseForm({ ...editCaseForm, description: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none resize-none"
              />
            </div>



            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditCaseModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingEdit}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold"
              >
                {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CASE CONFIRMATION DIALOG ─────────────────────────── */}
      <Dialog open={deleteConfirmModalOpen} onOpenChange={setDeleteConfirmModalOpen}>
        <DialogContent className="bg-[#16161a] border-destructive/30 text-foreground max-w-sm p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-heading font-semibold">Delete Matter?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedCase?.title}</span>? This will permanently remove all associated tasks and documents.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleDeleteCase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              Delete Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ADD TASK MODAL (FOR SELECTED CASE) ────────────────── */}
      <Dialog open={quickTaskModalOpen} onOpenChange={setQuickTaskModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Add Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              For: <span className="text-foreground font-semibold">{selectedCase?.title}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuickTask} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Task Title *</Label>
              <Input 
                required
                placeholder="e.g. Prepare list of dates and synopsis" 
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</Label>
              <Input 
                type="date"
                value={quickTaskDue}
                onChange={(e) => setQuickTaskDue(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setQuickTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingQuickTask}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold"
              >
                {submittingQuickTask ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ADD HEARING MODAL (FOR SELECTED CASE) ─────────────── */}
      <Dialog open={quickHearingModalOpen} onOpenChange={setQuickHearingModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Schedule Next Hearing</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              For: <span className="text-foreground font-semibold">{selectedCase?.title}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuickHearing} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Date & Time *</Label>
              <Input 
                required
                type="datetime-local"
                value={quickHearingDate}
                onChange={(e) => setQuickHearingDate(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Agenda / Notes</Label>
              <Input 
                placeholder="e.g. Cross examination of respondent" 
                value={quickHearingNotes}
                onChange={(e) => setQuickHearingNotes(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setQuickHearingModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submittingQuickHearing}
                className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold"
              >
                {submittingQuickHearing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Hearing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
