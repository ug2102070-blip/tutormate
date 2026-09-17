import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component; safe to ignore if middleware handles refresh
        }
      },
    },
  });
}

/**
 * Service Role Client for administrative actions in Server Actions / API routes.
 *
 * SECURITY: Hard-asserts SUPABASE_SERVICE_ROLE_KEY is present.
 * Never falls back to the anon key — doing so would silently grant unprivileged
 * access to code that assumes admin-level DB access, bypassing RLS.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "[createAdminClient] NEXT_PUBLIC_SUPABASE_URL is not set."
    );
  }
  if (!serviceKey) {
    throw new Error(
      "[createAdminClient] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Admin operations require the service role key — never use an anon key. " +
        "Add SUPABASE_SERVICE_ROLE_KEY to your .env.local (server-only, no NEXT_PUBLIC_ prefix)."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

