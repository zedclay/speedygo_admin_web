import { describe, expect, it } from 'vitest'
import {
  timelineEventIcon,
  timelineEventLabelKey,
  timelineEventSubtitle,
} from './orderTimelineUi'
import type { MessageKey } from '../../lib/i18n/messages'
import type { OrderTimelineEvent } from '../../lib/api/types'

const t = (key: MessageKey) => key

function event(
  partial: Partial<OrderTimelineEvent> & Pick<OrderTimelineEvent, 'eventType' | 'source'>,
): OrderTimelineEvent {
  return {
    actorType: null,
    fromStatus: null,
    toStatus: null,
    occurredAt: '2026-10-15T12:00:00.000Z',
    driverId: null,
    driverFullName: null,
    ...partial,
  }
}

describe('orderTimelineUi', () => {
  it('maps known persisted event types to labels and icons', () => {
    expect(timelineEventLabelKey('ORDER_CREATED')).toBe('timelineEventOrderCreated')
    expect(timelineEventIcon('DELIVERY_IN_TRANSIT')).toBe('delivery_dining')
  })

  it('falls back for unknown event types without inventing copy', () => {
    expect(timelineEventLabelKey('SOME_FUTURE_EVENT')).toBeNull()
    expect(timelineEventIcon('SOME_FUTURE_EVENT')).toBe('history')
  })

  it('uses known party names only', () => {
    const subtitle = timelineEventSubtitle({
      event: event({
        source: 'ORDER_STATUS',
        eventType: 'ORDER_CREATED',
        actorType: 'CUSTOMER',
      }),
      t,
      customerName: 'Amel Benali',
      merchantName: 'Restaurant',
    })
    expect(subtitle).toContain('Amel Benali')
    expect(subtitle).not.toContain('Sara')
  })

  it('uses driver full name when resolved', () => {
    const subtitle = timelineEventSubtitle({
      event: event({
        source: 'DELIVERY',
        eventType: 'DRIVER_ASSIGNED',
        driverId: 'd1',
        driverFullName: 'Yacine Mansouri',
      }),
      t,
      customerName: null,
      merchantName: null,
    })
    expect(subtitle).toContain('Yacine Mansouri')
  })
})
