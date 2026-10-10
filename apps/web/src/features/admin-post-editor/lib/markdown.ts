import type { default as MarkdownItCtor, Token } from 'markdown-it'

type MarkdownIt = InstanceType<typeof MarkdownItCtor>

/**
 * Admin preview uchun Markdown renderer — public saytdagi bilan bir xil qoidalar:
 * html:false (xom HTML escape qilinadi), havolalar faqat http(s)/tel/mailto/nisbiy,
 * tashqi havolalar rel="noopener nofollow" target=_blank, `:::warning Sarlavha` bloki.
 * Kutubxona dynamic import qilinadi — admin bundle'ining asosiy qismiga kirmaydi.
 */
let instance: Promise<MarkdownIt> | null = null

const SAFE = /^(https?:|tel:|mailto:|\/|#)/i

export function getMarkdown(): Promise<MarkdownIt> {
  instance ??= Promise.all([import('markdown-it'), import('markdown-it-container')]).then(([{ default: MD }, { default: container }]) => {
    const md = new MD({ html: false, linkify: true, typographer: false, breaks: false })
    md.validateLink = (url: string) => SAFE.test(url.trim())

    const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const t = tokens[idx]!
      const href = String(t.attrGet('href') ?? '')
      if (/^https?:/i.test(href)) {
        t.attrSet('target', '_blank')
        t.attrSet('rel', 'noopener nofollow noreferrer')
      }
      return defaultLink(tokens, idx, options, env, self)
    }

    md.use(container, 'warning', {
      render(tokens: Token[], idx: number) {
        const t = tokens[idx]!
        if (t.nesting === 1) {
          const title = t.info.trim().replace(/^warning\s*/, '')
          return `<aside class="md-callout" role="note">${title ? `<p class="md-callout-title">${md.utils.escapeHtml(title)}</p>` : ''}\n`
        }
        return '</aside>\n'
      },
    })
    return md
  })
  return instance
}

/** O‘qish vaqti: o‘zbekcha so‘zlar / 180 (backend bilan bir xil formula) */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 180))
}
