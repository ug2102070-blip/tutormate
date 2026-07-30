"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, GraduationCap, Filter, Users } from "lucide-react";
import { getOwnerStudents, type OwnerStudentRow } from "@/actions/ownerActions";

const feeStatusBadge: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: "rgb(5,150,105)", bg: "rgba(16,185,129,0.12)" },
  partial: { label: "Partial", color: "rgb(217,119,6)", bg: "rgba(245,158,11,0.12)" },
  unpaid: { label: "Unpaid", color: "rgb(220,38,38)", bg: "rgba(239,68,68,0.1)" },
  none: { label: "—", color: "var(--color-text-muted)", bg: "transparent" },
};

export default function OwnerStudentsPage() {
  const [students, setStudents] = useState<OwnerStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTutor, setFilterTutor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");

  useEffect(() => {
    (async () => {
      try {
        const data = await getOwnerStudents();
        setStudents(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tutorNames = useMemo(
    () => ["all", ...Array.from(new Set(students.map((s) => s.tutorName)))],
    [students]
  );

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        const matchSearch =
          s.fullName.toLowerCase().includes(search.toLowerCase()) ||
          s.phone.includes(search) ||
          (s.institution ?? "").toLowerCase().includes(search.toLowerCase());
        const matchTutor = filterTutor === "all" || s.tutorName === filterTutor;
        const matchStatus = filterStatus === "all" || s.status === filterStatus;
        return matchSearch && matchTutor && matchStatus;
      }),
    [students, search, filterTutor, filterStatus]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          All Students
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {students.filter((s) => s.status === "active").length} active across your center
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="pl-9 pr-4 py-2 text-xs rounded-xl outline-none w-full"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
        </div>
        <select
          value={filterTutor}
          onChange={(e) => setFilterTutor(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl outline-none"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          {tutorNames.map((n) => (
            <option key={n} value={n}>{n === "all" ? "All Tutors" : n}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl outline-none"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        {loading ? (
          <div className="animate-pulse space-y-3 p-5">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl" style={{ background: "var(--color-border)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>No students found.</p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-12 gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}
            >
              <span className="col-span-4">Student</span>
              <span className="col-span-3 hidden sm:block">Tutor</span>
              <span className="col-span-2 text-center hidden md:block">Batches</span>
              <span className="col-span-3 text-right">Fee Status</span>
            </div>
            {filtered.map((s) => {
              const badge = feeStatusBadge[s.feeStatus];
              return (
                <div
                  key={s.studentId}
                  className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 border-b last:border-b-0"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="col-span-7 sm:col-span-4 flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(16,185,129,0.15)", color: "rgb(16,185,129)" }}>
                      {s.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>{s.fullName}</p>
                      <p className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>{s.phone}</p>
                    </div>
                  </div>
                  <div className="col-span-3 hidden sm:block">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--color-text-secondary)" }}>{s.tutorName}</p>
                  </div>
                  <div className="col-span-2 text-center hidden md:block">
                    <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                      {s.enrolledBatchIds.length}
                    </span>
                  </div>
                  <div className="col-span-5 sm:col-span-3 flex justify-end">
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Count badge */}
      {!loading && (
        <p className="text-[11px] text-right" style={{ color: "var(--color-text-muted)" }}>
          Showing {filtered.length} of {students.length} students
        </p>
      )}
    </div>
  );
}
