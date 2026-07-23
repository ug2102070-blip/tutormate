"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { saveAttendance } from "@/actions/attendanceActions";
import type { BatchDoc, StudentDoc, AttendanceRecord } from "@/types";
import { CalendarCheck, Save, Check, X, Clock } from "lucide-react";

export default function AttendancePage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [students, setStudents] = useState<StudentDoc[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, AttendanceRecord>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  // Load tutor's batches
  useEffect(() => {
    if (!user) return;
    async function loadBatches() {
      const q = query(
        collection(db, "batches"),
        where("tutorId", "==", user!.uid),
        where("isArchived", "==", false)
      );
      const snap = await getDocs(q);
      const list: BatchDoc[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as BatchDoc));
      setBatches(list);
      if (list.length > 0) {
        setSelectedBatchId(list[0].id);
      }
    }
    loadBatches();
  }, [user]);

  // Load students & existing attendance record when batch/date changes
  const loadBatchStudentsAndAttendance = useCallback(async () => {
    if (!user || !selectedBatchId || !selectedDate) return;
    setLoading(true);
    setError("");

    try {
      // 1. Fetch active students in this batch
      const studentsQuery = query(
        collection(db, "students"),
        where("tutorId", "==", user.uid),
        where("status", "==", "active"),
        where("enrolledBatchIds", "array-contains", selectedBatchId)
      );
      const studentsSnap = await getDocs(studentsQuery);
      const studentList: StudentDoc[] = [];
      studentsSnap.forEach((d) =>
        studentList.push({ id: d.id, ...d.data() } as StudentDoc)
      );
      setStudents(studentList);

      // 2. Fetch existing attendance record doc for batchId_date
      const docId = `${selectedBatchId}_${selectedDate}`;
      const attendanceRef = doc(db, "attendance", docId);
      const attendanceSnap = await getDoc(attendanceRef);

      if (attendanceSnap.exists()) {
        const data = attendanceSnap.data();
        setAttendanceRecords(data.records || {});
      } else {
        // Initialize default record (all present)
        const initialMap: Record<string, AttendanceRecord> = {};
        studentList.forEach((s) => {
          initialMap[s.id] = { status: "present", remarks: null };
        });
        setAttendanceRecords(initialMap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load attendance.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBatchId, selectedDate]);

  useEffect(() => {
    loadBatchStudentsAndAttendance();
  }, [loadBatchStudentsAndAttendance]);

  function setStudentStatus(studentId: string, status: "present" | "absent" | "late") {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  }

  function setAllStatus(status: "present" | "absent" | "late") {
    const updated: Record<string, AttendanceRecord> = {};
    students.forEach((s) => {
      updated[s.id] = { status, remarks: null };
    });
    setAttendanceRecords(updated);
  }

  async function handleSaveAttendance() {
    if (!user || !selectedBatchId || !selectedDate) return;
    setSaving(true);
    setSavedSuccess(false);
    setError("");

    try {
      const token = await user.getIdToken();
      await saveAttendance(
        {
          batchId: selectedBatchId,
          date: selectedDate,
          records: attendanceRecords,
        },
        token
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save attendance.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(attendanceRecords).filter(
    (r) => r?.status === "present"
  ).length;
  const absentCount = Object.values(attendanceRecords).filter(
    (r) => r?.status === "absent"
  ).length;
  const lateCount = Object.values(attendanceRecords).filter(
    (r) => r?.status === "late"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Daily Attendance
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Take 1-click attendance for your batches and save daily class logs
          </p>
        </div>

        <button
          onClick={handleSaveAttendance}
          disabled={saving || students.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
          }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving Logs..." : "Save Attendance"}
        </button>
      </div>

      {savedSuccess && (
        <div
          className="p-3 text-sm rounded-lg animate-fade-in"
          style={{
            backgroundColor: "rgb(16 185 129 / 0.1)",
            color: "var(--color-success)",
            border: "1px solid rgb(16 185 129 / 0.2)",
          }}
          role="status"
        >
          ✅ Attendance saved successfully for {selectedDate}!
        </div>
      )}

      {error && (
        <div
          className="p-3 text-sm rounded-lg"
          style={{
            backgroundColor: "rgb(239 68 68 / 0.1)",
            color: "var(--color-error)",
            border: "1px solid rgb(239 68 68 / 0.2)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Batch & Date Picker Bar */}
      <div className="p-4 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">
              Select Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full sm:w-56 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">
              Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-44 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
            />
          </div>
        </div>

        {/* Quick Summary & Bulk Actions */}
        {students.length > 0 && (
          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)] w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Present: {presentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                Absent: {absentCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                Late: {lateCount}
              </span>
            </div>

            <button
              onClick={() => setAllStatus("present")}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]"
            >
              Mark All Present
            </button>
          </div>
        )}
      </div>

      {/* Attendance Sheet */}
      {loading ? (
        <div className="h-64 rounded-2xl animate-shimmer border border-[var(--color-border)]" />
      ) : students.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
          <CalendarCheck className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            No active students in this batch
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Enroll students into this batch first to start taking attendance.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
          <div className="divide-y divide-[var(--color-border)]">
            {students.map((student, idx) => {
              const currentStatus =
                attendanceRecords[student.id]?.status || "present";

              return (
                <div
                  key={student.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] w-6 text-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">
                        {student.fullName}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Phone: {student.phone}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Status Selector */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setStudentStatus(student.id, "present")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                        currentStatus === "present"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Present
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, "absent")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                        currentStatus === "absent"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-rose-50 hover:text-rose-700"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Absent
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, "late")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                        currentStatus === "late"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-amber-50 hover:text-amber-700"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> Late
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
