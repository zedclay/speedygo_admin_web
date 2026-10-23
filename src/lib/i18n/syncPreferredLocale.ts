import type { Locale } from './messages'

const LOCALE_KEY = 'speedygo.admin.locale'

/** Apply server preferredLocale to local Admin UI store (does not call API). */
export function applyPreferredLocaleLocally(
  preferredLocale: string | null | undefined,
  setLocale: (locale: Locale) => void,
): void {
  const next: Locale = preferredLocale === 'ar' ? 'ar' : 'fr'
  setLocale(next)
  try {
    localStorage.setItem(LOCALE_KEY, next)
  } catch {
    /* ignore */
  }
}
