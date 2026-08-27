"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, BookOpen, Archive, CheckCircle2 } from "lucide-react";
import { getOwnerBatches, type OwnerBatchRow } from "@/actions/ownerActions";
import { useLanguage } from "@/context/LanguageContext";

export default function OwnerBatchesPage() {
  const { t, language } = useLanguage();
  const isBn = language === "bn";
  const [batches, setBatches] = useState<OwnerBatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTutor, setFilterTutor] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOwnerBatches();
        setBatches(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tutorNames = useMemo(
    () => ["all", ...Array.from(new Set(batches.map((b) => b.tutorName)))],
    [batches]
  );

  const filtered = useMemo(
    () =>
      batches.filter((b) => {
        const matchSearch =
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.subject.toLowerCase().includes(search.toLowerCase()) ||
          b.tutorName.toLowerCase().includes(search.toLowerCase());
        const matchTutor = filterTutor === "all" || b.tutorName === filterTutor;
        const matchArchived = showArchived ? true : !b.isArchived;
        return matchSearch && matchTutor && matchArchived;
      }),
    [batches, search, filterTutor, showArchived]
  );

  const active = batches.filter((b) => !b.isArchived);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {t("owner.allBatches") || "All Batches"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {isBn ? `সেন্টারে মোট ${active.length} টি ব্যাচ সক্রিয় আছে` : `${active.length} active batch${active.length !== 1 ? "es" : ""} across center`}
          </p>
        </div>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: showArchived ? "rgba(245,158,11,0.12)" : "var(--color-bg)",
            color: showArchived ? "rgb(217,119,6)" : "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          <Archive className="w-3.5 h-3.5" />
          {showArchived ? (t("owner.hideArchived") || "Hide Archived") : (t("owner.showArchived") || "Show Archived")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("owner.searchBatchesPlaceholder") || "Search by name, subject or tutor..."}
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
            <option key={n} value={n}>{n === "all" ? (t("owner.allTutors") || "All Tutors") : n}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl" style={{ background: "var(--color-border)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          <BookOpen className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm font-medium">{t("owner.noBatchesFound") || "No batches found."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((b) => (
            <div
              key={b.batchId}
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                opacity: b.isArchived ? 0.6 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                    {b.name}
                  </p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {b.subject} · {t("common.class") || "Class"} {b.gradeClass}
                  </p>
                </div>
                {b.isArchived ? (
                  <Archive className="w-4 h-4 shrink-0 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)" }}
                >
                  {b.tutorName.charAt(0)}
                </div>
                <span className="text-[11px] font-medium truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {b.tutorName}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  {isBn ? `${b.studentCount} জন ছাত্র` : `${b.studentCount} students`}
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
                  ৳{b.monthlyFee.toLocaleString()}/{isBn ? "মাস" : "mo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
