'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// The gallery card shown on the profile: same heading + grid as before, but each
// thumbnail opens a zoom overlay with prev/next. Used by both the customer-facing
// profile and the cleaner's own preview.
export function GalleryLightbox({ photos, name }: { photos: string[]; name: string }) {
  const { t } = useLanguage()
  const [index, setIndex] = useState<number | null>(null)

  if (photos.length === 0) return null

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex((i) => (i! - 1 + photos.length) % photos.length)
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex((i) => (i! + 1) % photos.length)
  }

  return (
    <>
      <div className="bg-white shadow-md rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">{t('cleanerProfile.gallery')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className="relative w-full aspect-square cursor-zoom-in hover:opacity-90 transition-opacity"
            >
              <Image
                src={url}
                alt={`${name} ${i + 1}`}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover rounded-xl"
              />
            </button>
          ))}
        </div>
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIndex(null)}
        >
          <button
            onClick={() => setIndex(null)}
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 leading-none"
          >
            ✕
          </button>

          {photos.length > 1 && (
            <button
              onClick={prev}
              className="absolute left-4 text-white text-5xl font-light hover:text-gray-300 px-2 select-none"
            >
              ‹
            </button>
          )}

          {/* Full-size zoom view: kept as a plain <img> because its intrinsic
              aspect ratio is unknown and it renders object-contain within
              max-w/max-h bounds — next/image fill can't preserve that. Loads
              only when the overlay is opened. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[index]}
            alt={`${name} ${index + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl max-h-[80vh] w-auto object-contain mx-20"
          />

          {photos.length > 1 && (
            <button
              onClick={next}
              className="absolute right-4 text-white text-5xl font-light hover:text-gray-300 px-2 select-none"
            >
              ›
            </button>
          )}

          <p className="absolute bottom-4 text-white/60 text-sm">
            {index + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  )
}
