"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { X, Loader2, Download, Video } from "lucide-react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string | null;
  filePath: string;
  batchName?: string | null;
  createdAt?: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  title,
  description,
  filePath,
  batchName,
  createdAt,
}: VideoPlayerModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !filePath) return;

    async function loadVideoUrl() {
      setLoading(true);
      setError(null);
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) throw new Error("No active session");
        const url = await getMediaSignedUrl(filePath, token);
        if (!url) throw new Error("Failed to generate secure video link.");
        setVideoUrl(url);
      } catch (err: any) {
        console.error("Video load error:", err);
        setError(err.message || "Failed to load video stream.");
      } finally {
        setLoading(false);
      }
    }

    loadVideoUrl();
  }, [isOpen, filePath]);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      window.open(videoUrl, "_blank");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131b2e] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#0b0f19]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg truncate">
                  {title}
                </h3>
                {batchName && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                    {batchName}
                  </span>
                )}
              </div>
              {createdAt && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Uploaded on {new Date(createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="bg-slate-950 flex-1 flex flex-col justify-center items-center relative min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-sm font-medium text-slate-300">Preparing class video stream...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 max-w-md">
              <Video className="w-12 h-12 mx-auto mb-3 text-red-400/50" />
              <p className="font-semibold text-base mb-1">Playback Error</p>
              <p className="text-sm text-red-300/80 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          ) : videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full max-h-[60vh] object-contain bg-black"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.playbackRate = playbackRate;
                }
              }}
            />
          ) : null}
        </div>

        {/* Controls & Description Footer */}
        {!loading && !error && (
          <div className="p-4 sm:p-5 bg-white dark:bg-[#131b2e] border-t border-slate-100 dark:border-white/10 shrink-0 space-y-3">
            {/* Speed & Download Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Speed:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0b0f19] p-1 rounded-xl border border-slate-200/60 dark:border-white/10">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                        playbackRate === rate
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl transition-colors border border-slate-200 dark:border-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                Download Recording
              </button>
            </div>

            {/* Description */}
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0b0f19] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
