import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/tutor", "/student", "/parent", "/owner"];
const AUTH_ROUTES = ["/login", "/register", "/reset-password"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Always call getUser() to refresh the session cookies
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // Ignore error if user is unauthenticated
  }

  const { pathname } = request.nextUrl;
  const hasSession = Boolean(user);

  // Skip middleware for auth callback, API routes, and static assets
  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only redirect logged-in users away from login/register (NOT reset-password)
  // Let client-side handle it to ensure correct role-based dashboard redirection
  const isAuthOnlyRoute = ["/login", "/register"].some((route) =>
    pathname.startsWith(route)
  );
  // Optional: We removed the strict server-side redirect to /tutor/dashboard
  // so the client-side useAuth hook can correctly redirect to /owner/dashboard
  // or /student/dashboard based on the user profile role.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
