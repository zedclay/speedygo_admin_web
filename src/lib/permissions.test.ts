import { describe, expect, it } from 'vitest'
import { hasAnyPermission, hasPermission, PERMS } from './permissions'

describe('permissions', () => {
  it('requires all permissions for hasPermission', () => {
    expect(
      hasPermission(
        [PERMS.MERCHANTS_READ, PERMS.MERCHANTS_VERIFY],
        [PERMS.MERCHANTS_READ, PERMS.MERCHANTS_VERIFY],
      ),
    ).toBe(true)
    expect(hasPermission([PERMS.MERCHANTS_READ], PERMS.MERCHANTS_VERIFY)).toBe(
      false,
    )
  })

  it('accepts any for hasAnyPermission', () => {
    expect(
      hasAnyPermission([PERMS.COD_READ], [PERMS.COD_READ, PERMS.PAYMENTS_READ]),
    ).toBe(true)
    expect(hasAnyPermission([], [PERMS.COD_READ])).toBe(false)
  })
})
