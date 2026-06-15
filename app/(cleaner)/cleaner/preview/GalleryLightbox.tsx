"use client";

import { useState } from "react";
import Image from "next/image";
import type { CleanerGalleryPhoto } from "@/types/database";

interface Props {
  photos: CleanerGalleryPhoto[];
}

export default function GalleryLightbox({ photos }: Props) {
  const [index, setIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i! - 1 + photos.length) % photos.length);
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i! + 1) % photos.length);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Gallery</h2>
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setIndex(i)}
              className="relative rounded-xl overflow-hidden aspect-square bg-gray-100 hover:opacity-90 transition-opacity cursor-zoom-in"
            >
              <Image src={photo.photo_url} alt="Gallery photo" fill className="object-cover" />
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

          <div
            className="relative max-w-3xl max-h-[80vh] w-full mx-20"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[index].photo_url}
              alt="Gallery photo"
              width={1200}
              height={900}
              className="object-contain w-full max-h-[80vh]"
            />
          </div>

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
  );
}
