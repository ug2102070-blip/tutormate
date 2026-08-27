import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth Callback Route
 * Handles OAuth (Google, etc.) and OTP verification redirects.
 * Exchanges temporary code for a persistent session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      // Redirect to the dashboard-router (/login) which handles role-based redirects
      if (isLocalEnv) {
        return NextResponse.redirect(new URL(next, request.url));
      }

      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }

      return NextResponse.redirect(new URL(next, request.url));
    }

    console.error("Auth callback error:", error.message);
  }

  // Return the user to login page with an error parameter
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "auth_callback_error");
  return NextResponse.redirect(loginUrl);
}
