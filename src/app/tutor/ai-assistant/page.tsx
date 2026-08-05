"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  MessageSquare,
  BarChart2,
  Copy,
  Check,
  Download,
  Loader2,
  Zap,
  Users,
  Send,
  Phone,
  MessageCircle,
  SendHorizontal,
  X,
  Calendar,
  Award,
  CheckCircle2,
  Layers,
  Printer,
} from "lucide-react";

// Helper function to convert raw LaTeX/Math symbols & dollar signs into clean, readable text
function cleanContentFormatting(text: string): string {
  if (!text) return "";
  return text
    // Replace \text{...} with inside text
    .replace(/\\text\{([^}]+)\}/g, "$1")
    // Replace \frac{a}{b} with a/b
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    // Replace math symbols
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\propto/g, "∝")
    .replace(/\\approx/g, "≈")
    .replace(/\\le/g, "≤")
    .replace(/\\ge/g, "≥")
    .replace(/\\degree/g, "°")
    .replace(/\\circ/g, "°")
    .replace(/\\theta/g, "θ")
    .replace(/\\pi/g, "π")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\epsilon/g, "ε")
    // Clean superscripts/subscripts
    .replace(/\^\{([^}]+)\}/g, "^$1")
    // Strip inline math $...$ dollar delimiters
    .replace(/\$([^$]+)\$/g, "$1")
    // Strip display math $$...$$ dollar delimiters
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    // Clean remaining loose dollars
    .replace(/\$/g, "");
}
import {
  generateQuestions,
  generateAssignment,
  generateLessonPlan,
  suggestDoubtAnswer,
  generateParentMessage,
  generateWeeklySummary,
  publishGeneratedContentAsAssignment,
} from "@/actions/aiActions";
import { getTutorStudents } from "@/actions/tutorStudentActions";
import { getTutorBatches } from "@/actions/batchActions";
import type { StudentDoc, BatchDoc } from "@/types";

