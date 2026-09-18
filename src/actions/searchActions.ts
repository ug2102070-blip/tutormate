"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";

export interface SearchResult {
  id: string;
  type: "student" | "batch" | "exam" | "material";
  title: string;
  subtitle: string;
  href: string;
  meta?: string; // e.g. "Active" | "Class 9" | "2024-01-15"
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const authState = await verifyUserAuth();
  if (!authState?.uid) return [];

  const tutorId = authState.tutorId || authState.uid;
  const q = query.trim();
  const supabase = createAdminClient();
  const results: SearchResult[] = [];

  // ── Students ──────────────────────────────────────────────────────────────
  if (authState.role === "tutor" || authState.role === "owner" || authState.role === "admin") {
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, phone, institution, status")
      .eq("tutor_id", tutorId)
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,institution.ilike.%${q}%`)
      .limit(5);

    (students || []).forEach((s) => {
      results.push({
        id: `student-${s.id}`,
        type: "student",
        title: s.full_name,
        subtitle: s.phone + (s.institution ? ` · ${s.institution}` : ""),
        href: `/tutor/students/${s.id}`,
        meta: s.status === "active" ? "Active" : "Archived",
      });
    });
  }

  // ── Batches ───────────────────────────────────────────────────────────────
  if (authState.role === "tutor" || authState.role === "owner" || authState.role === "admin") {
    const { data: batches } = await supabase
      .from("batches")
      .select("id, name, subject, grade_class, is_archived")
      .eq("tutor_id", tutorId)
      .or(`name.ilike.%${q}%,subject.ilike.%${q}%,grade_class.ilike.%${q}%`)
      .eq("is_archived", false)
      .limit(4);

    (batches || []).forEach((b) => {
      results.push({
        id: `batch-${b.id}`,
        type: "batch",
        title: b.name,
        subtitle: [b.subject, b.grade_class].filter(Boolean).join(" · ") || "Batch",
        href: `/tutor/batches/${b.id}`,
        meta: b.is_archived ? "Archived" : "Active",
      });
    });
  }

  // ── Exams ─────────────────────────────────────────────────────────────────
  if (authState.role === "tutor" || authState.role === "owner") {
    const { data: exams } = await supabase
      .from("exams")
      .select("id, title, subject, exam_date")
      .eq("tutor_id", tutorId)
      .or(`title.ilike.%${q}%,subject.ilike.%${q}%`)
      .order("exam_date", { ascending: false })
      .limit(3);

    (exams || []).forEach((e) => {
      results.push({
        id: `exam-${e.id}`,
        type: "exam",
        title: e.title,
        subtitle: e.subject ? `Subject: ${e.subject}` : "Exam",
        href: `/tutor/exams`,
        meta: e.exam_date
          ? new Date(e.exam_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : undefined,
      });
    });
  }

  // ── Study Materials ───────────────────────────────────────────────────────
  if (authState.role === "tutor" || authState.role === "owner") {
    const { data: materials } = await supabase
      .from("study_materials")
      .select("id, title, created_at")
      .eq("tutor_id", tutorId)
      .ilike("title", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(3);

    (materials || []).forEach((m) => {
      results.push({
        id: `material-${m.id}`,
        type: "material",
        title: m.title,
        subtitle: "Study Material",
        href: `/tutor/materials`,
        meta: m.created_at
          ? new Date(m.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          : undefined,
      });
    });
  }

  return results;
}
