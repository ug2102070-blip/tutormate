"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { getStudentAttendanceHistory } from "@/actions/attendanceActions";
import type { AttendanceDoc } from "@/types";
import { CalendarCheck, Check, X, Clock, QrCode } from "lucide-react";
import { QRScannerModal } from "@/components/student/QRScannerModal";

export default function StudentAttendancePage() {
  const { user, claims } = useAuth();
  const { t } = useLanguage();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const {
    data: attendanceLogs = [],
    isLoading: loading,
    mutate: mutateAttendance,
  } = useSWR<AttendanceDoc[]>(
    user ? `student-attendance-${user.id}` : null,
    () => getStudentAttendanceHistory(),
    { dedupingInterval: 30_000 }
  );

  const studentDocId = claims?.role === "student" ? claims.studentDocId : "";
  const presentCount = attendanceLogs.filter(
    (l) => l.records?.[studentDocId]?.status === "present"
  ).length;
  const absentCount = attendanceLogs.filter(
    (l) => l.records?.[studentDocId]?.status === "absent"
  ).length;
  const lateCount = attendanceLogs.filter(
    (l) => l.records?.[studentDocId]?.status === "late"
  ).length;

  const totalClasses = attendanceLogs.length;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            {t("nav.myAttendance")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("attendance.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all"
        >
          <QrCode className="w-4 h-4" />
          {t("attendance.scanQr") || "Scan QR Attendance 📷"}
        </button>
      </div>


      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-xs text-[var(--color-text-muted)] font-medium">{t("dashboard.attendanceRate") || "Attendance Rate"}</div>
          <div className="text-xl font-bold text-[var(--color-primary)] mt-1">{attendanceRate}%</div>
        </div>
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-xs text-[var(--color-text-muted)] font-medium">{t("attendance.present") || "Present"}</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{presentCount}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-xs text-[var(--color-text-muted)] font-medium">{t("attendance.absent") || "Absent"}</div>
          <div className="text-xl font-bold text-rose-600 mt-1">{absentCount}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-xs text-[var(--color-text-muted)] font-medium">{t("attendance.late") || "Late"}</div>
          <div className="text-xl font-bold text-amber-500 mt-1">{lateCount}</div>
        </div>
      </div>

      {/* Attendance Logs Table */}
      {loading ? (
        <div className="h-64 rounded-xl animate-shimmer border border-[var(--color-border)]" />
      ) : attendanceLogs.length === 0 ? (
        <div className="py-12 text-center border border-dashed rounded-xl border-[var(--color-border)] bg-[var(--color-surface)]">
          <CalendarCheck className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {t("attendance.noLogs") || "No attendance logs found"}
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            {t("attendance.noLogsDesc") || "Your tutor has not logged any attendance for your batch yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5">{t("attendance.date") || "Date"}</th>
                  <th className="px-3.5 py-2.5">{t("attendance.status") || "Attendance Status"}</th>
                  <th className="px-3.5 py-2.5">{t("attendance.remarks") || "Remarks"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                {attendanceLogs.map((log) => {
                  const record = log.records?.[studentDocId];
                  const status = record?.status || "absent";


                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <td className="px-3.5 py-2.5 font-semibold">
                        {new Date(log.date + "T00:00:00").toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {status === "present" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <Check className="w-3 h-3" /> {t("attendance.present") || "Present"}
                          </span>
                        )}
                        {status === "absent" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <X className="w-3 h-3" /> {t("attendance.absent") || "Absent"}
                          </span>
                        )}
                        {status === "late" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            <Clock className="w-3 h-3" /> {t("attendance.late") || "Late"}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-[var(--color-text-muted)]">
                        {record?.remarks || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student QR Scanner Modal */}
      {user && (
        <QRScannerModal
          userId={user.id}
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSuccess={() => mutateAttendance()}
        />
      )}
    </div>
  );
}

