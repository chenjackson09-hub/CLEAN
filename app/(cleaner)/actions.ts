"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  sendBookingAccepted,
  sendBookingDeclined,
} from "@/lib/resend";

export async function updateCleanerProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const fullName = formData.get("full_name") as string;
  const phone = formData.get("phone") as string;
  const bio = formData.get("bio") as string;
  const hourlyRate = parseFloat(formData.get("hourly_rate") as string) || null;
  const serviceRadius = parseInt(formData.get("service_radius_km") as string) || 10;
  const yearsExp = parseInt(formData.get("years_experience") as string) || 0;
  const languagesRaw = formData.get("languages") as string;
  const languages = languagesRaw.split(",").map((l) => l.trim()).filter(Boolean);
  const serviceTypes = formData.getAll("service_types") as string[];
  const address = formData.get("address") as string;

  // Geocode address via Nominatim
  let lat: number | null = null;
  let lng: number | null = null;
  if (address) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { "User-Agent": "CleanApp/1.0" } }
      );
      const results = await res.json();
      if (results[0]) {
        lat = parseFloat(results[0].lat);
        lng = parseFloat(results[0].lon);
      }
    } catch {
      // Geocoding failed — location won't be set
    }
  }

  // Handle avatar upload
  const avatarFile = formData.get("avatar") as File;
  let avatarUrl: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true });
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    }
  }

  await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, ...(avatarUrl && { avatar_url: avatarUrl }) })
    .eq("id", user.id);

  const cleanerUpdate: Record<string, unknown> = {
    bio,
    hourly_rate: hourlyRate,
    service_radius_km: serviceRadius,
    years_experience: yearsExp,
    languages,
    service_types: serviceTypes,
  };

  if (lat !== null && lng !== null) {
    cleanerUpdate.location = `POINT(${lng} ${lat})`;
  }

  const { error } = await supabase
    .from("cleaners")
    .update(cleanerUpdate)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/cleaner/profile");
  return { success: true };
}

export async function addAvailability(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const date = formData.get("date") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;

  if (endTime <= startTime) {
    return { error: "End time must be after start time." };
  }

  const { error } = await supabase.from("cleaner_availability").insert({
    cleaner_id: user.id,
    date,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) return { error: error.message };

  revalidatePath("/cleaner/availability");
  return { success: true };
}

export async function uploadGalleryPhoto(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file = formData.get("photo") as File;
  if (!file || file.size === 0) return { error: "No file selected." };
  if (!file.type.startsWith("image/")) return { error: "File must be an image." };
  if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5 MB." };

  const ext = file.name.split(".").pop();
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("gallery")
    .upload(path, file);
  if (uploadErr) return { error: uploadErr.message };

  const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);

  const { error } = await supabase.from("cleaner_gallery").insert({
    cleaner_id: user.id,
    photo_url: urlData.publicUrl,
  });
  if (error) return { error: error.message };

  revalidatePath("/cleaner/profile");
  revalidatePath("/cleaner/preview");
  return { success: true };
}

export async function deleteGalleryPhoto(id: string, photoUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Extract storage path from the public URL
  const url = new URL(photoUrl);
  const storagePath = url.pathname.split("/object/public/gallery/")[1];
  if (storagePath) {
    await supabase.storage.from("gallery").remove([storagePath]);
  }

  const { error } = await supabase
    .from("cleaner_gallery")
    .delete()
    .eq("id", id)
    .eq("cleaner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/cleaner/profile");
  revalidatePath("/cleaner/preview");
  return { success: true };
}

export async function addWeeklyAvailability(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const dayOfWeek = parseInt(formData.get("day_of_week") as string);
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;

  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "Invalid day." };
  }
  if (endTime <= startTime) {
    return { error: "End time must be after start time." };
  }

  const { error } = await supabase.from("cleaner_weekly_availability").insert({
    cleaner_id: user.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) return { error: error.message };

  revalidatePath("/cleaner/availability");
  return { success: true };
}

export async function deleteWeeklyAvailability(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("cleaner_weekly_availability")
    .delete()
    .eq("id", id)
    .eq("cleaner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/cleaner/availability");
  return { success: true };
}

export async function deleteAvailability(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("cleaner_availability")
    .delete()
    .eq("id", id)
    .eq("cleaner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/cleaner/availability");
  return { success: true };
}

export async function respondToBooking(
  bookingId: string,
  response: "accepted" | "declined"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*, profiles!customer_id(full_name, phone, avatar_url)")
    .eq("id", bookingId)
    .eq("cleaner_id", user.id)
    .single();

  if (fetchErr || !booking) return { error: "Booking not found." };
  if (booking.status !== "pending") return { error: "Booking already responded to." };
  if (new Date(booking.response_deadline) < new Date()) {
    return { error: "Response deadline has passed." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  // Send email notification — use admin client to look up customer email
  try {
    const admin = createAdminClient();

    const [{ data: customerAuth }, { data: customerProfile }, { data: cleanerProfile }] =
      await Promise.all([
        admin.auth.admin.getUserById(booking.customer_id),
        supabase.from("profiles").select("full_name").eq("id", booking.customer_id).single(),
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
      ]);

    const customerEmail = customerAuth?.user?.email;
    if (customerEmail && customerProfile && cleanerProfile) {
      if (response === "accepted") {
        await sendBookingAccepted({
          customerEmail,
          customerName: customerProfile.full_name ?? "there",
          cleanerName: cleanerProfile.full_name ?? "Your cleaner",
          cleanerPhone: cleanerProfile.phone ?? "",
          scheduledDate: booking.scheduled_date,
          scheduledStart: booking.scheduled_start,
          address: booking.address,
        });
      } else {
        await sendBookingDeclined({
          customerEmail,
          customerName: customerProfile.full_name ?? "there",
          cleanerName: cleanerProfile.full_name ?? "Your cleaner",
          scheduledDate: booking.scheduled_date,
        });
      }
    }
  } catch {
    // Email failure should not block the booking response
  }

  revalidatePath("/cleaner/requests");
  revalidatePath("/cleaner/dashboard");
  return { success: true };
}
