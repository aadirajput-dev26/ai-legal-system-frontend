'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrg } from '@/lib/org-context';
import { useEmbedScriptLoader } from '@/lib/useEmbedScriptLoader';
import { useViasocketEvents } from '@/lib/useViasocketEvents';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Sparkles, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  Calendar, 
  Check, 
  Trash2, 
  Edit3, 
  Upload, 
  Link as LinkIcon, 
  ExternalLink,
  Layers,
  Cpu,
  Send,
  Scale
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { cases as casesApi, tasks as tasksApi, documents as docsApi, hearings as hearingsApi, tools as toolsApi } from '@/lib/api';
import { CaseDraftsTab } from '@/components/drafts/CaseDraftsTab';
import { CaseItem, TaskItem, HearingItem, DocumentItem } from '@/lib/types';
import { format, parseISO, formatDistanceToNow, differenceInCalendarDays } from 'date-fns';
import { ContactsTab } from '@/components/cases/ContactsTab';
import { FeesTab } from '@/components/cases/FeesTab';
import { FactsTab } from '@/components/cases/FactsTab';
import { MatterChatDoodle } from '@/components/chat/MatterChatDoodle';

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const { currentOrg } = useOrg();
  const { loadScript } = useEmbedScriptLoader();

  const [activeTab, setActiveTab] = useState('Overview');
  const [caseData, setCaseData] = useState<CaseItem | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [hearings, setHearings] = useState<HearingItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Viasocket Tools states
  const [caseTools, setCaseTools] = useState<any[]>([]);
  const [importableTools, setImportableTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [launchingViasocket, setLaunchingViasocket] = useState(false);

  // Listen to published/updated/deleted tools from viasocket postMessage events
  useViasocketEvents(caseId, () => {
    fetchToolsData();
  });

  // Auto-open AI Chatbot if opened with ?chat=true
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('chat=true')) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-ai-chat', {
          detail: { caseId, caseTitle: caseData?.title }
        }));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [caseId, caseData?.title]);

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [hearingModalOpen, setHearingModalOpen] = useState(false);
  const [editCaseModalOpen, setEditCaseModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingTool, setDeletingTool] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [docToServe, setDocToServe] = useState<{ id: string; title: string } | null>(null);
  const [servingDoc, setServingDoc] = useState(false);

  // New Task Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // New Hearing Form
  const [newHearingDate, setNewHearingDate] = useState('');
  const [newHearingNotes, setNewHearingNotes] = useState('');
  const [submittingHearing, setSubmittingHearing] = useState(false);

  // New Document Form
  const [docForm, setDocForm] = useState({
    title: '',
    type: 'TEXT',
    content: '',
    url: '',
    description: ''
  });
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [submittingDoc, setSubmittingDoc] = useState(false);

  // Edit Case Form
  const [editForm, setEditForm] = useState({
    title: '',
    case_number: '',
    status: '',
    court: '',
    stage: '',
    judge: '',
    client_name: '',
    opposing_party: '',
    description: '',
    next_hearing_date: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [tempInstructions, setTempInstructions] = useState('');
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Edit Document Form states
  const [editDocModalOpen, setEditDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [editDocForm, setEditDocForm] = useState({
    id: '',
    title: '',
    description: '',
    content: ''
  });
  const [submittingEditDoc, setSubmittingEditDoc] = useState(false);
  const [fetchingDocContentId, setFetchingDocContentId] = useState<string | null>(null);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      const [caseRes, tasksRes, hearingsRes, docsRes] = await Promise.allSettled([
        casesApi.get(caseId),
        tasksApi.list(caseId),
        hearingsApi.list(caseId),
        docsApi.list(caseId)
      ]);

      if (caseRes.status === 'fulfilled' && caseRes.value.data) {
        setCaseData(caseRes.value.data);
      }

      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value.data || []);
      }

      if (hearingsRes.status === 'fulfilled') {
        setHearings(hearingsRes.value.data || []);
      }

      if (docsRes.status === 'fulfilled') {
        const d = docsRes.value.data;
        setDocuments(Array.isArray(d) ? d : (d?.resources || []));
      }
    } catch (err) {
      console.error('Failed to load case data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchToolsData = useCallback(async () => {
    try {
      setLoadingTools(true);
      const res = await toolsApi.list(caseId);
      setCaseTools(res.data || res.tools || res || []);
    } catch (err) {
      console.error('Failed to load case tools:', err);
    } finally {
      setLoadingTools(false);
    }
  }, [caseId]);

  const fetchImportableTools = async () => {
    if (!currentOrg?.id) return;
    try {
      const res = await toolsApi.listImportable(currentOrg.id, caseId);
      setImportableTools(res.data || res.tools || res || []);
    } catch (err) {
      console.error('Failed to load importable tools:', err);
    }
  };

  const handleLaunchViasocket = async (scriptId?: string) => {
    try {
      setLaunchingViasocket(true);
      const tokenRes = await toolsApi.getToken(caseId);
      if (tokenRes.data?.token || tokenRes.token) {
        const token = tokenRes.data?.token || tokenRes.token;
        loadScript(token, () => {
          if (window.openViasocket) {
            window.openViasocket(scriptId, {
              theme: {
                "--col-home-page": "#111114",
                "--col-primary-button": "rgb(45, 69, 55)",
                "--col-primary-button-text": "rgb(74, 222, 128)",
                "--font-family-content": "'Inter', sans-serif",
                "--font-family-headings": "'Outfit', sans-serif"
              },
              metadata: {
                caseId,
                organisationId: currentOrg?.id
              }
            });
          }
        });
      } else {
        alert('Could not authenticate with ViaSocket. Check environment configuration.');
      }
    } catch (err) {
      console.error(err);
      alert('Authentication failure with ViaSocket integrations server.');
    } finally {
      setLaunchingViasocket(false);
    }
  };

  const handleImportToolSubmit = async (scriptId: string) => {
    try {
      await toolsApi.import(caseId, scriptId);
      setImportModalOpen(false);
      fetchToolsData();
    } catch (err) {
      console.error('Failed to import tool:', err);
    }
  };

  const handleConfirmDeleteTool = async () => {
    if (!toolToDelete) return;
    try {
      setDeletingTool(true);
      await toolsApi.delete(caseId, toolToDelete.id);
      setToolToDelete(null);
      fetchToolsData();
    } catch (err) {
      console.error('Failed to delete tool:', err);
    } finally {
      setDeletingTool(false);
    }
  };

  const handleRunTool = async (tool: any) => {
    if (!tool.webhook_url) {
      alert('This tool does not have a webhook URL configured.');
      return;
    }
    try {
      const res = await fetch(tool.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, triggeredBy: 'manual', timestamp: new Date().toISOString() }),
      });
      if (res.ok) {
        alert(`✓ Tool "${tool.title || 'Tool'}" triggered successfully.`);
      } else {
        alert(`Failed to trigger tool: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error('Failed to run tool:', err);
      alert('Network error while triggering the tool webhook.');
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchCaseData();
      fetchToolsData();
    }
  }, [caseId, fetchToolsData]);

  // Toggle task status
  const handleToggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await tasksApi.update(caseId, task.id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task:', err);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  // Delete task
  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setDeletingTask(true);
      await tasksApi.delete(caseId, taskToDelete.id);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setDeletingTask(false);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setSubmittingTask(true);
      const res = await tasksApi.create(caseId, {
        title: newTaskTitle,
        dueDate: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
        status: 'PENDING'
      });

      if (res.data) {
        setTasks(prev => [res.data, ...prev]);
        setTaskModalOpen(false);
        setNewTaskTitle('');
        setNewTaskDue('');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Create Hearing
  const handleCreateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHearingDate) return;

    try {
      setSubmittingHearing(true);
      const isoDate = new Date(newHearingDate).toISOString();
      const res = await hearingsApi.create(caseId, {
        date: isoDate,
        notes: newHearingNotes
      });

      if (res.data) {
        setHearings(prev => [res.data, ...prev]);
        await casesApi.update(caseId, { next_hearing_date: isoDate });
        setHearingModalOpen(false);
        setNewHearingDate('');
        setNewHearingNotes('');
        fetchCaseData();
      }
    } catch (err) {
      console.error('Failed to create hearing:', err);
    } finally {
      setSubmittingHearing(false);
    }
  };

  // Create Document
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title) return;

    try {
      setSubmittingDoc(true);
      
      if (docForm.type === 'PDF') {
        if (!selectedDocFile) {
          alert('Please select a PDF file.');
          return;
        }
        const formData = new FormData();
        formData.append('title', docForm.title);
        formData.append('type', 'PDF');
        formData.append('description', docForm.description);
        formData.append('file', selectedDocFile);
        
        await docsApi.create(caseId, formData);
      } else {
        const payload: any = {
          title: docForm.title,
          type: docForm.type,
          description: docForm.description
        };
        if (docForm.type === 'TEXT') {
          payload.content = docForm.content;
        } else if (docForm.type === 'LINK') {
          payload.url = docForm.url;
        }

        await docsApi.create(caseId, payload);
      }

      setDocModalOpen(false);
      setDocForm({ title: '', type: 'TEXT', content: '', url: '', description: '' });
      setSelectedDocFile(null);
      fetchCaseData();
    } catch (err) {
      console.error('Failed to upload document:', err);
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleEditDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDocForm.id) return;
    try {
      setSubmittingEditDoc(true);
      await docsApi.update(caseId, editDocForm.id, {
        title: editDocForm.title,
        description: editDocForm.description,
        content: editDocForm.content
      });
      setEditDocModalOpen(false);
      fetchCaseData();
    } catch (err) {
      console.error('Failed to update document:', err);
    } finally {
      setSubmittingEditDoc(false);
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      setDeletingDoc(true);
      await docsApi.delete(caseId, docToDelete.id);
      setDocToDelete(null);
      fetchCaseData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeletingDoc(false);
    }
  };

  const handleConfirmServeDoc = async () => {
    if (!docToServe) return;
    try {
      setServingDoc(true);
      await docsApi.serve(caseId, docToServe.id);
      setDocToServe(null);
      alert('Document has been successfully served to the opposing counsel.');
    } catch (err) {
      console.error('Failed to serve document:', err);
      alert('Failed to serve document. Ensure contact details are filled.');
    } finally {
      setServingDoc(false);
    }
  };

  const handleOpenEditDoc = async (doc: DocumentItem) => {
    const docId = doc.id || doc._id || '';
    if (!docId) return;

    try {
      setFetchingDocContentId(docId);
      const res = await docsApi.get(caseId, docId);
      const fullDoc = res.data || doc;
      
      setSelectedDoc(fullDoc);
      setEditDocForm({
        id: fullDoc.id || fullDoc._id || '',
        title: fullDoc.title || '',
        description: fullDoc.description || '',
        content: fullDoc.content || fullDoc.url || '',
      });
      setEditDocModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch document content:', err);
      // Fallback to basic data
      setSelectedDoc(doc);
      setEditDocForm({
        id: docId,
        title: doc.title || '',
        description: doc.description || '',
        content: doc.content || doc.url || '',
      });
      setEditDocModalOpen(true);
    } finally {
      setFetchingDocContentId(null);
    }
  };

  // Open Edit Form
  const handleOpenEdit = () => {
    if (!caseData) return;
    setEditForm({
      title: caseData.title || '',
      case_number: caseData.case_number || '',
      status: caseData.status || 'OPEN',
      court: caseData.court || '',
      stage: caseData.stage || '',
      judge: caseData.judge || '',
      client_name: caseData.client_name || '',
      opposing_party: caseData.opposing_party || '',
      description: caseData.description || '',
      next_hearing_date: caseData.next_hearing_date
        ? new Date(caseData.next_hearing_date).toISOString().slice(0, 16)
        : ''
    });
    setEditCaseModalOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingEdit(true);
      const updates: any = {
        title: editForm.title,
        case_number: editForm.case_number,
        status: editForm.status,
        court: editForm.court,
        stage: editForm.stage,
        judge: editForm.judge,
        client_name: editForm.client_name,
        opposing_party: editForm.opposing_party,
        description: editForm.description,
      };

      if (editForm.next_hearing_date) {
        updates.next_hearing_date = new Date(editForm.next_hearing_date).toISOString();
      }

      await casesApi.update(caseId, updates);
      setEditCaseModalOpen(false);
      fetchCaseData();
    } catch (err) {
      console.error('Failed to update case:', err);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleSaveInstructions = async () => {
    try {
      setSavingInstructions(true);
      await casesApi.update(caseId, { instructions: tempInstructions });
      setEditingInstructions(false);
      fetchCaseData();
    } catch (err) {
      console.error('Failed to update instructions:', err);
    } finally {
      setSavingInstructions(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy · HH:mm');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
        </div>
      </AppShell>
    );
  }

  if (!caseData) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-full py-24 text-center">
          <Scale className="w-10 h-10 text-[#6f7a7a] mb-3" />
          <h2 className="text-lg font-serif font-semibold text-white">Matter not found</h2>
          <p className="text-xs text-[#879292] mt-1 mb-4">The requested matter could not be loaded or may have been deleted.</p>
          <Button onClick={() => router.push('/cases')} className="bg-[#2dd4bf] text-[#091b18] text-xs font-semibold">
            Back to Matters
          </Button>
        </div>
      </AppShell>
    );
  }

  const hearingDate = caseData.next_hearing_date ? parseISO(caseData.next_hearing_date) : null;
  const daysDiff = hearingDate ? differenceInCalendarDays(hearingDate, new Date()) : null;
  const daysLabel = daysDiff === 0 
    ? 'TODAY' 
    : daysDiff === 1 
    ? 'IN 1 DAY' 
    : daysDiff !== null && daysDiff > 1 
    ? `IN ${daysDiff} DAYS` 
    : 'UPCOMING';

  const tabs = [
    { id: 'Brief', count: null },
    { id: 'Documents', count: documents.length },
    { id: 'Hearings', count: hearings.length },
    { id: 'Tasks', count: tasks.length },
    { id: 'Drafts', count: null },
    { id: 'Facts', count: null },
    { id: 'Contacts', count: null },
    { id: 'Fees', count: null },
    { id: 'Tools', count: caseTools.length },
  ];

  return (
    <AppShell 
      caseId={caseId}
      customBreadcrumbs={[
        { label: currentOrg?.name || 'Test Law Chambers', href: '/dashboard' },
        { label: 'Matters', href: '/cases' },
        { label: caseData.title, href: `/cases/${caseId}` },
        { label: 'Hearing brief' },
      ]}
    >
      <div className="flex flex-col h-full w-full px-6 sm:px-8 py-8 space-y-6">
        
        {/* ── Top Header Section (Matches Hearing Brief in Artifact) ──── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1.5">
            {hearingDate && (
              <div className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#f59e0b]">
                {format(hearingDate, 'EEE d MMM · HH:mm').toUpperCase()} · {daysLabel}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-foreground">
              Hearing brief
            </h1>
            <p className="text-xs text-muted-foreground">
              {[caseData.court, caseData.stage || 'Pleadings', caseData.judge ? `before Judge ${caseData.judge}` : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <Button 
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-ai-chat', {
                    detail: { caseId, caseTitle: caseData?.title }
                  }));
                }
              }}
              className="h-9 px-3.5 text-xs bg-teal-500/10 hover:bg-teal-500/20 text-[#0d9488] dark:text-[#2dd4bf] border border-teal-500/30 font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Chatbot
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => alert('Exporting hearing brief...')}
              className="h-9 px-4 text-xs bg-card hover:bg-accent border border-border text-foreground rounded-lg shadow-sm cursor-pointer"
            >
              Export
            </Button>
            <Button 
              size="sm"
              onClick={() => alert('Hearing brief approved for filing.')}
              className="h-9 px-5 text-xs bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-medium rounded-lg shadow-sm cursor-pointer"
            >
              Approve
            </Button>
          </div>
        </div>

        {/* ── Tabs Bar ───────────────────────────────────────────────── */}
        <div className="flex gap-4 border-b border-[#1e2323] overflow-x-auto text-xs pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id === 'Brief' ? 'Overview' : tab.id)}
              className={`pb-2.5 px-1 font-medium border-b-2 transition-all relative flex items-center gap-1.5 whitespace-nowrap
                ${(activeTab === 'Overview' && tab.id === 'Brief') || activeTab === tab.id
                  ? 'border-[#2dd4bf] text-[#2dd4bf]' 
                  : 'border-transparent text-[#6f7a7a] hover:text-[#f3f4f5]'}
              `}
            >
              {tab.id}
              {tab.count !== null && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-[#161a1a] text-[#879292]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Brief / Overview (Hearing Brief from Artifact) ───── */}
        {(activeTab === 'Overview' || activeTab === 'Brief') && (
          <div className="space-y-8">
            
            {/* Legend Box */}
            <div className="bg-[#121515] border border-[#1e2323] rounded-xl p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-[3px] h-3.5 bg-[#2dd4bf] rounded-full flex-shrink-0" />
                  <span className="text-[#c5cccc]">Supported by a document you can open</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-[3px] h-3.5 bg-[#f59e0b] rounded-full flex-shrink-0" />
                  <span className="text-[#c5cccc]">Stated by the client, no document yet</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-[3px] h-3.5 bg-[#60a5fa] rounded-full flex-shrink-0" />
                  <span className="text-[#c5cccc]">The other side&apos;s position</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-[3px] h-3.5 bg-[#a78bfa] rounded-full flex-shrink-0" />
                  <span className="text-[#c5cccc]">Written by LegalDesk — not evidence</span>
                </div>
              </div>
            </div>

            {/* Main Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
              
              {/* Left Column: Facts Relied On */}
              <div className="space-y-4">
                <div className="text-[11px] font-mono tracking-wider uppercase text-[#6f7a7a] mb-2">
                  FACTS RELIED ON
                </div>

                {/* Fact 1 - Green (Supported) */}
                <div className="border-l-[3px] border-[#2dd4bf] bg-[#141717] p-5 rounded-r-xl space-y-2">
                  <p className="text-base font-serif text-[#f3f4f5] leading-relaxed">
                    Invoice 4471 records a payment of ₹42,000 by the claimant on 3 March 2026.
                  </p>
                  <p className="text-xs text-[#2dd4bf]">
                    Exhibit A, page 2 · &ldquo;Total paid: 42,000.00&rdquo;
                  </p>
                </div>

                {/* Fact 2 - Green (Supported) */}
                <div className="border-l-[3px] border-[#2dd4bf] bg-[#141717] p-5 rounded-r-xl space-y-2">
                  <p className="text-base font-serif text-[#f3f4f5] leading-relaxed">
                    The fit-out agreement is dated 10 February 2026 and provides for completion within eight weeks.
                  </p>
                  <p className="text-xs text-[#2dd4bf]">
                    Exhibit C, page 1 · clause 3.1
                  </p>
                </div>

                {/* Fact 3 - Amber (Client statement, gap) */}
                <div className="border-l-[3px] border-[#f59e0b] bg-[#141717] p-5 rounded-r-xl space-y-3">
                  <p className="text-base font-serif text-[#f3f4f5] leading-relaxed">
                    <span className="text-[#f59e0b]">The client states that</span> the salesperson guaranteed a full refund if delivery slipped past the agreed date.
                  </p>
                  <p className="text-xs text-[#879292]">
                    Consultation, 12 March 2026 · no supporting document
                  </p>
                  <div className="bg-[#1c1610] border border-[#3d2c18] rounded-lg p-3 text-xs text-[#f59e0b]">
                    This cannot be pleaded as a fact, and LegalDesk will not write it into a draft as one.
                  </div>
                </div>

                {/* Fact 4 - Blue (Respondent contention) */}
                <div className="border-l-[3px] border-[#60a5fa] bg-[#141717] p-5 rounded-r-xl space-y-2">
                  <p className="text-base font-serif text-[#f3f4f5] leading-relaxed">
                    <span className="text-[#60a5fa]">The respondent contends that</span> the delay followed scope changes requested by the claimant in writing on 2 April 2026.
                  </p>
                  <p className="text-xs text-[#879292]">
                    Reply, paragraph 7
                  </p>
                </div>

                {/* Fact 5 - Purple (LegalDesk analysis) */}
                <div className="border-l-[3px] border-[#a78bfa] bg-[#131624] border border-[#2b3360] p-5 rounded-xl space-y-2">
                  <p className="text-base font-serif text-[#f3f4f5] leading-relaxed">
                    <span className="text-[#818cf8]">It appears from the material that</span> {caseData.description || 'the invoice total and inspection records differ by ₹14,400, which may bear on the scope-change defence.'}
                  </p>
                </div>
              </div>

              {/* Right Column: Exhibits & Gap Callout */}
              <div className="space-y-6">
                
                {/* Exhibits List */}
                <div className="space-y-3">
                  <div className="text-[11px] font-mono tracking-wider uppercase text-[#6f7a7a]">
                    EXHIBITS
                  </div>
                  <div className="space-y-2">
                    {documents.length > 0 ? (
                      documents.map((doc, idx) => {
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        const letter = letters[idx] || `${idx + 1}`;
                        return (
                          <div key={doc.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-[#141717] border border-[#1e2323] text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-[#2dd4bf] font-bold">{letter}</span>
                              <span className="text-[#f3f4f5] truncate font-medium">{doc.title}</span>
                            </div>
                            <span className="text-[#6f7a7a] font-mono flex-shrink-0 text-[11px]">{(doc as any).pages || 3} pp</span>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[#141717] border border-[#1e2323] text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[#2dd4bf] font-bold">A</span>
                            <span className="text-[#f3f4f5] truncate font-medium">Invoice 4471</span>
                          </div>
                          <span className="text-[#6f7a7a] font-mono text-[11px]">3 pp</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[#141717] border border-[#1e2323] text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[#2dd4bf] font-bold">B</span>
                            <span className="text-[#f3f4f5] truncate font-medium">Inspection report</span>
                          </div>
                          <span className="text-[#6f7a7a] font-mono text-[11px]">11 pp</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[#141717] border border-[#1e2323] text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[#2dd4bf] font-bold">C</span>
                            <span className="text-[#f3f4f5] truncate font-medium">Fit-out agreement</span>
                          </div>
                          <span className="text-[#6f7a7a] font-mono text-[11px]">9 pp</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Gap Alert Card */}
                <div className="bg-[#1c1612] border border-[#3d2c18] rounded-xl p-5 space-y-3.5">
                  <div className="text-[11px] font-mono tracking-wider uppercase text-[#f59e0b] font-semibold">
                    ONE GAP BEFORE FILING
                  </div>
                  <p className="text-xs text-[#d1d5db] leading-relaxed">
                    The refund undertaking rests on the client&apos;s account alone. If an email or message records it, adding that document moves the statement into the supported column.
                  </p>
                  <Button 
                    onClick={() => setDocModalOpen(true)}
                    className="w-full bg-[#141717] hover:bg-[#1e2424] border border-[#2b3333] text-[#f3f4f5] text-xs font-medium h-9 rounded-lg"
                  >
                    Upload the document
                  </Button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ── Tab: Facts ────────────────────────────────────────────── */}
        {activeTab === 'Facts' && (
          <FactsTab caseId={caseId} caseData={caseData} onUpdate={fetchCaseData} />
        )}

        {/* ── Tab: Contacts ─────────────────────────────────────────── */}
        {activeTab === 'Contacts' && (
          <ContactsTab caseId={caseId} caseData={caseData} onUpdate={fetchCaseData} />
        )}

        {/* ── Tab: Fees ─────────────────────────────────────────────── */}
        {activeTab === 'Fees' && (
          <FeesTab caseId={caseId} />
        )}

        {/* ── Tab: Hearings ─────────────────────────────────────────── */}
        {activeTab === 'Hearings' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Court Hearings Log</h3>
              <Button size="sm" onClick={() => setHearingModalOpen(true)} className="h-8 bg-[#4ADE80] text-black font-semibold text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Schedule Hearing
              </Button>
            </div>

            {hearings.length === 0 ? (
              <div className="p-8 rounded-xl border border-white/5 bg-[#111111] text-center">
                <p className="text-xs text-muted-foreground">No hearings recorded for this matter yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hearings.map((h) => (
                  <div key={h.id} className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{formatDateTime(h.date)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{h.notes || 'No specific agenda recorded.'}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono bg-white/5 border-white/10">
                      {h.status || 'SCHEDULED'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Documents ────────────────────────────────────────── */}
        {activeTab === 'Documents' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground"> 
                
                Case Documents</h3>
              <Button size="sm" onClick={() => setDocModalOpen(true)} className="h-8 bg-[#4ADE80] text-black font-semibold text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Document
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 rounded-xl border border-white/5 bg-[#111111] text-center">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((d, idx) => (
                  <div key={d.id || d._id || idx} className="p-4 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                        {d.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{d.description}</div>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono bg-white/5 border-white/10 flex-shrink-0">
                        {d.type || 'TEXT'}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDoc(d)}
                        className="w-7 h-7 text-muted-foreground hover:text-purple-400"
                        title="Edit Document"
                      >
                        {fetchingDocContentId === (d.id || d._id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDocToServe({ id: d.id || d._id || '', title: d.title || 'Document' })}
                        className="w-7 h-7 text-muted-foreground hover:text-green-400"
                        title="Serve to Opposing Counsel"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDocToDelete({ id: d.id || d._id || '', title: d.title || 'Document' })}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Tasks ────────────────────────────────────────────── */}
        {activeTab === 'Tasks' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Action Items & Tasks</h3>
              <Button size="sm" onClick={() => setTaskModalOpen(true)} className="h-8 bg-[#4ADE80] text-black font-semibold text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 rounded-xl border border-white/5 bg-[#111111] text-center">
                <p className="text-xs text-muted-foreground">No tasks recorded for this case.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.map((t) => (
                  <div key={t.id} className="p-3.5 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleTaskStatus(t)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          t.status === 'COMPLETED' ? 'bg-[#4ADE80] border-[#4ADE80] text-black' : 'border-muted-foreground/40 hover:border-[#4ADE80]'
                        }`}
                      >
                        {t.status === 'COMPLETED' && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <div className="min-w-0">
                        <div className={`text-sm ${t.status === 'COMPLETED' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {t.title}
                        </div>
                        {t.due_date && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Due: {formatDate(t.due_date)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={`text-[10px] font-mono ${
                        t.status === 'COMPLETED' ? 'text-[#4ADE80] border-[#4ADE80]/30' : 'text-muted-foreground border-white/10'
                      }`}>
                        {t.status}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setTaskToDelete({ id: t.id, title: t.title })}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Drafts ───────────────────────────────────────────── */}
        {activeTab === 'Drafts' && (
          <CaseDraftsTab caseId={caseId} />
        )}

            {/* ── Tab: Tools ────────────────────────────────────────────── */}
        {activeTab === 'Tools' && (
          <div className="space-y-4 max-w-3xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Automation Tools</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Tools imported into this case from your organization's tool library.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/tools')}
                  className="h-8 text-xs border-white/10 bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  Manage All Tools
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    fetchImportableTools();
                    setImportModalOpen(true);
                  }} 
                  className="h-8 text-xs border-purple-500/30 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Import Tool
                </Button>
              </div>
            </div>

            {loadingTools ? (
              <div className="p-12 rounded-xl border border-white/5 bg-[#111111] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#4ADE80]" />
                <span className="text-xs text-muted-foreground">Loading tools...</span>
              </div>
            ) : caseTools.length === 0 ? (
              <div className="p-8 rounded-xl border border-white/5 bg-[#111111] text-center">
                <Cpu className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-4">No tools imported into this case yet.</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    onClick={() => { fetchImportableTools(); setImportModalOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs h-8 px-4 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Import Tool
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/tools')}
                    className="text-xs h-8 px-4 border-white/10 text-muted-foreground hover:text-foreground"
                  >
                    Create New Tool
                  </Button>
                </div>
              </div>

            ) : (
              <div className="space-y-3">
                {caseTools.map((tool, idx) => (
                  <div key={tool.id || idx} className="p-4 bg-[#111111] border border-white/5 rounded-xl hover:border-purple-500/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Cpu className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{tool.title || 'Untitled Integration'}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{tool.description || 'No description provided.'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {tool.webhook_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunTool(tool)}
                            className="text-xs text-[#4ADE80] hover:text-[#4ADE80]/80 hover:bg-[#4ADE80]/10 h-7 px-2.5 rounded-lg border border-[#4ADE80]/20 font-semibold"
                          >
                            ▶ Run
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLaunchViasocket(tool.script_id)}
                          className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 px-2.5 rounded-lg border border-purple-500/20"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToolToDelete({ id: tool.script_id, title: tool.title || 'Automation Tool' })}
                          className="w-7 h-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete Tool"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {tool.webhook_url && (
                      <div className="mt-2.5 ml-12">
                        <div className="text-[10px] text-muted-foreground/60 font-mono truncate bg-white/5 px-2 py-1 rounded border border-white/5 select-all flex items-center gap-1.5">
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          {tool.webhook_url}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── IMPORT VIA-SOCKET TOOL DIALOG MODAL ───────────────────────── */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Import Organization Tool</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Copy a previously configured ViaSocket tool from another case into this case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 my-2 max-h-[300px] overflow-y-auto pr-1">
            {importableTools.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No other tools available to import in this firm.</p>
            ) : (
              importableTools.map((tool, idx) => (
                <div key={tool.script_id || idx} className="p-3 bg-[#111111] border border-white/5 rounded-lg flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{tool.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{tool.description}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleImportToolSubmit(tool.script_id)}
                    className="bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold text-[10px] h-7 px-2.5 rounded-md"
                  >
                    Import
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setImportModalOpen(false)} className="text-xs h-8">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CREATE TASK MODAL ───────────────────────────────────────── */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">New Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign an action item for this matter.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Title *</Label>
              <Input 
                required
                placeholder="e.g. Draft reply affidavit" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</Label>
              <Input 
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setTaskModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingTask} className="bg-[#4ADE80] text-black font-semibold">
                {submittingTask ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SCHEDULE HEARING MODAL ──────────────────────────────────── */}
      <Dialog open={hearingModalOpen} onOpenChange={setHearingModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading font-semibold">Schedule Hearing</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add upcoming court date for {caseData.title}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHearing} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Hearing Date & Time *</Label>
              <Input 
                required
                type="datetime-local"
                value={newHearingDate}
                onChange={(e) => setNewHearingDate(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Notes / Agenda</Label>
              <Input 
                placeholder="e.g. Final arguments before bench" 
                value={newHearingNotes}
                onChange={(e) => setNewHearingNotes(e.target.value)}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setHearingModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingHearing} className="bg-[#4ADE80] text-black font-semibold">
                {submittingHearing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADD DOCUMENT MODAL ──────────────────────────────────────── */}
      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-heading font-semibold">Add Document</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Index document into this case's vector collection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDoc} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Document Title *</Label>
              <Input 
                required
                placeholder="e.g. Deposition of PW-3" 
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Type</Label>
                <select 
                  value={docForm.type}
                  onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
                >
                  <option value="TEXT">Text</option>
                  <option value="LINK">Link</option>
                  <option value="PDF">PDF File</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Brief Summary</Label>
                <Input 
                  placeholder="e.g. Witness statements" 
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            {docForm.type === 'LINK' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">URL *</Label>
                <Input 
                  required
                  type="url"
                  placeholder="https://..." 
                  value={docForm.url}
                  onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            ) : docForm.type === 'PDF' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Upload PDF File *</Label>
                <Input
                  required
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedDocFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#111111] border-white/10 h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-white/10 file:text-foreground hover:file:bg-white/15 cursor-pointer pt-1"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Content / Transcript *</Label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Paste legal notes or transcript content here..." 
                  value={docForm.content}
                  onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none resize-none font-sans"
                />
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setDocModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingDoc} className="bg-[#4ADE80] text-black font-semibold">
                {submittingDoc ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add
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
              Update case facts, stage, or metadata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2 max-h-[75vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Title</Label>
              <Input 
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                <select 
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Stage</Label>
                <Input 
                  value={editForm.stage}
                  onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Court</Label>
                <Input 
                  value={editForm.court}
                  onChange={(e) => setEditForm({ ...editForm, court: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Judge</Label>
                <Input 
                  value={editForm.judge}
                  onChange={(e) => setEditForm({ ...editForm, judge: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Client</Label>
                <Input 
                  value={editForm.client_name}
                  onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Opposing</Label>
                <Input 
                  value={editForm.opposing_party}
                  onChange={(e) => setEditForm({ ...editForm, opposing_party: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Next Hearing Date</Label>
              <Input 
                type="datetime-local"
                value={editForm.next_hearing_date}
                onChange={(e) => setEditForm({ ...editForm, next_hearing_date: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Summary</Label>
              <textarea 
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none resize-none"
              />
            </div>



            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditCaseModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingEdit} className="bg-[#4ADE80] text-black font-semibold">
                {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DOCUMENT MODAL ────────────────────────────────────────── */}
      <Dialog open={editDocModalOpen} onOpenChange={setEditDocModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-semibold">Edit Document details</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify index keywords, description, or transcript content.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditDocSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Document Title *</Label>
              <Input
                required
                value={editDocForm.title}
                onChange={(e) => setEditDocForm({ ...editDocForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Description / Summary</Label>
              <Input
                value={editDocForm.description}
                onChange={(e) => setEditDocForm({ ...editDocForm, description: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            {selectedDoc?.type === 'TEXT' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Content / Transcript *</Label>
                <textarea
                  required
                  rows={6}
                  value={editDocForm.content}
                  onChange={(e) => setEditDocForm({ ...editDocForm, content: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none resize-none font-sans leading-relaxed"
                />
              </div>
            ) : selectedDoc?.type === 'PDF' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground/60 uppercase">Document PDF URL (Read Only)</Label>
                <Input
                  disabled
                  value={selectedDoc.url || selectedDoc.content || ''}
                  className="bg-[#111111]/50 border-white/5 h-9 text-xs text-muted-foreground/80 cursor-not-allowed select-all"
                />
              </div>
            ) : selectedDoc?.type === 'LINK' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground/60 uppercase">Indexed Link URL (Read Only)</Label>
                <Input
                  disabled
                  value={selectedDoc.url || selectedDoc.content || ''}
                  className="bg-[#111111]/50 border-white/5 h-9 text-xs text-muted-foreground/80 cursor-not-allowed select-all"
                />
              </div>
            ) : null}

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditDocModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingEditDoc} className="bg-[#4ADE80] text-black font-semibold">
                {submittingEditDoc ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM DELETE DOCUMENT MODAL ──────────────────────────── */}
      <ConfirmModal
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Delete Document?"
        description={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">{docToDelete?.title}</span>? This file will be permanently removed from this matter and will no longer be available for citing.
          </>
        }
        confirmLabel="Delete Document"
        loading={deletingDoc}
        onConfirm={handleConfirmDeleteDoc}
      />

      {/* ── CONFIRM DELETE TOOL MODAL ──────────────────────────────── */}
      <ConfirmModal
        open={!!toolToDelete}
        onOpenChange={(open) => !open && setToolToDelete(null)}
        title="Delete Tool?"
        description={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">{toolToDelete?.title}</span>? This automation script will be permanently detached from this matter.
          </>
        }
        confirmLabel="Delete Tool"
        loading={deletingTool}
        onConfirm={handleConfirmDeleteTool}
      />

      {/* ── CONFIRM DELETE TASK MODAL ──────────────────────────────── */}
      <ConfirmModal
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task?"
        description={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">{taskToDelete?.title}</span>? This task will be permanently removed.
          </>
        }
        confirmLabel="Delete Task"
        loading={deletingTask}
        onConfirm={handleConfirmDeleteTask}
      />

      {/* ── CONFIRM SERVE DOCUMENT MODAL ───────────────────────────── */}
      <ConfirmModal
        open={!!docToServe}
        onOpenChange={(open) => !open && setDocToServe(null)}
        title="Serve Document to Opposing Counsel?"
        variant="default"
        description={
          <>
            Are you sure you want to serve <span className="font-semibold text-foreground">{docToServe?.title}</span> to the opposing counsel? They will receive formal email notification.
          </>
        }
        confirmLabel="Serve Document"
        loading={servingDoc}
        onConfirm={handleConfirmServeDoc}
      />

      {/* ── AI Chatbot Doodle (Exclusively accessible when a case is opened) ── */}
      <MatterChatDoodle caseId={caseId} caseTitle={caseData?.title} />

    </AppShell>
  );
}
