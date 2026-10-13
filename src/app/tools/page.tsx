'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { useEmbedScriptLoader } from '@/lib/useEmbedScriptLoader';
import { useViasocketEvents } from '@/lib/useViasocketEvents';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  Mail,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  Cpu,
  Download,
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

  const [createCaseId, setCreateCaseId] = useState<string>('');
  const [launchingViasocket, setLaunchingViasocket] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTargetTool, setImportTargetTool] = useState<OrgTool | null>(null);
  const [importTargetCaseId, setImportTargetCaseId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const [deletingToolKey, setDeletingToolKey] = useState<string | null>(null);

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
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    if (currentOrg?.id) fetchOrgData();
  }, [currentOrg?.id, fetchOrgData]);

  useViasocketEvents(createCaseId, () => {
    fetchOrgData();
  });

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
              theme: {
                "--col-home-page": "#0d0f0f",
                "--col-primary-button": "#2dd4bf",
                "--col-primary-button-text": "#091b18",
                "--font-family-content": "'Plus Jakarta Sans', sans-serif",
                "--font-family-headings": "'Newsreader', Georgia, serif"
              },
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
      <div className="flex flex-col h-full max-w-[1300px] mx-auto px-6 sm:px-8 py-8 pb-16 space-y-7">

        {/* ── Top Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-[#f3f4f5] tracking-tight">
              Tools
            </h1>
            <p className="text-sm text-[#879292] mt-1 max-w-2xl leading-relaxed">
              Actions LegalDesk may take on your behalf — sending an email, creating a calendar entry. Each one is attached to a matter, and each one is logged.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setCreateCaseId(casesList[0]?.id || '');
                setCreateModalOpen(true);
              }}
              className="h-8 bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs px-4 rounded-lg transition-colors flex items-center gap-1"
            >
              Connect a tool
            </button>
          </div>
        </div>

        {/* ── Section: CONNECTED (Matching Artifact) ──────────────────── */}
        <div className="space-y-4">
          <div className="font-mono text-[10px] tracking-wider text-[#6f7a7a] uppercase font-semibold">
            CONNECTED
          </div>

          <div className="space-y-3">
            {/* Card 1: Google Calendar */}
            <div className="p-4 rounded-xl bg-[#121515] border border-[#222828] flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#141424] border border-[#252540] flex items-center justify-center flex-shrink-0 text-[#818cf8]">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-white">Google Calendar</h3>
                  <p className="text-xs text-[#879292] mt-0.5">Creates hearing entries and reminders</p>
                  <p className="text-xs text-[#6f7a7a] mt-1">
                    {casesList[0]?.title || 'Dhruvish v. Byjus'} &middot; last run 4d ago
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-[#2dd4bf] flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf]"></span>
                  Asks first
                </span>
                <button
                  onClick={() => {
                    if (casesList[0]?.id) handleLaunchViasocket(casesList[0].id);
                  }}
                  className="h-7 px-3.5 text-xs bg-[#141717] border border-[#272b2b] text-[#f3f4f5] hover:bg-[#1e2323] rounded-lg transition-colors"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Card 2: Gmail */}
            <div className="p-4 rounded-xl bg-[#121515] border border-[#222828] flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#141424] border border-[#252540] flex items-center justify-center flex-shrink-0 text-[#818cf8]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-white">Gmail</h3>
                  <p className="text-xs text-[#879292] mt-0.5">Sends a drafted notice to the named recipient</p>
                  <p className="text-xs text-[#6f7a7a] mt-1">
                    {casesList[0]?.title || 'Dhruvish v. Byjus'} &middot; never run
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-[#2dd4bf] flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf]"></span>
                  Asks first
                </span>
                <button
                  onClick={() => {
                    if (casesList[0]?.id) handleLaunchViasocket(casesList[0].id);
                  }}
                  className="h-7 px-3.5 text-xs bg-[#141717] border border-[#272b2b] text-[#f3f4f5] hover:bg-[#1e2323] rounded-lg transition-colors"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Custom Created ViaSocket Tools */}
            {orgTools.map((tool) => {
              const delKey = `${tool.script_id}-${tool.sourceCaseId}`;
              const isDeleting = deletingToolKey === delKey;

              return (
                <div
                  key={tool.script_id}
                  className="p-4 rounded-xl bg-[#121515] border border-[#222828] flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[#141717] border border-[#272b2b] flex items-center justify-center flex-shrink-0 text-[#2dd4bf]">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-white">{tool.title || 'Custom Automation'}</h3>
                      <p className="text-xs text-[#879292] mt-0.5">{tool.description || 'Custom workflow integration'}</p>
                      <p className="text-xs text-[#6f7a7a] mt-1">
                        {tool.sourceCaseTitle || 'Organization'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLaunchViasocket(tool.sourceCaseId, tool.script_id)}
                      className="h-7 px-3 text-xs bg-[#141717] border border-[#272b2b] text-[#f3f4f5] hover:bg-[#1e2323] rounded-lg"
                      title="Edit Script"
                    >
                      <Play className="w-3.5 h-3.5 text-[#2dd4bf]" />
                    </button>

                    <button
                      onClick={() => {
                        setImportTargetTool(tool);
                        setImportTargetCaseId('');
                        setImportSuccess(false);
                        setImportModalOpen(true);
                      }}
                      className="h-7 px-3 text-xs bg-[#141717] border border-[#272b2b] text-[#f3f4f5] hover:bg-[#1e2323] rounded-lg"
                      title="Import"
                    >
                      <Download className="w-3.5 h-3.5 text-[#818cf8]" />
                    </button>

                    <button
                      disabled={isDeleting}
                      onClick={() => handleDeleteTool(tool)}
                      className="h-7 px-2 text-xs bg-[#141717] border border-[#272b2b] text-[#879292] hover:text-[#f87171] rounded-lg"
                      title="Delete"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section: THE RULE (Safety Notice from Artifact) ──────────── */}
        <div className="p-4 rounded-xl bg-[#141717] border border-[#222828] space-y-1">
          <div className="font-mono text-[10px] tracking-wider text-[#6f7a7a] uppercase font-semibold">
            THE RULE
          </div>
          <p className="text-xs text-[#879292] leading-relaxed">
            LegalDesk never performs irreversible actions without your explicit approval. Every draft email, calendar addition, or docket update requires a review click first.
          </p>
        </div>

      </div>

      {/* Create Tool Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-md p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-serif font-semibold text-white">
              Connect Automation Tool
            </DialogTitle>
            <DialogDescription className="text-xs text-[#879292]">
              Select a matter to associate this tool with, then launch the builder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#879292] uppercase">
                Associate with Matter *
              </label>
              <select
                value={createCaseId}
                onChange={(e) => setCreateCaseId(e.target.value)}
                className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none cursor-pointer"
              >
                <option value="">Select a matter...</option>
                {casesList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)} className="text-[#879292] hover:text-white">Cancel</Button>
            <Button
              disabled={!createCaseId || launchingViasocket}
              onClick={() => handleLaunchViasocket(createCaseId)}
              className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold"
            >
              {launchingViasocket ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Launching...</>
              ) : (
                'Launch Builder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Tool Modal */}
      {importTargetTool && (
        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
          <DialogContent className="bg-[#141717] border-[#272b2b] text-[#f3f4f5] max-w-md p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base font-serif font-semibold text-white">
                Import Tool to Matter
              </DialogTitle>
              <DialogDescription className="text-xs text-[#879292]">
                Import {importTargetTool.title || 'this tool'} into another matter.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#879292] uppercase">Target Matter *</label>
                <select
                  value={importTargetCaseId}
                  onChange={(e) => { setImportTargetCaseId(e.target.value); setImportSuccess(false); }}
                  className="w-full bg-[#0d0f0f] border border-[#272b2b] rounded-lg h-9 px-3 text-sm text-[#f3f4f5] focus:outline-none cursor-pointer"
                >
                  <option value="">Select a matter...</option>
                  {casesList
                    .filter(c => c.id !== importTargetTool.sourceCaseId)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => { setImportModalOpen(false); setImportTargetTool(null); }} className="text-[#879292] hover:text-white">Cancel</Button>
              <Button
                disabled={!importTargetCaseId || importing}
                onClick={handleImportTool}
                className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold"
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Importing...</>
                ) : importSuccess ? (
                  '✓ Imported!'
                ) : (
                  'Import Tool'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
