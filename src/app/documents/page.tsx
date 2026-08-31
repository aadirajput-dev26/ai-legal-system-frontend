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
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Edit3,
  Eye, 
  Sparkles, 
  Scale, 
  Loader2, 
  FolderClosed, 
  Link as LinkIcon, 
  FileCheck2, 
  Database,
  Calendar,
  Layers
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { documents as docsApi, cases as casesApi } from '@/lib/api';
import { CaseItem, DocumentItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface OrgDocumentItem extends DocumentItem {
  case_id?: string;
  case_title?: string;
  case_number?: string;
  court?: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();

  const [documents, setDocuments] = useState<OrgDocumentItem[]>([]);
  const [casesList, setCasesList] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PDF' | 'TEXT' | 'LINK'>('ALL');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<OrgDocumentItem | null>(null);

  // Upload Form state
  const [uploadForm, setUploadForm] = useState({
    caseId: '',
    title: '',
    type: 'TEXT',
    description: '',
    content: '',
    url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingUpload, setSubmittingUpload] = useState(false);

  // Edit Form state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    caseId: '',
    title: '',
    description: '',
    content: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const normalizeDocType = (doc: any): 'TEXT' | 'LINK' | 'PDF' => {
    if (doc?.type && typeof doc.type === 'string' && doc.type.trim()) {
      const t = doc.type.trim().toUpperCase();
      if (t === 'PDF' || t === 'LINK' || t === 'TEXT') return t as any;
    }
    if (doc?.url) {
      const u = String(doc.url).toLowerCase();
      if (u.endsWith('.pdf') || u.includes('.pdf?') || u.includes('/pdf/')) {
        return 'PDF';
      }
      return 'LINK';
    }
    return 'TEXT';
  };

  // Fetch all documents for organization
  const fetchOrgDocuments = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const [docsRes, casesRes] = await Promise.allSettled([
        docsApi.listOrgDocuments(currentOrg.id),
        casesApi.list(currentOrg.id)
      ]);

      if (casesRes.status === 'fulfilled' && casesRes.value.data) {
        setCasesList(casesRes.value.data);
      }

      if (docsRes.status === 'fulfilled' && docsRes.value.data) {
        const list = Array.isArray(docsRes.value.data) ? docsRes.value.data : [];
        const normalized = list.map((doc: any) => ({
          ...doc,
          type: normalizeDocType(doc),
        }));
        setDocuments(normalized);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      fetchOrgDocuments();
    }
  }, [currentOrg?.id]);

  // Handle Document Creation / Indexing
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.caseId || !uploadForm.title) return;

    try {
      setSubmittingUpload(true);
      
      if (uploadForm.type === 'PDF') {
        if (!selectedFile) {
          alert('Please select a PDF file.');
          return;
        }
        const formData = new FormData();
        formData.append('title', uploadForm.title);
        formData.append('type', 'PDF');
        formData.append('description', uploadForm.description);
        formData.append('file', selectedFile);
        
        await docsApi.create(uploadForm.caseId, formData);
      } else {
        const payload: any = {
          title: uploadForm.title,
          type: uploadForm.type,
          description: uploadForm.description
        };

        if (uploadForm.type === 'TEXT') {
          payload.content = uploadForm.content;
        } else if (uploadForm.type === 'LINK') {
          payload.url = uploadForm.url;
        }

        await docsApi.create(uploadForm.caseId, payload);
      }

      setUploadModalOpen(false);
      setUploadForm({
        caseId: '',
        title: '',
        type: 'TEXT',
        description: '',
        content: '',
        url: ''
      });
      setSelectedFile(null);
      await fetchOrgDocuments();
    } catch (err) {
      console.error('Failed to index document:', err);
    } finally {
      setSubmittingUpload(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id || !editForm.caseId) return;

    try {
      setSubmittingEdit(true);
      await docsApi.update(editForm.caseId, editForm.id, {
        title: editForm.title,
        description: editForm.description,
        content: editForm.content
      });
      setEditModalOpen(false);
      await fetchOrgDocuments();
    } catch (err) {
      console.error('Failed to update document:', err);
    } finally {
      setSubmittingEdit(false);
    }
  };


  // Handle Document Deletion
  const handleDeleteDoc = async (doc: OrgDocumentItem) => {
    const docId = doc.id || doc._id;
    if (!doc.case_id || !docId) return;

    try {
      await docsApi.delete(doc.case_id, docId);
      setPreviewModalOpen(false);
      setSelectedDoc(null);
      await fetchOrgDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      // Type filter
      if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;

      // Case filter
      if (selectedCaseId !== 'ALL' && d.case_id !== selectedCaseId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          d.title?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.case_title?.toLowerCase().includes(q) ||
          d.case_number?.toLowerCase().includes(q) ||
          d.court?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [documents, typeFilter, selectedCaseId, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDocs = documents.length;
    const textDepositions = documents.filter(d => (d.type || normalizeDocType(d)) === 'TEXT').length;
    const pdfBriefs = documents.filter(d => (d.type || normalizeDocType(d)) === 'PDF').length;
    const webUrls = documents.filter(d => (d.type || normalizeDocType(d)) === 'LINK').length;

    return { totalDocs, textDepositions, pdfBriefs, webUrls };
  }, [documents]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return '—';
    }
  };

  const getDocIcon = (type?: string) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'LINK':
        return <LinkIcon className="w-4 h-4 text-blue-400" />;
      case 'TEXT':
      default:
        return <FileText className="w-4 h-4 text-emerald-400" />;
    }
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
        
        {/* ── Top Header & Upload Action ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-foreground">
                Documents & Evidences
              </h1>
              <Badge variant="outline" className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] text-xs font-normal py-0.5">
                <Database className="w-3 h-3 mr-1" />
                Knowledgebase 
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Centralized knowledge base of court filings, deposition transcripts, evidence, and legal authorities.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => {
                setUploadForm({
                  caseId: casesList[0]?.id || '',
                  title: '',
                  type: 'TEXT',
                  description: '',
                  content: '',
                  url: ''
                });
                setUploadModalOpen(true);
              }}
              className="h-9 bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium rounded-lg border border-[#4ADE80]/30 shadow-none text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Upload Documents
            </Button>
          </div>
        </div>

        {/* ── Metrics Summary Strip (Clickable Filter Cards) ─────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div 
            onClick={() => setTypeFilter('ALL')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              typeFilter === 'ALL'
                ? 'bg-[#1a231f] border-[#2D4537] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Documents</div>
              <div className="text-xl font-bold font-heading text-foreground mt-0.5">{metrics.totalDocs}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => setTypeFilter('TEXT')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              typeFilter === 'TEXT'
                ? 'bg-[#1a231f] border-[#2D4537] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Text Files</div>
              <div className="text-xl font-bold font-heading text-[#4ADE80] mt-0.5">{metrics.textDepositions}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 text-[#4ADE80] flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => setTypeFilter('PDF')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              typeFilter === 'PDF'
                ? 'bg-[#1f1624] border-purple-500/40 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">PDF Filings</div>
              <div className="text-xl font-bold font-heading text-purple-400 mt-0.5">{metrics.pdfBriefs}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => setTypeFilter('LINK')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              typeFilter === 'LINK'
                ? 'bg-[#131b26] border-blue-500/40 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Links</div>
              <div className="text-xl font-bold font-heading text-blue-400 mt-0.5">{metrics.webUrls}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── Search Bar (Left) & Matter Filter (Right) ────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-border/50 text-xs">
          {/* Left: Wide Search Input */}
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search documents by title, fact keywords, or transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border-white/10 pl-9 pr-4 h-9 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#4ADE80] placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Right: Matter Filter dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Matter:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-[#111111] border border-white/10 rounded-xl h-9 px-3 text-xs text-foreground focus:outline-none cursor-pointer min-w-[170px] max-w-[240px] truncate"
            >
              <option value="ALL" className="bg-[#16161a]">All Matters</option>
              {casesList.map(c => (
                <option key={c.id} value={c.id} className="bg-[#16161a]">{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Documents Master Table / Feed ───────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs">Loading indexed documents...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-xl border border-white/5 bg-[#111111] my-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1a231f] text-[#4ADE80] flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No documents found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Upload case records, deposition transcripts, or link external legal databases to power AI legal search.
            </p>
            <Button
              onClick={() => {
                setUploadForm({
                  caseId: casesList[0]?.id || '',
                  title: '',
                  type: 'TEXT',
                  description: '',
                  content: '',
                  url: ''
                });
                setUploadModalOpen(true);
              }}
              className="mt-2 h-8 text-xs bg-[#4ADE80] text-black font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Index First Document
            </Button>
          </div>
        ) : (
          <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            
            {/* Desktop Table Header */}
            <div className="hidden sm:grid grid-cols-[2.2fr_1fr_1.5fr_100px_90px] gap-4 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase bg-[#16161a] border-b border-white/5">
              <div>Document & Synopsis</div>
              <div>Type & Vector Index</div>
              <div>Associated Matter</div>
              <div>Added</div>
              <div className="text-right">Action</div>
            </div>

            {/* Document Rows */}
            <div className="divide-y divide-white/5">
              {filteredDocuments.map((doc, idx) => {
                const docId = doc.id || doc._id || idx;

                return (
                  <div
                    key={docId}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setPreviewModalOpen(true);
                    }}
                    className="p-3.5 hover:bg-white/[0.02] cursor-pointer transition-all flex flex-col sm:grid sm:grid-cols-[2.2fr_1fr_1.5fr_100px_90px] gap-3 sm:gap-4 items-start sm:items-center text-xs"
                  >
                    {/* Title & Description */}
                    <div className="flex items-start gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-[#16161a] border border-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getDocIcon(doc.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground text-sm truncate">{doc.title}</div>
                        {doc.description && (
                          <div className="text-muted-foreground/80 truncate text-[11px] mt-0.5">
                            {doc.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Type & RAG Index status */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono border-white/10 bg-[#16161a]">
                        {doc.type || 'TEXT'}
                      </Badge>
                      {/* <Badge className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] text-[10px] font-normal py-0 h-4">
                        <Sparkles className="w-2.5 h-2.5 mr-1 text-[#4ADE80]" />
                        Vector Synced
                      </Badge> */}
                    </div>

                    {/* Associated Case */}
                    <div className="min-w-0">
                      {doc.case_title ? (
                        <div className="truncate">
                          <span className="font-medium text-foreground">{doc.case_title}</span>
                          {doc.court && (
                            <span className="text-muted-foreground text-[11px] block truncate mt-0.5">
                              {doc.court}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">General Repository</span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-muted-foreground/70 font-mono text-[11px]">
                      {formatDate(doc.createdAt || doc.created_at)}
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoc(doc);
                          setPreviewModalOpen(true);
                        }}
                        className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoc(doc);
                          setEditForm({
                            id: doc.id || doc._id || '',
                            caseId: doc.case_id || '',
                            title: doc.title || '',
                            description: doc.description || '',
                            content: doc.content || '',
                          });
                          setEditModalOpen(true);
                        }}
                        className="w-7 h-7 text-muted-foreground hover:text-purple-400"
                        title="Edit Document"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc);
                        }}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>

                      {doc.case_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/cases/${doc.case_id}`);
                          }}
                          className="w-7 h-7 text-muted-foreground hover:text-[#4ADE80]"
                          title="Open Case Brief"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

      {/* ── UPLOAD / INDEX DOCUMENT MODAL ────────────────────────────── */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-heading font-semibold">Add Documents</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add case filings, witness deposition notes, or legal web citations to your organisation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Target Matter *</Label>
              <select
                required
                value={uploadForm.caseId}
                onChange={(e) => setUploadForm({ ...uploadForm, caseId: e.target.value })}
                className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none"
              >
                <option value="">Select a matter...</option>
                {casesList.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.court || 'Court'})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Document Title *</Label>
              <Input
                required
                placeholder="e.g. Cross-examination transcript of Investigating Officer"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Type</Label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
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
                  placeholder="e.g. Discrepancies in seizure memo"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            </div>

            {uploadForm.type === 'LINK' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Web Citation URL *</Label>
                <Input
                  required
                  type="url"
                  placeholder="https://indiankanoon.org/doc/..."
                  value={uploadForm.url}
                  onChange={(e) => setUploadForm({ ...uploadForm, url: e.target.value })}
                  className="bg-[#111111] border-white/10 h-9 text-sm"
                />
              </div>
            ) : uploadForm.type === 'PDF' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Upload PDF File *</Label>
                <Input
                  required
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#111111] border-white/10 h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-white/10 file:text-foreground hover:file:bg-white/15 cursor-pointer pt-1"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Content / Transcript *</Label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste testimony notes, witness statements, or legal provisions here..."
                  value={uploadForm.content}
                  onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg p-2.5 text-sm text-foreground focus:outline-none resize-none font-sans leading-relaxed"
                />
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingUpload} className="bg-[#4ADE80] text-black font-semibold">
                {submittingUpload ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DOCUMENT PREVIEW MODAL ───────────────────────────────────── */}
      {selectedDoc && (
        <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
          <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono bg-white/5 border-white/10">
                  {selectedDoc.type || 'TEXT'}
                </Badge>
                {selectedDoc.case_title && (
                  <Badge className="bg-[#1a231f] text-[#4ADE80] border-[#2D4537] text-[10px] font-normal">
                    {selectedDoc.case_title}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg font-heading font-semibold mt-2">{selectedDoc.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs my-2">
              {selectedDoc.description && (
                <div className="bg-[#111111] border border-white/5 rounded-xl p-3 text-muted-foreground">
                  <span className="font-semibold text-foreground block mb-0.5">Summary:</span>
                  {selectedDoc.description}
                </div>
              )}

              {selectedDoc.content && (
                <div className="bg-[#111111] border border-white/5 rounded-xl p-4 max-h-[300px] overflow-y-auto">
                  <span className="font-semibold text-muted-foreground block mb-1 text-[10px] uppercase tracking-wider">Document Text / Transcript</span>
                  <p className="text-sm font-serif leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {selectedDoc.content}
                  </p>
                </div>
              )}

              {selectedDoc.url && (
                <div className="p-3.5 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-muted-foreground block">Source URL:</span>
                    <a href={selectedDoc.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block">
                      {selectedDoc.url}
                    </a>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.open(selectedDoc.url!, '_blank')} className="h-7 text-xs flex-shrink-0">
                    Open <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 gap-2 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteDoc(selectedDoc)}
                className="text-destructive hover:bg-destructive/10 text-xs mr-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
              <Button variant="ghost" onClick={() => setPreviewModalOpen(false)}>Close</Button>
              {selectedDoc.case_id && (
                <Button
                  onClick={() => {
                    setPreviewModalOpen(false);
                    router.push(`/cases/${selectedDoc.case_id}`);
                  }}
                  className="bg-[#4ADE80] text-black font-semibold text-xs"
                >
                  Open Case Brief &rarr;
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── EDIT DOCUMENT MODAL ────────────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-semibold">Edit Document details</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify index keywords, description, or transcript content.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Document Title *</Label>
              <Input
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Description / Summary</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="bg-[#111111] border-white/10 h-9 text-sm"
              />
            </div>

            {selectedDoc?.type === 'TEXT' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Content / Transcript *</Label>
                <textarea
                  required
                  rows={6}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
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
              <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingEdit} className="bg-[#4ADE80] text-black font-semibold">
                {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
