"use client";

import { useState } from "react";
import ProfileView from "./ProfileView";
import ProfileForm from "./ProfileForm";
import type { Profile, Cleaner } from "@/types/database";

interface Props {
  profile: Profile | null;
  cleaner: Cleaner | null;
}

export default function ProfileViewEdit({ profile, cleaner }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <ProfileForm profile={profile} cleaner={cleaner} onSaved={() => setEditing(false)} />;
  }
  return <ProfileView profile={profile} cleaner={cleaner} onEdit={() => setEditing(true)} />;
}
