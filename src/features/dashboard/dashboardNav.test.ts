import { describe, expect, it } from 'vitest'
import { matchSidebarId } from '../../lib/nav/navConfig'

describe('dashboard / queue navigation ids', () => {
  it('keeps overview active on home', () => {
    expect(matchSidebarId('/')).toBe('overview')
  })

  it('keeps orders active for queue routes under /orders', () => {
    expect(matchSidebarId('/orders')).toBe('orders')
    expect(matchSidebarId('/orders/queues/delayed')).toBe('orders')
    expect(matchSidebarId('/orders/queues/unassigned')).toBe('orders')
    expect(matchSidebarId('/orders/queues/failure')).toBe('orders')
  })

  it('keeps administration active for admin detail routes', () => {
    expect(matchSidebarId('/administration')).toBe('administration')
    expect(matchSidebarId('/administration/admins/preview')).toBe(
      'administration',
    )
    expect(matchSidebarId('/administration/admins/abc/edit')).toBe(
      'administration',
    )
    expect(matchSidebarId('/administration/roles/abc')).toBe('administration')
  })
})
