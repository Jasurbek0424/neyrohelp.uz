import type { Metadata } from 'next'

import { AdminLeadPage } from '@/views/admin-lead'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Ariza #${(await params).id}` }
}

export default async function Page({ params }: Props) {
  return <AdminLeadPage id={Number((await params).id)} />
}
