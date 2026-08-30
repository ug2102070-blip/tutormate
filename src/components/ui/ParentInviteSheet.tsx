"use client";

import { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  MessageSquare,
  Copy,
  Check,
  QrCode,
  Share2,
  ExternalLink,
} from "lucide-react";
import { generateParentInvite } from "@/actions/tutorStudentActions";

interface ParentInviteData {
  studentName: string;
  inviteCode: string;
  joinUrl: string;
  guardianPhone: string | null;
  whatsappLink: string;
  smsLink: string | null;
}

interface ParentInviteSheetProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

export default function ParentInviteSheet({
  studentId,
  studentName,
  onClose,
}: ParentInviteSheetProps) {
  const [data, setData] = useState<ParentInviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await generateParentInvite({ studentId });
        if (res.success && res.data) {
          setData(res.data as ParentInviteData);
        } else {
          setError(res.error || "Failed to generate invite.");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to generate invite.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Generate QR code URL using a free public service
  const qrUrl = data
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.joinUrl)}&bgcolor=ffffff&color=4f46e5&margin=10`
    : null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet panel */}
      <div className="w-full sm:max-w-md bg-white dark:bg-[#131b2e] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Parent Invite
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                For {studentName}&apos;s Guardian
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-sm text-rose-700 dark:text-rose-400 font-medium">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Invite Code chip */}
              <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                    Invite Code
                  </p>
                  <p className="text-2xl font-mono font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400">
                    {data.inviteCode}
                  </p>
                </div>
                <button
                  onClick={copyCode}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#0b0f19] border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-50 transition-all text-indigo-600 flex items-center gap-1.5 text-xs font-bold shadow-xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Share via
                </p>

                {/* WhatsApp */}
                <a
                  href={data.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 hover:bg-[#25D366]/15 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Send via WhatsApp</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {data.guardianPhone ? `Direct message to ${data.guardianPhone}` : "Open in WhatsApp"}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </a>

                {/* SMS */}
                {data.smsLink && (
                  <a
                    href={data.smsLink}
                    className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Send SMS</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {data.guardianPhone} — Standard text message
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </a>
                )}

                {/* Copy Link */}
                <button
                  onClick={copyLink}
                  className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-700 dark:bg-slate-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {copied ? "Link Copied!" : "Copy Invite Link"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {data.joinUrl}
                    </p>
                  </div>
                </button>

                {/* QR Code Toggle */}
                <button
                  onClick={() => setShowQr((v) => !v)}
                  className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      View QR Code
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Scan to join parent portal instantly
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider shrink-0">
                    {showQr ? "Hide" : "View"}
                  </span>
                </button>

                {/* QR Code Display */}
                {showQr && qrUrl && (
                  <div className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f19]/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt={`QR code for ${studentName} parent invite`}
                      className="w-48 h-48 rounded-xl border border-slate-100 dark:border-white/10"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-center">
                      Scan QR code to join parent portal directly
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
