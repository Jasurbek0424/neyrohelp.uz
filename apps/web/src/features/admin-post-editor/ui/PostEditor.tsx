'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'

import { doctorListQuery } from '@/entities/admin-doctor'
import { PostStatusTag, postCategoriesQuery, useDeletePost, useSavePost, type PostAdmin, type PostStatus } from '@/entities/admin-post'
import { dashboardKeys } from '@/entities/lead'
import { MediaThumb, mediaThumb, useUploadMedia, validateUpload } from '@/entities/media'
import { adminPaths, useAdminUi } from '@/entities/session'
import { errorMessage, fieldErrorsFrom, zodErrors } from '@/shared/lib/admin/form-errors'
import { lt, ltOr, setLt } from '@/shared/lib/admin/ltext'
import { fromLocalInput, hhmm, toLocalInput } from '@/shared/lib/admin/time'
import { useUnsavedChangesGuard } from '@/shared/lib/hooks/useUnsavedChangesGuard'
import { slugify } from '@/shared/lib/slugify'
import { AdminButton } from '@/shared/ui/admin/Button'
import { ConfirmDialog } from '@/shared/ui/admin/ConfirmDialog'
import { AffixInput, Field, inputClass, Select } from '@/shared/ui/admin/Field'
import { FileDrop } from '@/shared/ui/admin/FileDrop'
import { CheckIcon, ExternalIcon, Icon } from '@/shared/ui/admin/icons'
import { LocaleTabs } from '@/shared/ui/admin/LocaleTabs'
import { Segmented } from '@/shared/ui/admin/Segmented'
import { Skeleton } from '@/shared/ui/admin/Skeleton'
import { Switch } from '@/shared/ui/admin/Switch'
import { toast } from '@/shared/ui/admin/Toast'
import { Topbar } from '@/shared/ui/admin/Topbar'

import { readingMinutes } from '../lib/markdown'
import { localeFill, postSchema, toDraft, toPayload, type PostDraft } from '../model/draft'

import { MarkdownToolbar } from './MarkdownToolbar'

/** Markdown preview (markdown-it) — og‘ir, faqat client'da va kerak bo‘lganda yuklanadi */
const MarkdownPreview = dynamic(() => import('./MarkdownPreview'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  ),
})

type View = 'split' | 'edit' | 'preview'
const section = 'border-b border-line p-5'

