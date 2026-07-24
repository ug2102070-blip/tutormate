"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { createStudent } from "@/actions/tutorStudentActions";
import { generateInviteCode } from "@/lib/utils";
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
      snap.forEach((doc) => list.push({ ...doc.data(), id: doc.id } as BatchDoc));
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
      } catch {
        // Fallback: Save student directly via Client SDK if Server Action Admin SDK key is missing
        const inviteCode = generateInviteCode(8);
        const studentRef = doc(collection(db, "students"));
        await setDoc(studentRef, {
          id: studentRef.id,
          tutorId: user.uid,
          authUid: null,
          inviteCode,
          fullName,
          phone,
          guardianPhone: guardianPhone || null,
          institution: institution || null,
          enrolledBatchIds: selectedBatchIds,
          status: "active",
          createdAt: serverTimestamp(),
        });

        for (const batchId of selectedBatchIds) {
          const batchRef = doc(db, "batches", batchId);
          await updateDoc(batchRef, {
            studentCount: increment(1),
          }).catch(() => {});
        }

        const tutorRef = doc(db, "tutors", user.uid);
        await updateDoc(tutorRef, {
          "stats.totalStudents": increment(1),
        }).catch(() => {
          setDoc(tutorRef, { stats: { totalStudents: 1 } }, { merge: true });
        });

        setCreatedInviteCode(inviteCode);
      }
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
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Add New Student
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Register a student profile and generate an invite code for self-registration
          </p>
        </div>
      </div>

      {/* Success Modal Card after Creation */}
      {createdInviteCode ? (
        <div className="p-8 rounded-2xl border border-slate-200 bg-white text-center space-y-6 shadow-sm animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-extrabold border border-indigo-100">
            🎉
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Student Profile Created!
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
              Give this unique invite code to <strong className="text-slate-900">{fullName}</strong> so they can register their account.
            </p>
          </div>

          {/* Invite Code Badge Box */}
          <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-center gap-4">
            <span className="text-3xl font-mono font-extrabold tracking-widest text-indigo-600">
              {createdInviteCode}
            </span>
            <button
              onClick={copyCode}
              className="p-2.5 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-1.5 text-xs font-bold text-indigo-700 shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-indigo-600" /> Copy Code
                </>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-center gap-3">
            <button
              onClick={() => {
                setCreatedInviteCode(null);
                setFullName("");
                setPhone("");
                setGuardianPhone("");
                setInstitution("");
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
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
            <div
              className="p-4 text-sm rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white space-y-6 shadow-xs"
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="student-name"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
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
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="student-phone"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
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
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guardian-phone"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Guardian Phone Number (Optional)
                  </label>
                  <input
                    id="guardian-phone"
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="01812345678"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-school"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  School / College (Optional)
                </label>
                <input
                  id="student-school"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Dhaka Residential Model College"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Batch Enrollment Selection */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Enroll in Batches
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select one or more active batches for this student
                </p>
              </div>

              {batches.length === 0 ? (
                <div className="p-4 text-xs rounded-xl border border-dashed border-slate-200 text-slate-500 bg-slate-50/50">
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
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {batch.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
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

            {/* Form Footer */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/tutor/students"
                className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
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
        </>
      )}
    </div>
  );
}
