"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/lib/geocode";
import {
  sendBookingAccepted,
  sendBookingDeclined,
} from "@/lib/resend";

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// Removes a booked time range from the cleaner's specific-date availability for
// that day, re-inserting whatever time is left before/after the booking. A slot
// fully covered by the booking is simply dropped; a booking in the middle of a
// slot splits it into two.
async function carveAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cleanerId: string,
  date: string,
  bookedStart: number,
  bookedEnd: number,
) {
  const { data: slots } = await supabase
    .from("cleaner_availability")
    .select("id, start_time, end_time")
    .eq("cleaner_id", cleanerId)
    .eq("date", date);

  for (const slot of slots ?? []) {
    const slotStart = timeToMinutes(slot.start_time);
    const slotEnd = timeToMinutes(slot.end_time);
    // Skip slots that don't overlap the booked range.
    if (bookedStart >= slotEnd || bookedEnd <= slotStart) continue;

    await supabase.from("cleaner_availability").delete().eq("id", slot.id);

    const leftEnd = Math.min(bookedStart, slotEnd);
    const rightStart = Math.max(bookedEnd, slotStart);
    const remainders: Array<{ start: number; end: number }> = [];
    if (leftEnd > slotStart) remainders.push({ start: slotStart, end: leftEnd });
    if (slotEnd > rightStart) remainders.push({ start: rightStart, end: slotEnd });

    for (const r of remainders) {
      await supabase.from("cleaner_availability").insert({
        cleaner_id: cleanerId,
        date,
        start_time: minutesToTime(r.start),
        end_time: minutesToTime(r.end),
      });
    }
  }
}

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

  const avatarFile = formData.get("avatar") as File;

  // Geocoding and avatar upload are independent — run in parallel
  const [geocodeResult, avatarResult] = await Promise.all([
    address ? geocodeAddress(address) : Promise.resolve(null),
    avatarFile && avatarFile.size > 0
      ? (async () => {
          const ext = avatarFile.name.split(".").pop();
          const path = `${user.id}/avatar.${ext}`;
          const { error } = await supabase.storage
            .from("avatars")
            .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
          if (error) return { url: null, error: error.message };
          const { data } = supabase.storage.from("avatars").getPublicUrl(path);
          // The storage path is stable (upsert overwrites the same file), so the
          // public URL never changes between uploads — the browser and next/image
          // would keep serving the cached old photo. A unique version query string
          // forces a fresh fetch each time the photo is replaced.
          return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
        })()
      : Promise.resolve({ url: null, error: null }),
  ]);

  if (avatarResult.error) return { error: avatarResult.error };
  const avatarUrl = avatarResult.url;

  const cleanerUpdate: Record<string, unknown> = {
    bio,
    hourly_rate: hourlyRate,
    service_radius_km: serviceRadius,
    years_experience: yearsExp,
    languages,
    service_types: serviceTypes,
    address,
  };
  if (geocodeResult) {
    cleanerUpdate.location = `POINT(${geocodeResult.lng} ${geocodeResult.lat})`;
  }

  // Both DB updates target different tables — run in parallel
  const [profileResult, cleanerResult] = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: fullName, phone, ...(avatarUrl && { avatar_url: avatarUrl }) })
      .eq("id", user.id),
    supabase.from("cleaners").update(cleanerUpdate).eq("id", user.id),
  ]);

  if (profileResult.error) return { error: profileResult.error.message };
  if (cleanerResult.error) return { error: cleanerResult.error.message };

  // Both the edit form and the public preview render the avatar, so refresh both
  // — revalidating only the profile page left the preview showing the old photo.
  revalidatePath("/cleaner/profile");
  revalidatePath("/cleaner/preview");
  return { success: true, avatarUrl: avatarUrl ?? undefined };
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

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  // Reject a slot that overlaps an already-submitted availability slot or an
  // already-accepted booking on the same date. Touching edges (e.g. 08:00–10:00
  // then 10:00–12:00) don't count as a clash — only true overlap does.
  const [{ data: existingSlots }, { data: acceptedBookings }] = await Promise.all([
    supabase
      .from("cleaner_availability")
      .select("start_time, end_time")
      .eq("cleaner_id", user.id)
      .eq("date", date),
    supabase
      .from("bookings")
      .select("scheduled_start, duration_hours")
      .eq("cleaner_id", user.id)
      .eq("scheduled_date", date)
      .eq("status", "accepted"),
  ]);

  const overlapsSlot = (existingSlots ?? []).some(
    (s) => newStart < timeToMinutes(s.end_time) && newEnd > timeToMinutes(s.start_time)
  );
  if (overlapsSlot) {
    return { error: "This time overlaps availability you already added." };
  }

  const overlapsBooking = (acceptedBookings ?? []).some((b) => {
    const s = timeToMinutes(b.scheduled_start);
    const e = s + b.duration_hours * 60;
    return newStart < e && newEnd > s;
  });
  if (overlapsBooking) {
    return { error: "This time overlaps a booking you already accepted." };
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

async function sendBookingEmail(
  booking: { customer_id: string; scheduled_date: string; scheduled_start: string; address: string },
  response: "accepted" | "declined",
  cleanerId: string,
) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: customerAuth }, { data: customerProfile }, { data: cleanerProfile }] =
    await Promise.all([
      admin.auth.admin.getUserById(booking.customer_id),
      supabase.from("profiles").select("full_name").eq("id", booking.customer_id).single(),
      supabase.from("profiles").select("full_name, phone").eq("id", cleanerId).single(),
    ]);

  const customerEmail = customerAuth?.user?.email;
  if (!customerEmail || !customerProfile || !cleanerProfile) return;

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

  const bookedStart = timeToMinutes(booking.scheduled_start);
  const bookedEnd = bookedStart + booking.duration_hours * 60;

  if (response === "accepted") {
    // Guard against double-booking: the slot must still be within the cleaner's
    // availability and must not overlap a booking already accepted for that day.
    const dayOfWeek = new Date(booking.scheduled_date + "T12:00:00").getDay();
    const [{ data: dateSlots }, { data: weeklySlots }, { data: acceptedBookings }] =
      await Promise.all([
        supabase
          .from("cleaner_availability")
          .select("start_time, end_time")
          .eq("cleaner_id", user.id)
          .eq("date", booking.scheduled_date),
        supabase
          .from("cleaner_weekly_availability")
          .select("start_time, end_time")
          .eq("cleaner_id", user.id)
          .eq("day_of_week", dayOfWeek),
        supabase
          .from("bookings")
          .select("scheduled_start, duration_hours")
          .eq("cleaner_id", user.id)
          .eq("scheduled_date", booking.scheduled_date)
          .eq("status", "accepted"),
      ]);

    const slots = [...(dateSlots ?? []), ...(weeklySlots ?? [])];
    const stillAvailable = slots.some(
      (s) => timeToMinutes(s.start_time) <= bookedStart && timeToMinutes(s.end_time) >= bookedEnd
    );
    if (!stillAvailable) {
      return { error: "This time is no longer available." };
    }

    const overlapsExisting = (acceptedBookings ?? []).some((b) => {
      const s = timeToMinutes(b.scheduled_start);
      const e = s + b.duration_hours * 60;
      return bookedStart < e && bookedEnd > s;
    });
    if (overlapsExisting) {
      return { error: "This time overlaps a booking you already accepted." };
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  // On approval, remove the booked time from the cleaner's availability so the
  // remaining hours stay open (e.g. 08:00–12:00 booked 08:00–10:00 → 10:00–12:00).
  if (response === "accepted") {
    await carveAvailability(supabase, user.id, booking.scheduled_date, bookedStart, bookedEnd);
    revalidatePath("/cleaner/availability");

    // The customer typically fans the same job out to several cleaners (and may
    // have requested other days too). Now that one cleaner has accepted, cancel
    // ALL of the customer's other still-pending requests so they stop showing as
    // actionable for every other cleaner. These belong to other cleaners, so the
    // acting cleaner's RLS-scoped session can't touch them — use the service-role
    // client to bypass RLS for this cross-cleaner cleanup.
    const admin = createAdminClient();
    await admin
      .from("bookings")
      .update({ status: "cancelled", responded_at: new Date().toISOString() })
      .eq("customer_id", booking.customer_id)
      .eq("status", "pending")
      .neq("id", bookingId);
  }

  // Fire and forget — email failure must not delay the booking response
  sendBookingEmail(booking, response, user.id).catch(() => {});

  // Note: intentionally NOT revalidating "/cleaner/requests" here. Doing so would
  // refresh the page immediately and unmount the just-answered card — closing the
  // confirmation modal (which shows the customer's phone) before the cleaner can
  // read it. RequestCard refreshes the list itself once the cleaner dismisses it.
  revalidatePath("/cleaner/dashboard");
  return { success: true };
}

export async function completeBooking(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("status, scheduled_date, scheduled_start")
    .eq("id", bookingId)
    .eq("cleaner_id", user.id)
    .single();

  if (fetchErr || !booking) return { error: "Booking not found." };
  if (booking.status !== "accepted") return { error: "Only accepted cleans can be completed." };

  const startDt = new Date(`${booking.scheduled_date}T${booking.scheduled_start}`);
  if (startDt > new Date()) return { error: "This clean hasn't started yet." };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", bookingId)
    .eq("cleaner_id", user.id);

  if (error) return { error: error.message };

  // First completed job promotes a cleaner out of "new" automatically — status
  // is otherwise admin-only, but this specific transition is meant to be automatic.
  const admin = createAdminClient();
  const { data: cleaner } = await admin.from("cleaners").select("status").eq("id", user.id).single();
  if (cleaner?.status === "new") {
    await admin.from("cleaners").update({ status: "active" }).eq("id", user.id);
  }

  revalidatePath("/cleaner/dashboard");
  return { success: true };
}
