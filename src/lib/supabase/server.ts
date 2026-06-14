import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// cache() deduplicates calls within the same React render tree (layout + page share one client)
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookies set by middleware, ignore here
          }
        },
      },
    }
  );
});

// Cached across the render tree — layout and page share one getUser() network call
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// Cached per render tree — layout and dashboard share one cleaners.status query
export const getCleanerStatus = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cleaners")
    .select("status")
    .eq("id", userId)
    .single();
  return (data?.status ?? null) as string | null;
});
