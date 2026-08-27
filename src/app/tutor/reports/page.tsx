"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAcademicYear } from "@/context/AcademicYearContext";
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  Building,
} from "lucide-react";

export default function ReportsCenterPage() {
  const { selectedYear } = useAcademicYear();

  const [reportType, setReportType] = useState("student");
  const [classFilter, setClassFilter] = useState("all");
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");
  const [generated, setGenerated] = useState(true);

  const reportRecords = [
    { id: "STU-2026-0001", name: "Ali Khan", class: "Class 1-A", roll: "01", guardian: "Khan Sahib", phone: "0300 5550000", status: "active" },
    { id: "STU-2026-0007", name: "Usman Tariq", class: "Class 1-A", roll: "07", guardian: "Tariq Sahib", phone: "0300 5550000", status: "active" },
    { id: "STU-2026-0002", name: "Sara Ahmed", class: "Class 2-A", roll: "02", guardian: "Ahmed Sahib", phone: "0300 5550000", status: "active" },
    { id: "STU-2026-0003", name: "Bilal Hassan", class: "Class 3-A", roll: "09", guardian: "Hassan Sahib", phone: "0300 5550000", status: "active" },
    { id: "STU-2026-0004", name: "Amina Siddiqui", class: "Class 4-A", roll: "04", guardian: "Siddiqui Sahib", phone: "0300 5550000", status: "active" },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = "Student ID,Student Name,Class,Roll,Guardian,Phone,Status\n";
    const rows = reportRecords
      .map(
        (r) =>
          `"${r.id}","${r.name}","${r.class}","${r.roll}","${r.guardian}","${r.phone}","${r.status}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutormate-${reportType}-report.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/tutor/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Reports Center
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Generate, filter, print and export school records for {selectedYear.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Print</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters Bar */}
      <div
        className="p-4 rounded-2xl border flex flex-col lg:flex-row items-end gap-3"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="w-full lg:w-48">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-bold"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="student">Student Report</option>
            <option value="attendance">Attendance Report</option>
            <option value="fees">Fee Ledger Report</option>
            <option value="exams">Exam Summary Report</option>
          </select>
        </div>

        <div className="w-full lg:w-44">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Class & Section</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-bold"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="all">All classes</option>
            <option value="class-1-a">Class 1-A</option>
            <option value="class-2-a">Class 2-A</option>
          </select>
        </div>

        <div className="w-full lg:w-36">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div className="w-full lg:w-36">
          <label className="block text-[11px] font-bold text-slate-400 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <button
          onClick={() => setGenerated(true)}
          className="w-full lg:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 self-end"
        >
          Generate Report
        </button>
      </div>

      {/* Generated Report Preview Sheet */}
      {generated && (
        <div
          className="p-8 rounded-2xl border space-y-6 print:border-none print:shadow-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          style={{
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Institutional Report Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                SP
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight">
                  TutorMate Academy
                </h2>
                <p className="text-[11px] text-slate-400">Institutional School Management Suite</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-sm font-black uppercase text-blue-600 dark:text-blue-400">
                Student Report
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Academic Year {selectedYear.name} | Generated {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-400">
            {reportRecords.length} records in this report
          </div>

          {/* Report Data Table */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Roll No.</th>
                  <th className="px-4 py-3">Guardian</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {reportRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{r.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">{r.class}</td>
                    <td className="px-4 py-3 font-bold">{r.roll}</td>
                    <td className="px-4 py-3 text-slate-500">{r.guardian}</td>
                    <td className="px-4 py-3 text-slate-500">{r.phone}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {r.status}
                      </span>
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
