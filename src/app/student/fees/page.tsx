"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { formatBDT } from "@/lib/utils";
import type { FeeDoc } from "@/types";
import { CreditCard, Check, AlertCircle } from "lucide-react";

export default function StudentFeesPage() {
  const { user, claims } = useAuth();
  const [fees, setFees] = useState<FeeDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!user || !claims || claims.role !== "student") return;

    async function loadFees() {
      if (!claims || claims.role !== "student") return;
      try {
        const q = query(
          collection(db, "fees"),
          where("studentId", "==", claims.studentDocId)
        );
        const snap = await getDocs(q);
        const list: FeeDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as FeeDoc));
        
        // Sort by year desc, month desc
        list.sort((a, b) => b.year - a.year || b.month - a.month);
        setFees(list);
      } catch {
        // handle error
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          My Payment History
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          View monthly fee statements, payment statuses, and receipts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--color-text-muted)] font-medium">Total Paid</div>
            <div className="text-2xl font-bold text-[var(--color-success)] mt-1">{formatBDT(totalPaid)}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Check className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--color-text-muted)] font-medium">Total Due</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{formatBDT(totalUnpaid)}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Fee History Table */}
      {loading ? (
        <div className="h-64 rounded-2xl animate-shimmer border border-[var(--color-border)]" />
      ) : fees.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
          <CreditCard className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            No fee statements generated yet
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Monthly fee invoices created by your tutor will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] font-semibold">
                <tr>
                  <th className="px-4 py-3">Billing Month</th>
                  <th className="px-4 py-3">Amount Due</th>
                  <th className="px-4 py-3">Amount Paid</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                {fees.map((fee) => (
                  <tr
                    key={fee.id}
                    className="hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {months[fee.month - 1]} {fee.year}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {formatBDT(fee.amountDue)}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--color-success)]">
                      {formatBDT(fee.amountPaid)}
                    </td>
                    <td className="px-4 py-3">
                      {fee.status === "paid" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 uppercase font-mono text-[11px] text-[var(--color-text-muted)]">
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
