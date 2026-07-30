"use client";

import { useEffect, useState } from "react";
import {
  Users,
  BookOpen,
  GraduationCap,
  CreditCard,
  Trash2,
  Search,
  AlertCircle,
  Crown,
  UserX,
} from "lucide-react";
import {
  getOwnerTutors,
  removeTutorFromCenterByOwner,
  type OwnerTutorRow,
} from "@/actions/ownerActions";
import { useAuth } from "@/hooks/useAuth";

export default function OwnerTutorsPage() {
  const { user } = useAuth();
  const [tutors, setTutors] = useState<OwnerTutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOwnerTutors();
      setTutors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (tutorId: string, name: string) => {
    if (!confirm(`Remove ${name} from the center? They will lose access to center features.`)) return;
    setRemoving(tutorId);
    try {
      await removeTutorFromCenterByOwner(tutorId);
      setSuccessMsg(`${name} removed from center.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemoving(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const filtered = tutors.filter((t) =>
    t.fullName.toLowerCase().includes(search.toLowerCase()) ||
    t.institution.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Tutors
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {tutors.length} tutor{tutors.length !== 1 ? "s" : ""} in your center
          </p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tutors..."
            className="pl-9 pr-4 py-2 text-xs rounded-xl outline-none w-full sm:w-56"
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-600"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-xl px-4 py-2.5 text-xs font-semibold text-red-500 flex gap-2 items-center"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        {loading ? (
          <div className="animate-pulse space-y-3 p-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl" style={{ background: "var(--color-border)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <UserX className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
              {search ? "No tutors match your search." : "No tutors in your center yet."}
            </p>
            {!search && (
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Share your center join code so tutors can join.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div
              className="grid grid-cols-12 gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}
            >
              <span className="col-span-4">Tutor</span>
              <span className="col-span-2 text-center hidden sm:block">Batches</span>
              <span className="col-span-2 text-center hidden sm:block">Students</span>
              <span className="col-span-3 text-right hidden md:block">This Month's Rev.</span>
              <span className="col-span-1 text-right">Action</span>
            </div>
            {filtered.map((t) => {
              const isOwnerItself = t.userId === user?.id;
              return (
                <div
                  key={t.tutorId}
                  className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 border-b last:border-b-0 transition-colors hover:bg-opacity-60"
                  style={{ borderColor: "var(--color-border)", background: isOwnerItself ? "rgba(245,158,11,0.04)" : undefined }}
                >
                  {/* Name */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)" }}
                    >
                      {t.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                        {t.fullName}
                        {isOwnerItself && (
                          <Crown className="w-3 h-3 ml-1 inline" style={{ color: "rgb(245,158,11)" }} />
                        )}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
                        {t.institution} · {t.contactPhone}
                      </p>
                    </div>
                  </div>

                  {/* Batches */}
                  <div className="col-span-2 text-center hidden sm:flex items-center justify-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
                    <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{t.batchCount}</span>
                  </div>

                  {/* Students */}
                  <div className="col-span-2 text-center hidden sm:flex items-center justify-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" style={{ color: "rgb(16,185,129)" }} />
                    <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{t.studentCount}</span>
                  </div>

                  {/* Revenue */}
                  <div className="col-span-3 text-right hidden md:block">
                    <span
                      className="text-xs font-bold"
                      style={{ color: t.monthlyRevenue > 0 ? "rgb(16,185,129)" : "var(--color-text-muted)" }}
                    >
                      ৳{t.monthlyRevenue.toLocaleString()}
                    </span>
                  </div>

                  {/* Remove */}
                  <div className="col-span-7 sm:col-span-1 flex justify-end">
                    {!isOwnerItself && (
                      <button
                        onClick={() => handleRemove(t.tutorId, t.fullName)}
                        disabled={removing === t.tutorId}
                        className="p-2 rounded-lg transition-all hover:bg-red-50 disabled:opacity-40"
                        title="Remove from center"
                      >
                        {removing === t.tutorId ? (
                          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-red-400" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Summary Row */}
      {!loading && tutors.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Batches", value: tutors.reduce((s, t) => s + t.batchCount, 0), icon: BookOpen, color: "var(--color-primary)" },
            { label: "Total Students", value: tutors.reduce((s, t) => s + t.studentCount, 0), icon: GraduationCap, color: "rgb(16,185,129)" },
            { label: "Monthly Revenue", value: `৳${tutors.reduce((s, t) => s + t.monthlyRevenue, 0).toLocaleString()}`, icon: CreditCard, color: "rgb(245,158,11)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>{value}</p>
                <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
