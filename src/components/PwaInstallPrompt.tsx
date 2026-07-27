"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    const isDismissed = localStorage.getItem("tutormate_pwa_dismissed");
    if (isDismissed) return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      setShowPrompt(true);
      return;
    }

    // Handle beforeinstallprompt for Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem("tutormate_pwa_dismissed", "true");
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-40 bg-white dark:bg-[#131b2e] border border-indigo-100 p-4 rounded-2xl shadow-xl animate-fade-in flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold shrink-0 shadow-xs text-base">
        TM
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Install TutorMate App</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
          {isIos
            ? "Tap Share and select 'Add to Home Screen' for quick access."
            : "Install TutorMate on your device for a fast, app-like experience."}
        </p>

        <div className="flex items-center gap-2 mt-2.5">
          {!isIos && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}

          {isIos && (
            <span className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg flex items-center gap-1 border border-indigo-100">
              <Share className="w-3.5 h-3.5" /> Share → Add to Home Screen
            </span>
          )}

          <button
            onClick={handleDismiss}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dismiss prompt"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
