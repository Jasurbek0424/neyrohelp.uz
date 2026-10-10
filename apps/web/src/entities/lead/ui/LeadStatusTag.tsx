import { StatusTag } from '@/shared/ui/admin/StatusTag'
import { Icon } from '@/shared/ui/admin/icons'

import { leadStatusMeta, tgMeta } from '../model/status'
import type { LeadStatus, TgDelivery } from '../model/types'

export function LeadStatusTag({ status }: { status: LeadStatus }) {
  const m = leadStatusMeta[status]
  return <StatusTag tone={m.tone}>{m.label}</StatusTag>
}

export function TelegramDelivery({ value }: { value: TgDelivery }) {
  const m = tgMeta[value]
  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-[13px] whitespace-nowrap ${m.color}`}>
      <Icon name={m.icon} size={16} strokeWidth={1.8} />
      <span className="truncate">{m.text}</span>
    </span>
  )
}
