"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarCheck, CreditCard, FileText, Award, Info, CheckCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: "attendance" | "fee" | "assignment" | "result" | "info";
  title: string;
  body: string;
  time: string;
  read: boolean;
  urgent?: boolean;
}

const typeIcon: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  attendance: CalendarCheck,
  fee: CreditCard,
  assignment: FileText,
  result: Award,
  info: Info,
};

const typeBg: Record<string, { bg: string; color: string }> = {
  attendance: { bg: "rgba(16,185,129,0.12)", color: "rgb(5,150,105)" },
  fee: { bg: "rgba(239,68,68,0.1)", color: "rgb(220,38,38)" },
  assignment: { bg: "rgba(99,102,241,0.12)", color: "rgb(79,70,229)" },
  result: { bg: "rgba(245,158,11,0.12)", color: "rgb(217,119,6)" },
  info: { bg: "rgba(107,114,128,0.1)", color: "rgb(75,85,99)" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const generated: Notification[] = [];

        // Fetch parent_links → student → fees & attendance
        const { data: link } = await supabase
          .from("parent_links")
          .select("student_id, students(id, tutor_id, full_name)")
          .eq("parent_uid", user.id)
          .limit(1)
          .single();

        if (link) {
          const student = (link as any).students as any;
          const studentId = link.student_id;
          const tutorId = student?.tutor_id;

          if (tutorId) {
            // Attendance this month
            const now = new Date();
            const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
            const { data: attRows } = await supabase
              .from("attendance")
              .select("records")
              .eq("tutor_id", tutorId)
              .gte("date", startDate);

            let present = 0, total = 0;
            for (const row of attRows ?? []) {
              const rec = (row.records as any)?.[studentId];
              if (rec) {
                total++;
                if (rec.status === "present" || rec.status === "late") present++;
              }
            }
            const rate = total > 0 ? Math.round((present / total) * 100) : 100;

            generated.push({
              id: "att",
              type: "attendance",
              title: rate < 75 ? "⚠️ Low Attendance Alert" : "Attendance Update",
              body: total > 0
                ? `This month's attendance: ${present}/${total} classes (${rate}%).${rate < 75 ? " Below the 75% threshold." : " Great job!"}`
                : "No attendance records yet for this month.",
              time: new Date().toISOString(),
              read: rate >= 75,
              urgent: rate < 75,
            });

            // Fee status this month
            const { data: feeRows } = await supabase
              .from("fees")
              .select("amount_due, amount_paid, status")
              .eq("student_id", studentId)
              .eq("year", now.getFullYear())
              .eq("month", now.getMonth() + 1);

            const unpaid = (feeRows ?? []).filter((f) => f.status === "unpaid" || f.status === "partial");
            if (unpaid.length > 0) {
              const totalPending = unpaid.reduce((s, f) => s + ((Number(f.amount_due) || 0) - (Number(f.amount_paid) || 0)), 0);
              generated.push({
                id: "fee",
                type: "fee",
                title: "Fee Payment Due",
                body: `৳${totalPending.toLocaleString()} in fees pending for this month. Please clear dues promptly.`,
                time: new Date().toISOString(),
                read: false,
                urgent: true,
              });
            } else {
              generated.push({
                id: "fee-ok",
                type: "fee",
                title: "Fees Up to Date ✓",
                body: "All fees for this month have been paid. Thank you!",
                time: new Date().toISOString(),
                read: true,
              });
            }

            // Pending assignments
            const { data: subs } = await supabase
              .from("assignment_submissions")
              .select("id, status")
              .eq("student_id", studentId)
              .in("status", ["pending", "submitted"]);

            if ((subs ?? []).length > 0) {
              generated.push({
                id: "assign",
                type: "assignment",
                title: `${subs!.length} Pending Assignment${subs!.length > 1 ? "s" : ""}`,
                body: `Your child has ${subs!.length} assignment${subs!.length > 1 ? "s" : ""} that need${subs!.length === 1 ? "s" : ""} attention. Please remind them.`,
                time: new Date().toISOString(),
                read: false,
              });
            }
          }
        }

        // Always add welcome
        generated.push({
          id: "welcome",
          type: "info",
          title: "Welcome to Parent Portal",
          body: "Track your child's attendance, fees, assignments and exam results — all in one place.",
          time: new Date(Date.now() - 86400000 * 2).toISOString(),
          read: true,
        });

        setNotifications(generated);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Notifications
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => setNotifications((p) => p.map((n) => ({ ...n, read: true })))}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--color-text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const Icon = typeIcon[n.type] ?? Bell;
            const style = typeBg[n.type] ?? typeBg.info;
            return (
              <div
                key={n.id}
                className="rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all duration-200"
                style={{
                  background: n.read ? "var(--color-bg)" : style.bg,
                  border: `1px solid ${n.read ? "var(--color-border)" : style.color + "40"}`,
                  opacity: n.read ? 0.8 : 1,
                }}
                onClick={() =>
                  setNotifications((prev) =>
                    prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                  )
                }
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                  <Icon className="w-4 h-4" style={{ color: style.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{n.title}</p>
                    {n.urgent && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(239,68,68,0.12)", color: "rgb(220,38,38)" }}>
                        Urgent
                      </span>
                    )}
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full" style={{ background: style.color }} />
                    )}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {n.body}
                  </p>
                  <p className="text-[10px] mt-1.5 font-medium" style={{ color: "var(--color-text-muted)" }}>
                    {formatTime(n.time)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
