"use client";

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import {
  getTutorAttendanceOverview,
  type TutorAttendanceOverviewData,
} from "@/actions/attendanceActions";
import { QRGeneratorModal } from "@/components/tutor/QRGeneratorModal";
import { EmptyState } from "@/components/EmptyState";
import {
  CalendarCheck,
  Search,
  Users,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react";

export default function DailyAttendanceCenterPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Default to today's local date (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // QR Modal State
  const [qrBatch, setQrBatch] = useState<{ id: string; name: string } | null>(null);

  // Fetch live overview from Supabase
  const {
    data: overviewData,
    isLoading,
    mutate,
  } = useSWR<TutorAttendanceOverviewData>(
    user ? `tutor-attendance-overview-${selectedDate}` : null,
    () => getTutorAttendanceOverview(selectedDate),
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    }
  );

  const batches = overviewData?.batches || [];
  const summary = overviewData?.summary || {
    totalEnrolled: 0,
    totalMarked: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    overallRate: 0,
  };

  // Filter batches by dropdown & search
  const filteredBatches = batches.filter((b) => {
    const matchesDropdown = classFilter === "all" || b.id === classFilter;
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.gradeClass.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDropdown && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/tutor/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Attendance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Attendance Management
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Mark and review daily attendance records in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/tutor/attendance/export"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5"
          >
            <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Monthly Export / PDF</span>
          </Link>

          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs"
            title="Refresh attendance records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/tutor/batches/new"
            className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Batch</span>
          </Link>
        </div>
      </div>

      {/* Date and Class Selector Bar */}
      <div
        className="p-4 rounded-2xl border flex flex-col md:flex-row items-center gap-4"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="w-full md:w-56">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Attendance Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-bold cursor-pointer"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div className="w-full md:w-64">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Batch / Class Filter</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-bold"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="all">All Batches Overview</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.students} students)
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:flex-1">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Quick Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batch by name, subject or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-medium"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
        </div>
      </div>

      {/* 6 Real-time Attendance Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Enrolled</span>
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-bold">
              <Users className="w-3 h-3" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {isLoading ? "..." : summary.totalEnrolled}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active students</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Marked</span>
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-bold">
              <CalendarCheck className="w-3 h-3" />
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {isLoading ? "..." : summary.totalMarked}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Logged today</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Present</span>
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {isLoading ? "..." : summary.totalPresent}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Attended class</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Absent</span>
            <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] flex items-center justify-center font-bold">
              <XCircle className="w-3 h-3" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {isLoading ? "..." : summary.totalAbsent}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Missed class</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Late</span>
            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] flex items-center justify-center font-bold">
              <Clock className="w-3 h-3" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {isLoading ? "..." : summary.totalLate}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Late arrivals</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Overall Rate</span>
            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-bold">
              %
            </span>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {isLoading ? "..." : `${summary.overallRate}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Attendance ratio</div>
        </div>
      </div>

      {/* Batches Attendance Matrix Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl animate-shimmer border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40"
              />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <EmptyState
            variant="batches"
            title="No batches found"
            description="Create your first batch to start recording attendance for your students."
            action={{ label: "Create New Batch", href: "/tutor/batches/new" }}
          />
        ) : filteredBatches.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No batches matched your filter or search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Batch / Class</th>
                  <th className="px-5 py-3.5">Enrolled</th>
                  <th className="px-5 py-3.5">Marked</th>
                  <th className="px-5 py-3.5">Present</th>
                  <th className="px-5 py-3.5">Absent</th>
                  <th className="px-5 py-3.5">Late</th>
                  <th className="px-5 py-3.5">Attendance Rate</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {b.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {b.subject && (
                            <span className="text-[10px] font-semibold text-slate-500">
                              {b.subject}
                            </span>
                          )}
                          {b.gradeClass && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                              Class {b.gradeClass}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                      {b.students} students
                    </td>

                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {b.marked} / {b.students}
                    </td>

                    <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-bold">
                      {b.present}
                    </td>

                    <td className="px-5 py-4 text-rose-600 dark:text-rose-400 font-bold">
                      {b.absent}
                    </td>

                    <td className="px-5 py-4 text-amber-600 dark:text-amber-400 font-bold">
                      {b.late}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              b.rate >= 80
                                ? "bg-emerald-500"
                                : b.rate >= 50
                                ? "bg-amber-500"
                                : b.rate > 0
                                ? "bg-rose-500"
                                : "bg-slate-300 dark:bg-slate-700"
                            }`}
                            style={{ width: `${b.rate}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 text-xs">
                          {b.rate}%
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {b.isMarked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Marked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* QR Attendance Button */}
                        <button
                          type="button"
                          onClick={() => setQrBatch({ id: b.id, name: b.name })}
                          className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all shadow-2xs flex items-center gap-1"
                          title="Open live QR Attendance for students"
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span className="hidden sm:inline">QR Session</span>
                        </button>

                        {/* Mark Attendance Link */}
                        <Link
                          href={`/tutor/attendance/register/${b.id}?date=${selectedDate}`}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center gap-1"
                        >
                          <span>{b.isMarked ? "Edit Register" : "Mark Register"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Session Generator Modal */}
      {qrBatch && user && (
        <QRGeneratorModal
          batchId={qrBatch.id}
          batchName={qrBatch.name}
          userId={user.id}
          isOpen={Boolean(qrBatch)}
          onClose={() => {
            setQrBatch(null);
            mutate();
          }}
          onSessionUpdated={() => mutate()}
        />
      )}
    </div>
  );
}
