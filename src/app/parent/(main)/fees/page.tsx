"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getParentFees } from "@/actions/parentActions";
import { CreditCard, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid ✓", color: "var(--color-success, #16a34a)", bg: "var(--color-success-bg, #f0fdf4)" },
  unpaid: { label: "Unpaid", color: "var(--color-error, #dc2626)", bg: "var(--color-error-bg, #fef2f2)" },
  partial: { label: "Partial", color: "var(--color-warning, #d97706)", bg: "var(--color-warning-bg, #fffbeb)" },
};

export default function ParentFeesPage() {
  const supabase = createClient();
  const { t, language } = useLanguage();
  const isBn = language === "bn";
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getParentFees();
      setFees(data);
      setLoading(false);
    }
    load();
  }, []);

  const totalDue = fees.reduce((s, f) => s + (f.amountDue || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.amountPaid || 0), 0);
  const totalPending = totalDue - totalPaid;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{t("fees.title") || "Fee History"}</h1>
            <p className="text-xs text-white/70">{t("fees.parentSubtitle") || "Payment records for your child"}</p>
          </div>
        </div>

        {!loading && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t("fees.totalDue") || "Total Due", value: `৳${totalDue}` },
              { label: t("fees.totalPaid") || "Total Paid", value: `৳${totalPaid}` },
              { label: t("fees.pending") || "Pending", value: `৳${totalPending}` },
            ].map((s) => (
              <div key={s.label} className="px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                <p className="text-base font-black text-white">{s.value}</p>
                <p className="text-[11px] text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fee List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : fees.length === 0 ? (
        <div className="text-center py-12 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
          {t("fees.noRecords") || "No fee records found."}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}>
          {fees.map((f, idx) => {
            const sc = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.unpaid;
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 px-4 py-4"
                style={{
                  background: "var(--color-surface)",
                  borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: "var(--color-primary-50)" }}
                >
                  <span className="text-[11px] font-bold" style={{ color: "var(--color-primary)" }}>
                    {MONTH_NAMES[f.month].slice(0, 3)}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    {f.year}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    {MONTH_NAMES[f.month]} {f.year}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {f.batchName || (t("common.class") || "Class")}
                  </p>
                  {f.paidAt && (
                    <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {t("fees.paidOn") || "Paid"} {new Date(f.paidAt).toLocaleDateString(isBn ? "bn-BD" : "en-BD", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    ৳{f.amountPaid}
                    <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                      /{f.amountDue}
                    </span>
                  </p>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sc.bg, color: sc.color }}
                  >
                    {f.status === "paid" ? (t("fees.paid") || "Paid ✓") : f.status === "unpaid" ? (t("fees.unpaid") || "Unpaid") : (t("fees.partial") || "Partial")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
