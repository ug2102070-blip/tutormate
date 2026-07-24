"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { generateMonthlyFees, updateFeeStatus } from "@/actions/feeActions";
import { formatBDT } from "@/lib/utils";
import type { BatchDoc, StudentDoc, FeeDoc } from "@/types";
import { CreditCard, Sparkles, Check, DollarSign } from "lucide-react";

export default function FeesPage() {
  const { user } = useAuth();
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

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Load batches
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
      snap.forEach((d) => list.push({ ...d.data(), id: d.id } as BatchDoc));
      setBatches(list);
      if (list.length > 0) {
        setSelectedBatchId(list[0].id);
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
      // 1. Load active students map for names
      const studentsQuery = query(
        collection(db, "students"),
        where("tutorId", "==", user.uid)
      );
      const studentsSnap = await getDocs(studentsQuery);
      const sMap: Record<string, StudentDoc> = {};
      studentsSnap.forEach((d) => {
        sMap[d.id] = { ...d.data(), id: d.id } as StudentDoc;
      });
      setStudentsMap(sMap);

      // 2. Fetch fees for selected batch, year, month
      const feesQuery = query(
        collection(db, "fees"),
        where("tutorId", "==", user.uid),
        where("batchId", "==", selectedBatchId),
        where("year", "==", selectedYear),
        where("month", "==", selectedMonth)
      );
      const feesSnap = await getDocs(feesQuery);
      const fList: FeeDoc[] = [];
      feesSnap.forEach((d) => fList.push({ ...d.data(), id: d.id } as FeeDoc));
      setFeesList(fList);
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
      const token = await user.getIdToken();
      const res = await generateMonthlyFees(
        {
          batchId: selectedBatchId,
          year: selectedYear,
          month: selectedMonth,
        },
        token
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
      const token = await user.getIdToken();
      await updateFeeStatus(
        {
          feeId: fee.id,
          status: newStatus,
          amountPaid: newStatus === "paid" ? fee.amountDue : 0,
          paymentMethod: newStatus === "paid" ? method : null,
        },
        token
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Monthly Fee Ledger
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Track student fee payments, generate monthly invoices, and record bKash/Nagad/Cash collections
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
          className="p-4 text-sm font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 animate-fade-in"
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
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center gap-4 justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
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
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
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
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
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
                  ? "bg-indigo-50 text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Header for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total Invoiced</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{formatBDT(totalDue)}</div>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total Collected</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{formatBDT(totalCollected)}</div>
        </div>
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Paid Students</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">
            {paidCount} / {feesList.length}
          </div>
        </div>
      </div>

      {/* Fee Ledger Table */}
      {loading ? (
        <div className="h-64 rounded-2xl animate-shimmer border border-slate-200 bg-white" />
      ) : filteredFees.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-slate-200 bg-white shadow-xs">
          <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">
            No fee entries for {months[selectedMonth - 1]} {selectedYear}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
            Click &quot;Generate Month Invoices&quot; above to create fee records for enrolled students.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {/* Mobile Fee Cards List */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredFees.map((fee) => {
              const student = studentsMap[fee.studentId];
              return (
                <div key={fee.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {student?.fullName || "Student"}
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        Phone: {student?.phone || "N/A"}
                      </div>
                    </div>
                    {fee.status === "paid" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Unpaid
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100/60 font-semibold">
                    <span className="text-slate-500">Amount Due: <strong className="text-slate-900">{formatBDT(fee.amountDue)}</strong></span>
                    <span className="text-slate-500">Paid: <strong className="text-emerald-600">{formatBDT(fee.amountPaid)}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                      {fee.paymentMethod ? `Via ${fee.paymentMethod}` : "No payment record"}
                    </span>

                    {fee.status === "paid" ? (
                      <button
                        onClick={() => handleTogglePaid(fee, "unpaid")}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
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
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Amount Due</th>
                  <th className="px-4 py-3">Amount Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
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
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                            className="px-3 py-1 text-[11px] font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
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
