"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";

export async function getOnboardingStatus(idToken?: string) {
  try {
    const authState = await verifyUserAuth(idToken);
    if (!hasRoleAtLeast(authState.role, "tutor")) {
      return null;
    }
    const tutorId = authState.tutorId || authState.uid;
    const adminSupabase = createAdminClient();

    const {
      count: batchCount
    } = await adminSupabase.from("batches").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: studentCount
    } = await adminSupabase.from("students").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: attendanceCount
    } = await adminSupabase.from("attendance").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: feeCount
    } = await adminSupabase.from("fees").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: doubtCount
    } = await adminSupabase.from("doubts").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    return {
      profile: true,
      batch: (batchCount || 0) > 0,
      invite: (studentCount || 0) > 0,
      attendance: (attendanceCount || 0) > 0,
      fee: (feeCount || 0) > 0,
      doubt: (doubtCount || 0) > 0,
    };
  } catch (err) {
    console.error("Error fetching onboarding status:", err);
    return null;
  }
}
