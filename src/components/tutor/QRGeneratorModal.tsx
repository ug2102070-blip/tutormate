"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generateQRSession, getActiveQRSession } from "@/actions/attendanceActions";
import { X, RefreshCw, Clock, Copy, Check, QrCode, Users, AlertCircle } from "lucide-react";

interface QRGeneratorModalProps {
  batchId: string;
  batchName: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated?: () => void;
}

interface ActiveSessionData {
  id: string;
  tutorId: string;
  batchId: string;
  date: string;
  token: string;
  shortCode: string;
  expiresAt: string;
  presentCount: number;
}

export function QRGeneratorModal({
  batchId,
  batchName,
  userId,
  isOpen,
  onClose,
  onSessionUpdated,
}: QRGeneratorModalProps) {
  const [session, setSession] = useState<ActiveSessionData | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Load existing session if available
  const fetchActiveSession = useCallback(async () => {
    if (!batchId || !userId) return;
    try {
      const active = await getActiveQRSession(batchId);
      if (active) {
        setSession(active);
        const remaining = Math.max(0, Math.floor((new Date(active.expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
      } else {
        setSession(null);
        setTimeLeft(0);
      }
    } catch (err: unknown) {
      console.error("Error fetching active QR session:", err);
    }
  }, [batchId, userId]);

  useEffect(() => {
    if (isOpen) {
      fetchActiveSession();
    }
  }, [isOpen, fetchActiveSession]);

  // Polling for live student scan count updates every 4 seconds
  useEffect(() => {
    if (!isOpen || !session || timeLeft <= 0) return;
    const interval = setInterval(() => {
      fetchActiveSession();
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, session, timeLeft, fetchActiveSession]);

  // Expiry countdown timer
  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [session]);

  const handleStartSession = async (mins: number = durationMinutes) => {
    if (!batchId || !userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await generateQRSession({ batchId, durationMinutes: mins });
      if (res.success && res.qrToken) {
        setSession({
          id: res.qrToken.id,
          tutorId: res.qrToken.tutorId,
          batchId: res.qrToken.batchId,
          date: res.qrToken.date,
          token: res.qrToken.token,
          shortCode: res.qrToken.shortCode,
          expiresAt: res.qrToken.expiresAt,
          presentCount: 0,
        });
        if (onSessionUpdated) onSessionUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start QR session.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!session?.shortCode) return;
    navigator.clipboard.writeText(session.shortCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const minutesStr = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secondsStr = String(timeLeft % 60).padStart(2, "0");
  const isExpired = timeLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131b2e] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">QR Attendance Mode</h2>
              <p className="text-xs text-slate-400 font-medium">{batchName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-center">
          {error && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!session || isExpired ? (
            /* Session Not Started or Expired State */
            <div className="py-4 space-y-5">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                <QrCode className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isExpired ? "QR Session Expired" : "Start QR Attendance"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Students can scan the code on screen or type the 6-digit PIN to mark attendance instantly.
                </p>
              </div>

              {/* Duration Selector */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Duration:
                </span>
                {[5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                      durationMinutes === mins
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-[#252535] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleStartSession()}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                {isExpired ? "Generate New QR Session" : "Start Session Now"}
              </button>
            </div>
          ) : (
            /* Active Live QR Session Display */
            <div className="space-y-5">
              {/* QR Code Container */}
              <div className="relative inline-block p-4 rounded-3xl bg-white border-2 border-indigo-500/30 shadow-xl">
                <QRCodeSVG
                  value={session.token}
                  size={200}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>

              {/* Countdown Timer & Live Count */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold font-mono">
                  <Clock className="w-4 h-4" />
                  <span>Expires in: {minutesStr}:{secondsStr}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <Users className="w-4 h-4" />
                  <span>Scanned: {session.presentCount}</span>
                </div>
              </div>

              {/* 6-Digit Backup PIN Display */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                    Session PIN Code
                  </div>
                  <div className="text-xl font-mono font-black tracking-widest text-indigo-600 dark:text-indigo-400">
                    {session.shortCode.slice(0, 3)} {session.shortCode.slice(3)}
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#1a233a] border border-slate-200 dark:border-white/10 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy PIN
                    </>
                  )}
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleStartSession(5)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#252535] hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  Regenerate QR
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
