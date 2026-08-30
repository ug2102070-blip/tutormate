"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { StickyNote, Plus, Trash2, Check, X, Pin, Edit3, Calendar, Loader2 } from "lucide-react";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  togglePinNote,
} from "@/actions/noteActions";
import type { NoteDoc } from "@/actions/noteActions";

/**
 * HeaderPersonalNote — DB-connected Quick Notes panel
 *
 * Phase 1 fix: All reads and writes now go through noteActions.ts (Supabase).
 * localStorage is kept ONLY as an optimistic cache for instant UI updates.
 * The DB is the source of truth — a page refresh always shows the correct state.
 *
 * Migration: Existing localStorage notes are NOT migrated automatically.
 * Users will see their DB notes on load. Old localStorage notes are ignored.
 */
export function HeaderPersonalNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<NoteDoc[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  // ── Load notes from DB on first open ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen || hasFetched.current) return;
    hasFetched.current = true;

    setIsLoading(true);
    getNotes()
      .then((data) => setNotes(data))
      .catch(() => {
        // Silent fail — show empty state
        setNotes([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setEditingId(null);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // ── Add note ────────────────────────────────────────────────────────────────
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;

    const optimisticNote: NoteDoc = {
      id: `optimistic-${Date.now()}`,
      userId: "",
      title: newNoteText.trim(),
      content: "",
      color: "default",
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    setNotes((prev) => [optimisticNote, ...prev]);
    const textToSave = newNoteText.trim();
    setNewNoteText("");
    setIsAdding(false);

    startTransition(async () => {
      try {
        const result = await createNote({
          title: textToSave,
          content: "",
          color: "default",
          is_pinned: true,
        });
        if (result.success && result.noteId) {
          // Replace optimistic note with real one from DB
          setNotes((prev) =>
            prev.map((n) =>
              n.id === optimisticNote.id
                ? { ...n, id: result.noteId as string }
                : n
            )
          );
          // Dispatch event so DashboardClientUI pinned note banner updates
          window.dispatchEvent(new Event("tutormate_note_updated"));
        }
      } catch {
        // Rollback optimistic note
        setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id));
      }
    });
  };

  // ── Toggle pin ──────────────────────────────────────────────────────────────
  const handleTogglePin = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const newPinned = !note.isPinned;

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: newPinned } : n))
    );

    startTransition(async () => {
      try {
        await togglePinNote(id, newPinned);
        window.dispatchEvent(new Event("tutormate_note_updated"));
      } catch {
        // Rollback
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isPinned: !newPinned } : n))
        );
      }
    });
  };

  // ── Delete note ─────────────────────────────────────────────────────────────
  const handleDeleteNote = (id: string) => {
    const prev = [...notes];
    // Optimistic remove
    setNotes((curr) => curr.filter((n) => n.id !== id));

    startTransition(async () => {
      try {
        await deleteNote(id);
        window.dispatchEvent(new Event("tutormate_note_updated"));
      } catch {
        // Rollback
        setNotes(prev);
      }
    });
  };

  // ── Save edit ───────────────────────────────────────────────────────────────
  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) return;
    const text = editText.trim();
    const prev = notes.find((n) => n.id === id);

    // Optimistic update
    setNotes((curr) =>
      curr.map((n) => (n.id === id ? { ...n, title: text } : n))
    );
    setEditingId(null);
    setEditText("");

    startTransition(async () => {
      try {
        await updateNote(id, { title: text });
        window.dispatchEvent(new Event("tutormate_note_updated"));
      } catch {
        // Rollback
        if (prev) {
          setNotes((curr) => curr.map((n) => (n.id === id ? prev : n)));
        }
      }
    });
  };

  const pinnedCount = notes.filter((n) => n.isPinned).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Header Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl border transition-all active:scale-95 relative cursor-pointer ${
          notes.length > 0
            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800"
        }`}
        title="Personal Sticky Notes"
      >
        <StickyNote className="w-4 h-4" />
        {notes.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
            {notes.length}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-11 w-84 sm:w-96 rounded-2xl p-4 shadow-2xl border z-50 animate-scale-in space-y-3"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 20px 40px -15px rgba(0,0,0,0.25)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <StickyNote className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-extrabold text-xs" style={{ color: "var(--color-text)" }}>
                  Personal Quick Notes
                </span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-bold">
                  ({notes.length} notes • {pinnedCount} pinned)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                disabled={isPending}
                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Plus className="w-3 h-3" />
                <span>New Note</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Note Form */}
          {isAdding && (
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2 animate-in fade-in">
              <textarea
                autoFocus
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddNote();
                  if (e.key === "Escape") { setIsAdding(false); setNewNoteText(""); }
                }}
                placeholder="Type your note... (Ctrl+Enter to save)"
                className="w-full p-2.5 rounded-lg border border-amber-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 outline-hidden focus:border-amber-400 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewNoteText(""); }}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim() || isPending}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Loading notes…</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No personal notes yet. Click &ldquo;New Note&rdquo; to create one!
              </div>
            ) : (
              notes.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all space-y-1.5 group relative ${
                    item.id.startsWith("optimistic-")
                      ? "opacity-60 animate-pulse"
                      : item.isPinned
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                      : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80"
                  }`}
                >
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSaveEdit(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 outline-hidden"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 text-[10px] font-bold text-slate-400 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2.5 py-1 rounded bg-amber-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {item.title}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(item.updatedAt).toLocaleDateString("en-BD", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item.id)}
                            disabled={isPending}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              item.isPinned
                                ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 font-bold"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                            title={item.isPinned ? "Pinned to Dashboard" : "Pin to Dashboard"}
                          >
                            <Pin className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => { setEditingId(item.id); setEditText(item.title); }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-all cursor-pointer"
                            title="Edit Note"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteNote(item.id)}
                            disabled={isPending}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
