"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getTutorMaterials, createMaterial, deleteMaterial, updateMaterial } from "@/actions/materialActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { BookOpen, Upload, Trash2, FileText, Image as ImageIcon, Video, File, FileArchive, Loader2, Plus, Eye, EyeOff, FileDown } from "lucide-react";
import type { BatchDoc, MaterialDoc } from "@/types";

export default function MaterialsPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [materials, setMaterials] = useState<MaterialDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    batchId: "all", // "all" means global
    isPublished: true,
  });

  const supabase = createClient();

  // Load batches and materials
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load active batches
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
      }

      // 2. Load materials
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const batchFilter = selectedBatchId === "all" ? undefined : selectedBatchId;
      const mats = await getTutorMaterials(token, batchFilter);
      setMaterials(mats);
    } catch (err) {
      console.error("Failed to load materials data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Please select a file to upload.");
      return;
    }
    if (!formData.title.trim()) {
      setUploadError("Please enter a title.");
      return;
    }

    try {
      setIsUploading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token || !user) throw new Error("Authentication error");

      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const uuid = crypto.randomUUID();
      const storagePath = `materials/${user.id}/${uuid}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file);

      if (uploadError) throw new Error("Failed to upload file to storage.");

      // 2. Determine file type
      let fileType: "pdf" | "video" | "image" | "docx" | "ppt" | "other" = "other";
      if (fileExt === "pdf") fileType = "pdf";
      else if (["mp4", "webm", "mkv", "avi"].includes(fileExt || "")) fileType = "video";
      else if (["png", "jpg", "jpeg", "gif", "webp"].includes(fileExt || "")) fileType = "image";
      else if (["doc", "docx"].includes(fileExt || "")) fileType = "docx";
      else if (["ppt", "pptx"].includes(fileExt || "")) fileType = "ppt";

      // 3. Create db record via server action
      await createMaterial({
        title: formData.title,
        description: formData.description || undefined,
        batchId: formData.batchId === "all" ? undefined : formData.batchId,
        filePath: storagePath,
        fileType,
        fileSize: file.size,
        isPublished: formData.isPublished,
      }, token);

      // Reset form and reload
      setFormData({ title: "", description: "", batchId: "all", isPublished: true });
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload material");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      await deleteMaterial(id, token);
      setMaterials(materials.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete material");
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      
      // Optimistic update
      setMaterials(materials.map(m => m.id === id ? { ...m, isPublished: !currentStatus } : m));
      await updateMaterial(id, { isPublished: !currentStatus }, token);
    } catch (err) {
      console.error(err);
      // Revert on error
      setMaterials(materials.map(m => m.id === id ? { ...m, isPublished: currentStatus } : m));
      alert("Failed to update status");
    }
  };

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
      case "pdf": return <FileText className="w-8 h-8 text-red-500" />;
      case "video": return <Video className="w-8 h-8 text-blue-500" />;
      case "image": return <ImageIcon className="w-8 h-8 text-green-500" />;
      case "docx": return <File className="w-8 h-8 text-blue-700" />;
      case "ppt": return <FileArchive className="w-8 h-8 text-orange-500" />;
      default: return <File className="w-8 h-8 text-slate-500" />;
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Study Materials
          </h1>
          <p className="text-slate-500 text-sm mt-1">Upload and share notes, videos, and slides with your students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form (Side) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              Upload Material
            </h2>
            
            {uploadError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl mb-4">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="e.g., Chapter 1 Notes"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                  placeholder="Brief context about this material..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Target Batch</label>
                <select 
                  value={formData.batchId}
                  onChange={e => setFormData({...formData, batchId: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="all">Global (All Students)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">File *</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  required
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              
              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="publish" 
                  checked={formData.isPublished}
                  onChange={e => setFormData({...formData, isPublished: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="publish" className="text-sm font-medium text-slate-700">Publish immediately</label>
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
              >
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
                ) : (
                  <><Plus className="w-5 h-5" /> Upload File</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Materials List (Main) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Filter by Batch:</span>
                <select 
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Materials</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="p-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                  <p className="text-sm">Loading materials...</p>
                </div>
              ) : materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-800 font-bold mb-1">No Materials Found</h3>
                  <p className="text-slate-500 text-sm max-w-sm">
                    {selectedBatchId === "all" 
                      ? "You haven't uploaded any study materials yet." 
                      : "No materials uploaded for this specific batch."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {materials.map((mat) => {
                    const batch = batches.find(b => b.id === mat.batchId);
                    
                    return (
                      <div key={mat.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 group">
                        <div className="shrink-0 pt-1">
                          {getFileIcon(mat.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 text-base truncate">
                                {mat.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-medium">
                                <span className="text-slate-500">{formatSize(mat.fileSize)}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">{new Date(mat.createdAt).toLocaleDateString()}</span>
                                <span className="text-slate-300">•</span>
                                <span className={`px-2 py-0.5 rounded-full ${mat.batchId ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {mat.batchId && batch ? batch.name : "Global (All)"}
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => handleDownload(mat.filePath)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Download/View"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => togglePublish(mat.id, mat.isPublished)}
                                className={`p-2 rounded-lg transition-colors ${mat.isPublished ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                                title={mat.isPublished ? "Unpublish" : "Publish"}
                              >
                                {mat.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDelete(mat.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {mat.description && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                              {mat.description}
                            </p>
                          )}
                          
                          {!mat.isPublished && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-200">
                              <EyeOff className="w-3 h-3" /> Draft (Hidden from students)
                            </div>
                          )}
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
