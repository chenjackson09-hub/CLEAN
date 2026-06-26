'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type ActionResult = { error?: string; success?: boolean; avatarUrl?: string } | null

type DefaultValues = {
  full_name: string
  phone: string
  bio: string
  preferred_service_type: 'residential' | 'commercial'
  address: string
  avatar_url: string | null
}

type Props = {
  defaultValues: DefaultValues
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors self-start shadow-sm disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save'}
    </button>
  )
}

export function ProfileForm({ defaultValues, action }: Props) {
  const [state, formAction] = useFormState(action, null)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(defaultValues.avatar_url)

  // On a successful save, adopt the freshly-saved (cache-busted) avatar URL and
  // re-fetch server data so the photo no longer shows the previous one.
  useEffect(() => {
    if (state?.success) {
      if (state.avatarUrl) setPreview(state.avatarUrl)
      router.refresh()
    }
  }, [state, router])

  const fieldClass = 'border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'
  const labelClass = 'text-xs font-semibold text-gray-600 uppercase tracking-wide'

  const initial = defaultValues.full_name?.charAt(0)?.toUpperCase() || '?'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center gap-5">
        {/* Clickable avatar */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-16 h-16 rounded-full shrink-0 group focus:outline-none"
          title="Change photo"
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center font-bold text-2xl text-blue-700 overflow-hidden">
            {preview ? (
              <img src={preview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </button>

        <div>
          <p className="text-lg font-bold text-gray-900">{defaultValues.full_name || 'Your name'}</p>
          <p className="text-sm text-gray-500">{defaultValues.address || 'Add your address'}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {defaultValues.preferred_service_type === 'commercial' ? 'Commercial' : 'Residential'}
          </span>
        </div>
      </div>

      <form action={formAction} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 border-t-4 border-t-blue-500 flex flex-col gap-4">
        {/* Hidden file input wired to avatar button */}
        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="full_name" className={labelClass}>Full Name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            defaultValue={defaultValues.full_name}
            required
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className={labelClass}>Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={defaultValues.phone}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className={labelClass}>About me</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={defaultValues.bio}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="preferred_service_type" className={labelClass}>Preferred Service Type</label>
          <select
            id="preferred_service_type"
            name="preferred_service_type"
            defaultValue={defaultValues.preferred_service_type}
            className={fieldClass}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="address" className={labelClass}>Address</label>
          <input
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
            defaultValue={defaultValues.address}
            required
            className={fieldClass}
          />
          <p className="text-xs text-gray-500">Used to find cleaners near you</p>
        </div>

        {state?.error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Profile saved!</p>
        )}

        <SubmitButton />
      </form>
    </div>
  )
}