export function PostEditor({ post }: { post?: PostAdmin }) {
  const router = useRouter()
  const qc = useQueryClient()
  const locale = useAdminUi((s) => s.contentLocale)
  const setLocale = useAdminUi((s) => s.setContentLocale)
  const [baseline, setBaseline] = useState(() => toDraft(post))
  const [draft, setDraft] = useState<PostDraft>(baseline)
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [sched, setSched] = useState(post?.status === 'scheduled')
  const [view, setView] = useState<View>('split')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savedAt, setSavedAt] = useState<string | null>(post?.updated_at ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)

  const categories = useQuery(postCategoriesQuery())
  const authors = useQuery(doctorListQuery())
  const save = useSavePost()
  const del = useDeletePost()
  const upload = useUploadMedia()

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline])
  useUnsavedChangesGuard(dirty && !save.isPending)
  const fill = useMemo(() => localeFill(draft), [draft])

  const set = <K extends keyof PostDraft>(k: K, v: PostDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const title = lt(draft.title, locale)
  const titleUz = lt(draft.title, 'uz')
  const crumb = (titleUz || 'Yangi maqola').length > 28 ? `${(titleUz || 'Yangi maqola').slice(0, 26)}…` : titleUz || 'Yangi maqola'
  const author = authors.data?.find((a) => a.id === draft.author_id)

  const statusNow: PostStatus = sched ? 'scheduled' : draft.status === 'scheduled' ? 'draft' : draft.status
  const primaryLabel = draft.status === 'published' && !sched ? 'Yangilash' : sched ? 'Rejalashtirish' : 'Nashr qilish'

  const persist = (status: PostStatus) => {
    const candidate = { ...draft, status }
    const parsed = postSchema.safeParse(candidate)
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error.issues))
      toast.error('Ba’zi maydonlar noto‘g‘ri to‘ldirilgan')
      return
    }
    setErrors({})
    save.mutate(
      { id: post?.id, body: toPayload(draft, status) },
      {
        onSuccess: (data) => {
          const next = toDraft(data)
          setBaseline(next)
          setDraft(next)
          setSched(data.status === 'scheduled')
          setSavedAt(data.updated_at ?? new Date().toISOString())
          void qc.invalidateQueries({ queryKey: dashboardKeys.all })
          toast.success(status === 'published' ? 'Maqola nashr qilindi' : status === 'scheduled' ? 'Nashr rejalashtirildi' : 'Qoralama saqlandi')
          if (!post) router.replace(adminPaths.post(data.id))
        },
        onError: (e) => {
          const f = fieldErrorsFrom(e)
          if ((e as { detail?: string }).detail === 'slug_taken') f.slug = 'Bu slug band'
          setErrors(f)
          toast.error(errorMessage(e))
        },
      },
    )
  }

  const insertImage = (file: File) => {
    const err = validateUpload(file, 'image')
    if (err) return toast.error(err)
    upload.mutate(
      { file, alt: titleUz },
      {
        onSuccess: (m) => {
          const url = mediaThumb(m, 960) ?? m.url
          const body = lt(draft.body, locale)
          const ta = bodyRef.current
          const pos = ta?.selectionStart ?? body.length
          const snippet = `\n\n![${titleUz.replace(/[[\]]/g, '') || 'Rasm'}](${url})\n\n`
          set('body', setLt(draft.body, locale, body.slice(0, pos) + snippet + body.slice(pos)))
        },
        onError: (e) => toast.error(errorMessage(e, 'Rasmni yuklab bo‘lmadi')),
      },
    )
  }

  const uploadCover = (file: File) => {
    const err = validateUpload(file, 'image')
    if (err) return toast.error(err)
    upload.mutate({ file, alt: titleUz }, { onSuccess: (m) => setDraft((d) => ({ ...d, cover: m, cover_id: m.id })), onError: (e) => toast.error(errorMessage(e)) })
  }

  const body = lt(draft.body, locale)
  const excerpt = lt(draft.excerpt, locale)
  const seoTitle = lt(draft.seo.title, locale) || title
  const seoDesc = lt(draft.seo.description, locale) || excerpt
  const tLen = lt(draft.seo.title, locale).length
  const dLen = lt(draft.seo.description, locale).length
  const notUz = locale !== 'uz' && !title.trim() && !body.trim()

  return (
    <>
      <Topbar crumbs={[{ label: 'Maqolalar', href: adminPaths.posts }, { label: crumb }]}>
        <span role="status" className="flex items-center gap-2 text-[13px] whitespace-nowrap text-ink-2 max-md:hidden">
          {save.isPending ? (
            'Saqlanmoqda…'
          ) : dirty ? (
            <>
              <span aria-hidden className="size-2 rounded-full bg-(--am-warn-dot)" />
              Saqlanmagan o‘zgarishlar
            </>
          ) : savedAt ? (
            <>
              <CheckIcon />
              {draft.status === 'draft' ? 'Qoralama saqlandi' : 'Saqlandi'} · {hhmm(savedAt)}
            </>
          ) : null}
        </span>
        {post && (
          <a href={`/uz/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="am-btn-o flex h-10 items-center gap-2 rounded-control border border-line-strong bg-white px-4 text-sm font-medium">
            Ko‘rib chiqish
            <ExternalIcon />
            <span className="sr-only">(yangi oynada)</span>
          </a>
        )}
        {draft.status !== 'published' && !sched && (
          <AdminButton onClick={() => persist('draft')} disabled={save.isPending}>
            Saqlash
          </AdminButton>
        )}
        <AdminButton variant="primary" className="px-[18px]" onClick={() => persist(sched ? 'scheduled' : 'published')} disabled={save.isPending}>
          {primaryLabel}
        </AdminButton>
      </Topbar>

      <div className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-auto">
        <main id="admin-main" className="min-w-0 flex-1 overflow-auto max-lg:overflow-visible px-8 pt-6 pb-14 max-md:px-4">
          <div className="mx-auto max-w-[1120px]">
            <div className="mb-4 flex h-9 items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span id="lang-label" className="text-[13px] font-medium text-ink-2">
                  Kontent tili
                </span>
                <LocaleTabs variant="pill" labelId="lang-label" value={locale} onChange={setLocale} fill={fill} />
              </div>
              <div className="text-xs text-ink-2 max-lg:hidden">Yashil nuqta — matn to‘liq, bo‘sh doira — tarjima yo‘q</div>
            </div>

            {notUz && (
              <div role="status" className="mb-4 rounded-control bg-(--am-warn-soft) px-3.5 py-2.5 text-[13px] font-medium text-(--am-warn)">
                {locale.toUpperCase()} tarjimasi hali yo‘q. Tarjima kiritilmaguncha saytda o‘zbekcha matn ko‘rsatiladi.
              </div>
            )}

            <div className="rounded-card border border-line bg-white">
              <div className="px-12 pt-12 pb-7 max-md:px-5 max-md:pt-6">
                <label htmlFor="post-title" className="sr-only">
                  Maqola sarlavhasi
                </label>
                <textarea
                  id="post-title"
                  rows={2}
                  maxLength={200}
                  placeholder={locale !== 'uz' && titleUz ? titleUz : 'Maqola sarlavhasi'}
                  aria-invalid={Boolean(errors['title.uz']) || undefined}
                  className="am-bare block h-[88px] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-4xl leading-[1.2] font-semibold tracking-[-0.02em] text-ink max-md:text-[28px]"
                  value={title}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\n/g, ' ')
                    setDraft((d) => ({ ...d, title: setLt(d.title, locale, v), slug: !slugTouched && locale === 'uz' ? slugify(v).slice(0, 120) : d.slug }))
                  }}
                />
                {errors['title.uz'] && (
                  <p role="alert" className="mt-1 text-xs font-medium text-danger">
                    {errors['title.uz']}
                  </p>
                )}

                <div className="mt-6 flex items-baseline justify-between">
                  <label htmlFor="post-summary" className="text-[13px] font-medium">
                    Qisqa mazmun
                  </label>
                  <span className={`text-xs tabular-nums ${excerpt.length > 280 ? 'font-semibold text-danger' : 'text-ink-2'}`}>{excerpt.length} / 280</span>
                </div>
                <textarea
                  id="post-summary"
                  rows={3}
                  maxLength={2000}
                  placeholder={locale !== 'uz' ? lt(draft.excerpt, 'uz') : 'Maqola nima haqida — 1–2 gap'}
                  className="am-in mt-1.5 block h-20 w-full resize-none rounded-control border border-line-strong bg-white px-3 py-2.5 text-[17px] leading-normal text-ink-2"
                  value={excerpt}
                  onChange={(e) => set('excerpt', setLt(draft.excerpt, locale, e.target.value))}
                />
              </div>

              <MarkdownToolbar textareaRef={bodyRef} value={body} onChange={(v) => set('body', setLt(draft.body, locale, v))} onInsertImage={() => imageInput.current?.click()} />
              <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" hidden tabIndex={-1} onChange={(e) => (e.target.files?.[0] && insertImage(e.target.files[0]), (e.target.value = ''))} />

              <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-2">
                <span className="text-xs text-ink-2">Markdown · {body.length.toLocaleString('ru-RU')} belgi</span>
                <Segmented<View>
                  label="Ko‘rinish"
                  tone="light"
                  value={view}
                  onChange={setView}
                  className="h-8!"
                  itemClassName="px-3 text-[13px]!"
                  options={[
                    { value: 'edit', label: 'Matn' },
                    { value: 'split', label: 'Yonma-yon' },
                    { value: 'preview', label: 'Ko‘rinish' },
                  ]}
                />
              </div>

              <div className={`grid min-h-[480px] ${view === 'split' ? 'grid-cols-2 max-lg:grid-cols-1' : 'grid-cols-1'}`}>
                {view !== 'preview' && (
                  <div className={view === 'split' ? 'border-r border-line max-lg:border-r-0 max-lg:border-b' : ''}>
                    <label htmlFor="post-body" className="sr-only">
                      Maqola matni (Markdown)
                    </label>
                    <textarea
                      ref={bodyRef}
                      id="post-body"
                      spellCheck
                      maxLength={20000}
                      placeholder={locale !== 'uz' && lt(draft.body, 'uz') ? 'Tarjima matnini kiriting…' : 'Matnni yozing. ## sarlavha, - ro‘yxat, **qalin**'}
                      className="am-bare block h-full min-h-[480px] w-full resize-y border-0 bg-transparent px-6 py-6 font-mono text-[14px] leading-[1.7] text-ink"
                      value={body}
                      onChange={(e) => set('body', setLt(draft.body, locale, e.target.value))}
                    />
                  </div>
                )}
                {view !== 'edit' && (
                  <section aria-label="Oldindan ko‘rish" className="min-w-0 px-8 py-6">
                    <MarkdownPreview source={body} lang={locale} />
                  </section>
                )}
              </div>

              <p className="m-0 border-t border-line px-12 py-5 text-sm leading-relaxed text-ink-2 max-md:px-5">Maqola ma’lumot uchun, shifokor ko‘rigi o‘rnini bosmaydi.</p>
            </div>
          </div>
        </main>

        <aside aria-label="Maqola sozlamalari" className="w-80 shrink-0 overflow-auto border-l border-line bg-white max-lg:w-full max-lg:overflow-visible max-lg:border-t max-lg:border-l-0">
          <section aria-labelledby="st-title" className={section}>
            <h2 id="st-title" className="m-0 mb-3 text-sm font-semibold">
              Holat
            </h2>
            <PostStatusTag status={statusNow} />
            <div className="mt-3.5">
              <Switch label="Nashrni rejalashtirish" checked={sched} onChange={setSched} />
            </div>
            {sched && (
              <div className="mt-3.5">
                <Field label="Nashr sanasi va vaqti" error={errors.published_at} hint="Belgilangan vaqtda maqola saytda paydo bo‘ladi (Toshkent vaqti).">
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="datetime-local"
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      className={`${inputClass} tabular-nums`}
                      value={toLocalInput(draft.published_at)}
                      onChange={(e) => set('published_at', fromLocalInput(e.target.value))}
                    />
                  )}
                </Field>
              </div>
            )}
            {post && draft.status !== 'draft' && !sched && (
              <button type="button" onClick={() => persist('draft')} className="am-link mt-3 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-ink">
                Qoralamaga qaytarish
              </button>
            )}
          </section>

          <section className={section}>
            <Field label="URL slug" error={errors.slug}>
              {({ id, describedBy, invalid }) => (
                <AffixInput
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  prefix="/blog/"
                  maxLength={120}
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                  }}
                />
              )}
            </Field>
          </section>

          <section className={section}>
            <Field label="Kategoriya" error={errors.category_id}>
              {({ id, invalid }) => (
                <Select id={id} aria-invalid={invalid || undefined} value={draft.category_id || ''} onChange={(e) => set('category_id', Number(e.target.value))}>
                  <option value="" disabled>
                    Tanlang
                  </option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {ltOr(c.title)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </section>

          <section className={section}>
            <label htmlFor="author" className="block text-[13px] font-medium">
              Muallif
            </label>
            <div className="mt-1.5 flex items-center gap-2.5">
              <MediaThumb media={author?.photo} width={40} height={40} />
              <Select id="author" wrapperClassName="min-w-0 flex-1" value={draft.author_id ?? ''} onChange={(e) => set('author_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Muallifsiz</option>
                {authors.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </Select>
            </div>
            {author && !author.photo && <p className="mt-1.5 mb-0 text-xs text-ink-2">Portret yuklanmagan</p>}
          </section>

          <section aria-labelledby="cover-title" className={section}>
            <h2 id="cover-title" className="m-0 mb-2.5 text-[13px] font-medium">
              Muqova rasmi
            </h2>
            {draft.cover ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card">
                <MediaThumb media={draft.cover} width="100%" height="100%" rounded={10} />
              </div>
            ) : (
              <FileDrop label="Muqova rasmini yuklash" onFile={uploadCover} busy={upload.isPending} hint="JPG/PNG/WebP, 16:10, kamida 1600 px" className="aspect-[16/10] w-full" />
            )}
            {draft.cover && (
              <div className="mt-2.5 flex items-center gap-3">
                <FileDrop label="Muqovani almashtirish" onFile={uploadCover} busy={upload.isPending} className="h-8! w-auto! flex-row! rounded-control! border-solid! border-line-strong! px-3! py-0!">
                  <span className="text-[13px] font-medium">{upload.isPending ? 'Yuklanmoqda…' : 'Almashtirish'}</span>
                </FileDrop>
                <button type="button" onClick={() => setDraft((d) => ({ ...d, cover: null, cover_id: null }))} className="am-link cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-ink">
                  Olib tashlash
                </button>
              </div>
            )}
          </section>

          <section className={section}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium">O‘qish vaqti</span>
              <span className="text-sm font-semibold">{readingMinutes(lt(draft.body, 'uz'))} daqiqa</span>
            </div>
            <div className="mt-1 text-xs text-ink-2">matn bo‘yicha hisoblandi</div>
          </section>

          <section className={section}>
            <Switch label="Tanlangan maqola" description="Blog sahifasida yuqorida ko‘rsatiladi." checked={draft.featured} onChange={(v) => set('featured', v)} />
          </section>

          <section aria-labelledby="seo-title" className="p-5">
            <h2 id="seo-title" className="m-0 mb-3 text-sm font-semibold">
              SEO
            </h2>
            <div className="rounded-control border border-line bg-white p-3.5" aria-label="Qidiruvdagi ko‘rinishi" role="img">
              <div className="truncate text-[13px] leading-snug text-(--am-ok)">
                neyromed.uz › {locale} › blog › {draft.slug || 'slug'}
              </div>
              <div className="mt-1 text-lg leading-tight text-(--am-seo-link)">{seoTitle ? `${seoTitle}${lt(draft.seo.title, locale) ? '' : ' | NeyroMed'}` : 'Sarlavha'}</div>
              <div className="mt-1 line-clamp-2 text-[13px] leading-normal text-ink-2">{seoDesc || 'Tavsif'}</div>
            </div>
            <div className="mt-3.5 flex items-center justify-between">
              <label htmlFor="seo-t" className="text-[13px] font-medium">
                Sarlavha (title)
              </label>
              <span className={`flex items-center gap-2 text-xs font-semibold tabular-nums ${tLen > 60 ? 'text-(--am-warn)' : 'text-(--am-ok)'}`}>
                {tLen > 60 && <span className="rounded-[4px] bg-(--am-warn-soft) px-1.5 py-px">biroz uzun</span>}
                {tLen} / 60
              </span>
            </div>
            <input id="seo-t" className={`${inputClass} mt-1.5`} maxLength={70} placeholder={title} value={lt(draft.seo.title, locale)} onChange={(e) => set('seo', { ...draft.seo, title: setLt(draft.seo.title, locale, e.target.value) })} />
            <div className="mt-3.5 flex items-center justify-between">
              <label htmlFor="seo-d" className="text-[13px] font-medium">
                Tavsif (description)
              </label>
              <span className={`flex items-center gap-2 text-xs font-semibold tabular-nums ${dLen > 160 ? 'text-(--am-warn)' : 'text-(--am-ok)'}`}>
                {dLen > 160 && <span className="rounded-[4px] bg-(--am-warn-soft) px-1.5 py-px">biroz uzun</span>}
                {dLen} / 160
              </span>
            </div>
            <textarea
              id="seo-d"
              rows={4}
              maxLength={200}
              placeholder={excerpt}
              className={`${inputClass} mt-1.5 h-24 resize-none py-2.5 leading-normal`}
              value={lt(draft.seo.description, locale)}
              onChange={(e) => set('seo', { ...draft.seo, description: setLt(draft.seo.description, locale, e.target.value) })}
            />
            <div className="mt-1.5 text-xs text-ink-2">Qidiruvda 160 belgidan keyin kesilishi mumkin.</div>
            {post && (
              <button type="button" onClick={() => setConfirmDelete(true)} className="am-del mt-6 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-medium text-ink-2">
                <Icon name="trash" size={16} />
                Maqolani o‘chirish
              </button>
            )}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="Maqolani o‘chirasizmi?"
        confirmLabel="O‘chirish"
        pending={del.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          post &&
          del.mutate(post.id, {
            onSuccess: () => {
              setBaseline(draft)
              toast.success('Maqola o‘chirildi')
              router.replace(adminPaths.posts)
            },
            onError: (e) => {
              setConfirmDelete(false)
              toast.error(errorMessage(e))
            },
          })
        }
      >
        «{titleUz || 'Nomsiz'}» barcha tillarda o‘chiriladi. Faqat saytdan olib qo‘yish uchun «Qoralamaga qaytarish»ni tanlang.
      </ConfirmDialog>
    </>
  )
}
