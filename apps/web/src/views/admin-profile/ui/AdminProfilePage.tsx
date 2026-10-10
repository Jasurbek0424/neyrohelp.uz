'use client'

import { useMe } from '@/widgets/admin-shell'
import { useLogout } from '@/features/admin-logout'
import { ChangePasswordForm, TwoFactorCard } from '@/features/admin-profile'
import { roleLabels, UserAvatar } from '@/entities/session'
import { AdminButton } from '@/shared/ui/admin/Button'
import { Notice } from '@/shared/ui/admin/EmptyState'
import { Icon } from '@/shared/ui/admin/icons'
import { Card } from '@/shared/ui/admin/Table'
import { Topbar } from '@/shared/ui/admin/Topbar'

/** Profil: 2FA (majburiy bo‘lsa — boshqa bo‘limlar yopiq), parol, chiqish (mobil uchun ham shu yerda) */
export function AdminProfilePage() {
  const me = useMe()
  const { logout, pending } = useLogout()
  return (
    <>
      <Topbar title="Profil" />
      <main id="admin-main" className="min-h-0 flex-1 overflow-auto px-8 py-7 max-md:px-4 max-md:py-4">
        <div className="flex max-w-[720px] flex-col gap-4">
          {me.totp_required && (
            <Notice>
              <strong className="font-semibold">Ikki bosqichli himoyani yoqing.</strong> Administrator va muharrir uchun majburiy — yoqilmaguncha panelning boshqa bo‘limlari ochilmaydi.
            </Notice>
          )}
          <Card aria-label="Hisob" className="flex items-center gap-4 p-6 max-md:flex-wrap">
            <UserAvatar name={me.name} size={48} />
            <div className="min-w-0 flex-1">
              <h1 className="m-0 truncate text-xl font-semibold tracking-[-0.01em]">{me.name}</h1>
              <p className="m-0 mt-0.5 truncate text-sm text-ink-2">
                {me.email} · {roleLabels[me.role]}
              </p>
            </div>
            <AdminButton onClick={logout} disabled={pending} className="max-md:w-full">
              <Icon name="logout" size={16} />
              {pending ? 'Chiqilmoqda…' : 'Tizimdan chiqish'}
            </AdminButton>
          </Card>
          {me.twofa_available && <TwoFactorCard me={me} />}
          <ChangePasswordForm />
        </div>
      </main>
    </>
  )
}
