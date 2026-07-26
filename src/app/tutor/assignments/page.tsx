"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getAssignments, createAssignment, publishAssignment, deleteAssignment } from "@/actions/assignmentActions";
import { BookOpen, Trash2, Plus, Loader2, Eye, Calendar, FileText, ArrowRight } from "lucide-react";
import type { BatchDoc, AssignmentDoc } from "@/types";
import Link from "next/link";

export default function TutorAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Assignments
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create assignments, track submissions, and grade your students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form (Side) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              Create Assignment
            </h2>
            
            {createError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl mb-4">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="e.g., Chapter 1 Homework"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                  placeholder="Instructions for the students..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Target Batch *</label>
                <select 
                  required
                  value={formData.batchId}
                  onChange={e => setFormData({...formData, batchId: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="" disabled>Select Batch</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deadline *</label>
                <input 
                  type="datetime-local" 
                  required
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Max Marks *</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={formData.maxMarks}
                  onChange={e => setFormData({...formData, maxMarks: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={isCreating}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
              >
                {isCreating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="w-5 h-5" /> Create Draft</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Assignments List (Main) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Filter by Batch:</span>
                <select 
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Assignments</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                  <p className="text-sm">Loading assignments...</p>
                </div>
              ) : assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-800 font-bold mb-1">No Assignments Found</h3>
                  <p className="text-slate-500 text-sm max-w-sm">
                    {selectedBatchId === "all" 
                      ? "You haven't created any assignments yet." 
                      : "No assignments for this specific batch."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assignments.map((assignment) => {
                    const batch = batches.find(b => b.id === assignment.batchId);
                    
                    return (
                      <div key={assignment.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 text-base truncate">
                                {assignment.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-medium">
                                <span className="flex items-center text-slate-500">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Due: {new Date(assignment.deadline).toLocaleString()}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">Marks: {assignment.maxMarks}</span>
                                <span className="text-slate-300">•</span>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                  {batch ? batch.name : "Unknown Batch"}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/tutor/assignments/${assignment.id}`}
                                className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                View <ArrowRight className="w-4 h-4" />
                              </Link>
                              
                              <button
                                onClick={() => handleDelete(assignment.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {assignment.description && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                              {assignment.description}
                            </p>
                          )}
                          
                          <div className="mt-3">
                            {!assignment.isPublished ? (
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-200">
                                  Draft
                                </span>
                                <button 
                                  onClick={() => handlePublish(assignment.id)}
                                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> Publish Now
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200">
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
        </div>
      </div>
    </div>
  );
}
