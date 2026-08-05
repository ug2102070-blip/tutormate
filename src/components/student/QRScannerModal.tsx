"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { scanQRAttendance } from "@/actions/attendanceActions";
import { X, Camera, KeyRound, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface QRScannerModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QRScannerModal({
  userId,
  isOpen,
  onClose,
  onSuccess,
}: QRScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "pin">("pin");
  const [pinInput, setPinInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successData, setSuccessData] = useState<{
    batchName: string;
    date: string;
    studentName: string;
    timestamp: string;
  } | null>(null);

  // Camera stream ref & canvas scanning
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");

  const handleScanSubmit = useCallback(async (inputCode: string) => {
    if (!inputCode.trim() || !userId) return;
    setLoading(true);
    setError("");
    setSuccessData(null);

    try {
      const res = await scanQRAttendance(inputCode);
      if (res.success) {
        setSuccessData({
          batchName: res.batchName,
          date: res.date,
          studentName: res.studentName,
          timestamp: res.timestamp,
        });
        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark attendance.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, onSuccess]);

  // Handle camera stream setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animFrame: number;

    if (isOpen && activeTab === "camera" && !successData) {
      setCameraError("");
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          setCameraActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }

          // Check if BarcodeDetector API is supported natively in browser
          if ("BarcodeDetector" in window) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ["qr_code"],
            });

            const detect = async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes.length > 0 && barcodes[0].rawValue) {
                    const qrVal = barcodes[0].rawValue;
                    handleScanSubmit(qrVal);
                    return;
                  }
                } catch {
                  // Ignore detection loop errors
                }
              }
              animFrame = requestAnimationFrame(detect);
            };
            detect();
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraError("Camera access denied or unsupported on this device. Please use the 6-digit PIN tab below.");
          setCameraActive(false);
        });
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    };
  }, [isOpen, activeTab, successData, handleScanSubmit]);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanSubmit(pinInput);
  };

  const handleReset = () => {
    setSuccessData(null);
    setPinInput("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131b2e] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">QR Attendance Scanner</h2>
              <p className="text-xs text-slate-400 font-medium">Mark your daily class attendance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {successData ? (
            /* Success State */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border-2 border-emerald-500/30 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Attendance Marked!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You are present for <strong className="text-indigo-600 dark:text-indigo-400">{successData.batchName}</strong> on {successData.date} at {successData.timestamp}.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-left text-xs space-y-1">
                <div className="flex justify-between font-medium text-emerald-900 dark:text-emerald-300">
                  <span>Student Name:</span>
                  <span className="font-bold">{successData.studentName}</span>
                </div>
                <div className="flex justify-between font-medium text-emerald-900 dark:text-emerald-300">
                  <span>Method:</span>
                  <span className="font-bold">QR / Session PIN 📷</span>
                </div>
                <div className="flex justify-between font-medium text-emerald-900 dark:text-emerald-300">
                  <span>Status:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Present</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#252535] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                >
                  Scan Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Tab Content: Camera vs PIN */
            <>
              {error && (
                <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mode Switching Tabs */}
              <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setActiveTab("pin")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "pin"
                      ? "bg-white dark:bg-[#1f2b48] text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" /> 6-Digit PIN
                </button>
                <button
                  onClick={() => setActiveTab("camera")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "camera"
                      ? "bg-white dark:bg-[#1f2b48] text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Camera Scanner
                </button>
              </div>

              {activeTab === "pin" ? (
                /* 6-Digit PIN Entry Form */
                <form onSubmit={handlePinSubmit} className="space-y-4 py-2">
                  <div className="text-center">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Enter Session PIN Code or Token
                    </label>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Ask your tutor for the 6-digit code shown under the QR code
                    </p>

                    <input
                      type="text"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 489215"
                      maxLength={36}
                      className="w-full text-center px-4 py-3.5 text-xl font-mono font-black tracking-widest rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/40 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 focus:border-indigo-600 outline-none uppercase"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !pinInput.trim()}
                    className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Submit Attendance
                  </button>
                </form>
              ) : (
                /* Camera Stream Scanner View */
                <div className="space-y-4 py-2 text-center">
                  {cameraError ? (
                    <div className="p-4 text-xs font-medium rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 text-left">
                      {cameraError}
                    </div>
                  ) : (
                    <div className="relative w-full aspect-square max-w-[260px] mx-auto rounded-3xl overflow-hidden border-2 border-indigo-500/40 bg-slate-950 flex items-center justify-center shadow-lg">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                      />
                      <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none animate-pulse" />
                      {!cameraActive && (
                        <div className="absolute text-xs text-white/70 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Accessing Camera...
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Point camera at your tutor&apos;s screen QR code
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
