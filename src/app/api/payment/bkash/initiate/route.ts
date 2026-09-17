import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initiateBkashPayment } from "@/lib/paymentGateway";

/**
 * bKash Payment Initiate Route
 *
 * SECURITY FIX: Added session authentication guard.
 * Previously this route accepted requests from any unauthenticated caller,
 * allowing arbitrary feeId + amount values to be submitted, potentially
 * triggering fraudulent payment sessions or probing fee IDs.
 */
export async function POST(request: Request) {
  try {
    // ── Session Authentication ──────────────────────────────────────────────
    const supabaseClient = await createClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You must be signed in to initiate a payment." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { feeId, amount, studentId } = body;

    if (!feeId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fee parameters (feeId, amount)." },
        { status: 400 }
      );
    }

    const res = await initiateBkashPayment({
      feeId,
      studentId,
      amount: Number(amount),
      provider: "bkash",
    });

    return NextResponse.json({
      success: res.success,
      paymentID: res.paymentId,
      bkashURL: res.redirectUrl,
      amount: res.amount,
      currency: "BDT",
      isMock: res.isMock,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to initiate bKash payment." },
      { status: 500 }
    );
  }
}
