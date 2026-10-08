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
  // The cleaner's saved home point (geocoded from their address), for the work-area map.
  center?: { lat: number; lng: number } | null;
}

export default function ProfileViewEdit({ profile, cleaner, startInEdit = false, center = null }: Props) {
  const [editing, setEditing] = useState(startInEdit);

  if (editing) {
    return <ProfileForm profile={profile} cleaner={cleaner} center={center} onSaved={() => setEditing(false)} />;
  }
  return <ProfileView profile={profile} cleaner={cleaner} center={center} onEdit={() => setEditing(true)} />;
}
