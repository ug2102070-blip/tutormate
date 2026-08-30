import { NextResponse } from "next/server";
import { initiateBkashPayment } from "@/lib/paymentGateway";

export async function POST(request: Request) {
  try {
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
