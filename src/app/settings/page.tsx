'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Building, 
  Users, 
  User as UserIcon, 
  Plus, 
  Trash2, 
  Check, 
  Loader2, 
  LogOut,
  Palette
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { organisations as orgsApi } from '@/lib/api';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, loading: authLoading } = useAuth();
  const { currentOrg, orgs, switchOrg, refreshOrgs } = useOrg();

  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'user'>('profile');

  // Sync tab with URL search parameter (?tab=user)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'user' || tabParam === 'team' || tabParam === 'profile') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Firm Profile state
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);

  // Team state
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Confirmation modal state for member deletion
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const handleConfirmRemoveMember = async () => {
    if (!currentOrg?.id || !memberToDelete) return;
    try {
      setRemovingMember(true);
      await orgsApi.members.remove(currentOrg.id, memberToDelete.user_id || memberToDelete.id);
      setMemberToDelete(null);
      await fetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemovingMember(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name || '');
      setOrgDesc(currentOrg.description || '');
      fetchMembers();
    }
  }, [currentOrg]);

  const fetchMembers = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoadingMembers(true);
      const res = await orgsApi.members.list(currentOrg.id);
      if (res.data) {
        setMembers(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Save Firm Profile
  const handleSaveFirmProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !orgName.trim()) return;

    try {
      setSavingOrg(true);
      await orgsApi.update(currentOrg.id, {
        name: orgName.trim(),
        description: orgDesc.trim()
      });
      setOrgSuccess(true);
      await refreshOrgs();
      setTimeout(() => setOrgSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update firm profile:', err);
    } finally {
      setSavingOrg(false);
    }
  };

  // Invite Team Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !inviteEmail.trim()) return;

    try {
      setSubmittingInvite(true);
      setInviteError('');
      await orgsApi.members.add(currentOrg.id, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('EDITOR');
      await fetchMembers();
    } catch (err: any) {
      console.error('Failed to invite member:', err);
      setInviteError(err.message || 'Failed to invite member');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleUpdateRole = async (memberUserId: string, newRole: string) => {
    if (!currentOrg?.id) return;
    try {
      await orgsApi.members.updateRole(currentOrg.id, memberUserId, { role: newRole });
      await fetchMembers();
    } catch (err) {
      console.error('Failed to update role:', err);
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
      <div className="flex flex-col h-full w-full px-6 sm:px-8 py-8 pb-16 space-y-7">
        
        {/* Top Header */}
        <div>
          <h1 className="text-3xl font-serif text-foreground tracking-tight">
            Settings & Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your practice, team roles, and account preferences.
          </p>
        </div>

        {/* Settings Tabs */}
        <div className="flex gap-2 border-b border-border pb-3 overflow-x-auto text-xs">
          {[
            { id: 'profile', label: 'Chambers Profile', icon: Building },
            { id: 'team', label: 'Team & RBAC', icon: Users, count: members.length },
            { id: 'user', label: 'Account', icon: UserIcon },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg transition-all font-medium text-xs whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#2dd4bf]/15 text-[#0d9488] dark:text-[#2dd4bf] border border-[#2dd4bf]/40 shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive 
                      ? 'bg-[#2dd4bf]/20 text-[#0d9488] dark:text-[#2dd4bf]' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB: FIRM PROFILE ───────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-lg font-serif font-semibold text-foreground">Chambers Details</h2>
              <p className="text-xs text-muted-foreground">Manage practice name and description.</p>
            </div>

            <form onSubmit={handleSaveFirmProfile} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase text-muted-foreground">Chambers Name *</Label>
                <Input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="bg-background border-border h-9 text-sm text-foreground focus:border-[#2dd4bf]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase text-muted-foreground">Practice Areas / Focus</Label>
                <textarea
                  rows={3}
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  placeholder="e.g. Commercial Litigation, Arbitration, Corporate"
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-[#2dd4bf] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingOrg || (orgName === (currentOrg?.name || '') && orgDesc === (currentOrg?.description || ''))}
                  className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold text-xs h-8 px-4 rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {savingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
                {orgSuccess && (
                  <span className="text-xs text-[#0d9488] dark:text-[#2dd4bf] font-medium">
                    Profile saved successfully!
                  </span>
                )}
              </div>
            </form>

            {/* Switch Active Firm */}
            {orgs.length > 1 && (
              <div className="pt-6 border-t border-border space-y-3">
                <h3 className="text-sm font-serif font-semibold text-foreground">Switch Active Chambers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                  {orgs.map(o => (
                    <div
                      key={o.id}
                      onClick={() => switchOrg(o.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        o.id === currentOrg?.id
                          ? 'bg-[#2dd4bf]/10 border-[#2dd4bf]/40 text-[#0d9488] dark:text-[#2dd4bf]'
                          : 'bg-muted/40 border-border hover:border-muted-foreground/40 text-foreground'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-foreground">{o.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Role: {o.role || 'MEMBER'}</div>
                      </div>
                      {o.id === currentOrg?.id && <Check className="w-4 h-4 text-[#0d9488] dark:text-[#2dd4bf]" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: TEAM & RBAC ────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-semibold text-foreground">Counsel & Team Members</h2>
                <p className="text-xs text-muted-foreground">Manage access permissions for your practice.</p>
              </div>

              <button
                onClick={() => setInviteModalOpen(true)}
                className="h-8 text-xs bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold px-3 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Invite Member
              </button>
            </div>

            {loadingMembers ? (
              <div className="py-12 flex justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-[#0d9488] dark:text-[#2dd4bf]" />
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center border border-border rounded-xl text-xs text-muted-foreground">
                No team members found.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                {members.map(m => {
                  const isCurrentUser = m.user_id === user?.id || m.id === user?.id;

                  return (
                    <div key={m.user_id || m.id} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#2dd4bf]/15 border border-[#2dd4bf]/30 flex items-center justify-center font-bold text-xs text-[#0d9488] dark:text-[#2dd4bf] flex-shrink-0">
                          {(m.name || m.email || 'C')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{m.name || m.email}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#2dd4bf]/15 text-[#0d9488] dark:text-[#2dd4bf]">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground font-mono text-[11px] truncate">{m.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          disabled={isCurrentUser}
                          value={m.role || 'EDITOR'}
                          onChange={(e) => handleUpdateRole(m.user_id || m.id, e.target.value)}
                          className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none cursor-pointer disabled:opacity-60"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>

                        {!isCurrentUser && (
                          <button
                            onClick={() => setMemberToDelete(m)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: USER PROFILE ───────────────────────────────────────── */}
        {activeTab === 'user' && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-lg font-serif font-semibold text-foreground">Account Details</h2>
              <p className="text-xs text-muted-foreground">Your credentials, workspace role, and interface preferences.</p>
            </div>

            <div className="max-w-md space-y-4">
              <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold text-foreground">{user?.name || 'Counsel'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono text-foreground">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-mono text-[#0d9488] dark:text-[#2dd4bf] font-semibold">{currentOrg?.role || 'ADMIN'}</span>
                </div>
              </div>

              {/* Theme Preference Setting */}
              <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#0d9488] dark:text-[#2dd4bf]" />
                      <span>Interface Theme</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Choose between light, dark, or system preference
                    </div>
                  </div>
                  <ThemeToggle variant="segmented" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={logout}
                  className="h-8 text-xs text-red-600 dark:text-[#f87171] border border-red-500/20 hover:bg-red-500/10 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── INVITE MEMBER MODAL ──────────────────────────────────────── */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-semibold text-foreground">Invite Counsel to Chambers</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Grant team access to {currentOrg?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteMember} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Email Address *</Label>
              <Input
                required
                type="email"
                placeholder="colleague@lawfirm.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-background border-border h-9 text-sm text-foreground focus:border-[#2dd4bf]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Role</Label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg h-9 px-3 text-sm text-foreground focus:outline-none focus:border-[#2dd4bf]"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="EDITOR">EDITOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            {inviteError && (
              <p className="text-xs text-red-500">{inviteError}</p>
            )}

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button type="submit" disabled={submittingInvite} className="bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold cursor-pointer">
                {submittingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM REMOVE MEMBER MODAL ────────────────────────────── */}
      <ConfirmModal
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        title="Remove Team Member?"
        description={
          <>
            Are you sure you want to remove <span className="font-semibold text-foreground">{memberToDelete?.name || memberToDelete?.email}</span> from <span className="font-semibold text-foreground">{currentOrg?.name}</span>? They will lose access to all chambers matters and documents immediately.
          </>
        }
        confirmLabel="Remove Member"
        loading={removingMember}
        onConfirm={handleConfirmRemoveMember}
      />

    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
