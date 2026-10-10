import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/shared/lib/seo'

export function buildRobots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
