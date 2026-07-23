"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { createStudent } from "@/actions/tutorStudentActions";
import type { BatchDoc } from "@/types";
import { ArrowLeft, Copy, Check } from "lucide-react";

export default function AddStudentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as BatchDoc));
      setBatches(list);
      if (list.length > 0) {
        setSelectedBatchIds([list[0].id]);
      }
    }
    loadBatches();
  }, [user]);

  function toggleBatchSelect(batchId: string) {
    if (selectedBatchIds.includes(batchId)) {
      setSelectedBatchIds(selectedBatchIds.filter((id) => id !== batchId));
    } else {
      setSelectedBatchIds([...selectedBatchIds, batchId]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (selectedBatchIds.length === 0) {
      setError("Please select at least one batch.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const result = await createStudent(
        {
          fullName,
          phone,
          guardianPhone: guardianPhone || null,
          institution: institution || null,
          enrolledBatchIds: selectedBatchIds,
        },
        token
      );

      setCreatedInviteCode(result.inviteCode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add student.";
      setError(msg);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/tutor/students"
          className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Add New Student
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Register a student profile and generate an invite code for self-registration
          </p>
        </div>
      </div>

      {/* Success Modal Card after Creation */}
      {createdInviteCode ? (
        <div className="p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-6 shadow-md animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)] flex items-center justify-center mx-auto text-xl font-bold">
            🎉
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Student Profile Created!
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Give this unique invite code to <strong className="text-[var(--color-text)]">{fullName}</strong> so they can register their account.
            </p>
          </div>

          {/* Invite Code Badge Box */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-center gap-3">
            <span className="text-2xl font-mono font-bold tracking-widest text-[var(--color-primary)]">
              {createdInviteCode}
            </span>
            <button
              onClick={copyCode}
              className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[var(--color-success)]" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" /> Copy
                </>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] flex justify-center gap-3">
            <button
              onClick={() => {
                setCreatedInviteCode(null);
                setFullName("");
                setPhone("");
                setGuardianPhone("");
                setInstitution("");
              }}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
            >
              Add Another Student
            </button>
            <Link
              href="/tutor/students"
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
              }}
            >
              View All Students
            </Link>
          </div>
        </div>
      ) : (
        <>
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

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] space-y-6 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="student-name"
                  className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
                >
                  Student Full Name
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Samiul Alam"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="student-phone"
                    className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
                  >
                    Student Phone Number
                  </label>
                  <input
                    id="student-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01712345678"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guardian-phone"
                    className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
                  >
                    Guardian Phone Number (Optional)
                  </label>
                  <input
                    id="guardian-phone"
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="01812345678"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-school"
                  className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]"
                >
                  School / College (Optional)
                </label>
                <input
                  id="student-school"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Dhaka Residential Model College"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
                />
              </div>
            </div>

            {/* Batch Enrollment Selection */}
            <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  Enroll in Batches
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Select one or more active batches for this student
                </p>
              </div>

              {batches.length === 0 ? (
                <div className="p-3 text-xs rounded-lg border border-dashed text-[var(--color-text-muted)] border-[var(--color-border)]">
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
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-50)]"
                            : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-[var(--color-text)]">
                            {batch.name}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-muted)]">
                            {batch.subject} — Class {batch.gradeClass}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-[var(--color-primary)]"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form Footer */}
            <div className="pt-4 border-t border-[var(--color-border)] flex justify-end gap-3">
              <Link
                href="/tutor/students"
                className="px-4 py-2.5 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || batches.length === 0}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                }}
              >
                {loading ? "Adding Student..." : "Add Student & Generate Code"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
