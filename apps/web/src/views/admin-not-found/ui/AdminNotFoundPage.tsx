import Link from 'next/link'

/** /admin ichidagi mavjud bo‘lmagan manzil */
export function AdminNotFoundPage() {
  return (
    <main id="admin-main" className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-(--am-bg) px-4 text-center">
      <p className="m-0 text-sm font-semibold text-ink-2">404</p>
      <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]">Sahifa topilmadi</h1>
      <p className="m-0 max-w-[420px] text-sm text-ink-2">Manzil noto‘g‘ri yoki sahifa o‘chirilgan.</p>
      <Link href="/admin" className="am-btn mt-2 flex h-10 items-center rounded-control bg-navy px-4 text-sm font-medium text-white">
        Bosh panelga qaytish
      </Link>
    </main>
  )
}
