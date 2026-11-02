"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { normalizeImageToJpeg } from "@/lib/image/normalizeImage"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { addHomePhoto, listMyHomePhotos, removeHomePhoto, type HomePhoto } from "@/lib/actions/homePhotos"
import { HOME_PHOTOS_BUCKET, MAX_HOME_PHOTOS } from "@/lib/homePhotos"

// "Photos of your home" - optional, recommended, and PRIVATE. Used while building the host
// profile (sign-up) and on the host's own profile page. Photos are saved the moment they are
// added or removed (no Save button, nothing in the wizard's own draft), so they work the same
// in both places. The privacy note is always visible: these are only ever seen by a cleaner the
// host sends a request to.
export default function HomePhotosManager() {
  const { t } = useLanguage()
  const [photos, setPhotos] = useState<HomePhoto[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    listMyHomePhotos().then((res) => {
      if (alive && "ok" in res) setPhotos(res.photos)
    })
    return () => {
      alive = false
    }
  }, [])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return
    setError(null)
    setBusy(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setError(t("homePhotos.errorUpload"))
        return
      }
      let room = MAX_HOME_PHOTOS - photos.length
      for (const file of files) {
        if (room <= 0) {
          setError(t("homePhotos.limit", { n: MAX_HOME_PHOTOS }))
          break
        }
        const jpeg = await normalizeImageToJpeg(file)
        const path = `${data.user.id}/${crypto.randomUUID()}.jpg`
        const { error: upErr } = await supabase.storage.from(HOME_PHOTOS_BUCKET).upload(path, jpeg, { contentType: "image/jpeg" })
        if (upErr) {
          setError(t("homePhotos.errorUpload"))
          break
        }
        const res = await addHomePhoto(path)
        if ("error" in res) {
          setError(res.error)
          break
        }
        setPhotos(res.photos)
        room = MAX_HOME_PHOTOS - res.photos.length
      }
    } catch {
      setError(t("homePhotos.errorUpload"))
    } finally {
      setBusy(false)
    }
  }

  async function onRemove(path: string) {
    setError(null)
    setBusy(true)
    const res = await removeHomePhoto(path)
    setBusy(false)
    if ("error" in res) setError(res.error)
    else setPhotos(res.photos)
  }

  const full = photos.length >= MAX_HOME_PHOTOS

  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-4" aria-labelledby="home-photos-title">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="home-photos-title" className="text-base font-semibold text-gray-900">{t("homePhotos.title")}</h2>
        <span className="text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">{t("homePhotos.optional")}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{t("homePhotos.why")}</p>
      <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2 mt-2">
        <span aria-hidden>🔒 </span>
        {t("homePhotos.privacy")}
      </p>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 mt-3">
          {photos.map((p) => (
            <li key={p.path} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              {/* A plain <img>: these are private, short-lived links - they must not pass through the public image optimizer cache. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={t("homePhotos.alt")} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(p.path)}
                disabled={busy}
                aria-label={t("homePhotos.remove")}
                className="absolute top-1 end-1 w-7 h-7 rounded-full bg-black/60 text-white text-sm leading-none hover:bg-black/80 disabled:opacity-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy || full}
          className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? t("homePhotos.adding") : `＋ ${t("homePhotos.add")}`}
        </button>
        <span className="text-xs text-gray-500">{photos.length} / {MAX_HOME_PHOTOS}</span>
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={onPick} data-testid="home-photo-input" />
      </div>
      {error && <p role="alert" className="text-sm text-red-600 mt-2">{error}</p>}
    </section>
  )
}
