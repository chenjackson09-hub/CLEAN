"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadGalleryPhoto, deleteGalleryPhoto } from "../../actions";
import { useLang } from "@/context/LangContext";
import type { CleanerGalleryPhoto } from "@/types/database";

interface Props {
  photos: CleanerGalleryPhoto[];
}

export default function GalleryManager({ photos: initialPhotos }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("photo", file);
    const result = await uploadGalleryPhoto(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(photo: CleanerGalleryPhoto) {
    const result = await deleteGalleryPhoto(photo.id, photo.photo_url);
    if (result?.error) {
      setError(result.error);
    } else {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("gallery_title")}</h2>
          <p className="text-sm text-gray-500">{t("gallery_subtitle")}</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? t("gallery_uploading") : t("gallery_add")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label={t("gallery_add")}
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {photos.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-gray-400">
          <p className="text-base">{t("gallery_empty")}</p>
          <p className="text-sm mt-1">{t("gallery_empty_sub")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100">
              <Image
                src={photo.photo_url}
                alt="Gallery photo"
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
              <button
                onClick={() => handleDelete(photo)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-base font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
