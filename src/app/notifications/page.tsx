'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCheck, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Check, 
  Search, 
  Gavel, 
  Clock, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  Scale, 
  Loader2, 
  ShieldAlert, 
  FolderClosed,
  ChevronRight,
  Filter
} from 'lucide-react';
import { notifications as notificationsApi } from '@/lib/api';
import { NotificationItem } from '@/lib/types';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters state
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'HEARING_ALERT' | 'TASK_DUE' | 'AI_INSIGHT'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'NORMAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const res = await notificationsApi.list({ orgId: currentOrg.id });
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      fetchNotifications();
    }
  }, [currentOrg?.id]);

  // Sync smart alerts
  const handleSyncAlerts = async () => {
    if (!currentOrg?.id) return;
    try {
      setSyncing(true);
      const res = await notificationsApi.sync(currentOrg.id);
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to sync alerts:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Mark single as read
  const handleMarkAsRead = async (item: NotificationItem) => {
    try {
      if (item.is_read) {
        await notificationsApi.markUnread(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: false } : n));
        setUnreadCount(c => c + 1);
      } else {
        await notificationsApi.markRead(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to update read state:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!currentOrg?.id) return;
    try {
      await notificationsApi.markAllRead(currentOrg.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // Delete/dismiss notification
  const handleDeleteNotification = async (id: string) => {
    try {
      const target = notifications.find(n => n.id === id);
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (target && !target.is_read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab filter
      if (activeTab === 'UNREAD' && n.is_read) return false;
      if (activeTab === 'HEARING_ALERT' && n.type !== 'HEARING_ALERT') return false;
      if (activeTab === 'TASK_DUE' && n.type !== 'TASK_DUE') return false;
      if (activeTab === 'AI_INSIGHT' && n.type !== 'AI_INSIGHT' && n.type !== 'CASE_UPDATE') return false;

      // Priority filter
      if (priorityFilter !== 'ALL' && n.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.case_title && n.case_title.toLowerCase().includes(q)) ||
          (n.court && n.court.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [notifications, activeTab, priorityFilter, searchQuery]);

  // Priority counters
  const urgentCount = useMemo(() => {
    return notifications.filter(n => (n.priority === 'URGENT' || n.priority === 'HIGH') && !n.is_read).length;
  }, [notifications]);

  const hearingAlertsCount = useMemo(() => {
    return notifications.filter(n => n.type === 'HEARING_ALERT' && !n.is_read).length;
  }, [notifications]);

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  // Helper for notification icons and colors
  const getNotificationVisuals = (item: NotificationItem) => {
    switch (item.type) {
      case 'HEARING_ALERT':
        return {
          icon: Gavel,
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          iconBg: 'bg-emerald-500/10 text-emerald-400',
          typeLabel: 'Court Hearing'
        };
      case 'TASK_DUE':
        return {
          icon: Clock,
          badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          iconBg: 'bg-orange-500/10 text-orange-400',
          typeLabel: 'Task Deadline'
        };
      case 'AI_INSIGHT':
        return {
          icon: Sparkles,
          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          iconBg: 'bg-purple-500/10 text-purple-400',
          typeLabel: 'AI Brief'
        };
      case 'CASE_UPDATE':
        return {
          icon: FolderClosed,
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          iconBg: 'bg-blue-500/10 text-blue-400',
          typeLabel: 'Case Milestone'
        };
      default:
        return {
          icon: Bell,
          badgeColor: 'bg-white/5 text-muted-foreground border-white/10',
          iconBg: 'bg-white/5 text-muted-foreground',
          typeLabel: 'System Alert'
        };
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
      <div className="flex flex-col h-full max-w-5xl mx-auto pb-16 space-y-6">
        
        {/* ── Top Header & Global Actions ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-foreground">
                Notifications & Alerts
              </h1>
              {unreadCount > 0 && (
                <Badge className="bg-[#4ADE80] text-black font-bold text-xs py-0.5 px-2">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Real-time court appearance alerts, filing deadlines, and case updates for {currentOrg?.name || 'firm'}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAlerts}
              disabled={syncing}
              className="h-9 bg-[#111111] border-white/10 hover:bg-white/5 text-xs text-muted-foreground hover:text-foreground"
              title="Rescan docket for new countdown alerts"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Checking...' : 'Check Alerts'}
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-9 bg-[#1a231f] border-[#2D4537] text-[#4ADE80] hover:bg-[#223028] text-xs font-medium"
              >
                <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* ── Summary Stats Strip (Clickable Filter Cards) ─────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div 
            onClick={() => { setActiveTab('ALL'); setPriorityFilter('ALL'); }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              activeTab === 'ALL' && priorityFilter === 'ALL'
                ? 'bg-[#1a231f] border-[#2D4537] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Alerts</div>
              <div className="text-xl font-bold font-heading text-foreground mt-0.5">{notifications.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/5 text-muted-foreground flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => { setActiveTab('UNREAD'); setPriorityFilter('ALL'); }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              activeTab === 'UNREAD'
                ? 'bg-[#1a231f] border-[#2D4537] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Unread</div>
              <div className="text-xl font-bold font-heading text-[#4ADE80] mt-0.5">{unreadCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 text-[#4ADE80] flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => { setPriorityFilter('URGENT'); setActiveTab('ALL'); }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              priorityFilter === 'URGENT'
                ? 'bg-[#291717] border-red-500/40 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Urgent / High</div>
              <div className="text-xl font-bold font-heading text-destructive mt-0.5">{urgentCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div 
            onClick={() => { setActiveTab('HEARING_ALERT'); setPriorityFilter('ALL'); }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              activeTab === 'HEARING_ALERT'
                ? 'bg-[#1f1624] border-purple-500/40 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.3)]'
                : 'bg-[#111111] border-white/5 hover:border-white/15'
            }`}
          >
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Court Hearings</div>
              <div className="text-xl font-bold font-heading text-purple-400 mt-0.5">{hearingAlertsCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── Search Bar (Left) & Priority Filter (Right) ────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-border/50 text-xs">
          {/* Left: Wide Search Input */}
          <div className="relative flex-1 w-full max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search notifications by title, case name, appearance notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border-white/10 pl-9 pr-4 h-9 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-[#4ADE80] placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Right: Priority dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-[#111111] border border-white/10 rounded-xl h-9 px-3 text-xs text-foreground focus:outline-none cursor-pointer min-w-[140px]"
            >
              <option value="ALL" className="bg-[#16161a]">All Priorities</option>
              <option value="URGENT" className="bg-[#16161a]">🚨 Urgent</option>
              <option value="HIGH" className="bg-[#16161a]">High</option>
              <option value="NORMAL" className="bg-[#16161a]">Normal</option>
            </select>
          </div>
        </div>

        {/* ── Notifications Feed List ─────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-xl border border-white/5 bg-[#111111] my-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1a231f] text-[#4ADE80] flex items-center justify-center mx-auto">
              <CheckCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">All caught up!</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No notifications matching your active filter criteria. Check back for upcoming court hearings and deadline reminders.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAlerts}
              className="mt-2 h-8 text-xs bg-transparent border-white/10 hover:bg-white/5"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" /> Rescan Docket
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredNotifications.map((item) => {
              const visuals = getNotificationVisuals(item);
              const isUrgent = item.priority === 'URGENT';
              const isHigh = item.priority === 'HIGH';

              return (
                <div
                  key={item.id}
                  className={`
                    p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group
                    ${!item.is_read 
                      ? 'bg-[#151c18] border-[#2D4537] shadow-[0_0_15px_rgba(45,69,55,0.25)]' 
                      : 'bg-[#111111] border-white/5 hover:border-white/15 hover:bg-white/[0.02] opacity-80'}
                  `}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Visual Icon */}
                    <div className={`w-9 h-9 rounded-xl ${visuals.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <visuals.icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Top Meta Line */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] py-0 h-4 ${visuals.badgeColor}`}>
                          {visuals.typeLabel}
                        </Badge>

                        {isUrgent && (
                          <Badge variant="destructive" className="text-[9px] py-0 h-4 font-bold tracking-wider uppercase">
                            Urgent
                          </Badge>
                        )}
                        {isHigh && !isUrgent && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4 border-orange-500/20 text-orange-400 font-bold uppercase">
                            High Priority
                          </Badge>
                        )}

                        {item.court && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {item.court}
                          </span>
                        )}

                        <span className="text-[11px] text-muted-foreground/60 font-mono ml-auto">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      {/* Title & Message */}
                      <div className="flex items-center gap-2">
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.8)] flex-shrink-0"></span>
                        )}
                        <h3 className={`text-sm font-semibold truncate ${!item.is_read ? 'text-foreground font-medium' : 'text-foreground/90'}`}>
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed font-serif pt-0.5">
                        {item.message}
                      </p>

                      {/* Related Case Tag */}
                      {item.case_title && (
                        <div className="pt-1 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                          <Scale className="w-3 h-3 text-muted-foreground/50" />
                          <span className="font-medium text-foreground/80">{item.case_title}</span>
                          {item.case_number && (
                            <>
                              <span>&middot;</span>
                              <span className="font-mono text-[10px]">{item.case_number}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto justify-end">
                    {item.link && (
                      <Button
                        size="sm"
                        onClick={() => router.push(item.link!)}
                        className="h-8 text-xs bg-[#4ADE80] hover:bg-[#34d399] text-black font-semibold rounded-lg shadow-sm"
                      >
                        View Case &rarr;
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(item)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
                      title={item.is_read ? 'Mark as unread' : 'Mark as read'}
                    >
                      {item.is_read ? 'Mark Unread' : <Check className="w-4 h-4 text-[#4ADE80]" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNotification(item.id)}
                      className="w-8 h-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                      title="Dismiss notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
