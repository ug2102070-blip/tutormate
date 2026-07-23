"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import type { StudentDoc, BatchDoc } from "@/types";
import { Plus, UserPlus, Search, Copy, Check, Phone } from "lucide-react";

export default function StudentsPage() {
  const { user, claims } = useAuth();
  const [students, setStudents] = useState<StudentDoc[]>([]);
  const [batches, setBatches] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || claims?.role !== "tutor") return;

    // Fetch batches map for batch names
    const batchesQuery = query(
      collection(db, "batches"),
      where("tutorId", "==", user.uid)
    );
    const unsubBatches = onSnapshot(batchesQuery, (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((doc) => {
        const data = doc.data() as BatchDoc;
        map[doc.id] = data.name;
      });
      setBatches(map);
    });

    // Fetch students
    const studentsQuery = query(
      collection(db, "students"),
      where("tutorId", "==", user.uid)
    );
    const unsubStudents = onSnapshot(studentsQuery, (snap) => {
      const list: StudentDoc[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as StudentDoc);
      });
      setStudents(list);
      setLoading(false);
    });

    return () => {
      unsubBatches();
      unsubStudents();
    };
  }, [user, claims]);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      s.inviteCode.toLowerCase().includes(search.toLowerCase());

    const matchesBatch =
      selectedBatchId === "all" || s.enrolledBatchIds.includes(selectedBatchId);

    return matchesSearch && matchesBatch;
  });

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Student Management
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Add students, generate self-linking invite codes, and assign batches
          </p>
        </div>

        <Link
          href="/tutor/students/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
          }}
        >
          <Plus className="w-4 h-4" /> Add Student
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, phone, or invite code..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
          />
        </div>

        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="w-full sm:w-56 px-3 py-2 text-xs font-medium rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
        >
          <option value="all">All Batches</option>
          {Object.entries(batches).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="h-64 rounded-2xl animate-shimmer border border-[var(--color-border)]" />
      ) : filteredStudents.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
          <UserPlus className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            No students found
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            {search || selectedBatchId !== "all"
              ? "No students match your search criteria."
              : "Add your first student to generate an invite code for self-registration."}
          </p>
          <Link
            href="/tutor/students/new"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add a student now
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] font-semibold">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Batches</th>
                  <th className="px-4 py-3">Invite Code</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {s.fullName}
                      {s.institution && (
                        <div className="text-[11px] font-normal text-[var(--color-text-muted)]">
                          {s.institution}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[var(--color-text-muted)]" />
                        {s.phone}
                      </div>
                      {s.guardianPhone && (
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          Guardian: {s.guardianPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.enrolledBatchIds.map((bId) => (
                          <span
                            key={bId}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-primary-50)] text-[var(--color-primary-dark)]"
                          >
                            {batches[bId] || bId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] font-mono text-[11px] font-bold tracking-wider">
                        {s.inviteCode}
                        <button
                          onClick={() => copyInviteCode(s.inviteCode)}
                          className="p-0.5 hover:text-[var(--color-primary)] transition-colors"
                          title="Copy invite code"
                        >
                          {copiedCode === s.inviteCode ? (
                            <Check className="w-3 h-3 text-[var(--color-success)]" />
                          ) : (
                            <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.authUid ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Linked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Claim
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
