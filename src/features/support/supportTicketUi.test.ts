import { describe, expect, it } from 'vitest'
import {
  formatTicketAge,
  resolveAuthorLabel,
  supportPriorityLabelKey,
  supportStatusLabelKey,
} from './supportTicketUi'

describe('supportTicketUi', () => {
  it('maps status and priority keys', () => {
    expect(supportStatusLabelKey('OPEN')).toBe('supportStatusOpen')
    expect(supportPriorityLabelKey('HIGH')).toBe('supportPriorityHigh')
    expect(supportStatusLabelKey('UNKNOWN')).toBeNull()
  })

  it('formats age from createdAt', () => {
    const created = new Date(Date.now() - 2 * 3600_000 - 15 * 60_000).toISOString()
    const label = formatTicketAge(created, {
      hours: 'h',
      minutes: 'min',
      unavailable: '—',
    })
    expect(label).toMatch(/2 h 1[45] min/)
  })

  it('resolves authors without inventing names', () => {
    expect(
      resolveAuthorLabel('Nadia', 'a', 'a', 'Self', 'Admin'),
    ).toBe('Nadia')
    expect(
      resolveAuthorLabel(null, 'profile-1', 'profile-1', 'Self Admin', 'Admin'),
    ).toBe('Self Admin')
    expect(
      resolveAuthorLabel(null, 'abcdefghijklmnop', null, null, 'Admin'),
    ).toBe('abcdefgh…')
  })
})
