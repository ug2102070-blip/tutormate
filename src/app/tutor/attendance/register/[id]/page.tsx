"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import {
  getBatchAttendanceRegister,
  saveAttendance,
  type BatchAttendanceRegisterData,
  type RegisterStudentItem,
} from "@/actions/attendanceActions";
import { QRGeneratorModal } from "@/components/tutor/QRGeneratorModal";
import { EmptyState } from "@/components/EmptyState";
import {
  ArrowLeft,
  Save,
  Check,
  QrCode,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  UserPlus,
} from "lucide-react";

function RegisterContent({ batchId }: { batchId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const todayStr = new Date().toISOString().split("T")[0];
  const queryDate = searchParams.get("date") || todayStr;
  const [selectedDate, setSelectedDate] = useState<string>(queryDate);

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Local Attendance State: Map of studentId -> { status, remarks }
  const [studentStatuses, setStudentStatuses] = useState<
    Record<string, { status: "present" | "absent" | "late"; remarks: string }>
  >({});

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch batch register from Supabase
  const {
    data: registerData,
    isLoading,
    mutate,
  } = useSWR<BatchAttendanceRegisterData>(
    user && batchId ? `batch-register-${batchId}-${selectedDate}` : null,
    () => getBatchAttendanceRegister(batchId, selectedDate),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  const students: RegisterStudentItem[] = registerData?.students || [];
  const batch = registerData?.batch || {
    id: batchId,
    name: "Batch Attendance Register",
    gradeClass: "",
    subject: "",
  };

  // Sync server data into local interactive state when loaded or date changed
  useEffect(() => {
    if (!students || students.length === 0) return;

    const initialMap: Record<
      string,
      { status: "present" | "absent" | "late"; remarks: string }
    > = {};

    for (const st of students) {
      initialMap[st.studentId] = {
        // Default to existing status from DB, or default to "present" if not marked yet
        status: st.status || "present",
        remarks: st.remarks || "",
      };
    }

    setStudentStatuses(initialMap);
  }, [registerData]);

  // Handle date switch
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    router.replace(`/tutor/attendance/register/${batchId}?date=${newDate}`);
  };

  // Status Change
  const handleStatusChange = (
    studentId: string,
    newStatus: "present" | "absent" | "late"
  ) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: newStatus,
        remarks: prev[studentId]?.remarks || "",
      },
    }));
    setSavedSuccess(false);
    setErrorMsg("");
  };

  // Remarks Change
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "present" }),
        remarks,
      },
    }));
    setSavedSuccess(false);
  };

  // Bulk Actions
  const handleMarkAll = (status: "present" | "absent") => {
    setStudentStatuses((prev) => {
      const updated: Record<
        string,
        { status: "present" | "absent" | "late"; remarks: string }
      > = {};
      for (const st of students) {
        updated[st.studentId] = {
          status,
          remarks: prev[st.studentId]?.remarks || "",
        };
      }
      return updated;
    });
    setSavedSuccess(false);
    setErrorMsg("");
  };

  // Save Attendance to Supabase
  const handleSave = async () => {
    if (students.length === 0) return;

    setSaving(true);
    setErrorMsg("");

    try {
      // Build payload
      const recordsToSave: Record<
        string,
        { status: "present" | "absent" | "late"; remarks?: string | null }
      > = {};

      for (const st of students) {
        const current = studentStatuses[st.studentId] || {
          status: "present",
          remarks: "",
        };
        recordsToSave[st.studentId] = {
          status: current.status,
          remarks: current.remarks.trim() || null,
        };
      }

      await saveAttendance({
        batchId,
        date: selectedDate,
        records: recordsToSave,
      });

      setSavedSuccess(true);
      await mutate();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save attendance.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // Calculate live counts from local state
  const presentCount = Object.values(studentStatuses).filter(
    (s) => s?.status === "present"
  ).length;
  const absentCount = Object.values(studentStatuses).filter(
    (s) => s?.status === "absent"
  ).length;
  const lateCount = Object.values(studentStatuses).filter(
    (s) => s?.status === "late"
  ).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Back to Overview */}
      <div className="flex items-center justify-between">
        <Link
          href="/tutor/attendance"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Attendance Overview</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 text-xs font-bold flex items-center gap-1"
            title="Refresh register"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Header & Date / Bulk Actions Bar */}
      <div className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: "var(--color-text)" }}
              >
                {batch.name}
              </h1>
              {batch.gradeClass && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900">
                  Class {batch.gradeClass}
                </span>
              )}
              {batch.subject && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  {batch.subject}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1 font-medium">
              Enrolled students: {students.length} | Status:{" "}
              {registerData?.isMarked ? (
                <span className="text-emerald-600 font-bold">Saved in database</span>
              ) : (
                <span className="text-amber-600 font-bold">Unsaved register</span>
              )}
            </p>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400">
                Register Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border text-slate-700 dark:text-slate-200 font-bold outline-hidden cursor-pointer"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
          </div>
        </div>

        {/* Quick Bulk Action Toolbar & Save Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkAll("present")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-2xs"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll("absent")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-2xs"
            >
              All Absent
            </button>

            {/* QR Attendance Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>QR Mode</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Counter Badges */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                P: {presentCount}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60">
                A: {absentCount}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60">
                L: {lateCount}
              </span>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md flex items-center gap-1.5 ${
                savedSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
              } disabled:opacity-50`}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : savedSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {saving
                  ? "Saving..."
                  : savedSuccess
                  ? "Attendance Saved!"
                  : "Save Attendance"}
              </span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Student Attendance Register Table */}
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
        ) : students.length === 0 ? (
          <EmptyState
            variant="students"
            title="No students enrolled in this batch"
            description="Add or enroll students into this batch to take attendance."
            action={{
              label: "Add Student",
              href: "/tutor/students/new",
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Roll No.</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Phone / ID</th>
                  <th className="px-5 py-3.5 text-center">Attendance Status</th>
                  <th className="px-5 py-3.5">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {students.map((r) => {
                  const currentStatus =
                    studentStatuses[r.studentId]?.status || "present";
                  const currentRemarks =
                    studentStatuses[r.studentId]?.remarks || "";

                  return (
                    <tr
                      key={r.studentId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-black text-slate-700 dark:text-slate-300">
                        {r.rollNo}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-100 dark:border-blue-900 shrink-0">
                            {r.avatarInitials}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {r.fullName}
                            </span>
                            {r.institution && (
                              <div className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                                {r.institution}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        <div>{r.phone}</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          PIN: {r.inviteCode}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {/* 3-Pill Status Toggle */}
                        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(r.studentId, "present")
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "present"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(r.studentId, "absent")
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "absent"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(r.studentId, "late")
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === "late"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            }`}
                          >
                            Late
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <input
                          type="text"
                          placeholder="Optional note (e.g. sick, late 10m)..."
                          value={currentRemarks}
                          onChange={(e) =>
                            handleRemarksChange(r.studentId, e.target.value)
                          }
                          className="w-full min-w-[160px] px-3 py-1.5 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium outline-hidden focus:border-blue-500"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Session Generator Modal */}
      {user && (
        <QRGeneratorModal
          batchId={batchId}
          batchName={batch.name}
          userId={user.id}
          isOpen={isQrModalOpen}
          onClose={() => {
            setIsQrModalOpen(false);
            mutate();
          }}
          onSessionUpdated={() => mutate()}
        />
      )}
    </div>
  );
}

export default function ClassAttendanceRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-5xl mx-auto p-8">
          <div className="h-28 rounded-2xl animate-shimmer border border-slate-200 bg-white dark:bg-slate-900" />
          <div className="h-64 rounded-2xl animate-shimmer border border-slate-200 bg-white dark:bg-slate-900" />
        </div>
      }
    >
      <RegisterContent batchId={id} />
    </Suspense>
  );
}

