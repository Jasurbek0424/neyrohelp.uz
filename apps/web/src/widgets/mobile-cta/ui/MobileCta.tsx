import Link from 'next/link'

import { PhoneIcon } from '@/shared/ui/Icons'

/** Mobil ekran pastida qotib turadigan qo‘ng‘iroq + yozilish paneli (JS'siz) */
export function MobileCta({ phoneHref, callLabel, cta }: { phoneHref: string; callLabel: string; cta: { href: string; label: string } }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-line bg-white/95 px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <a href={phoneHref} aria-label={callLabel} className="flex size-13 shrink-0 items-center justify-center rounded-control border border-field">
        <PhoneIcon />
      </a>
      <Link href={cta.href} className="flex h-13 flex-1 items-center justify-center rounded-control bg-navy font-medium text-white">
        {cta.label}
      </Link>
    </div>
  )
}
