"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CenterNotice {
  id: string;
  coachingCenterId: string;
  ownerUid: string;
  title: string;
  content: string;
  target: "everyone" | "tutors" | "students";
  noticeDate: string;
  noticeTime: string;
  isPinned: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface TutorNotice {
  id: string;
  tutorId: string;
  title: string;
  content: string;
  target: "all" | "students" | "parents";
  noticeDate: string;
  noticeTime: string;
  isPinned: boolean;
  updatedAt: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the correct tutors.id (UUID) for the authenticated user.
 * auth.tutorId from authHelpers may be profile.id fallback — this ensures
 * we always get the real tutors.id by looking up user_id.
 */
async function resolveTutorId(authUid: string): Promise<string | null> {
  const adminSupabase = createAdminClient();
  const { data: tutor } = await adminSupabase
    .from("tutors")
    .select("id")
    .eq("user_id", authUid)
    .maybeSingle();
  return tutor?.id ?? null;
}

function mapCenterNotice(n: Record<string, unknown>): CenterNotice {
  return {
    id: n.id as string,
    coachingCenterId: n.coaching_center_id as string,
    ownerUid: n.owner_uid as string,
    title: n.title as string,
    content: n.content as string,
    target: n.target as CenterNotice["target"],
    noticeDate: n.notice_date as string,
    noticeTime: n.notice_time as string,
    isPinned: (n.is_pinned as boolean) ?? false,
    updatedAt: n.updated_at as string,
    createdAt: n.created_at as string,
  };
}

function mapTutorNotice(n: Record<string, unknown>): TutorNotice {
  return {
    id: n.id as string,
    tutorId: n.tutor_id as string,
    title: n.title as string,
    content: n.content as string,
    target: n.target as TutorNotice["target"],
    noticeDate: n.notice_date as string,
    noticeTime: n.notice_time as string,
    isPinned: (n.is_pinned as boolean) ?? false,
    updatedAt: n.updated_at as string,
    createdAt: n.created_at as string,
  };
}

// ─── OWNER: Center Notices ─────────────────────────────────────────────────────

/**
 * Fetch all notices for the owner's coaching center.
 * Pinned notices always come first.
 */
export async function getCenterNotices(): Promise<CenterNotice[]> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("id")
    .eq("owner_uid", auth.uid)
    .maybeSingle();

  if (!center) return [];

  const { data: notices, error } = await adminSupabase
    .from("center_notices")
    .select("*")
    .eq("coaching_center_id", center.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!notices) return [];

  return notices.map(mapCenterNotice);
}

/**
 * Create a new center notice (Owner only).
 */
export async function createCenterNotice(formData: FormData): Promise<CenterNotice> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const target = (formData.get("target") as string) || "everyone";
  const noticeDate = (formData.get("noticeDate") as string) || new Date().toISOString().split("T")[0];
  const noticeTime = (formData.get("noticeTime") as string) || "09:00";

  if (!title || title.length > 200) {
    throw new Error("Title must be between 1 and 200 characters.");
  }
  if (!content || content.length > 2000) {
    throw new Error("Content must be between 1 and 2000 characters.");
  }
  if (!["everyone", "tutors", "students"].includes(target)) {
    throw new Error("Invalid target audience.");
  }

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("id")
    .eq("owner_uid", auth.uid)
    .maybeSingle();

  if (!center) {
    throw new Error("No coaching center found. Please set up your center first.");
  }

  const { data: notice, error } = await adminSupabase
    .from("center_notices")
    .insert({
      coaching_center_id: center.id,
      owner_uid: auth.uid,
      title,
      content,
      target,
      notice_date: noticeDate,
      notice_time: noticeTime,
      is_pinned: false,
    })
    .select()
    .single();

  if (error || !notice) {
    throw new Error(error?.message || "Failed to create notice.");
  }

  // Broadcast notifications to connected tutors (non-blocking)
  if (target === "everyone" || target === "tutors") {
    try {
      const { data: centerTutors } = await adminSupabase
        .from("tutors")
        .select("user_id")
        .eq("coaching_center_id", center.id)
        .neq("user_id", auth.uid);

      if (centerTutors && centerTutors.length > 0) {
        const rows = centerTutors
          .filter((t) => t.user_id)
          .map((t) => ({
            user_id: t.user_id,
            title: `📢 Center Notice: ${title}`,
            body: content,
            type: "announcement" as const,
            reference_id: notice.id,
            reference_type: "center_notice",
          }));
        if (rows.length > 0) {
          await adminSupabase.from("notifications").insert(rows);
        }
      }
    } catch {
      // Notifications are non-critical — notice creation succeeds regardless
      console.warn("[noticeActions] Failed to send notifications for center notice:", notice.id);
    }
  }

  return mapCenterNotice(notice);
}

