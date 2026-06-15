// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
import { notFound } from 'next/navigation'
import { Nav } from '../../Nav'
import { CleanerProfile } from './CleanerProfile'
import { MOCK_CLEANERS } from '@/lib/mockData/cleaners'

type Props = {
  params: { id: string }
}

export default async function CleanerProfilePage({ params }: Props) {
  const cleaner = MOCK_CLEANERS.find(c => c.id === params.id)

  if (!cleaner) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <div className="px-6 py-6">
        <CleanerProfile cleaner={cleaner} />
      </div>
    </div>
  )
}
