"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAcademicYear, AcademicYear } from "@/context/AcademicYearContext";
import {
  CalendarDays,
  Lock,
  Unlock,
  Edit2,
  ExternalLink,
  Trash2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  X,
} from "lucide-react";

export default function AcademicYearsPage() {
  const { allYears, selectedYear, setSelectedYearById, addAcademicYear, toggleLockYear } =
    useAcademicYear();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newYearName, setNewYearName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [isCurrentSession, setIsCurrentSession] = useState(false);

  const activeYearsCount = allYears.filter((y) => y.status === "active").length;

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName || !newStartDate || !newEndDate) return;

    addAcademicYear({
      name: newYearName,
      startDate: newStartDate,
      endDate: newEndDate,
      isCurrent: isCurrentSession,
      isLocked: false,
      status: "active",
    });

    setShowAddModal(false);
    setNewYearName("");
    setNewStartDate("");
    setNewEndDate("");
    setIsCurrentSession(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/tutor/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Academic Years</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Academic Years
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Manage school sessions while preserving complete historical records.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Academic Year</span>
        </button>
      </div>

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="p-5 rounded-2xl border"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Academic Years</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black" style={{ color: "var(--color-text)" }}>
            {allYears.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Live database total</div>
        </div>

        <div
          className="p-5 rounded-2xl border"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Active Years</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black" style={{ color: "var(--color-text)" }}>
            {activeYearsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Live database total</div>
        </div>

        <div
          className="p-5 rounded-2xl border"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Current Session</span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {selectedYear.name}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Live database total</div>
        </div>
      </div>

      {/* Academic Years Data Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Academic Year</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Classes</th>
                <th className="px-5 py-3.5">Students</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Record Lock</th>
                <th className="px-5 py-3.5">Current</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {allYears.map((ay) => {
                const isSelected = ay.id === selectedYear.id;
                return (
                  <tr
                    key={ay.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-blue-50/50 dark:bg-blue-950/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100">
                      {ay.name}
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {ay.startDate} — {ay.endDate}
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold">
                      {ay.classesCount}
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold">
                      {ay.studentsCount}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          ay.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {ay.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleLockYear(ay.id)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${
                          ay.isLocked
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        }`}
                      >
                        {ay.isLocked ? (
                          <>
                            <Lock className="w-3 h-3" /> Locked
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" /> Open
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      {ay.isCurrent ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                          Current
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedYearById(ay.id)}
                          className="text-[10px] text-slate-400 hover:text-blue-600 underline font-semibold"
                        >
                          Switch
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button
                          onClick={() => toggleLockYear(ay.id)}
                          className="p-1.5 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          title="Toggle Record Lock"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          title="Edit Year"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/tutor/classes?year=${ay.id}`}
                          className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          title="View Classes"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          className="p-1.5 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete Year"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Data Protection Banner */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100">
            Historical data is protected.
          </span>{" "}
          Years containing classes cannot be deleted; deactivate them to retain student history.
        </div>
      </div>

      {/* Add Academic Year Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
                Add Academic Year
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Year Name (e.g. 2027-28)
                </label>
                <input
                  type="text"
                  required
                  placeholder="2027-28"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isCurrentSession"
                  checked={isCurrentSession}
                  onChange={(e) => setIsCurrentSession(e.target.checked)}
                  className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="isCurrentSession"
                  className="font-medium text-slate-700 dark:text-slate-300"
                >
                  Set as current active session
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  Save Academic Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
