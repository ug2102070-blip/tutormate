"use client";

import { useEffect, useState } from "react";
import { QrCode, Copy, Check, Building2, Users, Share2, AlertCircle, Loader2 } from "lucide-react";
import { getOwnerCenterInfo } from "@/actions/ownerActions";
import type { CoachingCenterDoc } from "@/types";

export default function OwnerInvitePage() {
  const [center, setCenter] = useState<CoachingCenterDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOwnerCenterInfo();
        setCenter(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const joinLink = center
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${center.code}`
    : "";

  const copyCode = () => {
    if (!center) return;
    navigator.clipboard.writeText(center.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = () => {
    if (!center) return;
    navigator.clipboard.writeText(joinLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareLink = () => {
    if (!center || !navigator.share) return;
    navigator.share({
      title: `Join ${center.name} on TutorMate`,
      text: `Use this code to join our coaching center: ${center.code}`,
      url: joinLink,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  if (error || !center) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-3"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-500">{error ?? "No coaching center found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          Invite & QR Code
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Share this code or link with tutors to join your center
        </p>
      </div>

      {/* Center Info */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(245,158,11,0.15)" }}>
          <Building2 className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{center.name}</p>
          {center.address && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{center.address}</p>
          )}
        </div>
      </div>

      {/* QR Code visual (ASCII placeholder, real QR would need qrcode library) */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        {/* Large QR Icon as visual placeholder */}
        <div
          className="w-32 h-32 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "2px dashed rgba(245,158,11,0.4)",
          }}
        >
          <div className="text-center">
            <QrCode className="w-12 h-12 mx-auto" style={{ color: "rgb(245,158,11)" }} />
            <p className="text-[9px] mt-1 font-bold font-mono" style={{ color: "rgb(217,119,6)" }}>
              {center.code}
            </p>
          </div>
        </div>

        {/* Big Code Display */}
        <div className="text-center">
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
            Join Code
          </p>
          <p
            className="text-4xl font-black font-mono tracking-widest"
            style={{ color: "rgb(245,158,11)" }}
          >
            {center.code}
          </p>
        </div>

        {/* Copy Code Button */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "rgb(245,158,11)" }}
        >
          {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {codeCopied ? "Copied!" : "Copy Code"}
        </button>
      </div>

      {/* Share Link */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>Share Join Link</p>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
        >
          <span className="flex-1 text-xs font-mono truncate" style={{ color: "var(--color-text-muted)" }}>
            {joinLink}
          </span>
          <button
            onClick={copyLink}
            className="p-1.5 rounded-lg transition-colors shrink-0"
            style={{ background: linkCopied ? "rgba(16,185,129,0.12)" : "var(--color-bg)", border: "1px solid var(--color-border)" }}
          >
            {linkCopied
              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
            }
          </button>
        </div>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={shareLink}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl w-full justify-center transition-all hover:opacity-90"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            <Share2 className="w-3.5 h-3.5" />
            Share via App
          </button>
        )}
      </div>

      {/* Instructions */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>How tutors join</p>
        {[
          "Tutor downloads TutorMate and creates an account",
          "They go to Tutor → Coaching Center",
          "Enter the join code above to link their account to your center",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
              style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)" }}
            >
              {i + 1}
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
