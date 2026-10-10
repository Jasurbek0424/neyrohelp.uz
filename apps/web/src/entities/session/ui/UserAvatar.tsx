import { initials } from '@/shared/lib/admin/format'

export function UserAvatar({ name, size = 36 }: { name: string | null | undefined; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size <= 24 ? 10 : 13 }}
      className="flex shrink-0 items-center justify-center rounded-control bg-navy-soft font-semibold text-navy"
    >
      {initials(name)}
    </span>
  )
}
