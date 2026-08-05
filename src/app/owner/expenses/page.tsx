"use client";

import { useState } from "react";
import { Receipt, Plus, TrendingDown, DollarSign, Calendar, Tag, Trash2 } from "lucide-react";

interface Expense {
  id: string;
  title: string;
  category: "Rent" | "Utilities" | "Payroll" | "Marketing" | "Other";
  amount: number;
  date: string;
  paidTo?: string;
}

export default function OwnerExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: "1",
      title: "Coaching Premises Monthly Rent",
      category: "Rent",
      amount: 25000,
      date: "2026-07-01",
      paidTo: "Landlord (Dhanmondi Branch)",
    },
    {
      id: "2",
      title: "Electricity & AC Bill - June",
      category: "Utilities",
      amount: 6400,
      date: "2026-07-05",
      paidTo: "DESCO",
    },
    {
      id: "3",
      title: "Tutor Revenue Payout - Faruk Hasan",
      category: "Payroll",
      amount: 18500,
      date: "2026-07-10",
      paidTo: "Faruk Hasan",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Expense["category"]>("Utilities");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      title,
      category,
      amount: parseFloat(amount),
      date: new Date().toISOString().split("T")[0],
      paidTo: paidTo || undefined,
    };

    setExpenses([newExpense, ...expenses]);
    setTitle("");
    setAmount("");
    setPaidTo("");
    setShowModal(false);
  }

  function handleDelete(id: string) {
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <Receipt className="w-6 h-6 text-rose-500" /> Expenses & Payroll
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Track center operational costs, electricity, rent, marketing, and tutor payouts
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0"
          style={{ background: "linear-gradient(135deg, rgb(225, 29, 72) 0%, rgb(190, 18, 60) 100%)" }}
        >
          <Plus className="w-4 h-4" /> Record New Expense
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
            Total Center Expenses This Month
          </div>
          <div className="text-2xl font-black text-rose-500">
            ৳{totalExpense.toLocaleString()}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

      {/* Expense List */}
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
                  {item.paidTo && <span>Paid to: {item.paidTo}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-black text-rose-500">
                -৳{item.amount.toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Delete expense"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4 animate-scale-in"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <h2 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
              Record Center Expense
            </h2>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Expense Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity bill or Tutor Salary"
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
                  Category
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
                  <option value="Rent">Premises Rent</option>
                  <option value="Utilities">Electricity & Utility Bills</option>
                  <option value="Payroll">Tutor & Staff Payroll</option>
                  <option value="Marketing">Marketing & Banners</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Amount (৳ BDT)
                </label>
                <input
                  type="number"
                  required
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
                  Paid To / Recipient (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DESCO / Landlord / Tutor Name"
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
                  className="px-4 py-2 text-xs font-bold rounded-xl border"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl"
                  style={{ background: "rgb(225, 29, 72)" }}
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
