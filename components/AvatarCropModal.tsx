"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_ZOOM, MIN_ZOOM, clampPan, cropRect, scaleFor } from "@/lib/image/cropFrame";

// "Frame your photo": the picked picture sits under a round window; drag it into place, zoom with
// the slider, and the visible square is saved as the profile picture. Language follows <html dir>
// (like HelpWidget), so the same component works under both i18n systems.
const STRINGS = {
  en: { title: "Frame your photo", hint: "Drag the photo to move it. Use the slider to zoom.", zoom: "Zoom", use: "Use photo", cancel: "Cancel" },
  he: { title: "מסגרו את התמונה", hint: "גררו את התמונה כדי להזיז אותה. השתמשו בסליידר כדי להתקרב.", zoom: "זום", use: "שימוש בתמונה", cancel: "ביטול" },
} as const;

const FRAME = 280; // on-screen size of the square frame
const MAX_OUT = 1024;

export default function AvatarCropModal({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (cropped: File) => void;
  onCancel: () => void;
}) {
  const s = STRINGS[typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "he" : "en"];
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => () => URL.revokeObjectURL?.(url), [url]);

  // A picture the browser can't show can't be framed — keep it exactly as picked.
  const fallbackToOriginal = () => onDone(file);

  const setZoomClamped = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    setZoom(next);
    if (nat) setPan((p) => clampPan(nat.w, nat.h, FRAME, next, p.x, p.y));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !nat) return;
    const d = drag.current;
    setPan(clampPan(nat.w, nat.h, FRAME, zoom, d.ox + (e.clientX - d.px), d.oy + (e.clientY - d.py)));
  };
  const endDrag = () => {
    drag.current = null;
  };

  async function confirm() {
    const img = imgRef.current;
    if (!img || !nat) return fallbackToOriginal();
    try {
      const { sx, sy, side } = cropRect(nat.w, nat.h, FRAME, zoom, pan.x, pan.y);
      const out = Math.max(1, Math.min(MAX_OUT, Math.round(side)));
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) return fallbackToOriginal();
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
      if (!blob || blob.size === 0) return fallbackToOriginal();
      const base = file.name.replace(/\.[^./\\]+$/, "") || "avatar";
      onDone(new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
    } catch {
      fallbackToOriginal();
    }
  }

  const scale = nat ? scaleFor(nat.w, nat.h, FRAME, zoom) : 1;
  const dw = nat ? nat.w * scale : FRAME;
  const dh = nat ? nat.h * scale : FRAME;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={s.title}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-5">
        <h2 className="text-lg font-bold text-gray-900 text-center">{s.title}</h2>
        <p className="text-sm text-gray-500 text-center mt-1">{s.hint}</p>

        <div
          className="relative mx-auto mt-4 overflow-hidden rounded-2xl bg-gray-900 touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ width: FRAME, height: FRAME, maxWidth: "100%" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={(e) => setZoomClamped(zoom - e.deltaY * 0.002)}
          data-testid="crop-frame"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              if (el.naturalWidth && el.naturalHeight) setNat({ w: el.naturalWidth, h: el.naturalHeight });
              else fallbackToOriginal();
            }}
            onError={fallbackToOriginal}
            className="absolute max-w-none"
            style={{
              width: dw,
              height: dh,
              left: FRAME / 2 + pan.x - dw / 2,
              top: FRAME / 2 + pan.y - dh / 2,
              visibility: nat ? "visible" : "hidden",
            }}
          />
          {/* The round window: everything outside it is dimmed. */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "0 0 0 999px rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.9)" }}
          />
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm text-gray-600">
          <span className="shrink-0">{s.zoom}</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            aria-label={s.zoom}
            className="w-full"
          />
        </label>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            {s.cancel}
          </button>
          <button type="button" onClick={confirm} disabled={!nat} className="flex-1 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50">
            {s.use}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
