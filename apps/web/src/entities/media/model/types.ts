import type { components } from '@/shared/api/schema'

export type Media = components['schemas']['AdminMedia']

export type UploadKind = 'image' | 'any'

export type UploadInput = { file: File; alt?: string }
