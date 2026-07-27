import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feeId, amount } = body;

    if (!feeId || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fee parameters." },
        { status: 400 }
      );
    }

    const orderId = `INV-NAGAD-${feeId.slice(0, 8)}-${Date.now()}`;
    const paymentUrl = `/api/payment/nagad/callback?order_id=${orderId}&status=success&feeId=${feeId}&amount=${amount}`;

    return NextResponse.json({
      success: true,
      orderID: orderId,
      callBackUrl: paymentUrl,
      amount,
      currency: "BDT",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to initiate Nagad payment." },
      { status: 500 }
    );
  }
}
