"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getTutorMaterials, createMaterial, deleteMaterial, updateMaterial } from "@/actions/materialActions";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import {
  Video,
  Upload,
  Trash2,
  Loader2,
  Plus,
  Eye,
  EyeOff,
  Play,
  BookOpen,
  ArrowRight,
  Clock,
  Film,
} from "lucide-react";
import type { BatchDoc, MaterialDoc } from "@/types";
import Link from "next/link";

export default function TutorRecordedClassesPage() {
  const { user, claims, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [videoMaterials, setVideoMaterials] = useState<MaterialDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Video player modal state
  const [activeVideo, setActiveVideo] = useState<MaterialDoc | null>(null);

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadData();
  }, [user, claims, authLoading, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch batches
      const tutorId = (claims && "tutorId" in claims ? (claims as any).tutorId : null) || user!.id;
      const { data: batchesData } = await supabase
        .from("batches")
        .select("*")
        .eq("tutor_id", tutorId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (batchesData) {
        setBatches(
          batchesData.map((b) => ({
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
          }))
        );
      }

      // 2. Fetch materials and filter for video fileType
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const batchFilter = selectedBatchId === "all" ? undefined : selectedBatchId;
      const mats = await getTutorMaterials(token, batchFilter);
      const videos = mats.filter((m) => m.fileType === "video");
      setVideoMaterials(videos);
    } catch (err) {
      console.error("Failed to load recorded classes:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Please select a video file to upload.");
      return;
    }
    if (!formData.title.trim()) {
      setUploadError("Please enter a class title.");
      return;
    }

    try {
      setIsUploading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token || !user) throw new Error("Authentication error");

      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const uuid = crypto.randomUUID();
      const storagePath = `materials/${user.id}/${uuid}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file);

      if (uploadErr) throw new Error("Failed to upload video file to storage.");

      await createMaterial(
        {
          title: formData.title,
          description: formData.description || undefined,
          batchId: formData.batchId === "all" ? undefined : formData.batchId,
          filePath: storagePath,
          fileType: "video",
          fileSize: file.size,
          isPublished: formData.isPublished,
        },
        token
      );

      setFormData({ title: "", description: "", batchId: "all", isPublished: true });
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload video class.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this recorded class video?")) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      await deleteMaterial(id, token);
      setVideoMaterials(videoMaterials.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete video");
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      setVideoMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isPublished: !currentStatus } : m))
      );
      await updateMaterial(id, { isPublished: !currentStatus }, token);
    } catch (err) {
      console.error(err);
      setVideoMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isPublished: currentStatus } : m))
      );
      alert("Failed to update video visibility");
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
              Feature 16
            </span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Video className="w-6 h-6 text-indigo-400" />
            {t("recordedClasses.title")} 🎥
          </h1>
          <p className="text-indigo-200 text-sm mt-1">
            {t("recordedClasses.subtitle")}
          </p>
        </div>
        <Link
          href="/tutor/materials"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl transition-all border border-white/15 shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          Study Materials <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              {t("recordedClasses.uploadVideo") || "Upload Recorded Class"}
            </h2>

            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-700 text-sm rounded-xl mb-4 border border-red-200 dark:border-red-500/20">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleVideoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class / Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="e.g. Physics Chapter 3: Newton's Laws"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Topic Summary
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none min-h-[80px] resize-y"
                  placeholder="Details of what was covered in this session..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Batch
                </label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="all">Global (All Students)</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Video File (.mp4, .webm, .mkv, .mov) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/mp4,video/webm,video/x-matroska,video/quicktime"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-400 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="publishVideo"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <label
                  htmlFor="publishVideo"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Publish to students immediately
                </label>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Uploading Video...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" /> Upload Recorded Class
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Video Recordings List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter */}
          <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Filter by Batch:
              </span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Class Recordings ({videoMaterials.length})</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Videos Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
              <p className="text-sm font-medium">Loading class recordings...</p>
            </div>
          ) : videoMaterials.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
              <div className="w-16 h-16 bg-slate-50 dark:bg-[#0b0f19] rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {t("recordedClasses.noVideos") || "No Recorded Classes Found"}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-2">
                {t("recordedClasses.noVideosDesc") || (selectedBatchId === "all"
                  ? "You haven't uploaded any recorded class videos yet. Use the upload panel to post your first video lecture."
                  : "No recorded class videos available for this specific batch.")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoMaterials.map((vid) => {
                const batch = batches.find((b) => b.id === vid.batchId);

                return (
                  <div
                    key={vid.id}
                    className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                  >
                    {/* Thumbnail area with play button */}
                    <div
                      onClick={() => setActiveVideo(vid)}
                      className="bg-slate-900 aspect-video relative flex items-center justify-center cursor-pointer group-hover:bg-slate-950 transition-colors overflow-hidden"
                    >
                      <div className="w-14 h-14 bg-indigo-600/90 text-white rounded-full flex items-center justify-center pl-1 group-hover:scale-110 group-hover:bg-indigo-500 transition-all shadow-lg">
                        <Play className="w-6 h-6 fill-current" />
                      </div>

                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-indigo-400" />
                        {batch ? batch.name : "Global"}
                      </div>

                      {!vid.isPublished && (
                        <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Draft
                        </div>
                      )}
                    </div>

                    {/* Meta & Actions */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug line-clamp-2">
                          {vid.title}
                        </h4>
                        {vid.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {vid.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatSize(vid.fileSize)} •{" "}
                          {new Date(vid.createdAt).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePublish(vid.id, vid.isPublished)}
                            className={`p-2 rounded-xl transition-colors ${
                              vid.isPublished
                                ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            }`}
                            title={vid.isPublished ? "Hide from students" : "Publish to students"}
                          >
                            {vid.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(vid.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                            title="Delete video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          isOpen={!!activeVideo}
          onClose={() => setActiveVideo(null)}
          title={activeVideo.title}
          description={activeVideo.description}
          filePath={activeVideo.filePath}
          batchName={
            batches.find((b) => b.id === activeVideo.batchId)?.name || "Global Class"
          }
          createdAt={activeVideo.createdAt}
        />
      )}
    </div>
  );
}
