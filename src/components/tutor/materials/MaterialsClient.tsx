"use client";

import Link from "next/link";
import { useState, useRef, useOptimistic, useTransition } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { createMaterial, deleteMaterial, updateMaterial } from "@/actions/materialActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { BookOpen, Upload, Trash2, FileText, Image as ImageIcon, Video, File, FileArchive, Loader2, Plus, Eye, EyeOff, FileDown, ArrowRight } from "lucide-react";
import type { BatchDoc, MaterialDoc } from "@/types";
import { EmptyState } from "@/components/EmptyState";

interface MaterialsClientProps {
  initialBatches: BatchDoc[];
  initialMaterials: MaterialDoc[];
  userId: string;
  tutorId: string;
}

export default function MaterialsClient({
  initialBatches,
  initialMaterials,
  userId,
  tutorId
}: MaterialsClientProps) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");

  // Optimistic materials list
  const [optimisticMaterials, addOptimisticMaterial] = useOptimistic(
    initialMaterials,
    (state, action: { type: 'delete' | 'update' | 'add', payload: any }) => {
      switch (action.type) {
        case 'delete':
          return state.filter(m => m.id !== action.payload);
        case 'update':
          return state.map(m => m.id === action.payload.id ? { ...m, ...action.payload.data } : m);
        case 'add':
          return [action.payload, ...state];
        default:
          return state;
      }
    }
  );

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    batchId: "all",
    isPublished: true,
  });

  const supabase = createClient();

  // Filtered materials (based on optimistic state)
  const materials = selectedBatchId === "all"
    ? optimisticMaterials
    : optimisticMaterials.filter(m => m.batchId === selectedBatchId);

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

      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const uuid = crypto.randomUUID();
      const storagePath = `materials/${userId}/${uuid}.${fileExt}`;

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
      });

      // Reset form
      setFormData({ title: "", description: "", batchId: "all", isPublished: true });
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh page to get new data (Next.js server action revalidation)
      window.location.reload();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload material");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("materials.deleteConfirm"))) return;

    startTransition(async () => {
      addOptimisticMaterial({ type: 'delete', payload: id });
      try {
        await deleteMaterial(id);
      } catch (err) {
        console.error(err);
        alert("Failed to delete material");
        window.location.reload();
      }
    });
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      addOptimisticMaterial({
        type: 'update',
        payload: { id, data: { isPublished: !currentStatus } }
      });
      try {
        await updateMaterial(id, { isPublished: !currentStatus });
      } catch (err) {
        console.error(err);
        alert("Failed to update status");
        window.location.reload();
      }
    });
  };

  const handleDownload = async (path: string) => {
    try {
      const url = await getMediaSignedUrl(path);
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
      default: return <File className="w-8 h-8 text-slate-500 dark:text-slate-400" />;
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return t("materials.unknownSize");
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return Math.round(bytes / 1024) + " KB";
    return mb.toFixed(1) + " MB";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            {t("materials.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t("materials.subtitle")}</p>
        </div>

        <Link
          href="/tutor/recorded-classes"
          className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-all shadow-sm shrink-0"
        >
          <Video className="w-4 h-4" />
          {t("materials.recordedClassesBtn")} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form (Side) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-white/10 p-4 shadow-sm sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              {t("materials.uploadMaterialTitle")}
            </h2>

            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-700 text-xs font-semibold rounded-lg mb-4">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t("materials.titleLabel")}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder={t("materials.titlePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t("materials.descLabel")}</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                  placeholder={t("materials.descPlaceholder")}
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t("materials.targetBatchLabel")}</label>
                <select
                  value={formData.batchId}
                  onChange={e => setFormData({...formData, batchId: e.target.value})}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="all">{t("materials.globalAllStudents")}</option>
                  {initialBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t("materials.fileLabel")}</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  required
                  className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
                <label htmlFor="publish" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("materials.publishImmediately")}</label>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-70"
              >
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t("materials.uploading")}</>
                ) : (
                  <><Plus className="w-5 h-5" /> {t("materials.uploadFileBtn")}</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Materials List (Main) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Filter Bar */}
            <div className="p-3.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0b0f19]/50 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("materials.filterByBatch")}</span>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">{t("materials.allMaterials")}</option>
                  {initialBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

              {/* List */}
            <div className="p-0 flex-1 overflow-y-auto">
              {materials.length === 0 ? (
                <EmptyState
                  variant="materials"
                  title={t("materials.noMaterialsTitle")}
                  description={
                    selectedBatchId === "all"
                      ? t("materials.noMaterialsDescAll")
                      : t("materials.noMaterialsDescBatch")
                  }
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {materials.map((mat) => {
                    const batch = initialBatches.find(b => b.id === mat.batchId);

                    return (
                      <div key={mat.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex gap-4 group">
                        <div className="shrink-0 pt-1">
                          {getFileIcon(mat.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">
                                {mat.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-medium">
                                <span className="text-slate-500 dark:text-slate-400">{formatSize(mat.fileSize)}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-slate-500 dark:text-slate-400">{new Date(mat.createdAt).toLocaleDateString()}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${mat.batchId ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}>
                                  {mat.batchId && batch ? batch.name : t("materials.globalAll")}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => handleDownload(mat.filePath)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                                title="Download/View"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => togglePublish(mat.id, mat.isPublished)}
                                className={`p-2 rounded-lg transition-colors ${mat.isPublished ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
                                title={mat.isPublished ? "Unpublish" : "Publish"}
                              >
                                {mat.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDelete(mat.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {mat.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                              {mat.description}
                            </p>
                          )}

                          {!mat.isPublished && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-md border border-amber-200 dark:border-amber-500/20">
                              <EyeOff className="w-3 h-3" /> {t("materials.draftHidden")}
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
