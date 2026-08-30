"use client";

import { useState, useEffect, useTransition } from "react";
import {
  MessageCircle,
  X,
  Check,
  AlertCircle,
  Loader2,
  Send,
  Phone,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  getUnpaidFeesForReminder,
  sendFeeReminders,
  type FeeReminderTarget,
  type ReminderResult,
} from "@/actions/feeReminderActions";
import { formatBDT } from "@/lib/utils";

interface FeeReminderPanelProps {
  batchId: string;
  year: number;
  month: number;
  onClose: () => void;
}

type SendState = "idle" | "sending" | "done";

/**
 * FeeReminderPanel — WhatsApp bulk reminder UI.
 *
 * Wires the existing whatsapp.ts utility to a real user interface.
 * Shows all unpaid/partial fee students for the selected month,
 * allows selecting recipients, then sends bilingual reminders.
 *
 * Works in MOCK mode if TWILIO_* env vars aren't set — ideal for development.
 */
export function FeeReminderPanel({ batchId, year, month, onClose }: FeeReminderPanelProps) {
  const [targets, setTargets] = useState<FeeReminderTarget[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [results, setResults] = useState<ReminderResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  useEffect(() => {
    setIsLoading(true);
    getUnpaidFeesForReminder(batchId, year, month)
      .then((data) => {
        setTargets(data);
        // Pre-select all by default
        setSelectedIds(new Set(data.map((t) => t.feeId)));
      })
      .catch(() => setTargets([]))
      .finally(() => setIsLoading(false));
  }, [batchId, year, month]);

  const toggleAll = () => {
    if (selectedIds.size === targets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(targets.map((t) => t.feeId)));
    }
  };

  const toggleOne = (feeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(feeId)) next.delete(feeId);
      else next.add(feeId);
      return next;
    });
  };

  const handleSend = () => {
    if (selectedIds.size === 0) return;
    setSendState("sending");

    startTransition(async () => {
      try {
        const res = await sendFeeReminders(Array.from(selectedIds));
        setResults(res.results);
        setSendState("done");
      } catch {
        setSendState("idle");
      }
    });
  };

  const allSelected = targets.length > 0 && selectedIds.size === targets.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        style={{ background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                WhatsApp Fee Reminders
              </h2>
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {monthNames[month - 1]} {year} · Unpaid students
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sendState === "done" ? (
            /* Results view */
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {results.filter((r) => r.success).length} sent ·{" "}
                  {results.filter((r) => !r.success).length} failed
                </p>
              </div>

              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between p-3 rounded-xl border text-xs"
                  style={{
                    borderColor: "var(--color-border)",
                    background: r.success
                      ? "rgba(16,185,129,0.04)"
                      : "rgba(239,68,68,0.04)",
                  }}
                >
                  <div>
                    <p className="font-bold" style={{ color: "var(--color-text)" }}>
                      {r.studentName}
                    </p>
                    <p className="font-mono text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {r.phone}
                    </p>
                    {r.error && (
                      <p className="text-rose-500 text-[10px] mt-0.5">{r.error}</p>
                    )}
                  </div>
                  {r.success ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading unpaid fees…</span>
            </div>
          ) : targets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 text-center">
              <Check className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-600">All fees paid!</p>
              <p className="text-xs">No outstanding fees for {monthNames[month - 1]} {year}.</p>
            </div>
          ) : (
            <>
              {/* Message preview */}
              <div
                className="p-3 rounded-xl border text-xs leading-relaxed"
                style={{
                  background: "rgba(16,185,129,0.06)",
                  borderColor: "rgba(16,185,129,0.2)",
                  color: "var(--color-text-muted)",
                }}
              >
                <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 text-[10px] uppercase tracking-wide">
                  Message Preview
                </p>
                <p>
                  প্রিয় [Name], {monthNames[month - 1]} {year} মাসের টিউশন ফি ৳[Amount] এখনো বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন।
                </p>
                <p className="mt-1 text-slate-400 text-[10px]">
                  Dear [Name], your tuition fee of ৳[Amount] for {monthNames[month - 1]} {year} is still due.
                </p>
              </div>

              {/* Select all */}
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-2 text-xs font-bold cursor-pointer w-full px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                style={{ color: "var(--color-text-muted)" }}
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select all ({targets.length} students)
              </button>

              {/* Student list */}
              <div className="space-y-2">
                {targets.map((t) => (
                  <button
                    key={t.feeId}
                    type="button"
                    onClick={() => toggleOne(t.feeId)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left"
                    style={{
                      borderColor: selectedIds.has(t.feeId)
                        ? "rgba(16,185,129,0.4)"
                        : "var(--color-border)",
                      background: selectedIds.has(t.feeId)
                        ? "rgba(16,185,129,0.06)"
                        : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedIds.has(t.feeId) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--color-text)" }}>
                          {t.studentName}
                        </p>
                        <p className="text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                          <Phone className="w-2.5 h-2.5" />
                          {t.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-rose-600 shrink-0 ml-2">
                      {formatBDT(t.amountDue)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {sendState !== "done" && (
          <div className="p-5 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={handleSend}
              disabled={selectedIds.size === 0 || isPending || isLoading || sendState === "sending"}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md"
            >
              {sendState === "sending" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending reminders…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send to {selectedIds.size} student{selectedIds.size !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}

        {sendState === "done" && (
          <div className="p-5 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 rounded-xl border text-sm font-bold transition-all"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
