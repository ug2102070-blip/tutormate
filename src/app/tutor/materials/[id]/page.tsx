"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { updateMaterial } from "@/actions/materialActions";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import type { BatchDoc } from "@/types";

export default function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    batchId: "all",
    isPublished: true,
  });

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, resolvedParams.id]);

  async function loadData() {
    setLoading(true);
    try {
      // Load batches
      const { data: batchesData } = await supabase
        .from("batches")
        .select("*")
        .eq("is_archived", false)
        .eq("tutor_id", user?.id);

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
      }

      // Load material
      const { data: material, error: matError } = await supabase
        .from("materials")
        .select("*")
        .eq("id", resolvedParams.id)
        .eq("tutor_id", user?.id)
        .single();
      
      if (matError) throw matError;
      
      setFormData({
        title: material.title,
        description: material.description || "",
        batchId: material.batch_id || "all",
        isPublished: material.is_published,
      });

    } catch (err: any) {
      setError(err.message || "Failed to load material");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      await updateMaterial(resolvedParams.id, {
        title: formData.title,
        description: formData.description || undefined,
        batchId: formData.batchId === "all" ? undefined : formData.batchId,
        isPublished: formData.isPublished,
      }, token);

      router.push("/tutor/materials");
    } catch (err: any) {
      setError(err.message || "Failed to update material");
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/tutor/materials"
          className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Material</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update details for this study material.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-700 text-sm rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#13131f] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#13131f] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Batch</label>
            <select 
              value={formData.batchId}
              onChange={e => setFormData({...formData, batchId: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#13131f] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="all">Global (All Students)</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2 pb-2">
            <input 
              type="checkbox" 
              id="publish" 
              checked={formData.isPublished}
              onChange={e => setFormData({...formData, isPublished: e.target.checked})}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="publish" className="text-sm font-medium text-slate-700 dark:text-slate-300">Publish immediately</label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center justify-center gap-2 py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
            >
              {saving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-5 h-5" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
