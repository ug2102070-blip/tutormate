"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  QrCode, Copy, Check, Building2, Share2,
  AlertCircle, Loader2, Users, Download, RefreshCw,
  UserCheck, Clock,
} from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { getOwnerCenterInfo, getCenterInviteStats } from "@/actions/ownerActions";
import type { CoachingCenterDoc, CenterInviteStats } from "@/types";


// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString();
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OwnerInvitePage() {
  const [center, setCenter] = useState<CoachingCenterDoc | null>(null);
  const [stats, setStats] = useState<CenterInviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOwnerCenterInfo();
      setCenter(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load center info.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getCenterInviteStats();
      setStats(data);
    } catch {
      // Non-critical — ignore
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadStats();
  }, [loadData, loadStats]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinLink = center ? `${origin}/join?code=${center.code}` : "";

  const copyCode = () => {
    if (!center) return;
    navigator.clipboard.writeText(center.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const copyLink = () => {
    if (!center) return;
    navigator.clipboard.writeText(joinLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const shareLink = async () => {
    if (!center || !navigator.share) return;
    try {
      await navigator.share({
        title: `Join ${center.name} on TutorMate`,
        text: `Use code ${center.code} to join our coaching center on TutorMate.`,
        url: joinLink,
      });
    } catch {
      // User cancelled share dialog
    }
  };

  // Download QR as PNG via canvas
  const downloadQR = () => {
    // Find the hidden canvas rendered by QRCodeCanvas
    const canvas = document.getElementById("qr-download-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${center?.code ?? "tutormate"}-qr-code.png`;
    a.click();
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgb(245,158,11)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Loading invite details...
          </span>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (error || !center) {
    return (
      <div
        className="rounded-2xl p-6 flex items-center gap-3"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-500">
            {error ?? "No coaching center found."}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Please set up your coaching center in Center Settings first.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-xl font-extrabold tracking-tight flex items-center gap-2"
            style={{ color: "var(--color-text)" }}
          >
            <QrCode className="w-6 h-6" style={{ color: "rgb(245,158,11)" }} />
            Invite & QR Code
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Share with tutors to join{" "}
            <span className="font-semibold" style={{ color: "var(--color-text)" }}>
              {center.name}
            </span>
          </p>
        </div>
        <button
          onClick={() => { loadData(); loadStats(); }}
          className="p-2 rounded-xl border transition-colors"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Center Info Strip ── */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(245,158,11,0.15)" }}
        >
          <Building2 className="w-5 h-5" style={{ color: "rgb(245,158,11)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
            {center.name}
          </p>
          {center.address && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
              📍 {center.address}
            </p>
          )}
        </div>
        {/* Staff count badge */}
        {!statsLoading && stats && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
            style={{ background: "rgba(245,158,11,0.12)", color: "rgb(217,119,6)" }}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{stats.tutorCount} Tutor{stats.tutorCount !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* ── QR Code Card ── */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-5"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* Real QR Code */}
        <div className="relative">
          <div
            className="p-4 rounded-2xl shadow-lg"
            style={{
              background: "#ffffff",
              border: "4px solid rgba(245,158,11,0.3)",
            }}
          >
            <QRCodeSVG
              value={joinLink}
              size={180}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1e293b"
            />
          </div>
          {/* Scan Me label */}
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow"
            style={{ background: "rgb(245,158,11)", color: "#fff" }}
          >
            Scan to Join
          </div>
        </div>

        {/* Hidden canvas for PNG download */}
        <div style={{ display: "none" }}>
          <QRCodeCanvas
            id="qr-download-canvas"
            value={joinLink}
            size={512}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#1e293b"
          />
        </div>

        {/* Join Code Display */}
        <div className="text-center mt-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
            Join Code
          </p>
          <p
            className="text-4xl font-black font-mono tracking-widest"
            style={{ color: "rgb(245,158,11)" }}
          >
            {center.code}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center w-full">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
            style={{ background: "rgb(245,158,11)" }}
          >
            {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {codeCopied ? "Copied!" : "Copy Code"}
          </button>

          <button
            onClick={downloadQR}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:opacity-80 active:scale-95"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
              background: "var(--color-bg-secondary)",
            }}
          >
            <Download className="w-4 h-4" />
            Download QR
          </button>
        </div>
      </div>

      {/* ── Share Link Card ── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          Share Join Link
        </p>

        {/* Link input + copy */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
        >
          <span
            className="flex-1 text-xs font-mono truncate select-all"
            style={{ color: "var(--color-text-muted)" }}
          >
            {joinLink}
          </span>
          <button
            onClick={copyLink}
            className="p-1.5 rounded-lg transition-all shrink-0"
            style={{
              background: linkCopied ? "rgba(16,185,129,0.12)" : "var(--color-bg)",
              border: "1px solid var(--color-border)",
              color: linkCopied ? "#10b981" : "var(--color-text-muted)",
            }}
            title="Copy link"
          >
            {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Share via native app */}
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={shareLink}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            <Share2 className="w-4 h-4" />
            Share via App
          </button>
        )}
      </div>

      {/* ── Recent Joiners ── */}
      {!statsLoading && stats && stats.recentTutors.length > 0 && (
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" style={{ color: "rgb(16,185,129)" }} />
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Recent Joiners
            </p>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(16,185,129,0.1)", color: "rgb(16,185,129)" }}
            >
              {stats.tutorCount} total
            </span>
          </div>
          <div className="space-y-2">
            {stats.recentTutors.map((tutor) => (
              <div
                key={tutor.id}
                className="flex items-center justify-between py-2 px-3 rounded-xl"
                style={{ background: "var(--color-bg-secondary)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                    style={{ background: "rgba(245,158,11,0.15)", color: "rgb(217,119,6)" }}
                  >
                    {tutor.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                    {tutor.name}
                  </span>
                </div>
                <span
                  className="text-[11px] flex items-center gap-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <Clock className="w-3 h-3" />
                  {relativeTime(tutor.joinedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── How Tutors Join ── */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          How tutors join
        </p>
        {[
          "Tutor creates a TutorMate account (or logs in)",
          "They scan the QR code or open the share link",
          "They enter the join code on their Coaching Center page",
          "Their account is instantly linked to your center",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
              style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)" }}
            >
              {i + 1}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
