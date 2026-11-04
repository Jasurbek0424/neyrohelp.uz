import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { Suspense, type ReactNode } from 'react'

import { AdminShell } from '@/widgets/admin-shell'
import { fetchMeOnServer, sessionKeys } from '@/entities/session/server'

/** `me` serverda olinib keshga solinadi — panel birinchi HTML'da render bo‘ladi (skeleton → me → sahifa kutilmaydi) */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const qc = new QueryClient()
  const me = await fetchMeOnServer()
  if (me) qc.setQueryData(sessionKeys.me(), me)
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <Suspense>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </HydrationBoundary>
  )
}
