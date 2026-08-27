"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAcademicYear } from "@/context/AcademicYearContext";
import {
  FolderArchive,
  Upload,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";

export default function StudentDocumentsVaultPage() {
  const { selectedYear } = useAcademicYear();

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const documents = [
    {
      id: "doc-1",
      name: "Birth_Certificate_AliKhan.pdf",
      student: "Ali Khan",
      class: "Class 1-A",
      category: "Birth Certificate",
      size: "1.2 MB",
      uploaded: "Aug 14, 2026",
      uploadedBy: "Ayesha Rahman",
    },
    {
      id: "doc-2",
      name: "Previous_Marksheet_UsmanTariq.pdf",
      student: "Usman Tariq",
      class: "Class 1-A",
      category: "Previous Marksheet",
      size: "2.4 MB",
      uploaded: "Aug 14, 2026",
      uploadedBy: "Ayesha Rahman",
    },
  ];

  const filteredDocs = documents.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.student.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = classFilter === "all" || d.class === classFilter;
    const matchCat = categoryFilter === "all" || d.category === categoryFilter;
    return matchSearch && matchClass && matchCat;
  });

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
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Documents</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Student Documents
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Secure offline admission records, certificates and student files ({selectedYear.name}).
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="p-3 rounded-2xl border flex flex-col lg:flex-row items-center justify-between gap-3"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search document, student name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-200 outline-hidden"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-300 outline-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="all">All classes</option>
            <option value="Class 1-A">Class 1-A</option>
            <option value="Class 2-A">Class 2-A</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-300 outline-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="all">All categories</option>
            <option value="Birth Certificate">Birth Certificate</option>
            <option value="Previous Marksheet">Previous Marksheet</option>
            <option value="Transfer Certificate">Transfer Certificate</option>
          </select>
        </div>
      </div>

      {/* Security Storage Banner */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100">Secure local storage.</span>{" "}
          Supported: PDF, images, Word, Excel and text files up to 10 MB.
        </div>
      </div>

      {/* Documents Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
              <tr>
                <th className="px-5 py-3.5">Document</th>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Class</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Size</th>
                <th className="px-5 py-3.5">Uploaded</th>
                <th className="px-5 py-3.5">Uploaded By</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredDocs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs">
                        {d.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold">{d.student}</td>
                  <td className="px-5 py-4 text-slate-500">{d.class}</td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {d.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{d.size}</td>
                  <td className="px-5 py-4 text-slate-500">{d.uploaded}</td>
                  <td className="px-5 py-4 text-slate-500">{d.uploadedBy}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <button className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
