'use client'

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/shared/api/client'

import type { PostAdmin, PostCategory, PostFilters, PostInput, PostPage } from '../model/types'

export const postKeys = {
  all: ['admin', 'posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: PostFilters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: number) => [...postKeys.details(), id] as const,
}

export const postCategoryKeys = { all: ['admin', 'post-categories'] as const }

export const postListQuery = (filters: PostFilters) =>
  queryOptions({
    queryKey: postKeys.list(filters),
    queryFn: ({ signal }) => api<PostPage>('/admin/posts', { query: { ...filters }, signal }),
    placeholderData: keepPreviousData,
  })

export const postDetailQuery = (id: number) =>
  queryOptions({ queryKey: postKeys.detail(id), queryFn: ({ signal }) => api<PostAdmin>(`/admin/posts/${id}`, { signal }) })

export const postCategoriesQuery = () =>
  queryOptions({ queryKey: postCategoryKeys.all, queryFn: ({ signal }) => api<PostCategory[]>('/admin/post-categories', { signal }), staleTime: 5 * 60_000 })

export function useSavePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Partial<PostInput> }) =>
      id ? api<PostAdmin>(`/admin/posts/${id}`, { method: 'PATCH', body }) : api<PostAdmin>('/admin/posts', { method: 'POST', body }),
    onSuccess: (data) => {
      qc.setQueryData(postKeys.detail(data.id), data)
      void qc.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/admin/posts/${id}`, { method: 'DELETE' }),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: postKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}