/**
 * Update an existing center notice (Owner only).
 */
export async function updateCenterNotice(
  noticeId: string,
  formData: FormData
): Promise<CenterNotice> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const target = (formData.get("target") as string) || "everyone";
  const noticeDate = (formData.get("noticeDate") as string);
  const noticeTime = (formData.get("noticeTime") as string);

  if (!title || title.length > 200) {
    throw new Error("Title must be between 1 and 200 characters.");
  }
  if (!content || content.length > 2000) {
    throw new Error("Content must be between 1 and 2000 characters.");
  }
  if (!["everyone", "tutors", "students"].includes(target)) {
    throw new Error("Invalid target audience.");
  }

  const { data: notice, error } = await adminSupabase
    .from("center_notices")
    .update({ title, content, target, notice_date: noticeDate, notice_time: noticeTime })
    .eq("id", noticeId)
    .eq("owner_uid", auth.uid) // ownership check
    .select()
    .single();

  if (error || !notice) {
    throw new Error(error?.message || "Failed to update notice.");
  }

  return mapCenterNotice(notice);
}

/**
 * Toggle the pinned state of a center notice (Owner only).
 */
export async function togglePinCenterNotice(
  noticeId: string,
  currentlyPinned: boolean
): Promise<CenterNotice> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const { data: notice, error } = await adminSupabase
    .from("center_notices")
    .update({ is_pinned: !currentlyPinned })
    .eq("id", noticeId)
    .eq("owner_uid", auth.uid)
    .select()
    .single();

  if (error || !notice) {
    throw new Error(error?.message || "Failed to update pin status.");
  }

  return mapCenterNotice(notice);
}

/**
 * Delete a center notice (Owner only).
 */
export async function deleteCenterNotice(noticeId: string): Promise<void> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("center_notices")
    .delete()
    .eq("id", noticeId)
    .eq("owner_uid", auth.uid);

  if (error) {
    throw new Error(error.message || "Failed to delete notice.");
  }
}

// ─── TUTOR: Tutor Notices ─────────────────────────────────────────────────────

/**
 * Fetch all notices for the authenticated tutor.
 * Pinned notices always come first.
 */
export async function getTutorNotices(): Promise<TutorNotice[]> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  // Always resolve tutorId via user_id → tutors.id mapping
  const tutorId = await resolveTutorId(auth.uid);
  if (!tutorId) return [];

  const { data: notices, error } = await adminSupabase
    .from("tutor_notices")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!notices) return [];

  return notices.map(mapTutorNotice);
}

/**
 * Create a new tutor notice (Tutor only).
 */
export async function createTutorNotice(formData: FormData): Promise<TutorNotice> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const tutorId = await resolveTutorId(auth.uid);
  if (!tutorId) throw new Error("Tutor profile not found.");

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const target = (formData.get("target") as string) || "all";
  const noticeDate = (formData.get("noticeDate") as string) || new Date().toISOString().split("T")[0];
  const noticeTime = (formData.get("noticeTime") as string) || "09:00";

  if (!title || title.length > 200) {
    throw new Error("Title must be between 1 and 200 characters.");
  }
  if (!content || content.length > 2000) {
    throw new Error("Content must be between 1 and 2000 characters.");
  }
  if (!["all", "students", "parents"].includes(target)) {
    throw new Error("Invalid target audience.");
  }

  const { data: notice, error } = await adminSupabase
    .from("tutor_notices")
    .insert({
      tutor_id: tutorId,
      title,
      content,
      target,
      notice_date: noticeDate,
      notice_time: noticeTime,
      is_pinned: false,
    })
    .select()
    .single();

  if (error || !notice) {
    throw new Error(error?.message || "Failed to create notice.");
  }

  // Broadcast notifications to students/parents (non-blocking)
  try {
    if (target === "all" || target === "students") {
      const { data: students } = await adminSupabase
        .from("students")
        .select("auth_uid")
        .eq("tutor_id", tutorId)
        .eq("status", "active")
        .not("auth_uid", "is", null);

      if (students && students.length > 0) {
        const rows = students
          .filter((s) => s.auth_uid)
          .map((s) => ({
            user_id: s.auth_uid,
            title: `📢 Notice: ${title}`,
            body: content,
            type: "announcement" as const,
            reference_id: notice.id,
            reference_type: "tutor_notice",
          }));
        if (rows.length > 0) await adminSupabase.from("notifications").insert(rows);
      }
    }

    if (target === "all" || target === "parents") {
      const { data: students } = await adminSupabase
        .from("students")
        .select("id")
        .eq("tutor_id", tutorId)
        .eq("status", "active");

      if (students && students.length > 0) {
        const studentIds = students.map((s) => s.id);
        const { data: parentLinks } = await adminSupabase
          .from("parent_links")
          .select("parent_uid")
          .in("student_id", studentIds);

        if (parentLinks && parentLinks.length > 0) {
          const rows = parentLinks.map((p) => ({
            user_id: p.parent_uid,
            title: `📢 Notice: ${title}`,
            body: content,
            type: "announcement" as const,
            reference_id: notice.id,
            reference_type: "tutor_notice",
          }));
          await adminSupabase.from("notifications").insert(rows);
        }
      }
    }
  } catch {
    console.warn("[noticeActions] Failed to send notifications for tutor notice:", notice.id);
  }

  return mapTutorNotice(notice);
}

