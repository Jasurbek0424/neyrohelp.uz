'use client'

import { useMutation } from '@tanstack/react-query'

import { api } from '@/shared/api/client'

import type { Media, UploadInput } from '../model/types'

/** POST /admin/media (multipart). Keshga yozilmaydi — natija chaqiruvchi formaning draftiga tushadi */
export function useUploadMedia() {
  return useMutation({
    mutationFn: ({ file, alt }: UploadInput) => {
      const form = new FormData()
      form.append('file', file)
      if (alt?.trim()) form.append('alt_uz', alt.trim().slice(0, 300))
      return api<Media>('/admin/media', { method: 'POST', form })
    },
  })
}
