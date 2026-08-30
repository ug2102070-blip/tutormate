"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { noteSchema, type NoteFormValues } from "@/lib/validations/note";
import { revalidatePath } from "next/cache";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NoteDoc {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  color: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

type NoteUpdateFields = {
  updated_at: string;
  title?: string;
  content?: string;
  color?: string;
  is_pinned?: boolean;
};

function toNoteDoc(row: NoteRow): NoteDoc {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content || "",
    color: row.color || "default",
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── GET NOTES ─────────────────────────────────────────────────────────────────

/**
 * Fetches all notes for the authenticated user, ordered by pinned first then newest.
 */
export async function getNotes(): Promise<NoteDoc[]> {
  const authState = await verifyUserAuth();
  const userUid = authState.uid;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notes")
    .select("id, user_id, title, content, color, is_pinned, created_at, updated_at")
    .eq("user_id", userUid)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch notes: ${error.message}`);
  }

  return (data as NoteRow[]).map(toNoteDoc);
}

/**
 * Fetches only pinned notes for the dashboard sidebar/banner.
 * Faster than fetching all notes — only returns is_pinned=true records.
 */
export async function getDashboardPinnedNotes(): Promise<NoteDoc[]> {
  try {
    const authState = await verifyUserAuth();
    const userUid = authState.uid;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("notes")
      .select("id, user_id, title, content, color, is_pinned, created_at, updated_at")
      .eq("user_id", userUid)
      .eq("is_pinned", true)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (error) return [];
    return (data as NoteRow[]).map(toNoteDoc);
  } catch {
    return [];
  }
}

// ─── CREATE NOTE ───────────────────────────────────────────────────────────────

/**
 * Creates a new note for the authenticated user.
 */
export async function createNote(formData: NoteFormValues) {
  const authState = await verifyUserAuth();
  const userUid = authState.uid;
  const role = authState.role;

  const validated = noteSchema.parse(formData);
  const supabase = createAdminClient();

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      user_id: userUid,
      title: validated.title,
      content: validated.content || "",
      color: validated.color || "default",
      is_pinned: validated.is_pinned || false,
    })
    .select("id")
    .single();

  if (error || !note) {
    throw new Error(`Failed to create note: ${error?.message || "Unknown error"}`);
  }

  revalidatePath(`/${role}/notes`);
  revalidatePath(`/${role}/dashboard`);
  return { success: true, noteId: note.id };
}

// ─── UPDATE NOTE ───────────────────────────────────────────────────────────────

/**
 * Updates an existing note (partial update — only provided fields are changed).
 */
export async function updateNote(noteId: string, formData: Partial<NoteFormValues>) {
  const authState = await verifyUserAuth();
  const userUid = authState.uid;
  const role = authState.role;

  const supabase = createAdminClient();

  const updates: NoteUpdateFields = {
    updated_at: new Date().toISOString(),
  };

  if (formData.title !== undefined) updates.title = formData.title;
  if (formData.content !== undefined) updates.content = formData.content;
  if (formData.color !== undefined) updates.color = formData.color;
  if (formData.is_pinned !== undefined) updates.is_pinned = formData.is_pinned;

  const { error } = await supabase
    .from("notes")
    .update(updates)
    .eq("id", noteId)
    .eq("user_id", userUid); // Ownership check

  if (error) {
    throw new Error(`Failed to update note: ${error.message}`);
  }

  revalidatePath(`/${role}/notes`);
  revalidatePath(`/${role}/dashboard`);
  return { success: true };
}

// ─── TOGGLE PIN ────────────────────────────────────────────────────────────────

/**
 * Toggles the pinned status of a note.
 */
export async function togglePinNote(noteId: string, isPinned: boolean) {
  const authState = await verifyUserAuth();
  const userUid = authState.uid;
  const role = authState.role;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notes")
    .update({
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("user_id", userUid);

  if (error) {
    throw new Error(`Failed to toggle pin status: ${error.message}`);
  }

  revalidatePath(`/${role}/notes`);
  revalidatePath(`/${role}/dashboard`);
  return { success: true };
}

// ─── DELETE NOTE ───────────────────────────────────────────────────────────────

/**
 * Deletes a note (permanent — shows confirmation dialog client-side before calling).
 */
export async function deleteNote(noteId: string) {
  const authState = await verifyUserAuth();
  const userUid = authState.uid;
  const role = authState.role;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userUid);

  if (error) {
    throw new Error(`Failed to delete note: ${error.message}`);
  }

  revalidatePath(`/${role}/notes`);
  revalidatePath(`/${role}/dashboard`);
  return { success: true };
}
