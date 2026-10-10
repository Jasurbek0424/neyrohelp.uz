import { Suspense, type ReactNode } from 'react'

import { AdminShell } from '@/widgets/admin-shell'

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  )
}
