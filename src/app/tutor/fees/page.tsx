"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { generateMonthlyFees, updateFeeStatus } from "@/actions/feeActions";
import { formatBDT } from "@/lib/utils";
import type { BatchDoc, StudentDoc, FeeDoc } from "@/types";
import { CreditCard, Sparkles, Check, DollarSign } from "lucide-react";

export default function FeesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, StudentDoc>>({});
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [feesList, setFeesList] = useState<FeeDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const supabase = createClient();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Load batches
  useEffect(() => {
    if (!user) return;
    async function loadBatches() {
      const { data } = await supabase
        .from("batches")
        .select("*")
        .eq("tutor_id", user!.id)
        .eq("is_archived", false);

      if (data) {
        const list: BatchDoc[] = data.map((b) => ({
          id: b.id,
          tutorId: b.tutor_id,
          name: b.name,
          subject: b.subject,
          gradeClass: b.grade_class,
          monthlyFee: Number(b.monthly_fee),
          schedule: b.schedule || [],
          studentCount: b.student_count,
          isArchived: b.is_archived,
          createdAt: b.created_at,
        }));
        setBatches(list);
        if (list.length > 0) {
          setSelectedBatchId(list[0].id);
        }
      }
    }
    loadBatches();
  }, [user]);

  // Load fee ledger & student name map
  const loadFeeLedger = useCallback(async () => {
    if (!user || !selectedBatchId) return;
    setLoading(true);
    setError("");

    try {
      // 1. Load active students map
      const { data: studentList } = await supabase
        .from("students")
        .select("*")
        .eq("tutor_id", user!.id);

      const sMap: Record<string, StudentDoc> = {};
      if (studentList) {
        studentList.forEach((s) => {
          sMap[s.id] = {
            id: s.id,
            tutorId: s.tutor_id,
            authUid: s.auth_uid,
            inviteCode: s.invite_code,
            fullName: s.full_name,
            phone: s.phone,
            guardianPhone: s.guardian_phone,
            institution: s.institution,
            enrolledBatchIds: s.enrolled_batch_ids || [],
            status: s.status,
            createdAt: s.created_at,
          };
        });
      }
      setStudentsMap(sMap);

      // 2. Fetch fees for selected batch, year, month
      const { data: feesData } = await supabase
        .from("fees")
        .select("*")
        .eq("batch_id", selectedBatchId)
        .eq("year", selectedYear)
        .eq("month", selectedMonth);

      if (feesData) {
        setFeesList(
          feesData.map((f) => ({
            id: f.id,
            tutorId: f.tutor_id,
            studentId: f.student_id,
            batchId: f.batch_id,
            year: f.year,
            month: f.month,
            amountDue: Number(f.amount_due),
            amountPaid: Number(f.amount_paid),
            status: f.status,
            paymentMethod: f.payment_method,
            paidAt: f.paid_at,
            updatedAt: f.updated_at,
          }))
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load fee ledger.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBatchId, selectedYear, selectedMonth]);

  useEffect(() => {
    loadFeeLedger();
  }, [loadFeeLedger]);

  async function handleGenerateFees() {
    if (!user || !selectedBatchId) return;
    setGenerating(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await generateMonthlyFees(
        {
          batchId: selectedBatchId,
          year: selectedYear,
          month: selectedMonth,
        },
        user.id
      );

      setSuccessMsg(`Generated ${res.count} new fee ledger entries for ${months[selectedMonth - 1]} ${selectedYear}.`);
      loadFeeLedger();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate monthly fees.";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleTogglePaid(
    fee: FeeDoc,
    newStatus: "paid" | "unpaid",
    method: "cash" | "bkash" | "nagad" | "other" = "cash"
  ) {
    if (!user) return;

    try {
      await updateFeeStatus(
        {
          feeId: fee.id,
          status: newStatus,
          amountPaid: newStatus === "paid" ? fee.amountDue : 0,
          paymentMethod: newStatus === "paid" ? method : null,
        },
        user.id
      );
      loadFeeLedger();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update fee status.";
      setError(msg);
    }
  }

  const filteredFees = feesList.filter((f) =>
    statusFilter === "all" ? true : f.status === statusFilter
  );

  const totalCollected = feesList.reduce((acc, f) => acc + (f.amountPaid || 0), 0);
  const totalDue = feesList.reduce((acc, f) => acc + (f.amountDue || 0), 0);
  const paidCount = feesList.filter((f) => f.status === "paid").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("fees.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {t("dashboard.tutorSubtitle")}
          </p>
        </div>

        <button
          onClick={handleGenerateFees}
          disabled={generating || !selectedBatchId}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? "Generating..." : "Generate Month Invoices"}
        </button>
      </div>

      {successMsg && (
        <div
          className="p-4 text-sm font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 animate-fade-in"
          role="status"
        >
          ✅ {successMsg}
        </div>
      )}

      {error && (
        <div
          className="p-4 text-sm font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex flex-col sm:flex-row items-center gap-4 justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 outline-none"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatBDT(b.monthlyFee)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 outline-none"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {["all", "unpaid", "paid"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all ${
                statusFilter === st
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Header for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Invoiced</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{formatBDT(totalDue)}</div>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Collected</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{formatBDT(totalCollected)}</div>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Paid Students</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">
            {paidCount} / {feesList.length}
          </div>
        </div>
      </div>

      {/* Fee Ledger Table */}
      {loading ? (
        <div className="h-64 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
      ) : filteredFees.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No fee entries for {months[selectedMonth - 1]} {selectedYear}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-sm mx-auto">
            Click &quot;Generate Month Invoices&quot; above to create fee records for enrolled students.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] overflow-hidden shadow-xs">
          {/* Mobile Fee Cards List */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredFees.map((fee) => {
              const student = studentsMap[fee.studentId];
              return (
                <div key={fee.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {student?.fullName || "Student"}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Phone: {student?.phone || "N/A"}
                      </div>
                    </div>
                    {fee.status === "paid" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Unpaid
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100/60 font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Amount Due: <strong className="text-slate-900 dark:text-slate-100">{formatBDT(fee.amountDue)}</strong></span>
                    <span className="text-slate-500 dark:text-slate-400">Paid: <strong className="text-emerald-600">{formatBDT(fee.amountPaid)}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                      {fee.paymentMethod ? `Via ${fee.paymentMethod}` : "No payment record"}
                    </span>

                    {fee.status === "paid" ? (
                      <button
                        onClick={() => handleTogglePaid(fee, "unpaid")}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] hover:bg-slate-100 transition-colors"
                      >
                        Mark Unpaid
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePaid(fee, "paid", "cash")}
                          className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Cash
                        </button>
                        <button
                          onClick={() => handleTogglePaid(fee, "paid", "bkash")}
                          className="px-3 py-2 text-xs font-bold rounded-xl bg-pink-600 text-white hover:bg-pink-700 flex items-center gap-1 shadow-xs"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> bKash
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Fee Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Amount Due</th>
                  <th className="px-4 py-3">Amount Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 dark:text-slate-100 font-medium">
                {filteredFees.map((fee) => {
                  const student = studentsMap[fee.studentId];

                  return (
                    <tr
                      key={fee.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold">
                        {student?.fullName || "Student"}
                        <div className="text-[11px] font-medium text-slate-400">
                          Phone: {student?.phone || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {formatBDT(fee.amountDue)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">
                        {formatBDT(fee.amountPaid)}
                      </td>
                      <td className="px-4 py-3">
                        {fee.status === "paid" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            Paid
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 uppercase font-mono text-[11px] text-slate-400 font-bold">
                        {fee.paymentMethod || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fee.status === "paid" ? (
                          <button
                            onClick={() => handleTogglePaid(fee, "unpaid")}
                            className="px-3 py-1 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] hover:bg-slate-100 transition-colors"
                          >
                            Mark Unpaid
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTogglePaid(fee, "paid", "cash")}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3 h-3" /> Cash
                            </button>
                            <button
                              onClick={() => handleTogglePaid(fee, "paid", "bkash")}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-pink-600 text-white hover:bg-pink-700 flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign className="w-3 h-3" /> bKash
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
