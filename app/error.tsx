"use client";

import { useEffect } from "react";
import ErrorScreen from "@/components/ErrorScreen";

// Shown when a page throws while loading. "Try again" re-renders the page that failed.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorScreen kind="error" onRetry={reset} />
    </div>
  );
}
