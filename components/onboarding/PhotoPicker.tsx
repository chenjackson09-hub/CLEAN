"use client"

import { useRef, useState } from "react"
import { normalizeImageToJpeg } from "@/lib/image/normalizeImage"
import AvatarCropModal from "@/components/AvatarCropModal"

// A round photo button with the "take a photo / camera roll / choose from computer" menu both
// wizards use. The picked file is converted to a JPEG first (iPhone HEIC) and handed back with
// a preview URL; uploading is up to the caller.
export default function PhotoPicker({
  preview, onPick, labels, sizeClass = "w-24 h-24", fallback = "📷", alt = "", frame = true,
}: {
  preview: string | null
  onPick: (file: File, previewUrl: string) => void
  labels: { camera: string; library: string; computer: string }
  sizeClass?: string
  fallback?: string
  alt?: string
  // Let the person drag/zoom the picture into a square before it is used (profile pictures).
  frame?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [framing, setFraming] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)

  function choose(mode: "camera" | "library" | "computer") {
    setOpen(false)
    if (!input.current) return
    if (mode === "camera") input.current.setAttribute("capture", "environment")
    else input.current.removeAttribute("capture")
    input.current.click()
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const normalized = await normalizeImageToJpeg(file)
    if (input.current) input.current.value = "" // so choosing the same file again still fires
    if (frame) setFraming(normalized)
    else onPick(normalized, URL.createObjectURL(normalized))
  }

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={labels.library} className={`${sizeClass} rounded-full border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl text-gray-400">{fallback}</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full mt-2 start-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[200px] overflow-hidden">
          <button type="button" onClick={() => choose("camera")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">{labels.camera}</button>
          <button type="button" onClick={() => choose("library")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">{labels.library}</button>
          <button type="button" onClick={() => choose("computer")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">{labels.computer}</button>
        </div>
      )}
      {framing && (
        <AvatarCropModal
          file={framing}
          onCancel={() => setFraming(null)}
          onDone={(cropped) => {
            setFraming(null)
            onPick(cropped, URL.createObjectURL(cropped))
          }}
        />
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onChange} data-testid="photo-input" />
    </div>
  )
}
