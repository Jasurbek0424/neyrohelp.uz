'use client'

import { useEffect, useState } from 'react'

import { getMarkdown } from '../lib/markdown'

/**
 * Oldindan ko‘rish. `dangerouslySetInnerHTML` faqat shu yerda: markdown-it `html:false`
 * (foydalanuvchi HTML'i escape qilinadi) + xavfsiz havola tekshiruvi.
 */
export default function MarkdownPreview({ source, lang }: { source: string; lang: string }) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      void getMarkdown().then((md) => alive && setHtml(md.render(source)))
    }, 120)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [source])
  if (!source.trim()) return <p className="text-sm text-ink-2">Matn kiritilgach, shu yerda saytdagi ko‘rinishi chiqadi.</p>
  return <div lang={lang} className="prose-article am-preview" dangerouslySetInnerHTML={{ __html: html }} />
}
