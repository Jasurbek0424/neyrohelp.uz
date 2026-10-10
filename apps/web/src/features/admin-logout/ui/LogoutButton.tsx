'use client'

import { Icon } from '@/shared/ui/admin/icons'

import { useLogout } from '../model/useLogout'

export function LogoutButton({ className = '' }: { className?: string }) {
  const { logout, pending } = useLogout()
  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      aria-label="Tizimdan chiqish"
      title="Tizimdan chiqish"
      className={`am-btn-o flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control border border-line bg-white text-ink-2 disabled:opacity-50 ${className}`}
    >
      <Icon name="logout" size={16} />
    </button>
  )
}
