export type UserRole = "customer" | "cleaner" | "admin";
export type ServiceType = "residential" | "commercial";
export type CleanerStatus = "pending" | "approved" | "rejected" | "suspended";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "needs_info";
export type BookingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export type DwellingType = "apartment" | "house";
export type PetType = "dog" | "cat" | "other";

export interface Customer {
  id: string;
  bio: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  preferred_service_type: ServiceType | null;
  // Household details (help cleaners size up a job). All optional.
  num_rooms: number | null;
  pet_types: PetType[];
  num_pets: number | null;
  num_kids_under_15: number | null;
  num_people: number | null;
  house_size_sqm: number | null;
  dwelling_type: DwellingType | null;
  floor: number | null;
  // Average rating (1-5) received from cleaners and number of ratings. See
  // migration 0011.
  rating_avg: number | null;
  rating_count: number;
  // Lifetime count of completed cleans this customer has had done. Bumped by the
  // bookings status trigger when a clean is marked completed. See migration 0015.
  cleans_completed: number;
  // Most hours the customer is willing to pay for (null = no preference). See
  // migration 0013.
  max_hours: number | null;
  // Free-text notes the admin keeps on this customer. See migration
  // 0002_admin_panel_foundation.
  admin_notes: string | null;
}

export interface Cleaner {
  id: string;
  bio: string | null;
  service_types: string[] | null;
  hourly_rate: number | null;
  address: string | null;
  location: unknown | null;
  service_radius_km: number;
  status: CleanerStatus;
  years_experience: number | null;
  languages: string[] | null;
  // Average rating (1-5, 2 decimals) and number of ratings received. Maintained
  // by the ratings trigger; null avg when never rated. See migration 0011.
  rating_avg: number | null;
  rating_count: number;
  // Lifetime count of completed cleans this cleaner has finished. Bumped by the
  // bookings status trigger when a clean is marked completed. See migration 0015.
  cleans_completed: number;
  // Fewest / most hours the cleaner will accept a clean for (null = no
  // preference). See migration 0013.
  min_hours: number | null;
  max_hours: number | null;
  // Free-text notes the admin keeps on this cleaner. See migration
  // 0002_admin_panel_foundation.
  admin_notes: string | null;
}

export interface CleanerApplication {
  id: string;
  cleaner_id: string;
  id_document_url: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface CleanerAvailability {
  id: string;
  cleaner_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface CleanerGalleryPhoto {
  id: string;
  cleaner_id: string;
  photo_url: string;
  created_at: string;
}

export interface CleanerWeeklyAvailability {
  id: string;
  cleaner_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  start_time: string;
  end_time: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  cleaner_id: string;
  service_type: ServiceType;
  scheduled_date: string;
  scheduled_start: string;
  duration_hours: number;
  address: string;
  notes: string | null;
  status: BookingStatus;
  response_deadline: string;
  responded_at: string | null;
  created_at: string;
  // True once the cleaner has dismissed this booking's cancellation from the
  // dashboard "Updates" section (or cancelled it herself). See migration 0003.
  cleaner_ack_cancelled: boolean;
  // True once the cleaner has edited this booking (start time / duration / note)
  // after it was created. Drives the customer's "modified by the cleaner"
  // indicator on /bookings. See migration 0005.
  cleaner_modified: boolean;
  // True when the customer booked with a flexible ("Not sure") duration. The
  // stored duration_hours is a 2-hour default; this flag tells the cleaner the
  // length is unconfirmed. Cleared when the cleaner edits to a concrete
  // duration. See migration 0009.
  duration_flexible: boolean;
  // The broader window the customer is free in (separate from scheduled_start +
  // duration), so the cleaner can offer to extend. 'HH:MM:SS' or null. See
  // migration 0014.
  avail_window_start: string | null;
  avail_window_end: string | null;
}

export interface BookingWithCustomer extends Booking {
  profiles: Pick<Profile, "full_name" | "phone" | "avatar_url"> | null;
  // The score the *current* cleaner already gave the customer for this booking
  // (null = not yet rated). Attached by the dashboard page so the detail modal
  // can show/seed the rating control. See migration 0011.
  my_rating?: number | null;
}

export interface Rating {
  id: string;
  booking_id: string;
  rater_id: string;
  ratee_id: string;
  ratee_role: UserRole;
  score: number;
  created_at: string;
  updated_at: string;
}
