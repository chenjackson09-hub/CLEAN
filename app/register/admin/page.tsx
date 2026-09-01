import { Suspense } from 'react'
import { RegisterAdminForm } from './RegisterAdminForm'

export default function RegisterAdminPage() {
  return (
    <Suspense fallback={null}>
      <RegisterAdminForm />
    </Suspense>
  )
}
