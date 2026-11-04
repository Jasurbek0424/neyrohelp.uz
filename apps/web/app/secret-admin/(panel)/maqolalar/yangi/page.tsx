import type { Metadata } from 'next'

import { AdminPostPage } from '@/views/admin-post'

export const metadata: Metadata = { title: 'Yangi maqola' }

export default function Page() {
  return <AdminPostPage />
}
