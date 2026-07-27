import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feeId, amount, studentId } = body;

    if (!feeId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fee parameters." },
        { status: 400 }
      );
    }

    const invoiceNo = `INV-BKASH-${feeId.slice(0, 8)}-${Date.now()}`;
    const paymentUrl = `/api/payment/bkash/callback?paymentID=${invoiceNo}&status=success&feeId=${feeId}&amount=${amount}`;

    return NextResponse.json({
      success: true,
      paymentID: invoiceNo,
      bkashURL: paymentUrl,
      amount,
      currency: "BDT",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to initiate bKash payment." },
      { status: 500 }
    );
  }
}
