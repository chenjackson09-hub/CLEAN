"use client";

import { useState } from "react";
import { StarIcon } from "./HostProfileIcons";

export type ReviewItem = {
  id: string;
  score: number;
  reviewText: string;
  reviewerName: string;
};

const VISIBLE_COUNT = 3;

function FilledStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={`w-4 h-4 ${n <= score ? "text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

// Shows up to 3 reviews inline, with a "See all reviews" toggle to expand the
// rest in place — this page is otherwise a plain server component, so this
// small bit of interactivity is split out into its own client component.
export default function ReviewsList({ reviews }: { reviews: ReviewItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? reviews : reviews.slice(0, VISIBLE_COUNT);
  const remaining = reviews.length - VISIBLE_COUNT;

  return (
    <div className="flex flex-col">
      {shown.map((r, i) => (
        <div key={r.id} className={`flex flex-col gap-1 py-3 ${i > 0 ? "border-t border-gray-100" : "pt-0"}`}>
          <FilledStars score={r.score} />
          <p className="text-sm text-gray-700">&ldquo;{r.reviewText}&rdquo;</p>
          <p className="text-xs text-gray-400">— {r.reviewerName}</p>
        </div>
      ))}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 text-center"
        >
          See all reviews ({reviews.length}) →
        </button>
      )}
    </div>
  );
}
