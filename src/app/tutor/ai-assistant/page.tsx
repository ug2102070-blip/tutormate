"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
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
} from "lucide-react";
import {
  generateQuestions,
  generateAssignment,
  generateLessonPlan,
  suggestDoubtAnswer,
  generateParentMessage,
  generateWeeklySummary,
} from "@/actions/aiActions";

export default function AiAssistantPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    "questions" | "assignment" | "lesson" | "doubt" | "parent" | "summary"
  >("questions");

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string>("");

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

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Student Name
                </label>
                <input
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
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
                <div className="flex items-center gap-2">
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
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {output}
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
              <span>Ready for copy or edit</span>
              <span>Gemini 2.5 Flash Engine</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
