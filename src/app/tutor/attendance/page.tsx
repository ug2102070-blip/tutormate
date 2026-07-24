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
      snap.forEach((d) => list.push({ ...d.data(), id: d.id } as BatchDoc));
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
        studentList.push({ ...d.data(), id: d.id } as StudentDoc)
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daily Attendance
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Take 1-click attendance for your batches and save daily class logs
          </p>
        </div>

        <button
          onClick={handleSaveAttendance}
          disabled={saving || students.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving Logs..." : "Save Attendance"}
        </button>
      </div>

      {savedSuccess && (
        <div
          className="p-4 text-sm font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in"
          role="status"
        >
          ✅ Attendance saved successfully for {selectedDate}!
        </div>
      )}

      {error && (
        <div
          className="p-4 text-sm font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Batch & Date Picker Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center gap-4 justify-between shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Select Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full sm:w-56 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-44 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
            />
          </div>
        </div>

        {/* Quick Summary & Bulk Actions */}
        {students.length > 0 && (
          <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Present: {presentCount}
              </span>
              <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                Absent: {absentCount}
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                Late: {lateCount}
              </span>
            </div>

            <button
              onClick={() => setAllStatus("present")}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              Mark All Present
            </button>
          </div>
        )}
      </div>

      {/* Attendance Sheet */}
      {loading ? (
        <div className="h-64 rounded-2xl animate-shimmer border border-slate-200 bg-white" />
      ) : students.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-slate-200 bg-white shadow-xs">
          <CalendarCheck className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">
            No active students in this batch
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
            Enroll students into this batch first to start taking attendance.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {students.map((student, idx) => {
              const currentStatus =
                attendanceRecords[student.id]?.status || "present";

              return (
                <div
                  key={student.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {student.fullName}
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        Phone: {student.phone}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Status Selector */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                      onClick={() => setStudentStatus(student.id, "present")}
                      className={`flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        currentStatus === "present"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      <Check className="w-4 h-4" /> Present
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, "absent")}
                      className={`flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        currentStatus === "absent"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-rose-700"
                      }`}
                    >
                      <X className="w-4 h-4" /> Absent
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, "late")}
                      className={`flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        currentStatus === "late"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700"
                      }`}
                    >
                      <Clock className="w-4 h-4" /> Late
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Sticky Save Floating Bar */}
          <div className="sticky bottom-16 sm:hidden p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between shadow-lg">
            <span className="text-xs font-bold text-slate-600">
              {students.length} Students Logged
            </span>
            <button
              onClick={handleSaveAttendance}
              disabled={saving || students.length === 0}
              className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
