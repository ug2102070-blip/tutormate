"use client";

import { useState, useEffect, useRef } from "react";
import { X, Save, Palette } from "lucide-react";
import { createNote, updateNote } from "@/actions/noteActions";
import type { NoteData } from "./NoteCard";
import type { NoteFormValues } from "@/lib/validations/note";

interface NoteEditorProps {
  note?: NoteData | null;
  onClose: () => void;
}

const COLORS = [
  { id: "default", label: "Default" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "yellow", label: "Yellow" },
  { id: "pink", label: "Pink" },
  { id: "purple", label: "Purple" },
];

export function NoteEditor({ note, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [color, setColor] = useState(note?.color || "default");
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg("Title is required");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      const formData: NoteFormValues = {
        title: title.trim(),
        content: content.trim(),
        color: color as any,
        is_pinned: isPinned,
      };

      if (note) {
        await updateNote(note.id, formData);
        setSuccessMsg("Note updated!");
      } else {
        await createNote(formData);
        setSuccessMsg("Note created!");
      }
      setTimeout(() => onClose(), 600);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to save note");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl bg-surface border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Header Options */}
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2 text-sm text-text-muted"
            >
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Color</span>
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-surface border rounded-xl shadow-xl flex gap-1 z-10 flex-wrap w-[180px]">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setColor(c.id); setShowColorPicker(false); }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c.id ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: 
                        c.id === 'default' ? 'var(--color-bg-secondary)' :
                        c.id === 'blue' ? 'rgba(59, 130, 246, 0.5)' :
                        c.id === 'green' ? 'rgba(16, 185, 129, 0.5)' :
                        c.id === 'yellow' ? 'rgba(245, 158, 11, 0.5)' :
                        c.id === 'pink' ? 'rgba(236, 72, 153, 0.5)' :
                        'rgba(139, 92, 246, 0.5)'
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none outline-none placeholder:opacity-40"
            autoFocus={!note}
          />
          <textarea
            ref={textareaRef}
            placeholder="Take a note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-sm sm:text-base bg-transparent border-none outline-none resize-none placeholder:opacity-40 min-h-[150px] font-sans leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 flex justify-between items-center bg-bg-secondary/50">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted hover:text-text transition-colors">
            <input 
              type="checkbox" 
              checked={isPinned} 
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            Pin this note
          </label>

          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: "var(--color-primary)",
              color: "white",
            }}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : note ? "Update" : "Save"}
          </button>
        </div>
        {/* Toast feedback bar */}
        {(errorMsg || successMsg) && (
          <div
            className={`mx-4 mb-2 py-2 px-4 rounded-xl text-sm font-semibold text-white text-center ${
              errorMsg ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            {errorMsg || successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
