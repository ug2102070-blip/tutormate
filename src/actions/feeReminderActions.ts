"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { getTutorId } from "@/lib/enrollment";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FeeReminderTarget {
  feeId: string;
  studentId: string;
  studentName: string;
  phone: string;
  amountDue: number;
  monthLabel: string;
}

export interface ReminderResult {
  studentName: string;
  phone: string;
  success: boolean;
  error?: string;
}

// ─── GET UNPAID FEES FOR REMINDER ─────────────────────────────────────────────

/**
 * Fetches all unpaid/partial fee records for a given batch+month with student phone numbers.
 * Used to populate the WhatsApp reminder panel.
 */
export async function getUnpaidFeesForReminder(
  batchId: string,
  year: number,
  month: number
): Promise<FeeReminderTarget[]> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) return [];

  const tutorId = getTutorId(authState);
  const supabase = createAdminClient();

  // Join fees + students in a single query
  const { data, error } = await supabase
    .from("fees")
    .select(`
      id,
      student_id,
      amount_due,
      status,
      students!inner(full_name, phone)
    `)
    .eq("tutor_id", tutorId)
    .eq("batch_id", batchId)
    .eq("year", year)
    .eq("month", month)
    .in("status", ["unpaid", "partial"]);

  if (error || !data) return [];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return data.map((row) => {
    const student = row.students as unknown as { full_name: string; phone: string };
    return {
      feeId: row.id,
      studentId: row.student_id,
      studentName: student?.full_name || "Unknown",
      phone: student?.phone || "",
      amountDue: Number(row.amount_due),
      monthLabel: `${monthNames[month - 1]} ${year}`,
    };
  });
}

// ─── SEND BULK REMINDERS ──────────────────────────────────────────────────────

/**
 * Sends WhatsApp fee reminders to a list of selected fee IDs.
 * Uses sendWhatsAppMessage() — works in mock mode if Twilio is not configured.
 *
 * Message template (bilingual):
 *   প্রিয় [Name], [Month] মাসের টিউশন ফি ৳[Amount] এখনো বাকি আছে।
 *   অনুগ্রহ করে দ্রুত পরিশোধ করুন।
 *   Dear [Name], your tuition fee of ৳[Amount] for [Month] is still due.
 *   Please pay at your earliest convenience.
 */
export async function sendFeeReminders(
  feeIds: string[]
): Promise<{ sent: number; failed: number; results: ReminderResult[] }> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized");
  }

  const tutorId = getTutorId(authState);
  const supabase = createAdminClient();

  if (!feeIds.length) return { sent: 0, failed: 0, results: [] };

  // Fetch the selected fees with student data
  const { data, error } = await supabase
    .from("fees")
    .select(`
      id,
      student_id,
      amount_due,
      year,
      month,
      students!inner(full_name, phone)
    `)
    .eq("tutor_id", tutorId)
    .in("id", feeIds);

  if (error || !data) throw new Error("Failed to load fee records");

  // Fetch tutor name for personalizing the message
  const { data: tutorData } = await supabase
    .from("tutors")
    .select("full_name")
    .eq("id", tutorId)
    .single();

  const tutorName = tutorData?.full_name || "আপনার শিক্ষক";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const results: ReminderResult[] = [];

  // Send sequentially to respect Twilio rate limits
  for (const row of data) {
    const student = row.students as unknown as { full_name: string; phone: string };
    const name = student?.full_name || "শিক্ষার্থী";
    const phone = student?.phone || "";
    const amount = Number(row.amount_due);
    const monthLabel = `${monthNames[(row.month as number) - 1]} ${row.year}`;

    if (!phone) {
      results.push({ studentName: name, phone: "", success: false, error: "No phone number" });
      continue;
    }

    const message =
      `প্রিয় ${name}, ${monthLabel} মাসের টিউশন ফি ৳${amount} এখনো বাকি আছে। ` +
      `অনুগ্রহ করে দ্রুত পরিশোধ করুন। - ${tutorName}\n\n` +
      `Dear ${name}, your tuition fee of ৳${amount} for ${monthLabel} is still due. ` +
      `Please pay at your earliest convenience. - ${tutorName}`;

    const res = await sendWhatsAppMessage({ to: phone, message });
    results.push({
      studentName: name,
      phone,
      success: res.success,
      error: res.error,
    });
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { sent, failed, results };
}
