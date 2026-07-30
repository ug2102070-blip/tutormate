"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NoteCard, type NoteData } from "./NoteCard";
import { NoteEditor } from "./NoteEditor";

interface NotesListProps {
  initialNotes: NoteData[];
}

export function NotesList({ initialNotes }: NotesListProps) {
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [editingNote, setEditingNote] = useState<NoteData | null | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Sync state when initialNotes change (via server actions & revalidation)
  // We can just rely on initialNotes, but local state helps with optimistic UI if needed.
  // For simplicity, we just pass initialNotes to a derived layout.
  
  const pinnedNotes = initialNotes.filter(n => n.is_pinned);
  const otherNotes = initialNotes.filter(n => !n.is_pinned);

  const handleCreateNew = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (note: NoteData) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingNote(undefined);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Personal Notes</h2>
          <p className="text-sm text-text-muted mt-1">
            Keep track of your thoughts, to-dos, and reminders.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Note</span>
        </button>
      </div>

      {initialNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl opacity-60 mt-8">
          <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold">No notes yet</h3>
          <p className="text-sm mt-1 max-w-sm">
            Click the button above to create your first note.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {pinnedNotes.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4 pl-1">
                Pinned
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={handleEdit} />
                ))}
              </div>
            </div>
          )}

          {otherNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4 pl-1">
                  Others
                </h3>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {otherNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={handleEdit} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isEditorOpen && (
        <NoteEditor
          note={editingNote}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}
