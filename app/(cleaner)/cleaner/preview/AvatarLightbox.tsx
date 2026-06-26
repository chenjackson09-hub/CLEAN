"use client";

import { useState } from "react";

interface Props {
  src: string;
  name: string;
}

// Renders the same avatar markup the customer profile uses, but tapping it opens
// a full-size zoom overlay (preview-only enhancement).
export default function AvatarLightbox({ src, name }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={name}
        className="rounded-full shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
      >
        <img
          src={src}
          alt={name}
          className="w-32 h-32 lg:w-48 lg:h-48 rounded-full object-cover shadow"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 leading-none"
          >
            ✕
          </button>
          <img
            src={src}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
