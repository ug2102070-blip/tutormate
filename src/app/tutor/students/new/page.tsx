"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createStudent, linkProfileAsStudent } from "@/actions/tutorStudentActions";
import type { BatchDoc } from "@/types";
import { ArrowLeft, Copy, Check, Phone, UserPlus, FileText } from "lucide-react";

import { getTutorBatches } from "@/actions/batchActions";
import PhoneSearchInput from "@/components/ui/PhoneSearchInput";

// The lookup result type returned by PhoneSearchInput's onFound callback
type LookupResult =
  | { found: false }
  | {
      found: true;
      type: "profile";
      profile: { uid: string; displayName: string; email: string; phone: string; role: "student" | "parent" };
    }
  | {
      found: true;
      type: "existing_student";
      existingStudent: { id: string; fullName: string; phone: string; authUid: string | null; inviteCode: string };
    };

type AddMode = "phone" | "manual";

export default function AddStudentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<AddMode>("phone");

  // Shared
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone mode
  const [phoneResult, setPhoneResult] = useState<LookupResult | null>(null);
  const [guardianPhone, setGuardianPhone] = useState("");
  const [institution, setInstitution] = useState("");

  // Manual mode
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [manualGuardianPhone, setManualGuardianPhone] = useState("");
  const [manualInstitution, setManualInstitution] = useState("");

  useEffect(() => {
    if (!user) return;
    async function loadBatches() {
      try {
        const data = await getTutorBatches();
        const activeBatches = data.filter((b: any) => !b.isArchived);
        setBatches(activeBatches);
        if (activeBatches.length > 0) {
          setSelectedBatchIds([activeBatches[0].id]);
        }
      } catch (err) {
        console.error("loadBatches error:", err);
      }
    }
    loadBatches();
  }, [user]);

  function toggleBatchSelect(batchId: string) {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  }

  // --- Phone Mode Submit (link existing profile) ---
  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneResult || !phoneResult.found) {
      setError("No profile found with this number. Please use the manual form below.");
      return;
    }
    if (phoneResult.type === "existing_student") {
      setError("A student with this phone number is already in your student list.");
      return;
    }
    if (selectedBatchIds.length === 0) {
      setError("Please select at least one batch.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await linkProfileAsStudent({
        profileUid: phoneResult.profile.uid,
        batchIds: selectedBatchIds,
        guardianPhone: guardianPhone || null,
        institution: institution || null,
      });
      if (result.success && result.data) {
        if (result.data.alreadyLinked) {
          setError("This student is already in your student list.");
        } else {
          setCreatedInviteCode(result.data.inviteCode);
        }
      } else {
        setError(result.error || "Failed to add student.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add student.");
    } finally {
      setLoading(false);
    }
  }

  // --- Manual Mode Submit (create new student) ---
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (selectedBatchIds.length === 0) {
      setError("Please select at least one batch.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await createStudent({
        fullName,
        phone,
        guardianPhone: manualGuardianPhone || null,
        institution: manualInstitution || null,
        enrolledBatchIds: selectedBatchIds,
      });
      if (result.success && result.data) {
        setCreatedInviteCode(result.data.inviteCode);
      } else {
        setError(result.error || "Failed to add student.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add student.");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!createdInviteCode) return;
    navigator.clipboard.writeText(createdInviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Batch selector (shared between both modes)
  const BatchSelector = (
    <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Enroll in Batches</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Select one or more active batches for this student
        </p>
      </div>
      {batches.length === 0 ? (
        <div className="p-4 text-xs rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#0b0f19]/50">
          No active batches found. Please create a batch first.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {batches.map((batch) => {
            const isSelected = selectedBatchIds.includes(batch.id);
            return (
              <div
                key={batch.id}
                onClick={() => toggleBatchSelect(batch.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/80 shadow-xs"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 hover:bg-slate-100/50"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{batch.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    {batch.subject} — Class {batch.gradeClass}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/tutor/students"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Add New Student
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Search by phone number or create a new student profile
          </p>
        </div>
      </div>

      {/* Success Card */}
      {createdInviteCode ? (
        <div className="p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] text-center space-y-6 shadow-sm animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-extrabold border border-indigo-100">
            🎉
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Student Added!</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              Share this invite code with the student to link their account.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-center gap-4">
            <span className="text-3xl font-mono font-extrabold tracking-widest text-indigo-600">
              {createdInviteCode}
            </span>
            <button
              onClick={copyCode}
              className="p-2.5 rounded-xl bg-white dark:bg-[#131b2e] border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-1.5 text-xs font-bold text-indigo-700 shadow-xs"
            >
              {copied ? <><Check className="w-4 h-4 text-emerald-600" /> Copied!</> : <><Copy className="w-4 h-4 text-indigo-600" /> Copy Code</>}
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-center gap-3">
            <button
              onClick={() => {
                setCreatedInviteCode(null);
                setFullName(""); setPhone(""); setManualGuardianPhone(""); setManualInstitution("");
                setPhoneResult(null); setGuardianPhone(""); setInstitution("");
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Add Another Student
            </button>
            <Link
              href="/tutor/students"
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              View All Students
            </Link>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 text-sm rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium" role="alert">
              {error}
            </div>
          )}

          {/* Mode Toggle Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => { setMode("phone"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                mode === "phone"
                  ? "bg-white dark:bg-[#131b2e] text-indigo-600 shadow-sm border border-slate-200 dark:border-white/10"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Search by Phone
            </button>
            <button
              onClick={() => { setMode("manual"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                mode === "manual"
                  ? "bg-white dark:bg-[#131b2e] text-indigo-600 shadow-sm border border-slate-200 dark:border-white/10"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Create New Student
            </button>
          </div>

          {/* ── PHONE MODE ── */}
          {mode === "phone" && (
            <form
              onSubmit={handlePhoneSubmit}
              className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] space-y-6 shadow-xs"
            >
              <PhoneSearchInput
                label="Student Phone Number"
                placeholder="01XXXXXXXXX"
                onFound={(result) => setPhoneResult(result)}
                onClear={() => setPhoneResult(null)}
              />

              {/* Extra fields if a new profile was found (not yet a student) */}
              {phoneResult?.found && phoneResult.type === "profile" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-4 border-t border-slate-100 dark:border-white/5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Additional Details (Optional)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Guardian Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="01812345678"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        School / College (Optional)
                      </label>
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. Dhaka College"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {BatchSelector}

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Can't find phone number?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="text-indigo-600 hover:underline font-bold"
                  >
                    Use manual form
                  </button>
                </p>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !phoneResult?.found ||
                    phoneResult?.type === "existing_student" ||
                    batches.length === 0
                  }
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {loading ? "Adding..." : "Add Student to Batch"}
                </button>
              </div>
            </form>
          )}

          {/* ── MANUAL MODE ── */}
          {mode === "manual" && (
            <form
              onSubmit={handleManualSubmit}
              className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] space-y-6 shadow-xs"
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Student Full Name
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Samiul Alam"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="student-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Student Phone Number
                    </label>
                    <input
                      id="student-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01712345678"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="guardian-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Guardian Phone (Optional)
                    </label>
                    <input
                      id="guardian-phone"
                      type="tel"
                      value={manualGuardianPhone}
                      onChange={(e) => setManualGuardianPhone(e.target.value)}
                      placeholder="01812345678"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="student-school" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    School / College (Optional)
                  </label>
                  <input
                    id="student-school"
                    type="text"
                    value={manualInstitution}
                    onChange={(e) => setManualInstitution(e.target.value)}
                    placeholder="e.g. Dhaka Residential Model College"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b0f19]/50 text-slate-900 dark:text-slate-100 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {BatchSelector}

              <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3">
                <Link
                  href="/tutor/students"
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || batches.length === 0}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {loading ? "Adding Student..." : "Add Student & Generate Code"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
