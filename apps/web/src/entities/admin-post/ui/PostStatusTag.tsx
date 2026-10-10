import { StatusTag } from '@/shared/ui/admin/StatusTag'

import { postStatusMeta, type PostStatus } from '../model/types'

export function PostStatusTag({ status, label }: { status: PostStatus; label?: string }) {
  const m = postStatusMeta[status]
  return <StatusTag tone={m.tone}>{label ?? m.label}</StatusTag>
}