/**
 * Update an existing tutor notice (Tutor only).
 */
export async function updateTutorNotice(
  noticeId: string,
  formData: FormData
): Promise<TutorNotice> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const tutorId = await resolveTutorId(auth.uid);
  if (!tutorId) throw new Error("Tutor profile not found.");

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const target = (formData.get("target") as string) || "all";
  const noticeDate = (formData.get("noticeDate") as string);
  const noticeTime = (formData.get("noticeTime") as string);

  if (!title || title.length > 200) {
    throw new Error("Title must be between 1 and 200 characters.");
  }
  if (!content || content.length > 2000) {
    throw new Error("Content must be between 1 and 2000 characters.");
  }
  if (!["all", "students", "parents"].includes(target)) {
    throw new Error("Invalid target audience.");
  }

  const { data: notice, error } = await adminSupabase
    .from("tutor_notices")
    .update({ title, content, target, notice_date: noticeDate, notice_time: noticeTime })
    .eq("id", noticeId)
    .eq("tutor_id", tutorId) // ownership check
    .select()
    .single();

  if (error || !notice) {
    throw new Error(error?.message || "Failed to update notice.");
  }

  return mapTutorNotice(notice);
}

/**
 * Toggle the pinned state of a tutor notice (Tutor only).
 */
export async function togglePinTutorNotice(
  noticeId: string,
  currentlyPinned: boolean
): Promise<TutorNotice> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const tutorId = await resolveTutorId(auth.uid);
  if (!tutorId) throw new Error("Tutor profile not found.");

  const { data: notice, error } = await adminSupabase
    .from("tutor_notices")
    .update({ is_pinned: !currentlyPinned })
    .eq("id", noticeId)
    .eq("tutor_id", tutorId)
    .select()
    .single();

  if (error || !notice) {
    throw new Error(error?.message || "Failed to update pin status.");
  }

  return mapTutorNotice(notice);
}

/**
 * Delete a tutor notice (Tutor only).
 */
export async function deleteTutorNotice(noticeId: string): Promise<void> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const tutorId = await resolveTutorId(auth.uid);
  if (!tutorId) throw new Error("Tutor profile not found.");

  const { error } = await adminSupabase
    .from("tutor_notices")
    .delete()
    .eq("id", noticeId)
    .eq("tutor_id", tutorId);

  if (error) {
    throw new Error(error.message || "Failed to delete notice.");
  }
}

/**
 * Get center notices visible to a tutor (from their coaching center).
 * Target must be 'everyone' or 'tutors'. Pinned first.
 */
export async function getCenterNoticesForTutor(): Promise<CenterNotice[]> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  // Resolve actual tutors.id from user_id
  const tutorId = await resolveTutorId(auth.uid);
  if (!tutorId) return [];

  const { data: tutor } = await adminSupabase
    .from("tutors")
    .select("coaching_center_id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!tutor?.coaching_center_id) return [];

  const { data: notices, error } = await adminSupabase
    .from("center_notices")
    .select("*")
    .eq("coaching_center_id", tutor.coaching_center_id)
    .in("target", ["everyone", "tutors"])
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!notices) return [];

  return notices.map(mapCenterNotice);
}
