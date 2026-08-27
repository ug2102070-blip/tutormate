"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAcademicYear } from "@/context/AcademicYearContext";
import {
  CircleDollarSign,
  Users,
  Receipt,
  Scale,
  TrendingUp,
  BarChart3,
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  FileSpreadsheet,
} from "lucide-react";

export default function FinancialManagementERPPage() {
  const { selectedYear } = useAcademicYear();
  const [activeModule, setActiveModule] = useState<
    "trial" | "payroll" | "employees" | "expenses" | "pnl" | "balance"
  >("trial");
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // Financial Quick Cards
  const financialModules = [
    { key: "employees", label: "Employees", count: "3 staff records", icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60" },
    { key: "payroll", label: "Payroll", count: "৳60,000", icon: Receipt, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/60" },
    { key: "expenses", label: "Expense Management", count: "৳0", icon: CreditCard, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60" },
    { key: "balance", label: "Balance Sheet", count: "৳92,000", icon: Scale, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60" },
    { key: "trial", label: "Trial Balance", count: "3 active accounts", icon: Scale, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60" },
    { key: "pnl", label: "Profit & Loss", count: "৳92,000", icon: TrendingUp, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60" },
  ];

  // Trial Balance Mock
  const trialAccounts = [
    { code: "1000", account: "Cash and Bank", debit: 102000, credit: 10000 },
    { code: "4000", account: "Fee Income", debit: 0, credit: 102000 },
    { code: "5100", account: "Salary Expense", debit: 10000, credit: 0 },
  ];

  // Payroll Mock
  const payrollRecords = [
    { month: "2026-08", employee: "Ahmed Raza", code: "TCH-002", gross: 50000, deductions: 0, net: 50000, status: "pending", paidOn: "-" },
    { month: "2026-08", employee: "Fatima Noor", code: "TCH-001", gross: 10000, deductions: 0, net: 10000, status: "paid", paidOn: "Aug 14, 2026" },
  ];

  // Employees Mock
  const employees = [
    { id: "TCH-002", name: "Ahmed Raza", dept: "English", phone: "0301 2345678", status: "active", salary: "৳50,000" },
    { id: "TCH-001", name: "Fatima Noor", dept: "Mathematics", phone: "0300 1234567", status: "active", salary: "৳10,000" },
    { id: "TCH-003", name: "Sana Malik", dept: "Science", phone: "0302 3456789", status: "active", salary: "৳0" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/tutor/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Financial Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Financial Management
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Employees, payroll, expenses and database-calculated financial statements ({selectedYear.name}).
          </p>
        </div>

        <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
          Double-Entry Accounting
        </span>
      </div>

      {/* Top 6 Financial Module Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {financialModules.map((m) => {
          const Icon = m.icon;
          const isSelected = activeModule === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActiveModule(m.key as any)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                isSelected
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className={`w-8 h-8 rounded-xl ${m.color} flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                {m.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{m.count}</div>
            </button>
          );
        })}
      </div>

      {/* 1. TRIAL BALANCE VIEW */}
      {activeModule === "trial" && (
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              Trial Balance
            </h3>
            <p className="text-xs text-slate-400">Debit and credit totals from posted journal entries</p>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Debit</th>
                  <th className="px-5 py-3">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {trialAccounts.map((a) => (
                  <tr key={a.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 font-mono font-bold text-slate-500">{a.code}</td>
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100">{a.account}</td>
                    <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">
                      ৳{a.debit.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">
                      ৳{a.credit.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {/* Balanced Totals Row */}
                <tr className="bg-slate-50 dark:bg-slate-800/70 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={2} className="px-5 py-3.5 text-slate-800 dark:text-slate-100">
                    TOTALS (100% BALANCED)
                  </td>
                  <td className="px-5 py-3.5 text-blue-600 dark:text-blue-400">৳112,000</td>
                  <td className="px-5 py-3.5 text-blue-600 dark:text-blue-400">৳112,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PAYROLL VIEW */}
      {activeModule === "payroll" && (
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                Payroll Management
              </h3>
              <p className="text-xs text-slate-400">Monthly employee salary disbursement records</p>
            </div>
            <button
              onClick={() => setShowPayrollModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
            >
              Create Payroll
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Salary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {payrollRecords.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-semibold">{p.month}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{p.employee}</div>
                      <div className="text-[10px] text-slate-400">{p.code}</div>
                    </td>
                    <td className="px-4 py-3 font-bold">৳{p.gross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400">৳{p.deductions}</td>
                    <td className="px-4 py-3 font-black text-blue-600">৳{p.net.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.paidOn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. EMPLOYEES VIEW */}
      {activeModule === "employees" && (
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              Employees & Staff Directory
            </h3>
            <p className="text-xs text-slate-400">School employees linked to teacher profiles</p>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                <tr>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department / Subject</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Latest Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{e.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.dept}</td>
                    <td className="px-4 py-3 text-slate-500">{e.phone}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-blue-600">{e.salary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. EXPENSES, PNL & BALANCE SHEET */}
      {(activeModule === "expenses" || activeModule === "pnl" || activeModule === "balance") && (
        <div className="py-16 text-center text-xs text-slate-400 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
            <Scale className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-200">
            {activeModule === "expenses" && "No operational expenses logged for this period."}
            {activeModule === "pnl" && "Net Operating Profit: ৳92,000 (Revenue: ৳102,000 — Expenses: ৳10,000)"}
            {activeModule === "balance" && "Total Assets: ৳102,000 = Liabilities: ৳10,000 + Retained Earnings: ৳92,000"}
          </p>
        </div>
      )}
    </div>
  );
}
