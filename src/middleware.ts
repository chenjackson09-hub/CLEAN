import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Skip the network round-trip when there's no session cookie — user is
  // definitely unauthenticated and getUser() would hang waiting for Supabase.
  const hasSessionCookie = request.cookies.getAll().some(
    (c) => c.name.includes("-auth-token")
  );

  let user: User | null = null;
  if (hasSessionCookie) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  const { pathname } = request.nextUrl;

  const isAuthOnlyPath =
    pathname === "/login" || pathname === "/register";

  const isOnboardingPath = pathname.startsWith("/register/");

  if (!user && !isAuthOnlyPath && !isOnboardingPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (isAuthOnlyPath || pathname.startsWith("/cleaner"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? null;

    if (isAuthOnlyPath && role) {
      return NextResponse.redirect(
        new URL(`/${role}/dashboard`, request.url)
      );
    }

    if (pathname.startsWith("/cleaner") && role !== "cleaner") {
      return NextResponse.redirect(
        new URL(role ? `/${role}/dashboard` : "/login", request.url)
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
