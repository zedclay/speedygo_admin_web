/** Allowlisted Admin Settings keys — mirrors Backend Settings Foundation v1.0. */
export const SETTINGS_KEYS = {
  SUPPORT_EMAIL: 'platform.supportContactEmail',
  SUPPORT_PHONE: 'platform.supportContactPhone',
} as const

export type SettingsAllowlistedKey =
  (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS]
