"use client";

import { useState, useCallback } from "react";
import { Pin, PinOff, Trash2, Edit3 } from "lucide-react";
import { deleteNote, togglePinNote } from "@/actions/noteActions";

export interface NoteData {
  id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteCardProps {
  note: NoteData;
  onEdit: (note: NoteData) => void;
}

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: "var(--color-surface)", border: "var(--color-border)", text: "var(--color-text)" },
  blue: { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.2)", text: "var(--color-text)" },
  green: { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.2)", text: "var(--color-text)" },
  yellow: { bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.2)", text: "var(--color-text)" },
  pink: { bg: "rgba(236, 72, 153, 0.1)", border: "rgba(236, 72, 153, 0.2)", text: "var(--color-text)" },
  purple: { bg: "rgba(139, 92, 246, 0.1)", border: "rgba(139, 92, 246, 0.2)", text: "var(--color-text)" },
};

export function NoteCard({ note, onEdit }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((text: string, type: "success" | "error") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        setIsDeleting(true);
        await deleteNote(note.id);
        showToast("Note deleted", "success");
      } catch (error) {
        showToast("Failed to delete note", "error");
        console.error(error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinning) return;
    
    try {
      setIsPinning(true);
      await togglePinNote(note.id, !note.is_pinned);
      showToast(note.is_pinned ? "Note unpinned" : "Note pinned", "success");
    } catch (error) {
      showToast("Failed to update note", "error");
      console.error(error);
    } finally {
      setIsPinning(false);
    }
  };

  const themeColors = colorMap[note.color] || colorMap.default;

  return (
    <div
      onClick={() => onEdit(note)}
      className="group relative flex flex-col p-5 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer overflow-hidden min-h-[160px]"
      style={{
        background: themeColors.bg,
        borderColor: themeColors.border,
        color: themeColors.text,
      }}
    >
      <div className="flex justify-between items-start gap-4 mb-2">
        <h3 className="font-bold text-[15px] leading-tight line-clamp-2 pr-8">
          {note.title}
        </h3>
        
        {/* Actions inside header - visible on hover or if pinned */}
        <div className={`absolute top-4 right-4 flex items-center gap-1.5 transition-opacity duration-200 ${note.is_pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={handlePinToggle}
            disabled={isPinning}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={note.is_pinned ? "Unpin" : "Pin"}
          >
            {note.is_pinned ? (
              <PinOff className="w-4 h-4" />
            ) : (
              <Pin className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 text-sm opacity-80 whitespace-pre-wrap break-words line-clamp-5">
        {note.content}
      </div>

      <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs opacity-60">
        <span>{new Date(note.updated_at).toLocaleDateString()}</span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="p-1 hover:text-primary transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(note); }}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1 hover:text-red-500 transition-colors"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline toast feedback */}
      {toastMsg && (
        <div
          className={`absolute bottom-3 left-3 right-3 text-xs font-semibold py-1.5 px-3 rounded-lg text-white text-center z-10 transition-opacity ${
            toastMsg.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
