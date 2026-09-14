"use client";

import { useState } from "react";
import ProfileView from "./ProfileView";
import ProfileForm from "./ProfileForm";
import type { Profile, Cleaner } from "@/types/database";

interface Props {
  profile: Profile | null;
  cleaner: Cleaner | null;
  // Set by the profile page from a `?edit=1` query param — the preview's own
  // edit pencil links here with it, so it lands straight in edit mode instead
  // of stopping at the read-only view first.
  startInEdit?: boolean;
}

export default function ProfileViewEdit({ profile, cleaner, startInEdit = false }: Props) {
  const [editing, setEditing] = useState(startInEdit);

  if (editing) {
    return <ProfileForm profile={profile} cleaner={cleaner} onSaved={() => setEditing(false)} />;
  }
  return <ProfileView profile={profile} cleaner={cleaner} onEdit={() => setEditing(true)} />;
}
