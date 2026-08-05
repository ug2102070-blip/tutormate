"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/actions/notificationActions";
import type { NotificationDoc } from "@/types";
import { EmptyState } from "@/components/EmptyState";

const TYPE_ICONS: Record<string, string> = {
  assignment: "📝",
  material: "📚",
  exam: "⭐",
  fee: "💰",
  doubt: "💬",
  announcement: "📢",
};

const TYPE_LABELS: Record<string, string> = {
  assignment: "Assignment",
  material: "Material",
  exam: "Exam",
  fee: "Fee",
  doubt: "Doubt",
  announcement: "Announcement",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-BD", { weekday: "short", month: "short", day: "numeric" });
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function groupByDate(notifications: NotificationDoc[]): Record<string, NotificationDoc[]> {
  return notifications.reduce((acc, n) => {
    const key = formatDate(n.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {} as Record<string, NotificationDoc[]>);
}

export default function TutorNotificationsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-page:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          setNotifications((prev) => [
            {
              id: n.id,
              userId: n.user_id,
              title: n.title,
              body: n.body,
              type: n.type,
              referenceId: n.reference_id,
              referenceType: n.reference_type,
              isRead: n.is_read,
              createdAt: n.created_at,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function handleMarkAll() {
    if (!user) return;
    setMarkingAll(true);
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  }

  async function handleMarkOne(id: string) {
    if (!user) return;
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  const grouped = groupByDate(notifications);
  const dateGroups = Object.keys(grouped);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Page Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Notifications</h1>
              <p className="text-xs text-white/70">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
              id="mark-all-read-btn"
            >
              {markingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="w-7 h-7 animate-spin"
            style={{ color: "var(--color-primary)" }}
          />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          variant="notifications"
          title="No notifications yet"
          description="You'll see alerts about assignments, exams, and materials here."
        />
      ) : (
        <div className="space-y-4">
          {dateGroups.map((dateLabel) => (
            <div key={dateLabel}>
              {/* Date Group Header */}
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {dateLabel}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--color-border)" }}
                />
              </div>

              {/* Notifications in this group */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--color-border)" }}
              >
                {grouped[dateLabel].map((n, idx) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-4 px-4 py-4 transition-colors"
                    style={{
                      background: n.isRead ? "var(--color-surface)" : "var(--color-primary-50)",
                      borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: "var(--color-bg-secondary)" }}
                    >
                      {TYPE_ICONS[n.type] ?? "🔔"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className="text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md mr-2"
                            style={{
                              background: "var(--color-primary-50)",
                              color: "var(--color-primary)",
                            }}
                          >
                            {TYPE_LABELS[n.type] ?? n.type}
                          </span>
                          <p
                            className="text-sm font-semibold mt-1"
                            style={{ color: "var(--color-text)" }}
                          >
                            {n.title}
                          </p>
                        </div>
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkOne(n.id)}
                            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors"
                            style={{
                              background: "var(--color-primary-50)",
                              color: "var(--color-primary)",
                            }}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      {n.body && (
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {n.body}
                        </p>
                      )}
                      <p
                        className="text-[11px] mt-1.5 font-medium"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Unread Dot */}
                    {!n.isRead && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ background: "var(--color-primary)" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
