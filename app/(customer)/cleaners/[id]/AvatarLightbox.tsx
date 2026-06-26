'use client'

import { useState } from 'react'
import Image from 'next/image'

// The cleaner avatar shown on the profile: same markup as before, but tapping it
// opens a full-size zoom overlay. Used by both the customer-facing profile and
// the cleaner's own preview.
export function AvatarLightbox({ src, name }: { src: string; name: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={name}
        className="relative w-32 h-32 lg:w-48 lg:h-48 rounded-full shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
      >
        <Image
          src={src}
          alt={name}
          fill
          sizes="(min-width: 1024px) 12rem, 8rem"
          className="rounded-full object-cover shadow"
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
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-72 h-72 sm:w-96 sm:h-96"
          >
            <Image
              src={src}
              alt={name}
              fill
              sizes="(min-width: 640px) 24rem, 18rem"
              className="rounded-full object-cover shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  )
}
