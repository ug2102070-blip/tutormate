"use client";

import { useState } from "react";
import useSWR from "swr";
import { Receipt, Plus, TrendingDown, Calendar, Trash2, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { getCenterExpenses, createCenterExpense, deleteCenterExpense } from "@/actions/ownerActions";
import { EmptyState } from "@/components/EmptyState";
import { formatBDT } from "@/lib/utils";

interface Expense {
  id: string;
  title: string;
  category: "Rent" | "Utilities" | "Payroll" | "Marketing" | "Maintenance" | "Other";
  amount: number;
  date: string;
  paidTo?: string;
}

export default function OwnerExpensesPage() {
  const { t } = useLanguage();
  const { data: expenses = [], isLoading, mutate } = useSWR<Expense[]>(
    "owner-center-expenses-list",
    () => getCenterExpenses()
  );

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Expense["category"]>("Utilities");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      await createCenterExpense({
        title,
        category,
        amount: parseFloat(amount),
        paidTo: paidTo || undefined,
      });
      await mutate();
      setTitle("");
      setAmount("");
      setPaidTo("");
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record expense.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("owner.confirmDeleteExpense") || "Are you sure you want to delete this expense record?")) return;
    try {
      await deleteCenterExpense(id);
      await mutate();
    } catch (err: any) {
      alert(err.message || "Failed to delete expense.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <Receipt className="w-6 h-6 text-rose-500" /> {t("owner.expensesTitle") || "Expenses & Payroll"}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {t("owner.expensesDesc") || "Track center operational costs, electricity, rent, marketing, and tutor payouts"}
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg("");
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0"
          style={{ background: "linear-gradient(135deg, rgb(225, 29, 72) 0%, rgb(190, 18, 60) 100%)" }}
        >
          <Plus className="w-4 h-4" /> {t("owner.recordExpenseBtn") || "Record New Expense"}
        </button>
      </div>

      {/* Summary Card */}
      <div
        className="p-5 rounded-2xl border flex items-center justify-between"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            {t("owner.totalExpensesThisMonth") || "Total Center Expenses Recorded"}
          </div>
          <div className="text-2xl font-black text-rose-500">
            {formatBDT(totalExpense)}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

      {/* Expense List */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-20 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
          <div className="h-20 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]" />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          variant="fees"
          title={t("owner.noExpensesTitle") || "No Expenses Recorded"}
          description={t("owner.noExpensesDesc") || "Keep track of center premises rent, utility bills, maintenance, and tutor payouts."}
          action={{
            label: t("owner.recordExpenseBtn") || "Record First Expense",
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all hover:shadow-xs"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-extrabold truncate" style={{ color: "var(--color-text)" }}>
                      {item.title}
                    </h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                    {item.paidTo && <span>{t("owner.paidTo") || "Paid to:"} {item.paidTo}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-black text-rose-500">
                  -{formatBDT(item.amount)}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title={t("owner.deleteExpense") || "Delete expense"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4 animate-scale-in"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <h2 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
              {t("owner.recordCenterExpense") || "Record Center Expense"}
            </h2>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.expenseDescLabel") || "Expense Description"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("owner.expenseDescPlaceholder") || "e.g. Electricity bill or Tutor Salary"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.categoryLabel") || "Category"}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  <option value="Rent">{t("owner.catRent") || "Premises Rent"}</option>
                  <option value="Utilities">{t("owner.catUtilities") || "Electricity & Utility Bills"}</option>
                  <option value="Payroll">{t("owner.catPayroll") || "Tutor & Staff Payroll"}</option>
                  <option value="Marketing">{t("owner.catMarketing") || "Marketing & Banners"}</option>
                  <option value="Maintenance">{t("owner.catMaintenance") || "Maintenance & Repairs"}</option>
                  <option value="Other">{t("owner.catOther") || "Other Expenses"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.amountLabel") || "Amount (৳ BDT)"}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("owner.paidToLabel") || "Paid To / Recipient (Optional)"}
                </label>
                <input
                  type="text"
                  placeholder={t("owner.paidToPlaceholder") || "e.g. DESCO / Landlord / Tutor Name"}
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold rounded-xl border"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5"
                  style={{ background: "rgb(225, 29, 72)" }}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t("owner.saveExpenseBtn") || "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
