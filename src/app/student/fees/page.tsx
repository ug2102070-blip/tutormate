"use client";

import { useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { formatBDT } from "@/lib/utils";
import type { FeeDoc } from "@/types";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Printer,
  XCircle,
} from "lucide-react";
import { verifyPaymentTransaction } from "@/actions/paymentActions";

const supabase = createClient();

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function StudentFeesPage() {
  const { user, claims } = useAuth();
  const { t } = useLanguage();
  const [selectedFee, setSelectedFee] = useState<FeeDoc | null>(null);
  const [gateway, setGateway] = useState<"bkash" | "nagad">("bkash");
  const [trxID, setTrxID] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptFee, setReceiptFee] = useState<FeeDoc | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const studentDocId = claims?.role === "student" ? claims.studentDocId : "";

  const {
    data: fees = [],
    isLoading: loading,
    mutate: mutateFees,
  } = useSWR<FeeDoc[]>(
    user ? `student-fees-${user.id}-${studentDocId}` : null,
    async () => {
      let resolvedStudentDocId = studentDocId;
      if (!resolvedStudentDocId) {
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("auth_uid", user!.id)
          .maybeSingle();
        if (student) resolvedStudentDocId = student.id;
      }

      if (!resolvedStudentDocId) return [];

      const { data: feesData } = await supabase
        .from("fees")
        .select("*")
        .eq("student_id", resolvedStudentDocId);

      const list: FeeDoc[] = (feesData || []).map((f) => ({
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

      return list.sort((a, b) => b.year - a.year || b.month - a.month);
    },
    { dedupingInterval: 30_000 }
  );

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenPaymentModal = (fee: FeeDoc, method: "bkash" | "nagad") => {
    setSelectedFee(fee);
    setGateway(method);
    const suffix = fee.id.slice(0, 6).toUpperCase();
    setTrxID(`TRX-${method.toUpperCase()}-${suffix}`);
    setIsModalOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;

    setActionLoading(true);
    const res = await verifyPaymentTransaction(selectedFee.id, trxID, gateway);
    if (res.success) {
      showToast(`Payment successfully completed via ${gateway.toUpperCase()}! 🎉`);
      setIsModalOpen(false);
      mutateFees();
    } else {
      showToast(res.error || "Payment verification failed", "error");
    }
    setActionLoading(false);
  };

  const totalPaid = fees.reduce((acc, f) => acc + (f.amountPaid || 0), 0);
  const totalUnpaid = fees
    .filter((f) => f.status === "unpaid")
    .reduce((acc, f) => acc + (f.amountDue || 0), 0);
  const paidCount = fees.filter((f) => f.status === "paid").length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 text-sm font-semibold transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            {t("fees.studentTitle")}
          </h1>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("fees.studentSubtitle") || "Monthly fee statements & instant bKash / Nagad payment portal"}
          </p>
        </div>

        <button
          onClick={() => mutateFees()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className="p-3.5 rounded-xl flex items-center gap-3"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(16,185,129,0.15)" }}
          >
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("fees.totalPaid")}
            </div>
            <div
              className="text-xl font-extrabold tracking-tight"
              style={{ color: "var(--color-success)" }}
            >
              {formatBDT(totalPaid)}
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-xl flex items-center gap-3"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: totalUnpaid > 0 ? "rgba(239,68,68,0.15)" : "var(--color-bg-tertiary)",
            }}
          >
            <AlertCircle
              className="w-4 h-4"
              style={{ color: totalUnpaid > 0 ? "var(--color-error)" : "var(--color-text-muted)" }}
            />
          </div>
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: totalUnpaid > 0 ? "var(--color-error)" : "var(--color-text-muted)" }}
            >
              {t("fees.totalUnpaid")}
            </div>
            <div
              className="text-xl font-extrabold tracking-tight"
              style={{ color: totalUnpaid > 0 ? "var(--color-error)" : "var(--color-text)" }}
            >
              {formatBDT(totalUnpaid)}
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-xl flex items-center gap-3"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--color-primary-50)" }}
          >
            <TrendingUp className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("fees.monthsSettled") || "Months Settled"}
            </div>
            <div
              className="text-xl font-extrabold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              {paidCount} / {fees.length}
            </div>
          </div>
        </div>
      </div>

      {/* Fee Statements List */}
      {loading ? (
        <div
          className="h-64 rounded-xl animate-shimmer"
          style={{ border: "1px solid var(--color-border)" }}
        />
      ) : fees.length === 0 ? (
        <div
          className="py-12 text-center border border-dashed rounded-xl"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <CreditCard
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: "var(--color-text-muted)" }}
          />
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {t("fees.noStatements") || "No fee statements yet"}
          </h3>
          <p className="text-[11px] mt-1 max-w-sm mx-auto" style={{ color: "var(--color-text-muted)" }}>
            {t("fees.noStatementsDesc") || "Monthly invoices from your tutor will appear here."}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                style={{
                  background: "var(--color-bg-secondary)",
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">{t("fees.billingMonth") || "Billing Month"}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{t("fees.amountDue") || "Amount Due"}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{t("fees.amountPaid") || "Amount Paid"}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{t("fees.status") || "Status"}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{t("fees.paymentMethod") || "Payment Method"}</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">{t("common.actions") || "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {fees.map((fee) => {
                  const isPaid = fee.status === "paid";

                  return (
                    <tr key={fee.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="px-3.5 py-2.5 font-bold" style={{ color: "var(--color-text)" }}>
                        {months[fee.month - 1]} {fee.year}
                      </td>

                      <td className="px-3.5 py-2.5 font-bold" style={{ color: "var(--color-text)" }}>
                        {formatBDT(fee.amountDue)}
                      </td>

                      <td className="px-3.5 py-2.5 font-bold" style={{ color: "var(--color-success)" }}>
                        {formatBDT(fee.amountPaid)}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {isPaid ? `✓ ${t("fees.paid") || "Paid"}` : `✗ ${t("fees.unpaid") || "Unpaid"}`}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 font-bold uppercase text-[11px]">
                        {fee.paymentMethod ? (
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              fee.paymentMethod === "bkash"
                                ? "bg-pink-500/10 text-pink-600 border border-pink-500/30"
                                : fee.paymentMethod === "nagad"
                                ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                                : "bg-gray-500/10 text-gray-600"
                            }`}
                          >
                            {fee.paymentMethod}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-right">
                        {isPaid ? (
                          <button
                            onClick={() => setReceiptFee(fee)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 ml-auto hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            <Printer className="w-3.5 h-3.5" /> {t("fees.receipt") || "Receipt"}
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPaymentModal(fee, "bkash")}
                              className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-pink-600 hover:bg-pink-700 text-white shadow-sm transition-all flex items-center gap-1"
                            >
                              bKash 🌸
                            </button>

                            <button
                              onClick={() => handleOpenPaymentModal(fee, "nagad")}
                              className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all flex items-center gap-1"
                            >
                              Nagad 🟠
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

      {/* MFS Checkout & Verification Modal */}
      {isModalOpen && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleConfirmPayment}
            className="w-full max-w-sm rounded-xl border p-5 space-y-4 shadow-2xl"
            style={{
              background: "var(--color-card-bg)",
              borderColor: "var(--color-card-border)",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-2">
                <span
                  className={`p-1.5 rounded-lg text-white font-bold text-[10px] ${
                    gateway === "bkash" ? "bg-pink-600" : "bg-orange-600"
                  }`}
                >
                  {gateway.toUpperCase()}
                </span>
                <div>
                  <h3 className="text-sm font-extrabold">{t("fees.checkoutTitle") || "Instant MFS Checkout"}</h3>
                  <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {months[selectedFee.month - 1]} {selectedFee.year} {t("fees.feeStatement") || "Fee Statement"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Merchant Details Box */}
            <div className="p-3.5 rounded-lg bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-gray-500">{t("fees.merchantAccount") || "Merchant Account:"}</span>
                <span className="font-bold">{t("fees.tutorMateCoaching") || "TutorMate Coaching Portal"}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-gray-500">{t("fees.invoiceAmount") || "Invoice Amount:"}</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatBDT(selectedFee.amountDue)}
                </span>
              </div>
            </div>

            {/* TrxID Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-gray-400">
                {t("fees.trxIdLabel") || "Transaction TrxID / PIN Reference"}
              </label>
              <input
                type="text"
                required
                value={trxID}
                onChange={(e) => setTrxID(e.target.value)}
                placeholder="e.g. TRX-BKASH-948102"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
              <p className="text-[10px] text-gray-500 font-medium leading-tight pt-0.5">
                {t("fees.simulationDesc") || "Simulation Mode: TrxID auto-generated. Click below to verify & generate receipt."}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-2 text-[11px] font-semibold rounded-lg border hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: "var(--color-border)" }}
              >
                {t("common.cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className={`px-4 py-2 text-[11px] font-extrabold rounded-lg text-white shadow-md flex items-center gap-1.5 ${
                  gateway === "bkash" ? "bg-pink-600 hover:bg-pink-700" : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {t("fees.confirmPayment") || "Confirm & Verify Payment"} <CheckCircle2 className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {receiptFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-xl border p-5 space-y-4 shadow-2xl bg-white text-slate-900"
          >
            {/* Receipt Header */}
            <div className="text-center border-b pb-3 space-y-1">
              <div className="inline-flex p-1.5 rounded-lg bg-emerald-100 text-emerald-600 mb-1">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold tracking-tight">{t("fees.receiptTitle") || "TutorMate Payment Receipt"}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{t("fees.receiptSubtitle") || "Official Digital Fee Statement Confirmation"}</p>
            </div>

            {/* Receipt Details */}
            <div className="space-y-2.5 text-[11px] font-medium border-b pb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("fees.statementMonth") || "Statement Month:"}</span>
                <span className="font-bold text-slate-900">
                  {months[receiptFee.month - 1]} {receiptFee.year}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("fees.amountPaid") || "Amount Paid:"}</span>
                <span className="font-extrabold text-emerald-600 text-xs">
                  {formatBDT(receiptFee.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("fees.paymentMethod") || "Payment Gateway:"}</span>
                <span className="font-bold uppercase text-slate-800">{receiptFee.paymentMethod || "MFS"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("fees.settledTimestamp") || "Settled Timestamp:"}</span>
                <span className="font-mono text-slate-700">
                  {receiptFee.paidAt ? new Date(receiptFee.paidAt).toLocaleDateString() : t("fees.instant") || "Instant"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold">
              <span>{t("fees.verifiedBy") || "Verified by Supabase Engine"}</span>
              <span>{t("fees.statusConfirmed") || "Status: CONFIRMED"}</span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReceiptFee(null)}
                className="w-full py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all"
              >
                {t("common.close") || "Close Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
