"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatBDT } from "@/lib/utils";
import type { FeeDoc } from "@/types";
import { CreditCard, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

export default function StudentFeesPage() {
  const { user, claims } = useAuth();
  const [fees, setFees] = useState<FeeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadFees() {
      try {
        let studentDocId = claims?.role === "student" ? claims.studentDocId : "";

        if (!studentDocId) {
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("auth_uid", user!.id)
            .maybeSingle();

          if (student) {
            studentDocId = student.id;
          }
        }

        if (studentDocId) {
          const { data: feesData } = await supabase
            .from("fees")
            .select("*")
            .eq("student_id", studentDocId);

          if (feesData) {
            const list: FeeDoc[] = feesData.map((f) => ({
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

            list.sort((a, b) => b.year - a.year || b.month - a.month);
            setFees(list);
          }
        }
      } catch (err) {
        console.error("Error loading fees:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFees();
  }, [user, claims]);

  const totalPaid = fees.reduce((acc, f) => acc + (f.amountPaid || 0), 0);
  const totalUnpaid = fees
    .filter((f) => f.status === "unpaid")
    .reduce((acc, f) => acc + (f.amountDue || 0), 0);
  const paidCount = fees.filter((f) => f.status === "paid").length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          Payment History
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          Monthly fee statements and payment status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Paid */}
        <div
          className="p-4 rounded-2xl flex items-center gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.06) 100%)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(16,185,129,0.15)" }}
          >
            <CheckCircle className="w-5 h-5" style={{ color: "var(--color-success)" }} />
          </div>
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-success)" }}
            >
              Total Paid
            </div>
            <div
              className="text-xl font-extrabold tracking-tight"
              style={{ color: "var(--color-success)" }}
            >
              {formatBDT(totalPaid)}
            </div>
          </div>
        </div>

        {/* Total Due */}
        <div
          className="p-4 rounded-2xl flex items-center gap-4"
          style={{
            background: totalUnpaid > 0
              ? "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)"
              : "var(--color-bg-secondary)",
            border: totalUnpaid > 0
              ? "1px solid rgba(239,68,68,0.2)"
              : "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: totalUnpaid > 0 ? "rgba(239,68,68,0.15)" : "var(--color-bg-tertiary)",
            }}
          >
            <AlertCircle
              className="w-5 h-5"
              style={{ color: totalUnpaid > 0 ? "var(--color-error)" : "var(--color-text-muted)" }}
            />
          </div>
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: totalUnpaid > 0 ? "var(--color-error)" : "var(--color-text-muted)" }}
            >
              Total Due
            </div>
            <div
              className="text-xl font-extrabold tracking-tight"
              style={{ color: totalUnpaid > 0 ? "var(--color-error)" : "var(--color-text)" }}
            >
              {formatBDT(totalUnpaid)}
            </div>
          </div>
        </div>

        {/* Paid Count */}
        <div
          className="p-4 rounded-2xl flex items-center gap-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--color-primary-50)" }}
          >
            <TrendingUp className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Months Paid
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

      {/* Fee History */}
      {loading ? (
        <div
          className="h-64 rounded-2xl animate-shimmer"
          style={{ border: "1px solid var(--color-border)" }}
        />
      ) : fees.length === 0 ? (
        <div
          className="py-16 text-center border border-dashed rounded-2xl"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <CreditCard
            className="w-10 h-10 mx-auto mb-3"
            style={{ color: "var(--color-text-muted)" }}
          />
          <h3
            className="text-base font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            No fee statements yet
          </h3>
          <p
            className="text-xs mt-1 max-w-sm mx-auto"
            style={{ color: "var(--color-text-muted)" }}
          >
            Monthly invoices from your tutor will appear here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Mobile Cards */}
          <div className="md:hidden">
            {fees.map((fee, index) => (
              <div
                key={fee.id}
                className="p-4"
                style={{
                  borderBottom:
                    index < fees.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <span
                      className="text-sm font-extrabold"
                      style={{ color: "var(--color-text)" }}
                    >
                      {months[fee.month - 1]} {fee.year}
                    </span>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold border"
                    style={
                      fee.status === "paid"
                        ? {
                            background: "rgba(16,185,129,0.1)",
                            color: "var(--color-success)",
                            borderColor: "rgba(16,185,129,0.25)",
                          }
                        : {
                            background: "rgba(239,68,68,0.1)",
                            color: "var(--color-error)",
                            borderColor: "rgba(239,68,68,0.25)",
                          }
                    }
                  >
                    {fee.status === "paid" ? "✓ Paid" : "✗ Unpaid"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Amount Due:{" "}
                    <strong style={{ color: "var(--color-text)" }}>
                      {formatBDT(fee.amountDue)}
                    </strong>
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Paid:{" "}
                    <strong style={{ color: "var(--color-success)" }}>
                      {formatBDT(fee.amountPaid)}
                    </strong>
                  </span>
                </div>

                {fee.paymentMethod && (
                  <div
                    className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    via {fee.paymentMethod}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                style={{
                  background: "var(--color-bg-secondary)",
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <tr>
                  <th className="px-4 py-3 font-semibold">Billing Month</th>
                  <th className="px-4 py-3 font-semibold">Amount Due</th>
                  <th className="px-4 py-3 font-semibold">Amount Paid</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee, index) => (
                  <tr
                    key={fee.id}
                    style={{
                      borderBottom:
                        index < fees.length - 1
                          ? "1px solid var(--color-border)"
                          : "none",
                      color: "var(--color-text)",
                    }}
                  >
                    <td
                      className="px-4 py-3 font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      {months[fee.month - 1]} {fee.year}
                    </td>
                    <td
                      className="px-4 py-3 font-bold"
                      style={{ color: "var(--color-text)" }}
                    >
                      {formatBDT(fee.amountDue)}
                    </td>
                    <td
                      className="px-4 py-3 font-bold"
                      style={{ color: "var(--color-success)" }}
                    >
                      {formatBDT(fee.amountPaid)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
                        style={
                          fee.status === "paid"
                            ? {
                                background: "rgba(16,185,129,0.1)",
                                color: "var(--color-success)",
                                borderColor: "rgba(16,185,129,0.25)",
                              }
                            : {
                                background: "rgba(239,68,68,0.1)",
                                color: "var(--color-error)",
                                borderColor: "rgba(239,68,68,0.25)",
                              }
                        }
                      >
                        {fee.status === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 uppercase font-mono text-[11px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {fee.paymentMethod || "—"}
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
