"use client";

// Longest edge of the stored avatar. Avatars render at ~64px, so 1024 is
// generous while keeping the upload tiny.
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;

/**
 * Convert a user-selected image into a resized JPEG File, client-side, before
 * it's uploaded.
 *
 * Why this exists: iPhones capture photos as HEIC/HEIF. The raw file uploads
 * fine to Supabase (the bucket accepts any type), but `next/image`'s optimizer
 * and every non-Safari browser can't decode HEIC — so the avatar renders broken
 * and the save *looks* like it failed. iOS Safari can decode HEIC natively into
 * an <img>/canvas, so drawing it to a canvas and re-encoding as JPEG produces a
 * file that displays everywhere. It also shrinks multi-MB phone photos.
 *
 * Never throws: if the browser can't decode the file (or anything else goes
 * wrong) it returns the original File unchanged, so a save is never blocked.
 */
export async function normalizeImageToJpeg(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  // Only touch images; leave anything else untouched.
  if (file.type && !file.type.startsWith("image/")) return file;

  try {
    const source = await loadDecodable(file);
    const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
    const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!srcW || !srcH) return file;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
    const width = Math.round(srcW * scale);
    const height = Math.round(srcH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(source, 0, 0, width, height);
    if ("close" in source && typeof source.close === "function") source.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size === 0) return file;

    const baseName = file.name.replace(/\.[^./\\]+$/, "") || "avatar";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/**
 * Decode the file to something drawable. Prefer `createImageBitmap` with
 * `from-image` so EXIF orientation (rotated phone selfies) is baked in; fall
 * back to an <img> element, which Safari uses to decode HEIC.
 */
async function loadDecodable(
  file: File
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through — some browsers can't createImageBitmap from HEIC.
    }
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}
