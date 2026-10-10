/** Server tomonda API'ga ichki tarmoq orqali (Caddy'siz) murojaat. Brauzer esa same-origin `/api/v1`. */
export const API_INTERNAL_URL = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:8100').replace(/\/$/, '')
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const API_BASE = '/api/v1'

/** ISR: sahifa va API javoblari 1 soat keshlanadi; kontent o‘zgarsa teg orqali darhol yangilanadi */
export const REVALIDATE_SECONDS = 3600
