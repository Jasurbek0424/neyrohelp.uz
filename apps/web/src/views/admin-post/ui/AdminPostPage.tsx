'use client'

import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { postDetailQuery } from '@/entities/admin-post'
import { adminPaths } from '@/entities/session'
import { ApiError } from '@/shared/api/client'
import { errorMessage } from '@/shared/lib/admin/form-errors'
import { EmptyState, ErrorState } from '@/shared/ui/admin/EmptyState'
import { Skeleton } from '@/shared/ui/admin/Skeleton'
import { Topbar } from '@/shared/ui/admin/Topbar'

function EditorSkeleton() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Maqolalar', href: adminPaths.posts }, { label: '…' }]} />
      <div role="status" aria-label="Yuklanmoqda" className="flex min-h-0 flex-1">
        <div className="flex flex-1 flex-col gap-4 px-8 pt-6">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-[640px] rounded-card" />
        </div>
        <div className="w-80 border-l border-line bg-white max-lg:hidden" />
      </div>
    </>
  )
}

/** Markdown muharriri (toolbar, preview, SEO) — alohida chunk, faqat shu sahifada yuklanadi */
const PostEditor = dynamic(() => import('@/features/admin-post-editor').then((m) => m.PostEditor), { ssr: false, loading: EditorSkeleton })

/** A5: maqola muharriri. id yo‘q — yangi maqola */
export function AdminPostPage({ id }: { id?: number }) {
  const valid = id === undefined || (Number.isInteger(id) && id > 0)
  const q = useQuery({ ...postDetailQuery(id ?? 0), enabled: id !== undefined && valid })

  if (id === undefined) return <PostEditor />
  if (!valid || (q.error instanceof ApiError && q.error.status === 404)) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Maqolalar', href: adminPaths.posts }, { label: 'Topilmadi' }]} />
        <main id="admin-main" className="flex flex-1 items-center justify-center">
          <EmptyState
            title="Maqola topilmadi"
            action={
              <Link href={adminPaths.posts} className="am-link text-sm font-medium">
                Ro‘yxatga qaytish
              </Link>
            }
          />
        </main>
      </>
    )
  }
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
  if (!q.data) return <EditorSkeleton />
  return <PostEditor key={q.data.id} post={q.data} />
}
