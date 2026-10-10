import 'server-only'



import type { Locale } from './config'
import en from './dictionaries/en'
import ru from './dictionaries/ru'
import uz, { type Dictionary } from './dictionaries/uz'

const dictionaries: Record<Locale, Dictionary> = { uz, ru, en }

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale]

/** "{time} ichida" kabi shablonlarni to‘ldiradi */
export const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')

export type { Dictionary }
export * from './config'
