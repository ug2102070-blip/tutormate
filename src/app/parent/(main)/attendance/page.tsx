"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getParentAttendance } from "@/actions/parentActions";
import { CalendarCheck, Loader2 } from "lucide-react";

const STATUS_CONFIG = {
  present: { label: "Present", color: "var(--color-success, #16a34a)", bg: "var(--color-success-bg, #f0fdf4)" },
  absent: { label: "Absent", color: "var(--color-error, #dc2626)", bg: "var(--color-error-bg, #fef2f2)" },
  late: { label: "Late", color: "var(--color-warning, #d97706)", bg: "var(--color-warning-bg, #fffbeb)" },
};

export default function ParentAttendancePage() {
  const supabase = createClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await getParentAttendance();
      setData(res);
      setLoading(false);
    }
    load();
  }, []);

  const pct = data?.stats?.percentage ?? 0;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Attendance</h1>
              <p className="text-xs text-white/70">Your child's attendance log</p>
            </div>
          </div>

          {/* Circular Progress */}
          {!loading && (
            <div className="relative w-16 h-16">
              <svg width="64" height="64" viewBox="0 0 80 80" className="-rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                <circle
                  cx="40" cy="40" r="36" fill="none"
                  stroke="white" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-white">{pct}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex gap-4 mt-4">
            {[
              { label: "Total", value: data?.stats?.total ?? 0 },
              { label: "Present", value: data?.stats?.present ?? 0 },
              { label: "Absent", value: data?.stats?.absent ?? 0 },
            ].map((s) => (
              <div key={s.label}
                className="px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-[11px] text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : data?.records?.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          No attendance records found.
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {data.records.map((r: any, idx: number) => {
            const config = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.absent;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: "var(--color-surface)",
                  borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: config.bg, color: config.color }}
                >
                  {new Date(r.date).getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {new Date(r.date).toLocaleDateString("en-BD", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {r.batchName}
                  </p>
                  {r.remarks && (
                    <p className="text-xs italic mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {r.remarks}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: config.bg, color: config.color }}
                >
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
