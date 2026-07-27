import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");
  const status = searchParams.get("status");
  const feeId = searchParams.get("feeId");
  const amount = searchParams.get("amount");

  if (status === "success" && feeId) {
    try {
      const supabase = createAdminClient();
      const nowIso = new Date().toISOString();

      await supabase
        .from("fees")
        .update({
          status: "paid",
          amount_paid: Number(amount || 0),
          payment_method: "nagad",
          paid_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", feeId);

      const redirectUrl = new URL("/student/fees", request.url);
      redirectUrl.searchParams.set("payment", "success");
      redirectUrl.searchParams.set("trxID", orderId || `NAGAD-${Date.now()}`);
      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      console.error("[Nagad Callback] Error updating fee record:", err);
    }
  }

  const failureUrl = new URL("/student/fees", request.url);
  failureUrl.searchParams.set("payment", "cancel");
  return NextResponse.redirect(failureUrl);
}
