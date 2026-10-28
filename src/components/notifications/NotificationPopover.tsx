'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Gavel,
  AlertTriangle,
  Sparkles,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useOrg } from '@/lib/org-context';
import { notifications as notificationsApi } from '@/lib/api';
import { NotificationItem } from '@/lib/types';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function NotificationPopover() {
  const router = useRouter();
  const { currentOrg } = useOrg();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'HEARING_ALERT' | 'TASK_DUE'>('ALL');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const res = await notificationsApi.list({ orgId: currentOrg.id, limit: 30 });
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount ?? 0);
      } else if (res?.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('[NotificationPopover] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      fetchNotifications();
    }
  }, [currentOrg?.id]);

  // Sync practice alerts
  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentOrg?.id || syncing) return;
    try {
      setSyncing(true);
      await notificationsApi.sync(currentOrg.id);
      await fetchNotifications();
    } catch (err) {
      console.error('[NotificationPopover] Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentOrg?.id || unreadCount === 0) return;
    try {
      await notificationsApi.markAllRead(currentOrg.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationPopover] Mark all read failed:', err);
    }
  };

  // Toggle single item read status
  const handleToggleRead = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    const newStatus = !item.is_read;
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, is_read: newStatus } : n))
    );
    setUnreadCount(prev => Math.max(0, newStatus ? prev - 1 : prev + 1));

    try {
      if (newStatus) {
        await notificationsApi.markRead(item.id);
      } else {
        await notificationsApi.markUnread(item.id);
      }
    } catch {
      // Revert if API failed
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: item.is_read } : n))
      );
      setUnreadCount(prev => (newStatus ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  // Dismiss notification
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (item && !item.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await notificationsApi.delete(id);
    } catch {
      if (item) setNotifications(prev => [item, ...prev]);
    }
  };

  // Click on a notification item
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      notificationsApi.markRead(item.id).catch(() => {});
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setOpen(false);

    if (item.link) {
      router.push(item.link);
    } else if (item.case_id) {
      router.push(`/cases/${item.case_id}`);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'UNREAD') return !n.is_read;
      if (filter === 'HEARING_ALERT') return n.type === 'HEARING_ALERT';
      if (filter === 'TASK_DUE') return n.type === 'TASK_DUE';
      return true;
    });
  }, [notifications, filter]);

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* ── Compact Header Bell Button (Small icon & small way) ── */}
      <button
        type="button"
        onClick={() => {
          setOpen(prev => !prev);
          if (!open) fetchNotifications();
        }}
        className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer focus:outline-none ${
          open
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
        }`}
        title={`Notifications (${unreadCount} unread)`}
        aria-label="Practice Alerts and Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-teal-500 text-white text-[9px] font-bold font-mono flex items-center justify-center shadow-sm animate-in zoom-in-75 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Floating Dropdown Popover ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] sm:w-[380px] rounded-xl border border-border bg-card text-card-foreground shadow-2xl z-50 overflow-hidden font-sans animate-in fade-in-0 zoom-in-95 duration-150">
          
          {/* Popover Header */}
          <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">Alerts</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="h-6 px-1.5 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 transition-colors cursor-pointer"
                title="Scan for practice alerts"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${syncing ? 'animate-spin text-primary' : ''}`} />
                <span>Sync</span>
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="h-6 px-1.5 rounded text-[10px] font-mono text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Mark all alerts as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-1.5 border-b border-border/70 flex items-center gap-1 bg-muted/20 text-[10px] font-mono">
            {[
              { id: 'ALL', label: `All (${notifications.length})` },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'HEARING_ALERT', label: `Hearings (${notifications.filter(n => n.type === 'HEARING_ALERT').length})` },
              { id: 'TASK_DUE', label: `Tasks (${notifications.filter(n => n.type === 'TASK_DUE').length})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications Scrollable List */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                Loading alerts...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-10 text-center px-4 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-teal-500/60 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-foreground">No alerts</p>
                <p className="text-[11px] text-muted-foreground">
                  Your docket and practice tasks are up to date.
                </p>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const isHearing = item.type === 'HEARING_ALERT';
                const isTask = item.type === 'TASK_DUE';
                const isUrgent = item.priority === 'URGENT';

                let timeAgo = '';
                try {
                  timeAgo = formatDistanceToNow(parseISO(item.created_at), { addSuffix: true });
                } catch {
                  timeAgo = '';
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group px-3 py-2.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      !item.is_read
                        ? 'bg-teal-500/[0.04] hover:bg-teal-500/[0.08]'
                        : 'hover:bg-muted/50 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Compact Icon */}
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isHearing
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : isTask
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {isHearing ? (
                        <Gavel className="w-3.5 h-3.5" />
                      ) : isTask ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Text Body */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {isUrgent && (
                            <span className="text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                              Urgent
                            </span>
                          )}
                          <p className={`text-xs truncate ${!item.is_read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                            {item.title}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {timeAgo}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                        {item.message}
                      </p>

                      {item.case_title && (
                        <p className="text-[10px] font-mono text-muted-foreground/75 truncate">
                          Matter: {item.case_title}
                        </p>
                      )}
                    </div>

                    {/* Hover Actions (Toggle Read / Dismiss) */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleRead(e, item)}
                        className={`p-1 rounded transition-colors ${
                          item.is_read
                            ? 'text-muted-foreground hover:text-foreground'
                            : 'text-teal-600 dark:text-teal-400 hover:text-teal-700'
                        }`}
                        title={item.is_read ? 'Mark unread' : 'Mark as read'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        title="Dismiss"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-mono text-[10px]">
              {notifications.length} total alerts
            </span>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-primary hover:underline font-medium flex items-center gap-0.5 text-xs"
            >
              <span>View Dashboard</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
