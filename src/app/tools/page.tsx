'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { useEmbedScriptLoader } from '@/lib/useEmbedScriptLoader';
import { useViasocketEvents } from '@/lib/useViasocketEvents';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  Plus,
  Search,
  Loader2,
  Trash2,
  ExternalLink,
  Zap,
  FolderClosed,
  Download,
  RefreshCw,
  Play,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { tools as toolsApi, cases as casesApi } from '@/lib/api';
import { CaseItem } from '@/lib/types';

interface OrgTool {
  script_id: string;
  title?: string;
  description?: string;
  sourceCaseId: string;
  sourceCaseTitle?: string;
  sourceCaseNumber?: string;
  created_at?: string;
}

export default function ToolsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const { loadScript } = useEmbedScriptLoader();

  const [orgTools, setOrgTools] = useState<OrgTool[]>([]);
  const [casesList, setCasesList] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('ALL');

  const [createCaseId, setCreateCaseId] = useState<string>('');
  const [launchingViasocket, setLaunchingViasocket] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTargetTool, setImportTargetTool] = useState<OrgTool | null>(null);
  const [importTargetCaseId, setImportTargetCaseId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const [deletingToolKey, setDeletingToolKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchOrgData = useCallback(async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const casesRes = await casesApi.list(currentOrg.id);
      const cList: CaseItem[] = casesRes.data || [];
      setCasesList(cList);

      const allToolsMap: Record<string, OrgTool> = {};
      await Promise.allSettled(
        cList.slice(0, 20).map(async (c) => {
          try {
            const res = await toolsApi.list(c.id);
            const caseToolsList: any[] = res.data || res.tools || (Array.isArray(res) ? res : []);
            caseToolsList.forEach((t: any) => {
              if (t.script_id && !allToolsMap[t.script_id]) {
                allToolsMap[t.script_id] = {
                  script_id: t.script_id,
                  title: t.title,
                  description: t.description,
                  sourceCaseId: c.id,
                  sourceCaseTitle: c.title,
                  sourceCaseNumber: c.case_number || undefined,
                  created_at: t.created_at,
                };
              }
            });
          } catch {}
        })
      );
      setOrgTools(Object.values(allToolsMap));
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    if (currentOrg?.id) fetchOrgData();
  }, [currentOrg?.id, fetchOrgData]);

  useViasocketEvents(createCaseId, () => {
    fetchOrgData();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrgData();
  };

  const handleLaunchViasocket = async (caseId: string, scriptId?: string) => {
    if (!caseId) return;
    try {
      setLaunchingViasocket(true);
      setCreateCaseId(caseId);
      const tokenRes = await toolsApi.getToken(caseId);
      const token = tokenRes.data?.token || tokenRes.token;
      if (token) {
        loadScript(token, () => {
          if (window.openViasocket) {
            window.openViasocket(scriptId, {
              metadata: { caseId, organisationId: currentOrg?.id },
            });
          }
        });
        setCreateModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to launch ViaSocket:', err);
    } finally {
      setLaunchingViasocket(false);
    }
  };

  const handleImportTool = async () => {
    if (!importTargetTool || !importTargetCaseId) return;
    try {
      setImporting(true);
      await toolsApi.import(importTargetCaseId, importTargetTool.script_id);
      setImportSuccess(true);
      setTimeout(() => {
        setImportModalOpen(false);
        setImportTargetTool(null);
        setImportTargetCaseId('');
        setImportSuccess(false);
        fetchOrgData();
      }, 1200);
    } catch (err) {
      console.error('Failed to import tool:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteTool = async (tool: OrgTool) => {
    const key = `${tool.script_id}-${tool.sourceCaseId}`;
    setDeletingToolKey(key);
    try {
      await toolsApi.delete(tool.sourceCaseId, tool.script_id);
      setOrgTools(prev => prev.filter(t => t.script_id !== tool.script_id));
    } catch (err) {
      console.error('Failed to delete tool:', err);
    } finally {
      setDeletingToolKey(null);
    }
  };

  const filteredTools = useMemo(() => {
    return orgTools.filter(t => {
      if (selectedCaseFilter !== 'ALL' && t.sourceCaseId !== selectedCaseFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.sourceCaseTitle?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orgTools, selectedCaseFilter, searchQuery]);

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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-foreground">
                Automation Tools
              </h1>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs font-normal py-0.5">
                <Zap className="w-3 h-3 mr-1" />
                ViaSocket
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Create and manage automation tools across your organization. Import tools into specific cases to automate legal workflows.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="h-9 bg-[#2D4537] hover:bg-[#385945] text-[#4ADE80] font-medium rounded-lg border border-[#4ADE80]/30 shadow-none text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Tool
            </Button>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl border border-white/5 bg-[#111111] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Tools</div>
              <div className="text-xl font-bold font-heading text-foreground mt-0.5">{orgTools.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-white/5 bg-[#111111] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Cases with Tools</div>
              <div className="text-xl font-bold font-heading text-purple-400 mt-0.5">
                {new Set(orgTools.map(t => t.sourceCaseId)).size}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FolderClosed className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-white/5 bg-[#111111] flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Active Matters</div>
              <div className="text-xl font-bold font-heading text-[#4ADE80] mt-0.5">{casesList.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 text-[#4ADE80] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-border/50 text-xs">
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tools by name, description, or case..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 pl-9 pr-4 h-9 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder:text-muted-foreground/60 text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Matter:</span>
            <select
              value={selectedCaseFilter}
              onChange={(e) => setSelectedCaseFilter(e.target.value)}
              className="bg-[#111111] border border-white/10 rounded-xl h-9 px-3 text-xs text-foreground focus:outline-none cursor-pointer min-w-[170px] max-w-[240px]"
            >
              <option value="ALL" className="bg-[#16161a]">All Matters</option>
              {casesList.map(c => (
                <option key={c.id} value={c.id} className="bg-[#16161a]">{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tools List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="text-xs">Loading organization tools...</span>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-xl border border-white/5 bg-[#111111] my-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No tools found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create automation tools to automate filings, notifications, or other legal workflows using ViaSocket integrations.
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="mt-2 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create First Tool
            </Button>
          </div>
        ) : (
          <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_90px] gap-4 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase bg-[#16161a] border-b border-white/5">
              <div>Tool & Description</div>
              <div>Associated Matter</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {filteredTools.map((tool) => {
                const delKey = `${tool.script_id}-${tool.sourceCaseId}`;
                const isDeleting = deletingToolKey === delKey;

                return (
                  <div
                    key={tool.script_id}
                    className="p-3.5 hover:bg-white/[0.02] transition-all flex flex-col sm:grid sm:grid-cols-[2fr_1.5fr_90px] gap-3 sm:gap-4 items-start sm:items-center text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0 pr-2">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Cpu className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground text-sm truncate">
                          {tool.title || 'Untitled Tool'}
                        </div>
                        {tool.description && (
                          <div className="text-muted-foreground/80 truncate text-[11px] mt-0.5">
                            {tool.description}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-muted-foreground/40 mt-0.5 truncate">
                          {tool.script_id}
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      {tool.sourceCaseTitle ? (
                        <div className="truncate">
                          <span className="font-medium text-foreground">{tool.sourceCaseTitle}</span>
                          {tool.sourceCaseNumber && (
                            <span className="text-muted-foreground text-[11px] block mt-0.5">
                              #{tool.sourceCaseNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">Organization</span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLaunchViasocket(tool.sourceCaseId, tool.script_id)}
                        className="w-7 h-7 text-muted-foreground hover:text-purple-400"
                        title="Edit in ViaSocket"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setImportTargetTool(tool);
                          setImportTargetCaseId('');
                          setImportSuccess(false);
                          setImportModalOpen(true);
                        }}
                        className="w-7 h-7 text-muted-foreground hover:text-[#4ADE80]"
                        title="Import to Case"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/cases/${tool.sourceCaseId}`)}
                        className="w-7 h-7 text-muted-foreground hover:text-[#4ADE80]"
                        title="Open Source Case"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isDeleting}
                        onClick={() => handleDeleteTool(tool)}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        title="Delete Tool"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Create Tool Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-heading font-semibold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              Create Automation Tool
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a case to associate this tool with, then launch the ViaSocket builder to configure your automation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Associate with Case *
              </label>
              <select
                value={createCaseId}
                onChange={(e) => setCreateCaseId(e.target.value)}
                className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
              >
                <option value="">Select a matter...</option>
                {casesList.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#16161a]">
                    {c.title}{c.case_number ? ` (#${c.case_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-purple-500/5 border border-purple-500/15 rounded-xl text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-purple-400 font-semibold">How it works: </span>
              You will be taken to the ViaSocket builder to configure triggers and actions. Once published, the tool appears in this library and can be imported into any other case.
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              disabled={!createCaseId || launchingViasocket}
              onClick={() => handleLaunchViasocket(createCaseId)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {launchingViasocket ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Launching...</>
              ) : (
                <><Zap className="w-4 h-4 mr-1.5" /> Launch Builder</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Tool Modal */}
      {importTargetTool && (
        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
          <DialogContent className="bg-[#16161a] border-white/10 text-foreground max-w-md p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-[#4ADE80]" />
                Import Tool to Case
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Import <strong className="text-foreground">{importTargetTool.title || 'this tool'}</strong> into another case.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-2">
              <div className="p-3 bg-[#111111] border border-white/5 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{importTargetTool.title || 'Untitled Tool'}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{importTargetTool.description || 'No description'}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Target Matter *</label>
                <select
                  value={importTargetCaseId}
                  onChange={(e) => { setImportTargetCaseId(e.target.value); setImportSuccess(false); }}
                  className="w-full bg-[#111111] border border-white/10 rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="">Select a matter...</option>
                  {casesList
                    .filter(c => c.id !== importTargetTool.sourceCaseId)
                    .map(c => (
                      <option key={c.id} value={c.id} className="bg-[#16161a]">{c.title}</option>
                    ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => { setImportModalOpen(false); setImportTargetTool(null); }}>Cancel</Button>
              <Button
                disabled={!importTargetCaseId || importing}
                onClick={handleImportTool}
                className={`font-semibold transition-all ${importSuccess ? 'bg-[#1a231f] text-[#4ADE80] border border-[#4ADE80]/30' : 'bg-[#4ADE80] hover:bg-[#34d399] text-black'}`}
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Importing...</>
                ) : importSuccess ? (
                  '✓ Imported!'
                ) : (
                  <><Download className="w-4 h-4 mr-1.5" /> Import Tool</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
