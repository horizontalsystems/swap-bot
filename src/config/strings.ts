import { en } from './locales/en'
import { fa } from './locales/fa'
import { ru } from './locales/ru'
import { zh } from './locales/zh'

export type Strings = { [K in keyof typeof en]: string }

const locales: Record<string, Strings> = { en, fa, ru, zh }

export function s(lang?: string): Strings {
  return locales[lang ?? ''] ?? en
}

export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}
