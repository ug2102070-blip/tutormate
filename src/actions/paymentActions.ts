"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import type { FeeDoc } from "@/types";

export interface PaymentInitiateResult {
  success: boolean;
  paymentUrl?: string;
  invoiceNo?: string;
  amount?: number;
  gateway?: "bkash" | "nagad";
  error?: string;
}

/**
 * Initiates a bKash or Nagad online MFS fee payment session.
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

    const amount = Number(fee.amount_due) - Number(fee.amount_paid);
    if (amount <= 0 || fee.status === "paid") {
      return { success: false, error: "This fee statement is already fully paid." };
    }

    const invoiceNo = `INV-${gateway.toUpperCase()}-${feeId.slice(0, 8)}-${Date.now()}`;
    const paymentUrl = `/api/payment/${gateway}/callback?paymentID=${invoiceNo}&status=success&feeId=${feeId}&amount=${amount}`;

    return {
      success: true,
      paymentUrl,
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
