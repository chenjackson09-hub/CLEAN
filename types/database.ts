export type UserRole = "customer" | "cleaner" | "admin";
export type ServiceType = "residential" | "commercial";
export type CleanerStatus = "pending" | "approved" | "rejected" | "suspended";
export type ApplicationStatus = "pending" | "approved" | "rejected";
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

export interface Customer {
  id: string;
  bio: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  preferred_service_type: ServiceType | null;
}

export interface Cleaner {
  id: string;
  bio: string | null;
  service_types: string[] | null;
  hourly_rate: number | null;
  location: unknown | null;
  service_radius_km: number;
  status: CleanerStatus;
  years_experience: number | null;
  languages: string[] | null;
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
}

export interface BookingWithCustomer extends Booking {
  profiles: Pick<Profile, "full_name" | "phone" | "avatar_url"> | null;
}
