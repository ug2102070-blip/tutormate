"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Printer, Download, Calendar, Users, CheckCircle, XCircle, Clock, BookOpen, Layers } from "lucide-react";
import { getMonthlyAttendanceExportData, type AttendanceExportData } from "@/actions/attendanceActions";
import { getTutorBatches } from "@/actions/batchActions";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/context/LanguageContext";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AttendanceExportPage() {
  const { t } = useLanguage();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  // Fetch tutor batches for selector
  const { data: batches = [] } = useSWR(
    "tutor-batches-export-list",
    () => getTutorBatches()
  );

  const activeBatchId = selectedBatchId || batches[0]?.id || "";

  // Fetch export data for active batch & month
  const { data: exportData, isLoading } = useSWR<AttendanceExportData | null>(
    activeBatchId
      ? `attendance-export-${activeBatchId}-${selectedYear}-${selectedMonth}`
      : null,
    () => getMonthlyAttendanceExportData(activeBatchId, selectedYear, selectedMonth)
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Non-printable Top Bar & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <Link
            href="/tutor/attendance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Attendance Overview</span>
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Monthly Attendance Register & Export
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Generate official monthly attendance sheets, summary percentages, and print-ready PDF reports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Batch Selector */}
          <select
            value={activeBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.gradeClass ? `(Class ${b.gradeClass})` : ""}
              </option>
            ))}
          </select>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!exportData || exportData.students.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div
        className="p-6 sm:p-8 rounded-2xl border shadow-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:p-0"
        id="printable-attendance-sheet"
      >
        {/* Printable Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              {exportData?.batch.name || "Batch Attendance Sheet"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {exportData?.batch.gradeClass ? `Class ${exportData.batch.gradeClass} · ` : ""}
              {exportData?.batch.subject ? `${exportData.batch.subject} · ` : ""}
              Academic Period: <strong>{exportData?.monthName} {selectedYear}</strong>
            </p>
          </div>

          <div className="text-right text-xs">
            <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
              Total Classes: {exportData?.dates.length || 0}
            </div>
            <div className="text-[10px] text-slate-400">
              Enrolled Students: {exportData?.students.length || 0}
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        {isLoading ? (
          <div className="h-64 rounded-xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
        ) : !exportData || exportData.students.length === 0 ? (
          <EmptyState
            variant="attendance"
            title="No Attendance Records Found"
            description={`No classes or enrolled students recorded for ${months[selectedMonth - 1]} ${selectedYear}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60">
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[140px]">
                    Student Name
                  </th>
                  {exportData.dates.map((d) => (
                    <th key={d} className="py-2 px-1.5 text-center min-w-[28px] font-mono">
                      {d.slice(8)}
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center text-emerald-600 font-bold">P</th>
                  <th className="py-2 px-2 text-center text-rose-600 font-bold">A</th>
                  <th className="py-2 px-2 text-center text-amber-600 font-bold">L</th>
                  <th className="py-2 px-3 text-right font-black">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                {exportData.students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-bold sticky left-0 bg-white dark:bg-slate-900 z-10 truncate max-w-[180px]">
                      {st.fullName}
                      {st.phone && <div className="text-[10px] text-slate-400 font-normal">{st.phone}</div>}
                    </td>

                    {/* Daily Status Cells */}
                    {exportData.dates.map((d) => {
                      const status = st.dailyStatus[d];
                      return (
                        <td key={d} className="py-1.5 px-1 text-center font-bold text-[10px]">
                          {status === "present" ? (
                            <span className="text-emerald-600 font-black">P</span>
                          ) : status === "absent" ? (
                            <span className="text-rose-500 font-black">A</span>
                          ) : status === "late" ? (
                            <span className="text-amber-500 font-black">L</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2 px-2 text-center font-extrabold text-emerald-600 text-xs">
                      {st.presentCount}
                    </td>
                    <td className="py-2 px-2 text-center font-extrabold text-rose-500 text-xs">
                      {st.absentCount}
                    </td>
                    <td className="py-2 px-2 text-center font-extrabold text-amber-500 text-xs">
                      {st.lateCount}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-xs">
                      <span
                        className={
                          st.rate >= 80
                            ? "text-emerald-600"
                            : st.rate >= 60
                            ? "text-amber-600"
                            : "text-rose-600"
                        }
                      >
                        {st.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend for Print */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-bold text-emerald-600">
              P = Present
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-500">
              A = Absent
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-500">
              L = Late
            </span>
          </div>

          <div className="text-[10px] text-slate-400">
            Generated via TutorMate BD on {new Date().toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}
