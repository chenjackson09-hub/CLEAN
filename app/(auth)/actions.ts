"use server";

import { TERMS_VERSION } from "@/lib/legal/content";
import { safeNextPath } from "@/lib/safeRedirect";
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
  // The version of the Terms the person agreed to (they must tick the box to get here).
  termsVersion: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Only a Google-only user who hasn't onboarded yet may run this — mirrors the
  // "needs onboarding" check in the OAuth callback route. Blocks an already-set-up
  // user (any role) from reaching this action a second time and overwriting their
  // own role/profile — the page itself has no such guard, so this is the one place
  // that has to stop it.
  const providers: string[] = user.app_metadata?.providers ?? [];
  const isGoogleOnly = providers.includes("google") && !providers.includes("email");
  if (!isGoogleOnly || user.user_metadata?.onboarded === true) {
    return { error: "Onboarding has already been completed for this account." };
  }

  const role = input.role;
  const full_name = input.full_name.trim();
  const phone = input.phone.trim();
  if (role !== "customer" && role !== "cleaner") return { error: "Invalid role" };
  if (!full_name) return { error: "Name is required" };
  if (input.termsVersion !== TERMS_VERSION) return { error: "Please agree to the Terms of Use and Privacy Policy to continue." };

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
    user_metadata: { ...(user.user_metadata ?? {}), onboarded: true, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
  });
  if (metaErr) return { error: metaErr.message };

  return { success: true };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !user) {
    // Signed up with email + password but never entered the emailed code.
    const unverified = error?.code === "email_not_confirmed" || /not confirmed/i.test(error?.message ?? "");
    const message = error?.message ?? "Authentication failed.";
    if (unverified) return { error: message, needsVerification: true as const, email: email.trim() };
    return { error: message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // A sign-up that was started but never submitted resumes in its wizard (the answers were
  // saved step by step). Read on its own: a database without the column just skips this.
  if (profile?.role === "cleaner" || profile?.role === "customer") {
    const { data: done, error: doneErr } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!doneErr && done && done.onboarding_completed_at == null) redirect(`/register/${profile.role}`);
  }

  // Back to the page they were trying to open (e.g. a booking link), if any.
  // The middleware still enforces role access, so a wrong-role link lands on their home.
  const next = safeNextPath(formData.get("next"));
  if (next && profile?.role) redirect(next);

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

// "Cancel my registration": for someone who started signing up and wants out for good (typed the
// wrong email, picked the wrong role, wants to start over). It deletes THEIR OWN account, but only
// while the sign-up is still unfinished — an account that was submitted (or is an admin, or whose
// state can't be read) is never touched here. Freeing the email lets them register again.
export async function cancelUnfinishedRegistration(): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("role, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  // Fail closed: anything unclear means "don't delete".
  if (pErr || !profile) return { error: "We couldn't check your account, so nothing was deleted." };
  if (profile.role !== "customer" && profile.role !== "cleaner") return { error: "This account can't be cancelled here." };
  if (profile.onboarding_completed_at != null) return { error: "Your registration was already submitted, so it can't be cancelled here." };

  // Uploaded files first (a photo chosen during sign-up), then the account itself — the profile
  // and role rows go with the auth user.
  for (const bucket of ["avatars", "gallery", "home-photos"]) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${user.id}/${f.name}`);
      if (paths.length) await admin.storage.from(bucket).remove(paths);
    } catch {
      // a missing bucket or folder must not block cancelling
    }
  }
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return { error: delErr.message };

  await supabase.auth.signOut();
  redirect("/register");
}


// Used when a cleaner picks "Yes, continue later" partway through the
// registration wizard: their partial answers are already saved, so signing
// them out and landing on /login (rather than the dashboard) makes clear
// they'll need to log back in to finish.
export async function signOutToLogin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
