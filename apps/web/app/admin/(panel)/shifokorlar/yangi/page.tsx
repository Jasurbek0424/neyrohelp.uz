import type { Metadata } from 'next'

import { AdminDoctorPage } from '@/views/admin-doctor'

export const metadata: Metadata = { title: 'Yangi shifokor' }

export default function Page() {
  return <AdminDoctorPage />
}
