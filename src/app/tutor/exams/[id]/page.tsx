"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getExamDetails, saveExamResults } from "@/actions/examActions";
import { computeExamGrade } from "@/lib/gradeUtils";
import {
  Award,
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Printer,
  Download,
  Search,
  Check,
  TrendingUp,
  UserCheck,
  Percent,
  X,
  FileSpreadsheet,
} from "lucide-react";
import type { ExamDoc, ExamResultDoc } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();
  const [exam, setExam] = useState<ExamDoc | null>(null);
  const [batch, setBatch] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, examId]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await getExamDetails(examId);
      setExam(data.exam);
      setBatch(data.batch);
      setStudents(data.students || []);

      const initialResults: Record<string, any> = {};

      // Initialize with default empty values
      (data.students || []).forEach((s: any) => {
        initialResults[s.id] = {
          studentId: s.id,
          marksObtained: "",
          isAbsent: false,
          remarks: "",
          grade: null,
          position: null,
        };
      });

      // Override with saved results
      (data.results || []).forEach((r: ExamResultDoc) => {
        initialResults[r.studentId] = {
          studentId: r.studentId,
          marksObtained: r.marksObtained !== null ? r.marksObtained : "",
          isAbsent: r.isAbsent,
          remarks: r.remarks || "",
          grade: r.grade,
          position: r.position,
        };
      });

      setResults(initialResults);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load exam details");
    } finally {
      setLoading(false);
    }
  }

  const handleResultChange = (studentId: string, field: string, value: any) => {
    setResults((prev) => {
      const current = prev[studentId] || {};
      const updated = { ...current, [field]: value };

      if (field === "isAbsent" && value === true) {
        updated.marksObtained = "";
        updated.grade = null;
      } else if (field === "marksObtained" && exam) {
        updated.isAbsent = false;
        updated.grade = value !== "" ? computeExamGrade(Number(value), exam.totalMarks) : null;
      }

      return {
        ...prev,
        [studentId]: updated,
      };
    });
  };

  const handleFillAllMax = () => {
    if (!exam) return;
    setResults((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = {
          ...updated[s.id],
          marksObtained: exam.totalMarks,
          isAbsent: false,
          grade: "A+",
        };
      });
      return updated;
    });
  };

  const handleSaveResults = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const formattedResults = Object.values(results).map((r) => ({
        studentId: r.studentId,
        marksObtained: r.isAbsent || r.marksObtained === "" ? null : Number(r.marksObtained),
        isAbsent: r.isAbsent,
        remarks: r.remarks || null,
      }));

      await saveExamResults({
        examId,
        results: formattedResults,
      });

      setSuccessMsg("Exam results saved successfully! Grades and ranks have been calculated.");
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!exam || students.length === 0) return;

    const headers = [
      "Roll / Code",
      "Student Name",
      "Phone",
      "Institution",
      "Status",
      "Marks Obtained",
      "Total Marks",
      "Percentage",
      "Grade",
      "Rank",
      "Remarks",
    ];

    const rows = students.map((st, i) => {
      const r = results[st.id] || {};
      const status = r.isAbsent ? "Absent" : r.marksObtained !== "" ? "Present" : "Not Graded";
      const marks = r.isAbsent ? "AB" : r.marksObtained !== "" ? r.marksObtained : "—";
      const pct =
        !r.isAbsent && r.marksObtained !== "" && exam.totalMarks
          ? `${Math.round((Number(r.marksObtained) / exam.totalMarks) * 100)}%`
          : "—";
      const grade = r.grade || (r.marksObtained !== "" ? computeExamGrade(Number(r.marksObtained), exam.totalMarks) : "—");
      const rank = r.position ? `#${r.position}` : "—";

      return [
        `"${st.invite_code || i + 1}"`,
        `"${st.full_name}"`,
        `"${st.phone || ""}"`,
        `"${st.institution || ""}"`,
        `"${status}"`,
        `"${marks}"`,
        `"${exam.totalMarks}"`,
        `"${pct}"`,
        `"${grade || ""}"`,
        `"${rank}"`,
        `"${r.remarks || ""}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exam.title.replace(/\s+/g, "_")}_Marksheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.institution && s.institution.toLowerCase().includes(q))
    );
  }, [students, searchTerm]);

  // Aggregate Stats
  const evaluatedList = useMemo(() => {
    return Object.values(results).filter((r) => !r.isAbsent && r.marksObtained !== "");
  }, [results]);

  const stats = useMemo(() => {
    if (!exam || evaluatedList.length === 0) {
      return {
        avgPercentage: null,
        highestMarks: null,
        lowestMarks: null,
        passRate: null,
        evaluatedCount: 0,
      };
    }

    const marks = evaluatedList.map((r) => Number(r.marksObtained));
    const sum = marks.reduce((a, b) => a + b, 0);
    const avgScore = sum / marks.length;
    const avgPct = Math.round((avgScore / exam.totalMarks) * 100);
    const passMarks = exam.passMarks || 40;
    const passingCount = evaluatedList.filter((r) => Number(r.marksObtained) >= passMarks).length;
    const passRate = Math.round((passingCount / evaluatedList.length) * 100);

    return {
      avgPercentage: `${avgPct}%`,
      highestMarks: Math.max(...marks),
      lowestMarks: Math.min(...marks),
      passRate: `${passRate}%`,
      evaluatedCount: evaluatedList.length,
    };
  }, [exam, evaluatedList]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs">Loading gradebook details...</p>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl">
        <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error Loading Examination
        </h2>
        <p className="text-rose-600 dark:text-rose-400 text-xs">{error}</p>
        <Link href="/tutor/exams" className="text-blue-600 font-bold text-xs hover:underline mt-4 inline-block">
          &larr; Back to Exams
        </Link>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            href="/tutor/exams"
            className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 w-fit mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Exams
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {exam.title}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {batch?.name || "Batch"} {batch?.gradeClass ? `(${batch.gradeClass})` : ""} &bull;{" "}
            {exam.subject || "General Subject"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Marksheet</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleSaveResults}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save All Results</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b pb-4 mb-6">
        <h1 className="text-2xl font-black">{exam.title} — Marksheet</h1>
        <p className="text-xs text-slate-600">
          Batch: {batch?.name} | Subject: {exam.subject || "All Subjects"} | Date:{" "}
          {new Date(exam.examDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} | Max Marks:{" "}
          {exam.totalMarks} | Pass Marks: {exam.passMarks || 40}
        </p>
      </div>

      {/* Meta & Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 print:hidden">
        <div
          className="p-3.5 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-[10px] font-bold uppercase text-slate-400">Exam Date</p>
          <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">
            {new Date(exam.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-[10px] font-bold uppercase text-slate-400">Total / Pass Marks</p>
          <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">
            {exam.totalMarks} <span className="text-xs font-normal text-slate-400">/ {exam.passMarks || 40}</span>
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-[10px] font-bold uppercase text-slate-400">Evaluated</p>
          <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">
            {stats.evaluatedCount} <span className="text-xs font-normal text-slate-400">/ {students.length}</span>
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-[10px] font-bold uppercase text-slate-400">Class Average</p>
          <p className="text-sm font-black text-blue-600 mt-1">{stats.avgPercentage || "—"}</p>
        </div>

        <div
          className="p-3.5 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-[10px] font-bold uppercase text-slate-400">Highest / Lowest</p>
          <p className="text-sm font-black text-emerald-600 mt-1">
            {stats.highestMarks !== null ? stats.highestMarks : "—"}{" "}
            <span className="text-xs font-normal text-slate-400">
              / {stats.lowestMarks !== null ? stats.lowestMarks : "—"}
            </span>
          </p>
        </div>

        <div
          className="p-3.5 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-[10px] font-bold uppercase text-slate-400">Pass Rate</p>
          <p className="text-sm font-black text-emerald-600 mt-1">{stats.passRate || "—"}</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Gradebook Table Card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-medium"
                style={{ borderColor: "var(--color-border)" }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleFillAllMax}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-300 transition-colors"
            >
              Fill All ({exam.totalMarks})
            </button>
          </div>

          <div className="text-xs font-bold text-slate-400">
            {filteredStudents.length} Students in batch
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5 w-12 text-center">#</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5 text-center w-24">Absent</th>
                <th className="px-5 py-3.5 w-36">Marks Obtained</th>
                <th className="px-5 py-3.5 text-center w-24">Grade</th>
                <th className="px-5 py-3.5 text-center w-20">Rank</th>
                <th className="px-5 py-3.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, i) => {
                  const result = results[st.id] || {
                    marksObtained: "",
                    isAbsent: false,
                    remarks: "",
                    grade: null,
                    position: null,
                  };

                  const liveGrade = result.isAbsent
                    ? null
                    : result.marksObtained !== ""
                    ? computeExamGrade(Number(result.marksObtained), exam.totalMarks)
                    : result.grade;

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        result.isAbsent ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3 text-center text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{st.full_name}</div>
                        <div className="text-[10px] text-slate-400">
                          {st.phone || st.institution || `ID: ${st.invite_code || "N/A"}`}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={result.isAbsent || false}
                          onChange={(e) => handleResultChange(st.id, "isAbsent", e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={exam.totalMarks}
                            value={result.marksObtained}
                            onChange={(e) => handleResultChange(st.id, "marksObtained", e.target.value)}
                            disabled={result.isAbsent}
                            placeholder="-"
                            className="w-20 px-2.5 py-1.5 border rounded-xl text-center font-bold text-xs bg-slate-50 dark:bg-slate-900 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-400 outline-hidden"
                            style={{ borderColor: "var(--color-border)" }}
                          />
                          <span className="text-[10px] text-slate-400">/{exam.totalMarks}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {result.isAbsent ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600">
                            AB
                          </span>
                        ) : liveGrade ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs ${
                              liveGrade.includes("A")
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : liveGrade === "F"
                                ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                                : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {liveGrade}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center font-black text-blue-600">
                        {result.position ? `#${result.position}` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={result.remarks || ""}
                          onChange={(e) => handleResultChange(st.id, "remarks", e.target.value)}
                          placeholder="Feedback/remarks..."
                          className="w-full px-2.5 py-1.5 border rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-hidden font-normal"
                          style={{ borderColor: "var(--color-border)" }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
