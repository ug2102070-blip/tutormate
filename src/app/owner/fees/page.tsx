"use client";

import { useEffect, useState } from "react";
import { CreditCard, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { getOwnerFeeReport, type OwnerFeeRow } from "@/actions/ownerActions";

function MonthPicker({
  year, month, onPrev, onNext,
}: { year: number; month: number; onPrev: () => void; onNext: () => void }) {
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        className="p-1.5 rounded-lg transition-colors"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <ChevronLeft className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
      </button>
      <span className="text-sm font-bold w-24 text-center" style={{ color: "var(--color-text)" }}>
        {monthNames[month - 1]} {year}
      </span>
      <button
        onClick={onNext}
        className="p-1.5 rounded-lg transition-colors"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <ChevronRight className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
      </button>
    </div>
  );
}

export default function OwnerFeesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<OwnerFeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (y: number, m: number) => {
    setLoading(true);
    try {
      const data = await getOwnerFeeReport(y, m);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(year, month); }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const totalDue = rows.reduce((s, r) => s + r.totalDue, 0);
  const totalPaid = rows.reduce((s, r) => s + r.totalPaid, 0);
  const totalPending = rows.reduce((s, r) => s + r.totalPending, 0);
  const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Fee Reports
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Center-wide fee collection overview
          </p>
        </div>
        <MonthPicker year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Due", value: `৳${totalDue.toLocaleString()}`, icon: CreditCard, color: "var(--color-primary)" },
          { label: "Collected", value: `৳${totalPaid.toLocaleString()}`, icon: TrendingUp, color: "rgb(16,185,129)" },
          { label: "Pending", value: `৳${totalPending.toLocaleString()}`, icon: TrendingDown, color: "rgb(239,68,68)" },
          { label: "Collection Rate", value: `${collectionRate}%`, icon: TrendingUp, color: collectionRate >= 80 ? "rgb(16,185,129)" : "rgb(245,158,11)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>{value}</div>
            <div className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Per-Tutor Breakdown */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Per-Tutor Breakdown</h2>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-2 p-5">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl" style={{ background: "var(--color-border)" }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10" style={{ color: "var(--color-text-muted)" }}>
            <CreditCard className="w-7 h-7 mx-auto mb-2" />
            <p className="text-xs">No fee data for this period.</p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}
            >
              <span className="col-span-3">Tutor</span>
              <span className="col-span-2 text-right">Due</span>
              <span className="col-span-2 text-right">Paid</span>
              <span className="col-span-2 text-right">Pending</span>
              <span className="col-span-3 text-right">Rate</span>
            </div>
            {rows.map((r) => {
              const rate = r.totalDue > 0 ? Math.round((r.totalPaid / r.totalDue) * 100) : 100;
              return (
                <div
                  key={r.tutorName}
                  className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 border-b last:border-b-0"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)" }}
                    >
                      {r.tutorName.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>{r.tutorName}</span>
                  </div>
                  <span className="col-span-2 text-right text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    ৳{r.totalDue.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-right text-xs font-bold" style={{ color: "rgb(16,185,129)" }}>
                    ৳{r.totalPaid.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-right text-xs font-bold" style={{ color: r.totalPending > 0 ? "rgb(239,68,68)" : "rgb(16,185,129)" }}>
                    ৳{r.totalPending.toLocaleString()}
                  </span>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <div className="flex-1 h-1.5 rounded-full max-w-16" style={{ background: "var(--color-border)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${rate}%`,
                          background: rate >= 80 ? "rgb(16,185,129)" : "rgb(245,158,11)",
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-bold w-8 text-right" style={{ color: rate >= 80 ? "rgb(16,185,129)" : "rgb(217,119,6)" }}>
                      {rate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
