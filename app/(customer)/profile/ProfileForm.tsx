'use client'
import { useFormState, useFormStatus } from 'react-dom'

type ActionResult = { error?: string; success?: boolean } | null

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
      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2 rounded-md font-semibold text-sm transition-colors self-start shadow-sm disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save'}
    </button>
  )
}

export function ProfileForm({ defaultValues, action }: Props) {
  const [state, formAction] = useFormState(action, null)

  const fieldClass = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'
  const labelClass = 'text-xs font-semibold text-gray-600 uppercase tracking-wide'

  const initial = defaultValues.full_name?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 shadow-md text-white flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0">
          {defaultValues.avatar_url ? (
            <img src={defaultValues.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div>
          <p className="text-lg font-bold">{defaultValues.full_name || 'Your name'}</p>
          <p className="text-sm text-white/80">📍 {defaultValues.address || 'Add your address'}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium bg-white/20">
            {defaultValues.preferred_service_type === 'commercial' ? 'Commercial' : 'Residential'}
          </span>
        </div>
      </div>

      <form action={formAction} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 border-t-4 border-t-indigo-400 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="full_name" className={labelClass}>Full Name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
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
            defaultValue={defaultValues.address}
            required
            className={fieldClass}
          />
          <p className="text-xs text-gray-500">Used to find cleaners near you</p>
        </div>

        {state?.error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">Profile saved!</p>
        )}

        <SubmitButton />
      </form>
    </div>
  )
}
