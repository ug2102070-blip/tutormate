"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import {
  createCoachingCenterSchema,
  joinCoachingCenterSchema,
  updateCoachingCenterSchema,
} from "@/lib/validations/coaching";
import type {
  CoachingCenterDoc,
  CenterTutorDoc,
  CenterAnalyticsDoc,
  BatchDoc,
} from "@/types";

/**
 * Ensures the tutor record exists in public.tutors for the authenticated user.
 */
async function ensureTutorRecord(tutorId: string, email?: string) {
  const adminSupabase = createAdminClient();

  const { data: existingProfile } = await adminSupabase
    .from("profiles")
    .select("id, display_name, phone_number")
    .eq("id", tutorId)
    .maybeSingle();

  if (!existingProfile) {
    let userEmail = email || "";
    if (!userEmail) {
      try {
        const { data: userById } = await adminSupabase.auth.admin.getUserById(tutorId);
        if (userById?.user?.email) {
          userEmail = userById.user.email;
        }
      } catch {
        // ignore
      }
    }

    await adminSupabase.from("profiles").upsert({
      id: tutorId,
      email: userEmail,
      display_name: userEmail ? userEmail.split("@")[0] : "Tutor",
      role: "tutor",
      tutor_id: tutorId,
      updated_at: new Date().toISOString(),
    });
  }

  const { data: existingTutor } = await adminSupabase
    .from("tutors")
    .select("id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!existingTutor) {
    const displayName = existingProfile?.display_name || email?.split("@")[0] || "Tutor";
    const phone = existingProfile?.phone_number || "";

    await adminSupabase.from("tutors").upsert({
      id: tutorId,
      user_id: tutorId,
      full_name: displayName,
      institution: "Coaching Center",
      contact_phone: phone,
    });
  }
}

/**
 * Generates a unique 6-character alphanumeric join code.
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "CC-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new Coaching Center organization (Owner mode).
 */
export async function createCoachingCenter(formData: FormData, idToken?: string) {
  const auth = await verifyUserAuth(idToken);
  const tutorId = auth.tutorId || auth.uid;
  await ensureTutorRecord(tutorId, auth.email);

  const rawData = {
    name: formData.get("name") as string,
    address: (formData.get("address") as string) || undefined,
    contactPhone: (formData.get("contactPhone") as string) || undefined,
  };

  const validated = createCoachingCenterSchema.parse(rawData);
  const adminSupabase = createAdminClient();

  // Check if tutor already belongs to a coaching center
  const { data: tutor } = await adminSupabase
    .from("tutors")
    .select("coaching_center_id")
    .eq("id", tutorId)
    .maybeSingle();

  if (tutor?.coaching_center_id) {
    throw new Error("You are already linked to a Coaching Center. Leave your current center before creating a new one.");
  }

  // Generate unique join code
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await adminSupabase
      .from("coaching_centers")
      .select("id")
      .eq("code", joinCode)
      .maybeSingle();
    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  // Insert Coaching Center
  const { data: newCenter, error: centerError } = await adminSupabase
    .from("coaching_centers")
    .insert({
      owner_uid: auth.uid,
      name: validated.name.trim(),
      address: validated.address?.trim() || null,
      contact_phone: validated.contactPhone?.trim() || null,
      code: joinCode,
    })
    .select()
    .single();

  if (centerError || !newCenter) {
    console.error("[CoachingActions] Create error:", centerError);
    throw new Error(centerError?.message || "Failed to create coaching center.");
  }

  // Link tutor to the new coaching center
  await adminSupabase
    .from("tutors")
    .update({ coaching_center_id: newCenter.id })
    .eq("id", tutorId);

  revalidatePath("/tutor/coaching");

  return {
    success: true,
    center: {
      id: newCenter.id,
      ownerUid: newCenter.owner_uid,
      name: newCenter.name,
      address: newCenter.address,
      contactPhone: newCenter.contact_phone,
      logoUrl: newCenter.logo_url,
      code: newCenter.code,
      createdAt: newCenter.created_at,
    } as CoachingCenterDoc,
  };
}

/**
 * Get details of current user's Coaching Center.
 */
export async function getCoachingCenter(idToken?: string) {
  const auth = await verifyUserAuth(idToken);
  const tutorId = auth.tutorId || auth.uid;

  const adminSupabase = createAdminClient();

  const { data: tutor } = await adminSupabase
    .from("tutors")
    .select("coaching_center_id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!tutor?.coaching_center_id) {
    return null;
  }

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("*")
    .eq("id", tutor.coaching_center_id)
    .maybeSingle();

  if (!center) {
    return null;
  }

  const isOwner = center.owner_uid === auth.uid;

  return {
    center: {
      id: center.id,
      ownerUid: center.owner_uid,
      name: center.name,
      address: center.address,
      contactPhone: center.contact_phone,
      logoUrl: center.logo_url,
      code: center.code,
      createdAt: center.created_at,
    } as CoachingCenterDoc,
    isOwner,
  };
}

