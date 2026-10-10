import 'server-only'

import MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'

import { SITE_URL } from '@/shared/config/env'

import { slugify } from './slugify'

/**
 * Maqola matni (Markdown) → xavfsiz HTML.
 * - `html: false` — xom HTML teglari matn sifatida chiqadi (XSS yo‘q)
 * - havolalar: faqat http/https/tel/mailto + sayt ichidagi `/yo‘l` va `#langar`; boshqasi oddiy matnga aylanadi
 * - tashqi havolalar: target=_blank + rel="noopener noreferrer nofollow"
 * - `:::warning Sarlavha` / `:::info Sarlavha` — callout bloklari (dizayndagi kabi)
 * - h2/h3 ga slug id (takroriylarga -2, -3), h2 lardan mundarija
 */

export type TocItem = { id: string; text: string }
export type RenderedMarkdown = { html: string; toc: TocItem[] }

type Token = ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number]

const SAFE_SCHEMES = new Set(['http:', 'https:', 'tel:', 'mailto:'])
const siteHost = (() => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return ''
  }
})()

type LinkKind = 'internal' | 'external' | 'contact' | null

function classifyHref(href: string): LinkKind {
  const value = href.trim()
  if (!value) return null
  // sayt ichidagi yo‘l yoki langar (protokolsiz `//host` emas)
  if (value.startsWith('#')) return 'internal'
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) return 'internal'
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (!SAFE_SCHEMES.has(url.protocol)) return null
  if (url.protocol === 'tel:' || url.protocol === 'mailto:') return 'contact'
  return url.host === siteHost ? 'internal' : 'external'
}

/** Rasm manbai: faqat https/http yoki sayt ichidagi /media/ */
function safeImageSrc(src: string): boolean {
  const value = src.trim()
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

const CALLOUTS = {
  warning: 'callout rounded-control border-l-[3px] border-coral bg-coral-soft p-6 text-[17px] [&>*+*]:mt-3',
  info: 'callout rounded-control border-l-[3px] border-navy bg-navy-soft p-6 text-[17px] [&>*+*]:mt-3',
} as const

function createRenderer() {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false })

  // Havolani markdown-it rad etmasin — xavfsizlik tekshiruvi pastdagi core qoidada (rad etilgani matnga aylanadi)
  md.validateLink = () => true

  for (const tone of Object.keys(CALLOUTS) as (keyof typeof CALLOUTS)[]) {
    md.use(container, tone, {
      validate: (params: string) => new RegExp(`^${tone}(\\s+.*)?$`).test(params.trim()),
      render: (tokens: { nesting: number; info: string }[], idx: number) => {
        const token = tokens[idx]
        if (!token) return ''
        if (token.nesting === 1) {
          const title = token.info.trim().slice(tone.length).trim()
          const heading = title ? `<p class="text-lg font-semibold">${md.renderInline(title)}</p>\n` : ''
          return `<aside class="${CALLOUTS[tone]}" role="note">\n${heading}`
        }
        return '</aside>\n'
      },
    })
  }

  // 1) xavfsiz bo‘lmagan havolalarni olib tashlash (matn qoladi), tashqi havolalarga rel/target
  // 2) xavfsiz bo‘lmagan rasmlarni alt matnga almashtirish
  md.core.ruler.push('nm_safe_links', (state) => {
    for (const block of state.tokens) {
      if (block.type !== 'inline' || !block.children) continue
      const out: Token[] = []
      const dropped: boolean[] = []
      for (const t of block.children) {
        if (t.type === 'link_open') {
          const kind = classifyHref(String(t.attrGet('href') ?? ''))
          dropped.push(kind === null)
          if (kind === null) continue
          if (kind === 'external') {
            t.attrSet('target', '_blank')
            t.attrSet('rel', 'noopener noreferrer nofollow')
          }
          out.push(t)
          continue
        }
        if (t.type === 'link_close') {
          if (dropped.pop()) continue
          out.push(t)
          continue
        }
        if (t.type === 'image') {
          if (!safeImageSrc(String(t.attrGet('src') ?? ''))) {
            const text = new state.Token('text', '', 0)
            text.content = t.content
            out.push(text)
            continue
          }
          t.attrSet('loading', 'lazy')
          t.attrSet('decoding', 'async')
        }
        out.push(t)
      }
      block.children = out
    }
  })

  return md
}

const md = createRenderer()

/** Sarlavhalar uchun takrorlanmas id: bosh-ogriq, bosh-ogriq-2 */
function idFactory() {
  const seen = new Map<string, number>()
  return (text: string) => {
    const base = slugify(text) || 'bolim'
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
}

export function renderMarkdown(source: string): RenderedMarkdown {
  const env = {}
  const tokens = md.parse(source ?? '', env)
  const nextId = idFactory()
  const toc: TocItem[] = []

  tokens.forEach((token, i) => {
    if (token.type !== 'heading_open' || (token.tag !== 'h2' && token.tag !== 'h3')) return
    const inline = tokens[i + 1]
    const text = (inline?.children ?? [])
      .filter((c) => c.type === 'text' || c.type === 'code_inline')
      .map((c) => c.content)
      .join('')
      .trim()
    if (!text) return
    const id = nextId(text)
    token.attrSet('id', id)
    if (token.tag === 'h2') toc.push({ id, text })
  })

  return { html: md.renderer.render(tokens, md.options, env), toc }
}