export default function AiAssistantPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    "questions" | "assignment" | "lesson" | "doubt" | "parent" | "summary"
  >("questions");

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string>("");

  // Clean Output & Depth Mode Options
  const [cleanOutputOnly, setCleanOutputOnly] = useState(true);
  const [outputMode, setOutputMode] = useState<"questions_only" | "with_answers" | "with_explanations">("with_explanations");

  // Student list for parent dropdown
  const [students, setStudents] = useState<StudentDoc[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [targetPhone, setTargetPhone] = useState<string>("");
  const [portalSending, setPortalSending] = useState(false);
  const [portalSent, setPortalSent] = useState(false);

  // Batch list for Direct Send / Publish Assignment Modal
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishBatchId, setPublishBatchId] = useState<string>("");
  const [publishTitle, setPublishTitle] = useState<string>("");
  const [publishDeadline, setPublishDeadline] = useState<string>("");
  const [publishMaxMarks, setPublishMaxMarks] = useState<number>(50);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const supabase = createClient();

  // Load students & batches for tutor
  useEffect(() => {
    if (!user) return;
    async function loadInitialData() {
      try {
        const studentList = await getTutorStudents();
        setStudents(studentList);

        const batchList = await getTutorBatches();
        const activeBatches = batchList.filter((b) => !b.isArchived);
        setBatches(activeBatches);
        if (activeBatches.length > 0) {
          setPublishBatchId(activeBatches[0].id);
        }
      } catch (err) {
        console.error("Failed to load initial tutor data:", err);
      }
    }
    loadInitialData();

    // Default deadline to 7 days from today in YYYY-MM-DD format
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setPublishDeadline(defaultDate.toISOString().split("T")[0]);
  }, [user]);

  // Question Generator Form State
  const [qClass, setQClass] = useState("Class 10 (SSC)");
  const [qSubject, setQSubject] = useState("Physics");
  const [qTopic, setQTopic] = useState("Newton's Laws of Motion");
  const [qType, setQType] = useState<"mcq" | "short" | "creative">("mcq");
  const [qCount, setQCount] = useState(5);
  const [qDiff, setQDiff] = useState<"easy" | "medium" | "hard">("medium");

  // Assignment Drafter Form State
  const [aSubject, setASubject] = useState("Higher Math");
  const [aTopic, setATopic] = useState("Trigonometric Ratios & Identities");
  const [aDiff, setADiff] = useState<"easy" | "medium" | "hard">("medium");
  const [aMaxMarks, setAMaxMarks] = useState(50);
  const [aNotes, setANotes] = useState("Include 2 real-life application questions.");

  // Lesson Planner Form State
  const [lSubject, setLSubject] = useState("Chemistry");
  const [lChapter, setLChapter] = useState("Chemical Bonding & Structure");
  const [lDuration, setLDuration] = useState(60);
  const [lTarget, setLTarget] = useState("HSC Science Batch 2026");

  // Doubt Helper Form State
  const [dSubject, setDSubject] = useState("Biology");
  const [dText, setDText] = useState(
    "What is the difference between mitosis and meiosis division?"
  );

  // Parent Communicator Form State
  const [pName, setPName] = useState("Rahim Ahmed");
  const [pIssue, setPIssue] = useState<
    "absent" | "fee_due" | "poor_performance" | "praise" | "general"
  >("absent");
  const [pDetails, setPDetails] = useState("Missed today's Physics class without prior notice.");
  const [pLang, setPLang] = useState<"bn" | "en" | "banglish">("bn");

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) {
      setTargetPhone("");
      return;
    }
    const found = students.find((s) => s.id === studentId);
    if (found) {
      setPName(found.fullName);
      const phone = found.guardianPhone || found.phone || "";
      setTargetPhone(phone);
    }
  };

  const handleSendWhatsApp = () => {
    if (!output) return;
    const cleanPhone = targetPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("88") ? cleanPhone : cleanPhone.startsWith("0") ? "88" + cleanPhone : cleanPhone;
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(output)}`
      : `https://wa.me/?text=${encodeURIComponent(output)}`;
    window.open(url, "_blank");
  };

  const handleSendSMS = () => {
    if (!output) return;
    const cleanPhone = targetPhone.replace(/[^0-9]/g, "");
    const url = cleanPhone ? `sms:${cleanPhone}?body=${encodeURIComponent(output)}` : `sms:?body=${encodeURIComponent(output)}`;
    window.open(url, "_blank");
  };

  const handleSendPortalNotification = async () => {
    if (!output || !selectedStudentId) {
      alert("Please select an enrolled student from the dropdown list first.");
      return;
    }
    setPortalSending(true);
    try {
      const { sendParentPortalNotification } = await import("@/actions/aiActions");
      await sendParentPortalNotification(
        {
          studentId: selectedStudentId,
          title: `Tutor Notice for ${pName}`,
          message: output,
        },
        user?.id
      );
      setPortalSent(true);
      setTimeout(() => setPortalSent(false), 3000);
    } catch (err: any) {
      alert("Failed to send notification: " + (err.message || "Unknown error"));
    } finally {
      setPortalSending(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const element = document.createElement("a");
    const file = new Blob([output], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `tutormate-ai-${activeTab}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    if (!output) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the question paper.");
      return;
    }

    const cleaned = cleanContentFormatting(output);
    const examSubject = activeTab === "questions" ? qSubject : activeTab === "assignment" ? aSubject : lSubject;
    const examTopic = activeTab === "questions" ? qTopic : activeTab === "assignment" ? aTopic : lChapter;
    const examClass = qClass;
    const totalMarks = activeTab === "assignment" ? aMaxMarks : qCount * 10;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${examSubject} - Question Paper</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2.5px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1e1b4b; }
            .header p { margin: 3px 0; font-size: 13px; color: #475569; font-weight: 600; }
            .meta-grid { display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
            .student-box { display: flex; justify-content: space-between; margin-top: 15px; font-size: 12px; font-weight: 600; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .content { white-space: pre-wrap; font-size: 13.5px; margin-top: 25px; font-family: inherit; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            @media print { body { padding: 0; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TutorMate Academic Assessment Paper</h1>
            <p>Subject: <strong>${examSubject}</strong> | Level: <strong>${examClass}</strong></p>
            <p>Topic / Chapter: <strong>${examTopic}</strong></p>
            <div class="meta-grid">
              <span>Time Allotted: 45 Mins</span>
              <span>Full Marks: ${totalMarks}</span>
            </div>
            <div class="student-box">
              <span>Student Name: __________________________</span>
              <span>Roll/ID: _____________</span>
              <span>Date: _____________</span>
            </div>
          </div>

          <div class="content">${cleaned}</div>

          <div class="footer">
            Printed via TutorMate AI Academic Portal
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const openPublishModal = async () => {
    try {
      const batchList = await getTutorBatches();
      const activeBatches = batchList.filter((b) => !b.isArchived);
      setBatches(activeBatches);
      if (activeBatches.length > 0 && (!publishBatchId || !activeBatches.some(b => b.id === publishBatchId))) {
        setPublishBatchId(activeBatches[0].id);
      }
    } catch (err) {
      console.error("Failed to refresh batches:", err);
    }

    let title = "";
    if (activeTab === "questions") title = `${qSubject}: ${qTopic} Question Set`;
    else if (activeTab === "assignment") title = `${aSubject}: ${aTopic} Assignment`;
    else if (activeTab === "lesson") title = `${lSubject}: ${lChapter} Lesson Material`;
    else title = "Class Practice & Revision Work";

    setPublishTitle(title);
    setPublishMaxMarks(activeTab === "assignment" ? aMaxMarks : 50);
    setIsPublishModalOpen(true);
    setPublishSuccess(false);
  };

  const handlePublishAssignmentSubmit = async () => {
    if (!publishBatchId) {
      alert("Please select a batch to send this assignment to.");
      return;
    }
    if (!publishTitle.trim()) {
      alert("Please enter an assignment title.");
      return;
    }
    if (!publishDeadline) {
      alert("Please select a submission deadline.");
      return;
    }

    setPublishing(true);
    try {
      await publishGeneratedContentAsAssignment(
        {
          batchId: publishBatchId,
          title: publishTitle,
          content: output,
          deadline: publishDeadline,
          maxMarks: publishMaxMarks,
        }
      );

      setPublishSuccess(true);
      setTimeout(() => {
        setIsPublishModalOpen(false);
        setPublishSuccess(false);
      }, 2000);
    } catch (err: any) {
      alert("Failed to publish assignment: " + (err.message || "Unknown error"));
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await generateQuestions(
        {
          classLevel: qClass,
          subject: qSubject,
          topic: qTopic,
          questionType: qType,
          count: qCount,
          difficulty: qDiff,
          cleanOutputOnly,
          outputMode,
        },
        user?.id
      );
      setOutput(res.result);
    } catch (err: any) {
      setOutput(`Error: ${err.message || "Failed to generate questions."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssignment = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await generateAssignment(
        {
          topic: aTopic,
          subject: aSubject,
          difficulty: aDiff,
          maxMarks: aMaxMarks,
          instructions: aNotes,
          cleanOutputOnly,
          outputMode,
        },
        user?.id
      );
      setOutput(res.result);
    } catch (err: any) {
      setOutput(`Error: ${err.message || "Failed to generate assignment."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLessonPlan = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await generateLessonPlan(
        {
          subject: lSubject,
          chapter: lChapter,
          durationMins: lDuration,
          targetAudience: lTarget,
          cleanOutputOnly,
        },
        user?.id
      );
      setOutput(res.result);
    } catch (err: any) {
      setOutput(`Error: ${err.message || "Failed to generate lesson plan."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestDoubt = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await suggestDoubtAnswer(dText, dSubject, user?.id);
      setOutput(res.result);
    } catch (err: any) {
      setOutput(`Error: ${err.message || "Failed to solve doubt."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateParentMessage = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await generateParentMessage(
        {
          studentName: pName,
          issueType: pIssue,
          contextDetails: pDetails,
          language: pLang,
        },
        user?.id
      );
      setOutput(res.result);
    } catch (err: any) {
      setOutput(`Error: ${err.message || "Failed to draft parent message."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    setOutput("");
    try {
      const res = await generateWeeklySummary(user?.id);
      setOutput(res.result);
    } catch (err: any) {
      setOutput(`Error: ${err.message || "Failed to generate summary."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div
        className="p-6 rounded-2xl text-white relative overflow-hidden shadow-lg"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)",
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> Premium AI Assistant
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("aiAssistant.title")}
            </h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
              {t("aiAssistant.subtitle")}
            </p>
          </div>
          <Zap className="w-16 h-16 text-white/20 hidden sm:block" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "questions", label: "Question Gen", icon: FileText },
          { id: "assignment", label: "Assignment Drafter", icon: BookOpen },
          { id: "lesson", label: "Lesson Planner", icon: Sparkles },
          { id: "doubt", label: "Doubt Solver", icon: HelpCircle },
          { id: "parent", label: "Parent Message", icon: MessageSquare },
          { id: "summary", label: "Weekly Summary", icon: BarChart2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setOutput("");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              style={{
                background: isActive ? "var(--color-primary, #6366f1)" : "var(--color-surface)",
                color: isActive ? "#ffffff" : "var(--color-text-secondary)",
                border: "1px solid " + (isActive ? "var(--color-primary)" : "var(--color-border)"),
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Form Left, Output Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Controls */}
        <div
          className="lg:col-span-5 p-5 rounded-2xl space-y-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Global Content Settings Component for Questions & Assignments */}
          {(activeTab === "questions" || activeTab === "assignment") && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-3.5 h-3.5" /> Output Format & Depth
                </span>
              </div>

              {/* Output Mode / Answer Depth Selector */}
              <div>
                <label className="text-[11px] font-bold block mb-1.5 text-slate-500 dark:text-slate-400">
                  Select Question Details / Answers Option:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setOutputMode("questions_only")}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                      outputMode === "questions_only"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    📝 Questions Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputMode("with_answers")}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                      outputMode === "with_answers"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    ✅ + Answers
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputMode("with_explanations")}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                      outputMode === "with_explanations"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    💡 + Explanations
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <FileText className="w-4 h-4 text-indigo-500" /> Question Generator Config
              </h2>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Class / Level
                </label>
                <input
                  type="text"
                  value={qClass}
                  onChange={(e) => setQClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={qSubject}
                    onChange={(e) => setQSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Question Type
                  </label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="mcq">MCQ (Multiple Choice)</option>
                    <option value="short">Short Answer</option>
                    <option value="creative">Creative Question (CQ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Topic / Chapter Name
                </label>
                <input
                  type="text"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Question Count ({qCount})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={qCount}
                    onChange={(e) => setQCount(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Difficulty
                  </label>
                  <select
                    value={qDiff}
                    onChange={(e) => setQDiff(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateQuestions}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Questions with AI
              </button>
            </div>
          )}

          {activeTab === "assignment" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <BookOpen className="w-4 h-4 text-purple-500" /> Assignment Drafter Config
              </h2>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={aSubject}
                  onChange={(e) => setASubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Topic Name
                </label>
                <input
                  type="text"
                  value={aTopic}
                  onChange={(e) => setATopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={aMaxMarks}
                    onChange={(e) => setAMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Difficulty
                  </label>
                  <select
                    value={aDiff}
                    onChange={(e) => setADiff(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Special Instructions
                </label>
                <textarea
                  value={aNotes}
                  onChange={(e) => setANotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <button
                onClick={handleGenerateAssignment}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Draft Assignment & Rubric
              </button>
            </div>
          )}

          {activeTab === "lesson" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <Sparkles className="w-4 h-4 text-cyan-500" /> Lesson Planner Config
              </h2>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={lSubject}
                  onChange={(e) => setLSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Chapter / Lesson Title
                </label>
                <input
                  type="text"
                  value={lChapter}
                  onChange={(e) => setLChapter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    value={lDuration}
                    onChange={(e) => setLDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={lTarget}
                    onChange={(e) => setLTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateLessonPlan}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Structured Lesson Plan
              </button>
            </div>
          )}

          {activeTab === "doubt" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <HelpCircle className="w-4 h-4 text-emerald-500" /> Student Doubt Solver
              </h2>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  value={dSubject}
                  onChange={(e) => setDSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Student Doubt Question Text
                </label>
                <textarea
                  value={dText}
                  onChange={(e) => setDText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <button
                onClick={handleSuggestDoubt}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Draft Explanation Answer
              </button>
            </div>
          )}

          {activeTab === "parent" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <MessageSquare className="w-4 h-4 text-amber-500" /> Parent Communication Generator
              </h2>

              {/* Student Selector Dropdown */}
              <div>
                <label className="text-xs font-bold block mb-1 flex items-center justify-between" style={{ color: "var(--color-text-muted)" }}>
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-500" /> Select Enrolled Student</span>
                  {students.length > 0 && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{students.length} Students Available</span>}
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Choose Student from Database --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} {s.guardianPhone ? `(Guardian: ${s.guardianPhone})` : s.phone ? `(Phone: ${s.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="Enter student name"
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Guardian Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="e.g. 01700000000"
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Message Reason
                  </label>
                  <select
                    value={pIssue}
                    onChange={(e) => setPIssue(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="absent">Class Absence</option>
                    <option value="fee_due">Tuition Fee Due</option>
                    <option value="poor_performance">Academic Alert</option>
                    <option value="praise">Performance Praise</option>
                    <option value="general">General Notice</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Language Mode
                  </label>
                  <select
                    value={pLang}
                    onChange={(e) => setPLang(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="bn">Bengali (বাংলা)</option>
                    <option value="banglish">Banglish</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Additional Context
                </label>
                <textarea
                  value={pDetails}
                  onChange={(e) => setPDetails(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <button
                onClick={handleGenerateParentMessage}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Draft Parent SMS/Message
              </button>
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <BarChart2 className="w-4 h-4 text-blue-500" /> Weekly Executive Summary
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click below to analyze your live database statistics (student counts, attendance %, fee collection) and generate a narrative weekly report.
              </p>
              <button
                onClick={handleGenerateSummary}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Weekly AI Report
              </button>
            </div>
          )}
        </div>

        {/* Output Display Panel */}
        <div
          className="lg:col-span-7 p-5 rounded-2xl flex flex-col justify-between min-h-[400px]"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI Generated Result
              </h3>

              {output && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Direct Publish to Batch Button */}
                  {(activeTab === "questions" || activeTab === "assignment" || activeTab === "lesson") && (
                    <button
                      onClick={openPublishModal}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm transition-all active:scale-95 hover:opacity-90"
                    >
                      <SendHorizontal className="w-3.5 h-3.5" /> Direct Send / Publish
                    </button>
                  )}

                  {/* Print / PDF Question Paper Button */}
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / PDF
                  </button>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border)",
                      color: copied ? "#10b981" : "var(--color-text)",
                    }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              )}
            </div>

            {/* Output Box */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs font-bold text-slate-500">
                  AI is processing your prompt...
                </p>
              </div>
            ) : output ? (
              <div className="space-y-3">
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {cleanContentFormatting(output)}
                </div>

                {/* Consolidated Action Bar for Parent Communication */}
                {activeTab === "parent" && (
                  <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Target: <strong>{pName}</strong> {targetPhone ? `(${targetPhone})` : ""}
                      </span>
                      {selectedStudentId ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Linked Student Selected
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                          Select from dropdown to enable Parent Portal Post
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleSendWhatsApp}
                        className="flex-1 min-w-[110px] py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </button>

                      <button
                        onClick={handleSendSMS}
                        className="flex-1 min-w-[100px] py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5" /> SMS
                      </button>

                      <button
                        onClick={handleSendPortalNotification}
                        disabled={portalSending || !selectedStudentId}
                        className="flex-1 min-w-[160px] py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        {portalSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : portalSent ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        {portalSent ? "Posted to Parent Portal! ✓" : "Post to Parent Portal 🔔"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Zap className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold text-slate-400">
                  Configure options on the left and click Generate to view AI outputs.
                </p>
              </div>
            )}
          </div>

          {output && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Ready for copy, edit or send to batch</span>
              <span>Gemini 2.5 Flash Engine</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Direct Publish to Batch as Assignment */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div
            className="w-full max-w-lg p-6 rounded-2xl space-y-4 relative shadow-2xl"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <button
              onClick={() => setIsPublishModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <SendHorizontal className="w-5 h-5" />
              <h3 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
                Publish Assignment Directly to Batch
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This will create a published assignment with your AI-generated questions/material and immediately notify all enrolled batch students.
            </p>

            {publishSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-bold">Successfully Published!</h4>
                  <p className="text-[11px]">Assignment created and students notified in batch portal.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-600 dark:text-slate-300">
                    Select Target Batch
                  </label>
                  <select
                    value={publishBatchId}
                    onChange={(e) => setPublishBatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="">-- Choose Batch --</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.subject} - {b.gradeClass})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-600 dark:text-slate-300">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Submission Deadline
                    </label>
                    <input
                      type="date"
                      value={publishDeadline}
                      onChange={(e) => setPublishDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" /> Max Marks
                    </label>
                    <input
                      type="number"
                      value={publishMaxMarks}
                      onChange={(e) => setPublishMaxMarks(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishAssignmentSubmit}
                    disabled={publishing}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                    Publish Assignment Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
