import { TelegramIcon } from '@/shared/ui/Icons'

import { CopyLinkButton } from './CopyLinkButton'

/** Telegram'da ulashish (oddiy havola) + havolani nusxalash (yagona client qism) */
export function PostShare({ url, title, labels }: { url: string; title: string; labels: { share: string; telegram: string; copy: string; copied: string } }) {
  const shareHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="sr-only">{labels.share}</span>
      <a
        href={shareHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center gap-2 rounded-control border border-line-strong px-4 text-[15px] font-medium transition-colors hover:bg-sand"
      >
        <TelegramIcon />
        {labels.telegram}
      </a>
      <CopyLinkButton url={url} label={labels.copy} copiedLabel={labels.copied} />
    </div>
  )
}
