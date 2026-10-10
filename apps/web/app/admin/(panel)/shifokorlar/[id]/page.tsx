import type { Metadata } from 'next'

import { AdminDoctorPage } from '@/views/admin-doctor'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Shifokor #${(await params).id}` }
}

export default async function Page({ params }: Props) {
  return <AdminDoctorPage id={Number((await params).id)} />
}
