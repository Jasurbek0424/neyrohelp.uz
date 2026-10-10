import { notFound } from 'next/navigation'

/** Mavjud bo‘lmagan manzillar tilga mos 404 sahifani (layout bilan) ko‘rsatsin */
export default function CatchAll() {
  notFound()
}
