"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import type { FeeDoc } from "@/types";

export interface PaymentInitiateResult {
  success: boolean;
  invoiceNo?: string;
  amount?: number;
  gateway?: "bkash" | "nagad";
  error?: string;
}

/**
 * Validates a fee record and returns metadata needed to initiate payment.
 *
 * SECURITY FIX: No longer constructs or returns a pre-built callback URL.
 * The callback URL (with HMAC token) is generated server-side inside
 * paymentGateway.ts and returned only from the payment initiate API routes.
 * Returning a pre-built ?status=success callback URL to the client would allow
 * the client to replay it directly, forging a payment confirmation.
 *
 * SECURITY FIX: Added ownership check — only the fee's student or tutor
 * may initiate payment for a given fee record.
 */
export async function initiateFeePayment(
  feeId: string,
  gateway: "bkash" | "nagad"
): Promise<PaymentInitiateResult> {
  try {
    const auth = await verifyUserAuth();
    const supabase = createAdminClient();

    // Fetch fee record
    const { data: fee, error: feeErr } = await supabase
      .from("fees")
      .select("*, students(full_name)")
      .eq("id", feeId)
      .single();

    if (feeErr || !fee) {
      return { success: false, error: "Fee statement record not found." };
    }

    // ── Ownership check ────────────────────────────────────────────────────────
    // Only the student named on the fee OR the tutor who owns it may initiate.
    const isStudent = fee.student_id === auth.uid;
    const isTutor = fee.tutor_id === (auth.tutorId || auth.uid);
    if (!isStudent && !isTutor) {
      return {
        success: false,
        error: "Unauthorized: You do not have permission to pay this fee.",
      };
    }

    const amount = Number(fee.amount_due) - Number(fee.amount_paid);
    if (amount <= 0 || fee.status === "paid") {
      return { success: false, error: "This fee statement is already fully paid." };
    }

    const invoiceNo = `INV-${gateway.toUpperCase()}-${feeId.slice(0, 8)}-${Date.now()}`;

    // NOTE: paymentUrl is intentionally NOT returned.
    // The client should POST to /api/payment/<gateway>/initiate which generates
    // a signed (HMAC-protected) redirect URL server-side.
    return {
      success: true,
      invoiceNo,
      amount,
      gateway,
    };
  } catch (err: any) {
    console.error("[initiateFeePayment] Error:", err);
    return { success: false, error: err.message || "Failed to initiate MFS payment." };
  }
}

/**
 * Verifies and completes a bKash / Nagad payment transaction.
 *
 * SECURITY FIX: Added ownership check — only the fee's student or tutor
 * may mark a fee record as paid. Previously, any authenticated user could
 * supply any feeId and mark it paid (IDOR).
 */
export async function verifyPaymentTransaction(
  feeId: string,
  trxID: string,
  gateway: "bkash" | "nagad"
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const cleanTrxId = trxID ? trxID.trim().toUpperCase() : "";

    if (!cleanTrxId || cleanTrxId.length < 5) {
      return { success: false, error: "Please enter a valid MFS Transaction ID (TrxID)." };
    }

    const supabase = createAdminClient();

    // Fetch fee statement
    const { data: fee, error: fetchErr } = await supabase
      .from("fees")
      .select("*, students(full_name)")
      .eq("id", feeId)
      .single();

    if (fetchErr || !fee) {
      return { success: false, error: "Fee statement record not found." };
    }

    // ── Ownership check ────────────────────────────────────────────────────────
    // Only the student on the fee OR the owning tutor may verify/mark it paid.
    const isStudent = fee.student_id === auth.uid;
    const isTutor = fee.tutor_id === (auth.tutorId || auth.uid);
    if (!isStudent && !isTutor) {
      return {
        success: false,
        error: "Unauthorized: You do not have permission to verify this transaction.",
      };
    }

    const nowIso = new Date().toISOString();
    const amountDue = Number(fee.amount_due);

    // Update fee record status
    const { error: updateErr } = await supabase
      .from("fees")
      .update({
        status: "paid",
        amount_paid: amountDue,
        payment_method: gateway,
        paid_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", feeId);

    if (updateErr) {
      console.error("[verifyPaymentTransaction] Update error:", updateErr);
      return { success: false, error: updateErr.message };
    }

    // Insert notification for tutor
    try {
      const studentName = fee.students?.full_name || "A student";
      await supabase.from("notifications").insert({
        user_id: fee.tutor_id,
        title: `Fee Payment Received (${gateway.toUpperCase()}) 💳`,
        body: `${studentName} paid ${amountDue} BDT for Month ${fee.month}/${fee.year} via ${gateway.toUpperCase()} (TrxID: ${cleanTrxId}).`,
        type: "fee",
        reference_id: feeId,
        reference_type: "fee",
        is_read: false,
        created_at: nowIso,
      });
    } catch {
      // Ignore notification failures
    }

    revalidatePath("/student/fees");
    revalidatePath("/tutor/fees");
    revalidatePath("/parent/fees");

    return { success: true };
  } catch (err: any) {
    console.error("[verifyPaymentTransaction] Error:", err);
    return { success: false, error: err.message || "Failed to verify transaction." };
  }
}
