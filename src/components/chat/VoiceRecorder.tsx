"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Send } from "lucide-react";

interface VoiceRecorderProps {
  onSendAudio: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSendAudio, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required to record voice messages.");
      onCancel();
    }
  }

  function handleStopAndSend() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    const finalDuration = duration;

    recorder.onstop = () => {
      stopTracks();
      const mimeType = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      onSendAudio(audioBlob, finalDuration);
    };

    recorder.stop();
  }

  function handleCancelRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    onCancel();
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-red-50 text-red-700 rounded-xl border border-red-200 animate-fade-in w-full">
      <div className="relative flex items-center justify-center">
        <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-red-400 opacity-75" />
        <Mic className="w-4 h-4 text-red-600 relative z-10" />
      </div>

      <span className="text-xs font-bold font-mono tracking-wider">
        {formatTime(duration)}
      </span>

      <span className="text-xs font-semibold text-red-600 flex-1 animate-pulse">
        Recording audio...
      </span>

      <button
        type="button"
        onClick={handleCancelRecording}
        className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-100 transition-colors"
        title="Cancel voice message"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleStopAndSend}
        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
      >
        <Send className="w-3.5 h-3.5" /> Send Voice
      </button>
    </div>
  );
}
