"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getAssignments, createAssignment, publishAssignment, deleteAssignment } from "@/actions/assignmentActions";
import { BookOpen, Trash2, Plus, Loader2, Eye, Calendar, FileText, ArrowRight } from "lucide-react";
import type { BatchDoc, AssignmentDoc } from "@/types";
import Link from "next/link";

export default function TutorAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [mobileTab, setMobileTab] = useState<"list" | "create">("list");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    batchId: "",
    deadline: "",
    maxMarks: 100,
  });

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: batchesData } = await supabase
        .from("batches")
        .select("*")
        .eq("tutor_id", user!.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (batchesData) {
        setBatches(batchesData.map((b) => ({
          id: b.id,
          tutorId: b.tutor_id,
          name: b.name,
          subject: b.subject,
          gradeClass: b.grade_class,
          monthlyFee: b.monthly_fee,
          schedule: b.schedule,
          studentCount: b.student_count,
          isArchived: b.is_archived,
          createdAt: b.created_at,
        })));
        if (!formData.batchId && batchesData.length > 0) {
          setFormData(prev => ({ ...prev, batchId: batchesData[0].id }));
        }
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const batchFilter = selectedBatchId === "all" ? undefined : selectedBatchId;
      const data = await getAssignments(token, batchFilter);
      setAssignments(data);
    } catch (err) {
      console.error("Failed to load assignments data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!formData.title.trim() || !formData.batchId || !formData.deadline) {
      setCreateError("Please fill out all required fields.");
      return;
    }

    try {
      setIsCreating(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token || !user) throw new Error("Authentication error");

      await createAssignment({
        title: formData.title,
        description: formData.description || undefined,
        batchId: formData.batchId,
        deadline: formData.deadline,
        maxMarks: formData.maxMarks,
      }, token);

      setFormData(prev => ({ ...prev, title: "", description: "", deadline: "" }));
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create assignment");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment? All submissions will be lost.")) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      await deleteAssignment(id, token);
      setAssignments(assignments.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete assignment");
    }
  };

  const handlePublish = async (id: string) => {
    if (!window.confirm("Publishing will create submission records for all students currently enrolled in the batch. Do you want to continue?")) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      
      setAssignments(assignments.map(a => a.id === id ? { ...a, isPublished: true } : a));
      await publishAssignment(id, token);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to publish assignment");
    }
  };

  if (authLoading) return null;

  const createForm = (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h2
        className="text-base font-bold mb-4 flex items-center gap-2"
        style={{ color: "var(--color-text)" }}
      >
        <Plus className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
        Create Assignment
      </h2>

      {createError && (
        <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "var(--color-error)" }}>
          {createError}
        </div>
      )}

      <form onSubmit={handleCreateSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            placeholder="e.g., Chapter 1 Homework"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            placeholder="Instructions for students..."
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Target Batch *</label>
          <select
            required
            value={formData.batchId}
            onChange={e => setFormData({...formData, batchId: e.target.value})}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <option value="" disabled>Select Batch</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Deadline *</label>
          <input
            type="datetime-local"
            required
            value={formData.deadline}
            onChange={e => setFormData({...formData, deadline: e.target.value})}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Max Marks *</label>
          <input
            type="number"
            required
            min={1}
            value={formData.maxMarks}
            onChange={e => setFormData({...formData, maxMarks: parseInt(e.target.value) || 0})}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          {isCreating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
          ) : (
            <><Plus className="w-5 h-5" /> Create Draft</>
          )}
        </button>
      </form>
    </div>
  );

  const assignmentList = (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-card)",
        minHeight: 400,
      }}
    >
      {/* Filter */}
      <div
        className="p-4 flex flex-wrap gap-3 items-center justify-between"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-secondary)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Filter:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium outline-none"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <option value="all">All Assignments</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--color-text-muted)" }}>
            <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: "var(--color-primary)" }} />
            <p className="text-sm">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ background: "var(--color-bg-secondary)" }}
            >
              <BookOpen className="w-8 h-8" style={{ color: "var(--color-text-muted)" }} />
            </div>
            <h3 className="font-bold mb-1" style={{ color: "var(--color-text)" }}>No Assignments Found</h3>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {selectedBatchId === "all"
                ? "Create your first assignment!"
                : "No assignments for this batch."}
            </p>
          </div>
        ) : (
          <div
            style={{ borderTop: "none" }}
          >
            {assignments.map((assignment, index) => {
              const batch = batches.find(b => b.id === assignment.batchId);
              return (
                <div
                  key={assignment.id}
                  className="p-4 flex gap-3 transition-colors"
                  style={{
                    borderBottom: index < assignments.length - 1 ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-bold text-base truncate"
                          style={{ color: "var(--color-text)" }}
                        >
                          {assignment.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-medium">
                          <span className="flex items-center" style={{ color: "var(--color-text-muted)" }}>
                            <Calendar className="w-3 h-3 mr-1" />
                            Due: {new Date(assignment.deadline).toLocaleDateString()}
                          </span>
                          <span style={{ color: "var(--color-border)" }}>•</span>
                          <span style={{ color: "var(--color-text-muted)" }}>Marks: {assignment.maxMarks}</span>
                          {batch && (
                            <>
                              <span style={{ color: "var(--color-border)" }}>•</span>
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                  background: "var(--color-primary-50)",
                                  color: "var(--color-primary)",
                                }}
                              >
                                {batch.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/tutor/assignments/${assignment.id}`}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                          style={{
                            background: "var(--color-primary-50)",
                            color: "var(--color-primary)",
                          }}
                        >
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleDelete(assignment.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "var(--color-text-muted)" }}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {assignment.description && (
                      <p className="text-sm mt-2 line-clamp-1" style={{ color: "var(--color-text-secondary)" }}>
                        {assignment.description}
                      </p>
                    )}

                    <div className="mt-2.5">
                      {!assignment.isPublished ? (
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border"
                            style={{
                              background: "rgba(245,158,11,0.1)",
                              color: "var(--color-warning)",
                              borderColor: "rgba(245,158,11,0.2)",
                            }}
                          >
                            Draft
                          </span>
                          <button
                            onClick={() => handlePublish(assignment.id)}
                            className="text-xs font-semibold flex items-center gap-1"
                            style={{ color: "var(--color-success)" }}
                          >
                            <Eye className="w-3 h-3" /> Publish
                          </button>
                        </div>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border"
                          style={{
                            background: "rgba(16,185,129,0.1)",
                            color: "var(--color-success)",
                            borderColor: "rgba(16,185,129,0.2)",
                          }}
                        >
                          Published
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div>
        <h1
          className="text-xl font-bold flex items-center gap-2"
          style={{ color: "var(--color-text)" }}
        >
          <FileText className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          {t("assignments.title")}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {t("assignments.subtitle")}
        </p>
      </div>

      {/* Mobile Tab Switcher */}
      <div
        className="flex lg:hidden rounded-xl p-1 gap-1"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
      >
        {(["list", "create"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className="flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200"
            style={{
              background: mobileTab === tab ? "var(--color-surface)" : "transparent",
              color: mobileTab === tab ? "var(--color-primary)" : "var(--color-text-muted)",
              boxShadow: mobileTab === tab ? "var(--shadow-card)" : "none",
            }}
          >
            {tab === "list" ? "📋 Assignments" : "➕ Create New"}
          </button>
        ))}
      </div>

      {/* Mobile View */}
      <div className="lg:hidden animate-fade-in">
        {mobileTab === "list" ? assignmentList : createForm}
      </div>

      {/* Desktop 2-Column Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-6">
        <div className="lg:col-span-1 sticky top-6 self-start">
          {createForm}
        </div>
        <div className="lg:col-span-2">
          {assignmentList}
        </div>
      </div>
    </div>
  );
}
