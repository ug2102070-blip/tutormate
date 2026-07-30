"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { noteSchema, type NoteFormValues } from "@/lib/validations/note";
import { revalidatePath } from "next/cache";

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
  return { success: true, noteId: note.id };
}

/**
 * Updates an existing note.
 */
export async function updateNote(noteId: string, formData: Partial<NoteFormValues>) {
  const authState = await verifyUserAuth();
  const userUid = authState.uid;
  const role = authState.role;

  const supabase = createAdminClient();

  // Validate only provided fields
  const updates: Record<string, any> = {
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
    .eq("user_id", userUid); // Extra safety check

  if (error) {
    throw new Error(`Failed to update note: ${error.message}`);
  }

  revalidatePath(`/${role}/notes`);
  return { success: true };
}

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
      updated_at: new Date().toISOString() 
    })
    .eq("id", noteId)
    .eq("user_id", userUid);

  if (error) {
    throw new Error(`Failed to toggle pin status: ${error.message}`);
  }

  revalidatePath(`/${role}/notes`);
  return { success: true };
}

/**
 * Deletes a note.
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
  return { success: true };
}
