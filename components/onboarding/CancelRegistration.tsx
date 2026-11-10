"use client";

import { useState } from "react";
import { cancelUnfinishedRegistration } from "@/app/(auth)/actions";

// "Cancel registration and go back": deletes the person's own UNFINISHED account (so the email
// is free again) and returns them to the first sign-up screen. Two steps — it can't be undone.
// Strings come from the caller so it works under whichever language system the page uses.
export default function CancelRegistration({
  labels,
}: {
  labels: { cancel: string; warn: string; yes: string; no: string };
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    // On success the server redirects to /register; we only get a value back on failure.
    const result = await cancelUnfinishedRegistration();
    if (result && "error" in result) {
      setError(result.error);
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-sm text-red-600 hover:underline mt-2">
        {labels.cancel}
      </button>
    );
  }

  return (
    <div className="w-full mt-2 rounded-xl border border-red-200 bg-red-50 p-4 text-start">
      <p className="text-sm text-red-800 mb-3">{labels.warn}</p>
      {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {labels.yes}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          disabled={busy}
          className="flex-1 border border-gray-300 bg-white rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
        >
          {labels.no}
        </button>
      </div>
    </div>
  );
}
