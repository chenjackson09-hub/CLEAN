"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roleHome";
import type { UserRole } from "@/types/database";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication failed." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(ROLE_HOME[(profile?.role as UserRole) ?? "customer"] ?? "/login");
}

export async function signUp(
  formData: FormData,
  role: UserRole
) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  if (role === "cleaner") {
    redirect("/register/cleaner");
  }

  // Customer: profile row will be created on first sign-in via database trigger.
  // Send them to login so they can confirm email and sign in.
  redirect("/login");
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
