'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { AppShell } from '@/components/layout/AppShell';
import { 
  Bell, 
  CheckCheck, 
  RefreshCw, 
  Trash2, 
  Check, 
  Search, 
  Gavel, 
  Clock, 
  Sparkles, 
  Loader2, 
  ShieldAlert, 
  FolderClosed,
  Scale
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
      if (activeTab === 'UNREAD' && n.is_read) return false;
      if (activeTab === 'HEARING_ALERT' && n.type !== 'HEARING_ALERT') return false;
      if (activeTab === 'TASK_DUE' && n.type !== 'TASK_DUE') return false;
      if (activeTab === 'AI_INSIGHT' && n.type !== 'AI_INSIGHT' && n.type !== 'CASE_UPDATE') return false;

      if (priorityFilter !== 'ALL' && n.priority !== priorityFilter) return false;

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

  const getNotificationVisuals = (item: NotificationItem) => {
    switch (item.type) {
      case 'HEARING_ALERT':
        return {
          icon: Gavel,
          typeColor: 'text-[#f87171]',
          typeLabel: 'Court Hearing'
        };
      case 'TASK_DUE':
        return {
          icon: Clock,
          typeColor: 'text-[#f59e0b]',
          typeLabel: 'Task Deadline'
        };
      case 'AI_INSIGHT':
        return {
          icon: Sparkles,
          typeColor: 'text-[#818cf8]',
          typeLabel: 'LegalDesk Brief'
        };
      case 'CASE_UPDATE':
        return {
          icon: FolderClosed,
          typeColor: 'text-[#2dd4bf]',
          typeLabel: 'Matter Update'
        };
      default:
        return {
          icon: Bell,
          typeColor: 'text-[#879292]',
          typeLabel: 'Alert'
        };
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
        
        {/* Top Header & Global Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-serif text-[#f3f4f5] tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#2dd4bf] text-[#091b18]">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-sm text-[#879292] mt-1">
              Court appearance alerts, filing deadlines, and matter updates for {currentOrg?.name || 'firm'}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSyncAlerts}
              disabled={syncing}
              className="h-8 bg-[#141717] border border-[#272b2b] hover:bg-[#1e2323] text-xs text-[#f3f4f5] px-3.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#879292] ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Checking...' : 'Check Alerts'}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="h-8 bg-[#141717] border border-[#272b2b] text-[#2dd4bf] hover:bg-[#1e2323] text-xs font-medium px-3.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div 
            onClick={() => { setActiveTab('ALL'); setPriorityFilter('ALL'); }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'ALL' && priorityFilter === 'ALL'
                ? 'bg-[#141717] border-[#2dd4bf]/40'
                : 'bg-[#121515] border-[#222828] hover:border-[#272b2b]'
            }`}
          >
            <div className="text-[10px] font-mono text-[#6f7a7a] uppercase tracking-wider">Total Alerts</div>
            <div className="text-xl font-serif font-semibold text-white mt-0.5">{notifications.length}</div>
          </div>

          <div 
            onClick={() => { setActiveTab('UNREAD'); setPriorityFilter('ALL'); }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'UNREAD'
                ? 'bg-[#141717] border-[#2dd4bf]/40'
                : 'bg-[#121515] border-[#222828] hover:border-[#272b2b]'
            }`}
          >
            <div className="text-[10px] font-mono text-[#6f7a7a] uppercase tracking-wider">Unread</div>
            <div className="text-xl font-serif font-semibold text-[#2dd4bf] mt-0.5">{unreadCount}</div>
          </div>

          <div 
            onClick={() => { setPriorityFilter('URGENT'); setActiveTab('ALL'); }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              priorityFilter === 'URGENT'
                ? 'bg-[#141717] border-[#f87171]/40'
                : 'bg-[#121515] border-[#222828] hover:border-[#272b2b]'
            }`}
          >
            <div className="text-[10px] font-mono text-[#6f7a7a] uppercase tracking-wider">Urgent</div>
            <div className="text-xl font-serif font-semibold text-[#f87171] mt-0.5">{urgentCount}</div>
          </div>

          <div 
            onClick={() => { setActiveTab('HEARING_ALERT'); setPriorityFilter('ALL'); }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'HEARING_ALERT'
                ? 'bg-[#141717] border-[#818cf8]/40'
                : 'bg-[#121515] border-[#222828] hover:border-[#272b2b]'
            }`}
          >
            <div className="text-[10px] font-mono text-[#6f7a7a] uppercase tracking-wider">Hearings</div>
            <div className="text-xl font-serif font-semibold text-[#818cf8] mt-0.5">{hearingAlertsCount}</div>
          </div>
        </div>

        {/* Search Bar & Priority Filter */}
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search notifications by title, matter name, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-[#121515] border border-[#222828] text-xs text-[#f3f4f5] placeholder-[#6f7a7a] px-3.5 py-2 rounded-xl focus:outline-none focus:border-[#2dd4bf]"
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-[#121515] border border-[#222828] text-xs text-[#879292] px-3.5 py-2 rounded-xl focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>

        {/* Notifications Feed List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#879292]">
            <Loader2 className="w-8 h-8 animate-spin text-[#2dd4bf]" />
            <span className="text-xs">Loading alerts...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-xl border border-[#222828] bg-[#121515] space-y-3">
            <CheckCheck className="w-8 h-8 mx-auto text-[#2dd4bf]" />
            <h3 className="text-base font-serif font-semibold text-white">All caught up</h3>
            <p className="text-xs text-[#879292] max-w-sm mx-auto">
              No notifications matching your filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((item) => {
              const visuals = getNotificationVisuals(item);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    !item.is_read 
                      ? 'bg-[#141717] border-[#2dd4bf]/30' 
                      : 'bg-[#121515] border-[#222828] hover:border-[#272b2b] opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-[#0d0f0f] border border-[#272b2b] flex items-center justify-center flex-shrink-0 text-[#2dd4bf]">
                      <visuals.icon className={`w-4 h-4 ${visuals.typeColor}`} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono uppercase font-semibold ${visuals.typeColor}`}>
                          {visuals.typeLabel}
                        </span>

                        {item.court && (
                          <span className="text-[11px] text-[#6f7a7a] font-mono">
                            &middot; {item.court}
                          </span>
                        )}

                        <span className="text-[10px] text-[#6f7a7a] font-mono ml-auto">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!item.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] flex-shrink-0"></span>
                        )}
                        <h3 className="text-sm font-serif font-semibold text-white truncate">
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-xs text-[#879292] leading-relaxed font-serif">
                        {item.message}
                      </p>

                      {item.case_title && (
                        <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#879292]">
                          <Scale className="w-3 h-3 text-[#6f7a7a]" />
                          <span className="text-white font-medium">{item.case_title}</span>
                          {item.case_number && (
                            <span className="font-mono text-[#6f7a7a]">&middot; {item.case_number}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#222828] w-full sm:w-auto justify-end">
                    {item.link && (
                      <button
                        onClick={() => router.push(item.link!)}
                        className="h-7 text-xs bg-[#2dd4bf] hover:bg-[#34d399] text-[#091b18] font-semibold px-3 rounded-lg transition-colors"
                      >
                        View matter &rarr;
                      </button>
                    )}

                    <button
                      onClick={() => handleMarkAsRead(item)}
                      className="p-1.5 text-[#879292] hover:text-[#f3f4f5] transition-colors"
                      title={item.is_read ? 'Mark as unread' : 'Mark as read'}
                    >
                      <Check className={`w-3.5 h-3.5 ${item.is_read ? 'opacity-40' : 'text-[#2dd4bf]'}`} />
                    </button>

                    <button
                      onClick={() => handleDeleteNotification(item.id)}
                      className="p-1.5 text-[#6f7a7a] hover:text-[#f87171] transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
