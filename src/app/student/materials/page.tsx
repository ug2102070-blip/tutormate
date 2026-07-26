"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getStudentMaterials } from "@/actions/materialActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { BookOpen, FileText, Image as ImageIcon, Video, File, FileArchive, Loader2, FileDown, Download } from "lucide-react";
import type { BatchDoc, MaterialDoc } from "@/types";

export default function StudentMaterialsPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [materials, setMaterials] = useState<MaterialDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      // 1. Get student's enrolled batches
      const { data: studentDoc } = await supabase
        .from("students")
        .select("enrolled_batch_ids")
        .eq("auth_uid", user?.id)
        .single();
        
      if (studentDoc && studentDoc.enrolled_batch_ids.length > 0) {
        const { data: batchesData } = await supabase
          .from("batches")
          .select("*")
          .in("id", studentDoc.enrolled_batch_ids);
          
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
      }

      // 2. Load materials
      const batchFilter = selectedBatchId === "all" ? undefined : selectedBatchId;
      const mats = await getStudentMaterials(token, batchFilter);
      setMaterials(mats);
    } catch (err) {
      console.error("Failed to load materials data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async (path: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const url = await getMediaSignedUrl(path, token);
      if (url) window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to get URL", err);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf": return <FileText className="w-10 h-10 text-red-500" />;
      case "video": return <Video className="w-10 h-10 text-blue-500" />;
      case "image": return <ImageIcon className="w-10 h-10 text-green-500" />;
      case "docx": return <File className="w-10 h-10 text-blue-700" />;
      case "ppt": return <FileArchive className="w-10 h-10 text-orange-500" />;
      default: return <File className="w-10 h-10 text-slate-500" />;
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return Math.round(bytes / 1024) + " KB";
    return mb.toFixed(1) + " MB";
  };

  if (authLoading) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          Study Materials
        </h1>
        <p className="text-slate-500 text-sm mt-1">Access lecture notes, assignments, and study resources from your tutor.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filter by Subject:</span>
            <select 
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Subjects</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.subject} ({b.name})</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
              <p className="text-sm">Loading your materials...</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-800 font-bold mb-1">No Materials Found</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                {selectedBatchId === "all" 
                  ? "Your tutor hasn't shared any study materials yet." 
                  : "No materials available for this specific subject."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {materials.map((mat) => {
                const batch = batches.find(b => b.id === mat.batchId);
                
                return (
                  <div key={mat.id} className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all bg-white group flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="shrink-0 p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                        {getFileIcon(mat.fileType)}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase mb-1 ${mat.batchId ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {mat.batchId && batch ? batch.subject : "General"}
                        </span>
                        <h4 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                          {mat.title}
                        </h4>
                      </div>
                    </div>
                    
                    {mat.description && (
                      <p className="text-sm text-slate-600 line-clamp-3 mb-4 flex-1">
                        {mat.description}
                      </p>
                    )}
                    {!mat.description && <div className="flex-1"></div>}
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-medium text-slate-500">
                        {formatSize(mat.fileSize)} • {new Date(mat.createdAt).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => handleDownload(mat.filePath)}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
