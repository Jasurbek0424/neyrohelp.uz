import type { components, operations } from '@/shared/api/schema'
import type { Tone } from '@/shared/ui/admin/StatusTag'

/** Tiplar OpenAPI'dan (backend: PostListItem, PostAdmin, PostIn/PostPatch, AdminPostCategory) */
type S = components['schemas']

export type PostStatus = S['PostStatus']
export type Completeness = S['Completeness']
export type PostListItem = S['PostListItem']
export type PostPage = S['Page_PostListItem_']
export type PostAdmin = S['PostAdmin']
export type PostInput = S['PostIn']
export type PostPatch = S['PostPatch']
export type PostCategory = S['AdminPostCategory']

type PostQuery = NonNullable<operations['list_posts_api_v1_admin_posts_get']['parameters']['query']>
export type PostFilters = { [K in keyof PostQuery]?: Exclude<PostQuery[K], null> }

export const postStatusMeta: Record<PostStatus, { label: string; tone: Tone }> = {
  published: { label: 'Nashrda', tone: 'ok' },
  draft: { label: 'Qoralama', tone: 'warn' },
  scheduled: { label: 'Rejalashtirilgan', tone: 'navy' },
}