/**
 * Join an existing Coaching Center via Join Code.
 */
export async function joinCoachingCenter(formData: FormData, idToken?: string) {
  const auth = await verifyUserAuth(idToken);
  const tutorId = auth.tutorId || auth.uid;
  await ensureTutorRecord(tutorId, auth.email);

  const rawCode = (formData.get("code") as string) || "";
  const validated = joinCoachingCenterSchema.parse({ code: rawCode.trim().toUpperCase() });

  const adminSupabase = createAdminClient();

  // Find center by code
  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("id, name")
    .eq("code", validated.code)
    .maybeSingle();

  if (!center) {
    throw new Error("Invalid Coaching Center join code. Please check and try again.");
  }

  // Update tutor record
  const { error: updateError } = await adminSupabase
    .from("tutors")
    .update({ coaching_center_id: center.id })
    .eq("id", tutorId);

  if (updateError) {
    console.error("[CoachingActions] Join error:", updateError);
    throw new Error("Failed to join coaching center.");
  }

  revalidatePath("/tutor/coaching");

  return { success: true, centerName: center.name };
}

/**
 * Leave current Coaching Center (Staff Tutors only).
 */
export async function leaveCoachingCenter(idToken?: string) {
  const auth = await verifyUserAuth(idToken);
  const tutorId = auth.tutorId || auth.uid;

  const adminSupabase = createAdminClient();

  const { data: tutor } = await adminSupabase
    .from("tutors")
    .select("coaching_center_id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!tutor?.coaching_center_id) {
    throw new Error("You are not currently in a coaching center.");
  }

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("owner_uid")
    .eq("id", tutor.coaching_center_id)
    .maybeSingle();

  if (center?.owner_uid === auth.uid) {
    throw new Error("Coaching Center owners cannot leave. You can update center details or remove staff tutors.");
  }

  await adminSupabase
    .from("tutors")
    .update({ coaching_center_id: null })
    .eq("id", tutorId);

  revalidatePath("/tutor/coaching");

  return { success: true };
}

/**
 * Remove a staff tutor from the Coaching Center (Owner action).
 */
export async function removeTutorFromCenter(targetTutorId: string, idToken?: string) {
  const auth = await verifyUserAuth(idToken);
  const adminSupabase = createAdminClient();

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("id, owner_uid")
    .eq("owner_uid", auth.uid)
    .maybeSingle();

  if (!center) {
    throw new Error("Only Coaching Center owners can remove staff tutors.");
  }

  await adminSupabase
    .from("tutors")
    .update({ coaching_center_id: null })
    .eq("id", targetTutorId)
    .eq("coaching_center_id", center.id);

  revalidatePath("/tutor/coaching");

  return { success: true };
}

/**
 * Update Coaching Center info (Owner action).
 */
export async function updateCoachingCenter(formData: FormData, idToken?: string) {
  const auth = await verifyUserAuth(idToken);
  const adminSupabase = createAdminClient();

  const rawData = {
    name: formData.get("name") as string,
    address: (formData.get("address") as string) || undefined,
    contactPhone: (formData.get("contactPhone") as string) || undefined,
  };

  const validated = updateCoachingCenterSchema.parse(rawData);

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("id")
    .eq("owner_uid", auth.uid)
    .maybeSingle();

  if (!center) {
    throw new Error("Only Coaching Center owners can update center details.");
  }

  const { error } = await adminSupabase
    .from("coaching_centers")
    .update({
      name: validated.name.trim(),
      address: validated.address?.trim() || null,
      contact_phone: validated.contactPhone?.trim() || null,
    })
    .eq("id", center.id);

  if (error) {
    throw new Error("Failed to update coaching center information.");
  }

  revalidatePath("/tutor/coaching");

  return { success: true };
}

/**
 * Fetch all tutors in the user's Coaching Center.
 */
export async function getCenterTutors(idToken?: string): Promise<CenterTutorDoc[]> {
  const auth = await verifyUserAuth(idToken);
  const tutorId = auth.tutorId || auth.uid;

  const adminSupabase = createAdminClient();

  const { data: currentTutor } = await adminSupabase
    .from("tutors")
    .select("coaching_center_id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!currentTutor?.coaching_center_id) {
    return [];
  }

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("owner_uid")
    .eq("id", currentTutor.coaching_center_id)
    .maybeSingle();

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, user_id, full_name, institution, contact_phone, created_at")
    .eq("coaching_center_id", currentTutor.coaching_center_id);

  if (!tutors || tutors.length === 0) {
    return [];
  }

  const result: CenterTutorDoc[] = [];

  for (const t of tutors) {
    const { count: batchCount } = await adminSupabase
      .from("batches")
      .select("*", { count: "exact", head: true })
      .eq("tutor_id", t.id)
      .eq("is_archived", false);

    const { count: studentCount } = await adminSupabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("tutor_id", t.id)
      .eq("status", "active");

    result.push({
      tutorId: t.id,
      userId: t.user_id,
      fullName: t.full_name,
      institution: t.institution,
      contactPhone: t.contact_phone,
      batchCount: batchCount || 0,
      studentCount: studentCount || 0,
      isOwner: t.user_id === center?.owner_uid,
      joinedAt: t.created_at,
    });
  }

  return result;
}

