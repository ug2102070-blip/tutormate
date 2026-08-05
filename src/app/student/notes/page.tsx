export const dynamic = "force-dynamic";
import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { NotesList } from "@/components/notes/NotesList";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Personal Notes | TutorMate",
  description: "Manage your personal notes",
};

export default async function StudentNotesPage() {
  const authState = await verifyUserAuth();

  if (authState.role !== "student") {
    redirect(`/${authState.role}/dashboard`);
  }

  const supabase = createAdminClient();

  const { data: notes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", authState.uid)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch notes:", error);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <NotesList initialNotes={notes || []} />
    </div>
  );
}
