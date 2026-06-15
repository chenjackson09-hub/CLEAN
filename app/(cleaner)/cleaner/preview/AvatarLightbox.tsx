"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  src: string;
  name: string;
}

export default function AvatarLightbox({ src, name }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-48 h-48 rounded-full bg-gray-200 border-4 border-white overflow-hidden shrink-0 shadow hover:opacity-90 transition-opacity cursor-zoom-in"
      >
        <Image src={src} alt={name} width={192} height={192} className="object-cover w-full h-full" />
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
            className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={src} alt={name} fill className="object-cover" />
          </div>
        </div>
      )}
    </>
  );
}
