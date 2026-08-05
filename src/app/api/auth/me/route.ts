import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/me
 * Lightweight endpoint to check if the current session is authenticated.
 * Returns 200 if logged in, 401 if not.
 * Used by the /join page to detect auth state client-side.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, uid: user.id }, { status: 200 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
