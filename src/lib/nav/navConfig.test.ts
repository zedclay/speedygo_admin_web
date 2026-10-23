import { describe, expect, it } from 'vitest'
import { matchSidebarId, navItemVisible, SIDEBAR_NAV } from './navConfig'
import { PERMS } from '../permissions'

describe('navConfig', () => {
  it('matches sidebar ids for nested routes', () => {
    expect(matchSidebarId('/collections/cod/abc')).toBe('collections')
    expect(matchSidebarId('/merchants/verification')).toBe('merchants')
    expect(matchSidebarId('/')).toBe('overview')
  })

  it('hides permission-gated items without grants', () => {
    const merchants = SIDEBAR_NAV.find((i) => i.id === 'merchants')!
    expect(navItemVisible(merchants, [])).toBe(false)
    expect(navItemVisible(merchants, [PERMS.MERCHANTS_READ])).toBe(true)
  })

  it('keeps overview visible without permissions list requirement', () => {
    const overview = SIDEBAR_NAV.find((i) => i.id === 'overview')!
    expect(navItemVisible(overview, [])).toBe(true)
  })
})
