"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Refreshes server components (so the Bookings nav badge updates) whenever one
// of this customer's bookings changes — e.g. a cleaner accepts a request.
export default function RealtimeCustomerBookings({ customerId }: { customerId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("customer-bookings")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${customerId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, router]);

  return null;
}
