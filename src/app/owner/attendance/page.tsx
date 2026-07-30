"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getOwnerAttendanceSummary, type OwnerAttendanceRow } from "@/actions/ownerActions";

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? "rgb(16,185,129)" : rate >= 60 ? "rgb(245,158,11)" : "rgb(239,68,68)";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 rounded-full" style={{ background: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${rate}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold w-9 shrink-0 text-right" style={{ color }}>
        {rate}%
      </span>
    </div>
  );
}

export default function OwnerAttendancePage() {
  const [rows, setRows] = useState<OwnerAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getOwnerAttendanceSummary(days);
        setRows(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  const avgRate = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.rate, 0) / rows.length)
    : 0;

  const totalPresent = rows.reduce((s, r) => s + r.presentCount, 0);
  const totalAbsent = rows.reduce((s, r) => s + r.absentCount, 0);
  const totalLate = rows.reduce((s, r) => s + r.lateCount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Attendance Overview
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Center-wide attendance across all batches
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: days === d ? "var(--color-primary)" : "var(--color-bg)",
                color: days === d ? "#fff" : "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Avg. Rate", value: `${avgRate}%`, icon: TrendingUp, color: avgRate >= 80 ? "rgb(16,185,129)" : "rgb(245,158,11)" },
          { label: "Present", value: totalPresent, icon: CalendarCheck, color: "rgb(16,185,129)" },
          { label: "Absent", value: totalAbsent, icon: TrendingDown, color: "rgb(239,68,68)" },
          { label: "Late", value: totalLate, icon: Minus, color: "rgb(245,158,11)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-xl font-extrabold" style={{ color: "var(--color-text)" }}>{value}</div>
            <div className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Records Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        {loading ? (
          <div className="animate-pulse space-y-2 p-5">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl" style={{ background: "var(--color-border)" }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10" style={{ color: "var(--color-text-muted)" }}>
            <CalendarCheck className="w-7 h-7 mx-auto mb-2" />
            <p className="text-xs">No attendance records in this period.</p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}
            >
              <span className="col-span-3">Date</span>
              <span className="col-span-3">Batch</span>
              <span className="col-span-2 hidden sm:block">Tutor</span>
              <span className="col-span-1 text-center">P</span>
              <span className="col-span-1 text-center">A</span>
              <span className="col-span-2">Rate</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 items-center px-5 py-3 border-b last:border-b-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="col-span-3 text-[11px] font-mono font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  {r.date}
                </span>
                <span className="col-span-3 text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                  {r.batchName}
                </span>
                <span className="col-span-2 text-[11px] truncate hidden sm:block" style={{ color: "var(--color-text-muted)" }}>
                  {r.tutorName}
                </span>
                <span className="col-span-1 text-xs font-bold text-center" style={{ color: "rgb(16,185,129)" }}>
                  {r.presentCount}
                </span>
                <span className="col-span-1 text-xs font-bold text-center" style={{ color: "rgb(239,68,68)" }}>
                  {r.absentCount}
                </span>
                <div className="col-span-2">
                  <RateBar rate={r.rate} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
