"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import type { StudentDoc } from "@/types";
import { Plus, UserPlus, Search, Copy, Check, Phone } from "lucide-react";

import { getTutorBatches } from "@/actions/batchActions";
import { getTutorStudents } from "@/actions/tutorStudentActions";

export default function StudentsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<StudentDoc[]>([]);
  const [batches, setBatches] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const [batchList, studentList] = await Promise.all([
          getTutorBatches(user?.id),
          getTutorStudents(user?.id),
        ]);

        const map: Record<string, string> = {};
        batchList.forEach((b: any) => {
          map[b.id] = b.name;
        });
        setBatches(map);

        setStudents(studentList);
      } catch (err) {
        console.error("loadData error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("students.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {t("students.subtitle")}
          </p>
        </div>

        <Link
          href="/tutor/students/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" /> {t("students.addNewStudent")}
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="w-full sm:w-56 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 outline-none"
        >
          <option value="all">{t("common.all")} {t("nav.batches")}</option>
          {Object.entries(batches).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="h-64 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
      ) : filteredStudents.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <UserPlus className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No students found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-sm mx-auto">
            {search || selectedBatchId !== "all"
              ? "No students match your search criteria."
              : "Add your first student to generate an invite code for self-registration."}
          </p>
          <Link
            href="/tutor/students/new"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-indigo-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add a student now
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] overflow-hidden shadow-xs">
          {/* Mobile Card View */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredStudents.map((s) => (
              <div key={s.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.fullName}</div>
                    {s.institution && (
                      <div className="text-xs font-medium text-slate-400">{s.institution}</div>
                    )}
                  </div>
                  {s.authUid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      Linked
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{s.phone}</span>
                  {s.guardianPhone && <span className="text-slate-400 text-[11px]">(Guardian: {s.guardianPhone})</span>}
                </div>

                <div className="flex flex-wrap gap-1">
                  {s.enrolledBatchIds.map((bId) => (
                    <span
                      key={bId}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 border border-indigo-100"
                    >
                      {batches[bId] || bId}
                    </span>
                  ))}
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Invite Code:</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] font-mono text-[11px] font-extrabold text-indigo-700">
                    {s.inviteCode}
                    <button
                      onClick={() => copyInviteCode(s.inviteCode)}
                      className="p-0.5 hover:text-indigo-900 transition-colors"
                      title="Copy invite code"
                    >
                      {copiedCode === s.inviteCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Batches</th>
                  <th className="px-4 py-3">Invite Code</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 dark:text-slate-100 font-medium">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold">
                      {s.fullName}
                      {s.institution && (
                        <div className="text-[11px] font-medium text-slate-400">
                          {s.institution}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {s.phone}
                      </div>
                      {s.guardianPhone && (
                        <div className="text-[11px] text-slate-400">
                          Guardian: {s.guardianPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.enrolledBatchIds.map((bId) => (
                          <span
                            key={bId}
                            className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 border border-indigo-100"
                          >
                            {batches[bId] || bId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] font-mono text-[11px] font-extrabold text-indigo-700 tracking-wider">
                        {s.inviteCode}
                        <button
                          onClick={() => copyInviteCode(s.inviteCode)}
                          className="p-0.5 hover:text-indigo-900 transition-colors"
                          title="Copy invite code"
                        >
                          {copiedCode === s.inviteCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.authUid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          Linked
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
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
