"use client";

import { useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { generateMonthlyFees, updateFeeStatus } from "@/actions/feeActions";
import { formatBDT } from "@/lib/utils";
import type { BatchDoc, StudentDoc, FeeDoc } from "@/types";
import { CreditCard, Sparkles, Check, DollarSign } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const supabase = createClient();

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function FeesPage() {
  const { user, claims } = useAuth();
  const { t } = useLanguage();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const tutorId = (claims && "tutorId" in claims ? (claims as any).tutorId : null) || user?.id;

  // 1. SWR Cache for Batches
  const { data: batches = [] } = useSWR<BatchDoc[]>(
    tutorId ? `tutor-batches-list-${tutorId}` : null,
    async () => {
      const { data } = await supabase
        .from("batches")
        .select("*")
        .eq("tutor_id", tutorId)
        .eq("is_archived", false);

      return (data || []).map((b) => ({
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
    }
  );

  const activeBatchId = selectedBatchId || batches[0]?.id || "";

  // 2. SWR Cache for Students Map and Fees Ledger
  const {
    data: feeData,
    isLoading: loading,
    mutate: mutateFees,
  } = useSWR<{ studentsMap: Record<string, StudentDoc>; feesList: FeeDoc[] }>(
    tutorId && activeBatchId
      ? `tutor-fees-ledger-${activeBatchId}-${selectedYear}-${selectedMonth}`
      : null,
    async () => {
      const [{ data: studentList }, { data: feesData }] = await Promise.all([
        supabase.from("students").select("*").eq("tutor_id", tutorId),
        supabase
          .from("fees")
          .select("*")
          .eq("batch_id", activeBatchId)
          .eq("year", selectedYear)
          .eq("month", selectedMonth),
      ]);

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

      const fList: FeeDoc[] = (feesData || []).map((f) => ({
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
      }));

      return { studentsMap: sMap, feesList: fList };
    }
  );

  const studentsMap = feeData?.studentsMap || {};
  const feesList = feeData?.feesList || [];

  async function handleGenerateFees() {
    if (!activeBatchId) return;
    setGenerating(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await generateMonthlyFees({
        batchId: activeBatchId,
        year: selectedYear,
        month: selectedMonth,
      });

      setSuccessMsg(
        res.count > 0
          ? t("fees.generatedSuccess")
              .replace("{{count}}", res.count.toString())
              .replace("{{month}}", months[selectedMonth - 1])
              .replace("{{year}}", selectedYear.toString())
          : t("fees.alreadyExist")
              .replace("{{month}}", months[selectedMonth - 1])
              .replace("{{year}}", selectedYear.toString())
      );
      mutateFees();
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
    try {
      await updateFeeStatus({
        feeId: fee.id,
        status: newStatus,
        amountPaid: newStatus === "paid" ? fee.amountDue : 0,
        paymentMethod: newStatus === "paid" ? method : null,
      });
      mutateFees();
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
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("fees.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {t("fees.subtitle")}
          </p>
        </div>

        <button
          onClick={handleGenerateFees}
          disabled={generating || !activeBatchId}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? t("fees.generating") : t("fees.generateInvoices")}
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
      <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex flex-col sm:flex-row items-center gap-4 justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t("fees.batchFilter")}
            </label>
            <select
              value={activeBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 outline-none"
            >
              {batches.length === 0 && (
                <option value="">No batches available</option>
              )}
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatBDT(b.monthlyFee)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t("fees.monthFilter")}
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 outline-none"
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
              {t("fees.yearFilter")}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 outline-none"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
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
              className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all ${
                statusFilter === st
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {st === "all" ? t("common.all") : st === "paid" ? t("fees.paidStatus") : t("fees.unpaidStatus")}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Header for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t("fees.totalInvoiced")}</div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{formatBDT(totalDue)}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t("fees.totalCollected")}</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{formatBDT(totalCollected)}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t("fees.paidStudents")}</div>
          <div className="text-xl font-extrabold text-indigo-600 mt-0.5">
            {paidCount} / {feesList.length}
          </div>
        </div>
      </div>

      {/* Fee Ledger Table */}
      {loading ? (
        <div className="h-48 rounded-xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
      ) : filteredFees.length === 0 ? (
        <EmptyState
          variant="fees"
          title={t("fees.noFeesTitle").replace("{{month}}", months[selectedMonth - 1]).replace("{{year}}", selectedYear.toString())}
          description={t("fees.noFeesDesc")}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] overflow-hidden shadow-xs">
          {/* Mobile Fee Cards List */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredFees.map((fee) => {
              const student = studentsMap[fee.studentId];
              return (
                <div key={fee.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {student?.fullName || t("fees.studentPlaceholder")}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("fees.phonePrefix")}{student?.phone || t("fees.notAvailable")}
                      </div>
                    </div>
                    {fee.status === "paid" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {t("fees.paidStatus")}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {t("fees.unpaidStatus")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100/60 font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{t("fees.amountDue")}<strong className="text-slate-900 dark:text-slate-100">{formatBDT(fee.amountDue)}</strong></span>
                    <span className="text-slate-500 dark:text-slate-400">{t("fees.paidAmount")}<strong className="text-emerald-600">{formatBDT(fee.amountPaid)}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                      {fee.paymentMethod ? t("fees.viaPaymentMethod").replace("{{method}}", fee.paymentMethod) : t("fees.noPaymentRecord")}
                    </span>

                    {fee.status === "paid" ? (
                      <button
                        onClick={() => handleTogglePaid(fee, "unpaid")}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] hover:bg-slate-100 transition-colors"
                      >
                        {t("fees.markUnpaid")}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePaid(fee, "paid", "cash")}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3 h-3" /> {t("fees.cash")}
                        </button>
                        <button
                          onClick={() => handleTogglePaid(fee, "paid", "bkash")}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-pink-600 text-white hover:bg-pink-700 flex items-center gap-1 shadow-xs"
                        >
                          <DollarSign className="w-3 h-3" /> {t("fees.bKash")}
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
                  <th className="px-4 py-2.5">{t("fees.tableStudentName")}</th>
                  <th className="px-4 py-2.5">{t("fees.tableAmountDue")}</th>
                  <th className="px-4 py-2.5">{t("fees.tableAmountPaid")}</th>
                  <th className="px-4 py-2.5">{t("fees.tableStatus")}</th>
                  <th className="px-4 py-2.5">{t("fees.tablePaymentMethod")}</th>
                  <th className="px-4 py-2.5 text-right">{t("fees.tableActions")}</th>
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
                      <td className="px-4 py-2 font-bold">
                        {student?.fullName || t("fees.studentPlaceholder")}
                        <div className="text-[11px] font-medium text-slate-400">
                          {t("fees.phonePrefix")}{student?.phone || t("fees.notAvailable")}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-bold">
                        {formatBDT(fee.amountDue)}
                      </td>
                      <td className="px-4 py-2 font-bold text-emerald-600">
                        {formatBDT(fee.amountPaid)}
                      </td>
                      <td className="px-4 py-2">
                        {fee.status === "paid" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {t("fees.paidStatus")}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {t("fees.unpaidStatus")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 uppercase font-mono text-[11px] text-slate-400 font-bold">
                        {fee.paymentMethod || t("fees.tableEmpty")}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {fee.status === "paid" ? (
                          <button
                            onClick={() => handleTogglePaid(fee, "unpaid")}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] hover:bg-slate-100 transition-colors"
                          >
                            {t("fees.markUnpaid")}
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTogglePaid(fee, "paid", "cash")}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3 h-3" /> {t("fees.cash")}
                            </button>
                            <button
                              onClick={() => handleTogglePaid(fee, "paid", "bkash")}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-pink-600 text-white hover:bg-pink-700 flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign className="w-3 h-3" /> {t("fees.bKash")}
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
