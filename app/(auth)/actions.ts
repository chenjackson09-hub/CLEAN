"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roleHome";
import type { UserRole } from "@/types/database";

// NOTE: account creation lives client-side in the role-specific onboarding pages
// (app/(auth)/register/{customer,cleaner}/page.tsx), which call
// supabase.auth.signUp with profile fields as metadata for the handle_new_user
// trigger. There is intentionally no signUp server action here.

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !user) return { error: error?.message ?? "Authentication failed." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(profile?.role ? (ROLE_HOME[profile.role as UserRole] ?? "/login") : "/login");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signOutToRegister() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/register");
}
