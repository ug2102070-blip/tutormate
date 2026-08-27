"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getStudentMaterials } from "@/actions/materialActions";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import {
  Video,
  Play,
  Loader2,
  BookOpen,
  ArrowRight,
  Clock,
  Film,
  Sparkles,
} from "lucide-react";
import type { BatchDoc, MaterialDoc } from "@/types";
import Link from "next/link";

export default function StudentRecordedClassesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [videoMaterials, setVideoMaterials] = useState<MaterialDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Video player modal state
  const [activeVideo, setActiveVideo] = useState<MaterialDoc | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
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
      }

      // 2. Load materials and filter for video fileType
      const batchFilter = selectedBatchId === "all" ? undefined : selectedBatchId;
      const mats = await getStudentMaterials(batchFilter);
      const videos = mats.filter((m) => m.fileType === "video");
      setVideoMaterials(videos);
    } catch (err) {
      console.error("Failed to load student recorded classes:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBatchId, supabase]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedBatchId, loadData]);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return Math.round(bytes / 1024) + " KB";
    return mb.toFixed(1) + " MB";
  };

  if (authLoading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
              Lecture Archive
            </span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Video className="w-6 h-6 text-indigo-400" />
            {t("recordedClasses.title")}
          </h1>
          <p className="text-indigo-200 text-sm mt-1">
            {t("recordedClasses.subtitle")}
          </p>
        </div>
        <Link
          href="/student/materials"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl transition-all border border-white/15 shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          Study Materials <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Filter by Subject:
          </span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Subjects ({videoMaterials.length})</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.subject} ({b.name})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> High Definition Video Streaming
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
          <p className="text-sm font-medium">Loading class recordings...</p>
        </div>
      ) : videoMaterials.length === 0 ? (
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-500">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
            {t("recordedClasses.noVideos") || "No Recorded Classes Found"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            {selectedBatchId === "all"
              ? t("recordedClasses.noVideosStudentDesc") || "Your tutor hasn't uploaded any recorded class videos yet. When they do, they will appear here."
              : "No recorded class videos available for this specific batch."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videoMaterials.map((vid) => {
            const batch = batches.find((b) => b.id === vid.batchId);

            return (
              <div
                key={vid.id}
                className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all flex flex-col group"
              >
                {/* Video Playable Preview Card */}
                <div
                  onClick={() => setActiveVideo(vid)}
                  className="bg-slate-950 aspect-video relative flex items-center justify-center cursor-pointer group-hover:bg-slate-900 transition-colors overflow-hidden"
                >
                  <div className="w-14 h-14 bg-indigo-600/90 text-white rounded-full flex items-center justify-center pl-1 group-hover:scale-110 group-hover:bg-indigo-500 transition-all shadow-xl">
                    <Play className="w-6 h-6 fill-current" />
                  </div>

                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-400" />
                    {batch ? batch.subject : "General Lecture"}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white">
                    {formatSize(vid.fileSize)}
                  </div>
                </div>

                {/* Content info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug line-clamp-2">
                      {vid.title}
                    </h4>
                    {vid.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                        {vid.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(vid.createdAt).toLocaleDateString()}
                    </div>

                    <button
                      onClick={() => setActiveVideo(vid)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Watch Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          isOpen={!!activeVideo}
          onClose={() => setActiveVideo(null)}
          title={activeVideo.title}
          description={activeVideo.description}
          filePath={activeVideo.filePath}
          batchName={
            batches.find((b) => b.id === activeVideo.batchId)?.subject || "Class Recording"
          }
          createdAt={activeVideo.createdAt}
        />
      )}
    </div>
  );
}
