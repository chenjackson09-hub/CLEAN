"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/roleHome";
import type { UserRole } from "@/types/database";

// First-time onboarding for OAuth (Google) users. The handle_new_user trigger
// defaults them to a skeleton `customer`, so this fills in name/phone, sets the
// chosen role (creating cleaner rows + switching off the stray customer row when
// they pick cleaner), and flags `user_metadata.onboarded` so they're not asked
// again (see the callback route + middleware).
export async function completeOnboarding(input: {
  role: "customer" | "cleaner";
  full_name: string;
  phone: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const role = input.role;
  const full_name = input.full_name.trim();
  const phone = input.phone.trim();
  if (role !== "customer" && role !== "cleaner") return { error: "Invalid role" };
  if (!full_name) return { error: "Name is required" };

  const admin = createAdminClient();

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, role, full_name, phone });
  if (profileErr) return { error: profileErr.message };

  if (role === "customer") {
    // The trigger already made the customers row; ensure it exists.
    const { error } = await admin.from("customers").upsert({ id: user.id });
    if (error) return { error: error.message };
  } else {
    // Switch to cleaner: drop the stray customer row, create the cleaner + a
    // pending application (status defaults to 'pending').
    await admin.from("customers").delete().eq("id", user.id);
    const { error: cleanerErr } = await admin.from("cleaners").upsert({ id: user.id });
    if (cleanerErr) return { error: cleanerErr.message };
    const { data: existingApp } = await admin
      .from("cleaner_applications")
      .select("id")
      .eq("cleaner_id", user.id)
      .limit(1);
    if (!existingApp || existingApp.length === 0) {
      const { error: appErr } = await admin.from("cleaner_applications").insert({ cleaner_id: user.id });
      if (appErr) return { error: appErr.message };
    }
  }

  // Mark onboarding complete so they aren't re-routed here.
  const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata ?? {}), onboarded: true },
  });
  if (metaErr) return { error: metaErr.message };

  return { success: true };
}

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
  // Land on the shared "signed out" screen (public route) instead of jumping
  // straight to /login — used by the cleaner/customer/admin nav sign-out.
  redirect("/signed-out");
}

export async function signOutToRegister() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/register");
}
