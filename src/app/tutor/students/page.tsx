"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import type { StudentDoc } from "@/types";
import { Plus, UserPlus, Search, Copy, Check, Phone, BarChart3 } from "lucide-react";
import { getStudentsPageData } from "@/actions/tutorStudentActions";
import { EmptyState } from "@/components/EmptyState";

export default function StudentsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // SWR: cache students + batches for 30s — instant on navigation back
  const { data: pageRes, isLoading } = useSWR(
    user ? "tutor-students-page" : null,
    () => getStudentsPageData({}),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const students: StudentDoc[] = pageRes?.data?.students || [];
  const batches: Record<string, string> = Object.fromEntries(
    (pageRes?.data?.batches || []).map((b: { id: string; name: string }) => [b.id, b.name])
  );

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
    <div className="space-y-4">
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
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="w-full sm:w-56 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 outline-none"
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
      {isLoading ? (
        <div className="h-64 rounded-xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          variant="students"
          title={t("students.noStudents")}
          description={
            search || selectedBatchId !== "all"
              ? t("students.noStudentsSearch")
              : t("students.noStudentsDesc")
          }
          action={
            !search && selectedBatchId === "all"
              ? { label: t("students.addStudentBtn"), href: "/tutor/students/new" }
              : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] overflow-hidden shadow-xs">
          {/* Mobile Card View */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredStudents.map((s) => (
              <div key={s.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.fullName}</div>
                    {s.institution && (
                      <div className="text-xs font-medium text-slate-400">{s.institution}</div>
                    )}
                  </div>
                  {s.authUid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      {t("students.statusLinked")}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                      {t("students.statusPending")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{s.phone}</span>
                  {s.guardianPhone && <span className="text-slate-400 text-[11px]">({t("students.guardianPrefix")} {s.guardianPhone})</span>}
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
                  <Link
                    href={`/tutor/students/${s.id}/report`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> View Report
                  </Link>

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
                  <th className="px-4 py-2.5">{t("students.tableStudentName")}</th>
                  <th className="px-4 py-2.5">{t("students.tablePhone")}</th>
                  <th className="px-4 py-2.5">{t("students.tableBatches")}</th>
                  <th className="px-4 py-2.5">{t("students.tableInviteCode")}</th>
                  <th className="px-4 py-2.5">{t("students.tableStatus")}</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 dark:text-slate-100 font-medium">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-2 font-bold">
                      {s.fullName}
                      {s.institution && (
                        <div className="text-[11px] font-medium text-slate-400">
                          {s.institution}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {s.phone}
                      </div>
                      {s.guardianPhone && (
                        <div className="text-[11px] text-slate-400">
                          {t("students.guardianPrefix")} {s.guardianPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] font-mono text-[11px] font-extrabold text-indigo-700 tracking-wider">
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
                    <td className="px-4 py-2">
                      {s.authUid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {t("students.statusLinked")}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          {t("students.statusPendingClaim")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/tutor/students/${s.id}/report`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs"
                        title="View comprehensive student progress report"
                      >
                        <BarChart3 className="w-3 h-3" /> Report
                      </Link>
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
