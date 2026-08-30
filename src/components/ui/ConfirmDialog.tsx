"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = red confirm button (delete/irreversible). "warning" = amber. Default: "danger" */
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog — Accessible modal confirmation dialog.
 *
 * Use this before ALL destructive server actions:
 *   - Delete student, batch, exam, assignment, note, material, fee record
 *   - Archive batch permanently
 *   - Remove student from batch
 *
 * Usage:
 *   const { confirm, ConfirmDialogNode } = useConfirm();
 *   ...
 *   {ConfirmDialogNode}
 *   <button onClick={async () => {
 *     const ok = await confirm({ title: "Delete student?", description: "..." });
 *     if (ok) await deleteStudent(id);
 *   }}>Delete</button>
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button on open (safer default)
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard: Escape cancels, Enter confirms
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const confirmBtnClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 shadow-rose-500/30"
      : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 shadow-amber-500/30";

  const iconBgClass =
    variant === "danger"
      ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
      : "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 fade-in"
      >
        <div
          className="rounded-2xl p-6 shadow-2xl border"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}>
              {variant === "danger" ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2
                id="confirm-dialog-title"
                className="text-sm font-extrabold"
                style={{ color: "var(--color-text)" }}
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="text-xs mt-1 leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-5">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {cancelLabel}
            </button>

            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 ${confirmBtnClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
