"use client";

import React, { useState, useEffect, useRef } from "react";
import { StickyNote, Plus, Trash2, Check, X, Pin, Edit3, Calendar } from "lucide-react";

export interface NoteItem {
  id: string;
  text: string;
  isPinned: boolean;
  createdAt: string;
}

export function HeaderPersonalNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notes from localStorage
  const loadNotes = () => {
    try {
      const saved = localStorage.getItem("tutormate_dashboard_multi_notes");
      if (saved) {
        setNotes(JSON.parse(saved));
      } else {
        // Migration from single note if exists
        const legacyNote = localStorage.getItem("tutormate_dashboard_personal_note");
        if (legacyNote && legacyNote.trim()) {
          const initial: NoteItem[] = [
            {
              id: "note-1",
              text: legacyNote,
              isPinned: true,
              createdAt: "Today",
            },
          ];
          setNotes(initial);
          localStorage.setItem("tutormate_dashboard_multi_notes", JSON.stringify(initial));
        } else {
          setNotes([
            {
              id: "note-1",
              text: "Remember to print Physics Chapter 4 question papers before the 4:00 PM Alpha batch class.",
              isPinned: true,
              createdAt: "Today",
            },
          ]);
        }
      }
    } catch {
      setNotes([]);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const saveNotesToStorage = (updated: NoteItem[]) => {
    setNotes(updated);
    localStorage.setItem("tutormate_dashboard_multi_notes", JSON.stringify(updated));
    window.dispatchEvent(new Event("tutormate_note_updated"));
  };

  // Close on outside click
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

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      isPinned: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [newNote, ...notes];
    saveNotesToStorage(updated);
    setNewNoteText("");
    setIsAdding(false);
  };

  const handleTogglePin = (id: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    saveNotesToStorage(updated);
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotesToStorage(updated);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) return;
    const updated = notes.map((n) => (n.id === id ? { ...n, text: editText.trim() } : n));
    saveNotesToStorage(updated);
    setEditingId(null);
    setEditText("");
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
                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-xs cursor-pointer"
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
                placeholder="Type your new personal note or reminder..."
                className="w-full p-2.5 rounded-lg border border-amber-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 outline-hidden focus:border-amber-400 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewNoteText("");
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                >
                  Add Note
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {notes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No personal notes added yet. Click &ldquo;New Note&rdquo; to create one!
              </div>
            ) : (
              notes.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all space-y-1.5 group relative ${
                    item.isPinned
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                      : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80"
                  }`}
                >
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 outline-hidden"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 text-[10px] font-bold text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2.5 py-1 rounded bg-amber-600 text-white text-[10px] font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {item.text}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-2.5 h-2.5" /> {item.createdAt}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle Pin */}
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item.id)}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              item.isPinned
                                ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 font-bold"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                            title={item.isPinned ? "Pinned to Dashboard" : "Pin to Dashboard"}
                          >
                            <Pin className="w-3 h-3" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditText(item.text);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-all cursor-pointer"
                            title="Edit Note"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(item.id)}
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