/**
 * Fetch all batches across all tutors in the Coaching Center.
 */
export async function getCenterBatches(idToken?: string) {
  const auth = await verifyUserAuth(idToken);
  const tutorId = auth.tutorId || auth.uid;

  const adminSupabase = createAdminClient();

  const { data: currentTutor } = await adminSupabase
    .from("tutors")
    .select("coaching_center_id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!currentTutor?.coaching_center_id) {
    return [];
  }

  const { data: centerTutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name")
    .eq("coaching_center_id", currentTutor.coaching_center_id);

  if (!centerTutors || centerTutors.length === 0) {
    return [];
  }

  const tutorMap = new Map<string, string>();
  centerTutors.forEach((t) => tutorMap.set(t.id, t.full_name));

  const tutorIds = centerTutors.map((t) => t.id);

  const { data: batches } = await adminSupabase
    .from("batches")
    .select("*")
    .in("tutor_id", tutorIds)
    .order("created_at", { ascending: false });

  if (!batches) return [];

  return batches.map((b) => ({
    id: b.id,
    tutorId: b.tutor_id,
    tutorName: tutorMap.get(b.tutor_id) || "Tutor",
    name: b.name,
    subject: b.subject,
    gradeClass: b.grade_class,
    monthlyFee: Number(b.monthly_fee),
    schedule: b.schedule || [],
    studentCount: b.student_count || 0,
    isArchived: b.is_archived,
    createdAt: b.created_at,
  }));
}

/**
 * Fetch aggregated analytics metrics for the Coaching Center.
 */
export async function getCenterAnalytics(idToken?: string): Promise<CenterAnalyticsDoc> {
  const auth = await verifyUserAuth(idToken);
  const tutorId = auth.tutorId || auth.uid;

  const adminSupabase = createAdminClient();

  const { data: currentTutor } = await adminSupabase
    .from("tutors")
    .select("coaching_center_id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!currentTutor?.coaching_center_id) {
    return {
      totalTutors: 0,
      totalStudents: 0,
      totalBatches: 0,
      monthlyRevenue: 0,
      attendanceRate: 0,
    };
  }

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id")
    .eq("coaching_center_id", currentTutor.coaching_center_id);

  if (!tutors || tutors.length === 0) {
    return {
      totalTutors: 0,
      totalStudents: 0,
      totalBatches: 0,
      monthlyRevenue: 0,
      attendanceRate: 0,
    };
  }

  const tutorIds = tutors.map((t) => t.id);

  // Total Tutors
  const totalTutors = tutorIds.length;

  // Total Active Batches
  const { count: totalBatches } = await adminSupabase
    .from("batches")
    .select("*", { count: "exact", head: true })
    .in("tutor_id", tutorIds)
    .eq("is_archived", false);

  // Total Active Students
  const { count: totalStudents } = await adminSupabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .in("tutor_id", tutorIds)
    .eq("status", "active");

  // Monthly Revenue (Current Month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: feeRows } = await adminSupabase
    .from("fees")
    .select("amount_paid")
    .in("tutor_id", tutorIds)
    .eq("year", currentYear)
    .eq("month", currentMonth);

  const monthlyRevenue = (feeRows || []).reduce(
    (sum, row) => sum + (Number(row.amount_paid) || 0),
    0
  );

  // Attendance Rate calculation (Current month)
  const startDateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const { data: attendanceRows } = await adminSupabase
    .from("attendance")
    .select("records")
    .in("tutor_id", tutorIds)
    .gte("date", startDateStr);

  let totalPresentCount = 0;
  let totalRecordCount = 0;

  if (attendanceRows && attendanceRows.length > 0) {
    for (const row of attendanceRows) {
      const recs = row.records as Record<string, { status: string }>;
      if (recs && typeof recs === "object") {
        Object.values(recs).forEach((r) => {
          totalRecordCount++;
          if (r.status === "present" || r.status === "late") {
            totalPresentCount++;
          }
        });
      }
    }
  }

  const attendanceRate =
    totalRecordCount > 0
      ? Math.round((totalPresentCount / totalRecordCount) * 100)
      : 100;

  return {
    totalTutors,
    totalStudents: totalStudents || 0,
    totalBatches: totalBatches || 0,
    monthlyRevenue,
    attendanceRate,
  };
}
