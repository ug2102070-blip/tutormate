"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/actions/notificationActions";
import type { NotificationDoc } from "@/types";

const TYPE_ICONS: Record<string, string> = {
  assignment: "📝",
  material: "📚",
  exam: "⭐",
  fee: "💰",
  doubt: "💬",
  announcement: "📢",
};

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

export function NotificationBell() {
  const { user, role } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) loadNotifications();
  }, [user, loadNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleMarkAll() {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleClickNotification(n: NotificationDoc) {
    if (!n.isRead && user) {
      await markAsRead(n.id, user.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
    }
    setOpen(false);
    // Navigate to relevant page based on type
    const base = role === "tutor" ? "/tutor" : role === "student" ? "/student" : "/parent";
    const routes: Record<string, string> = {
      assignment: `${base}/assignments`,
      exam: `${base}/exams`,
      material: `${base}/materials`,
      fee: `${base}/fees`,
      doubt: `${base}/doubts`,
      announcement: `${base}/notifications`,
    };
    const route = routes[n.type] || `${base}/notifications`;
    router.push(route);
  }

  if (!user) return null;

  const notificationsHref =
    role === "tutor"
      ? "/tutor/notifications"
      : role === "student"
      ? "/student/notifications"
      : "/parent/notifications";

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) loadNotifications();
        }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
        style={{
          background: open ? "var(--color-primary-50)" : "transparent",
          border: "1px solid",
          borderColor: open ? "var(--color-primary-100)" : "var(--color-border)",
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell
          className="w-4 h-4"
          style={{ color: unreadCount > 0 ? "var(--color-primary)" : "var(--color-text-muted)" }}
        />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 animate-bounce"
            style={{
              background: "var(--color-error, #ef4444)",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden z-50 animate-scale-in"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <span
              className="text-sm font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Notifications
              {unreadCount > 0 && (
                <span
                  className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: "var(--color-primary-50)",
                    color: "var(--color-primary)",
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-semibold transition-colors"
                style={{ color: "var(--color-primary)" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Bell
                  className="w-8 h-8 opacity-30"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    background: n.isRead ? "transparent" : "var(--color-primary-50)",
                    borderBottom: "1px solid var(--color-border-subtle, var(--color-border))",
                  }}
                >
                  <span className="text-xl shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold leading-snug"
                      style={{ color: "var(--color-text)" }}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {n.body}
                      </p>
                    )}
                    <p
                      className="text-[10px] mt-1 font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: "var(--color-primary)" }}
                    />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <Link
            href={notificationsHref}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center py-3 text-xs font-semibold transition-colors"
            style={{
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-primary)",
            }}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
