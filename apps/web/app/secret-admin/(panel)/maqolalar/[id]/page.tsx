import type { Metadata } from 'next'

import { AdminPostPage } from '@/views/admin-post'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Maqola #${(await params).id}` }
}

export default async function Page({ params }: Props) {
  return <AdminPostPage id={Number((await params).id)} />
}
