"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  isMe?: boolean;
}

export function AudioPlayer({ src, isMe }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const updateDuration = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => setIsPlaying(false);
    const onError = (e: Event) => {
      console.warn("Audio element error for src:", src, e);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
        });
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const maxSeekValue = isFinite(duration) && duration > 0 ? duration : (currentTime > 0 ? currentTime : 1);

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-xl border max-w-xs ${
        isMe
          ? "bg-indigo-700/40 text-white border-white/20"
          : "bg-slate-100 dark:bg-[#252535] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-white/10"
      }`}
    >
      <audio ref={audioRef} src={src} preload="auto" />

      <button
        type="button"
        onClick={togglePlay}
        className={`p-2 rounded-full transition-transform active:scale-95 shrink-0 ${
          isMe
            ? "bg-white dark:bg-[#1e1e2e] text-indigo-600 hover:bg-white/90"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] font-mono tracking-wider font-semibold opacity-90">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> Voice Note
          </span>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={maxSeekValue}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-black/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
}
