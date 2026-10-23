import type { MessageKey } from '../../lib/i18n/messages'
import type { OrderTimelineEvent } from '../../lib/api/types'

/** Map persisted eventType → FR/AR message key. Unknown types fall back to raw code. */
const EVENT_LABEL_KEYS: Record<string, MessageKey> = {
  ORDER_CREATED: 'timelineEventOrderCreated',
  MERCHANT_ACCEPTED: 'timelineEventMerchantAccepted',
  MERCHANT_REJECTED: 'timelineEventMerchantRejected',
  PREPARATION_STARTED: 'timelineEventPreparationStarted',
  ORDER_READY: 'timelineEventOrderReady',
  CUSTOMER_CANCELLED: 'timelineEventCustomerCancelled',
  DRIVER_ASSIGNED: 'timelineEventDriverAssigned',
  DRIVER_STARTED_TO_PICKUP: 'timelineEventStartedToPickup',
  DRIVER_ARRIVED_PICKUP: 'timelineEventArrivedPickup',
  ORDER_PICKED_UP: 'timelineEventOrderPickedUp',
  DELIVERY_IN_TRANSIT: 'timelineEventInTransit',
  DRIVER_ARRIVED_CUSTOMER: 'timelineEventArrivedCustomer',
  DELIVERY_COMPLETED: 'timelineEventDeliveryCompleted',
}

const EVENT_ICONS: Record<string, string> = {
  ORDER_CREATED: 'person',
  MERCHANT_ACCEPTED: 'store',
  MERCHANT_REJECTED: 'cancel',
  PREPARATION_STARTED: 'skillet',
  ORDER_READY: 'inventory_2',
  CUSTOMER_CANCELLED: 'cancel',
  DRIVER_ASSIGNED: 'two_wheeler',
  DRIVER_STARTED_TO_PICKUP: 'directions',
  DRIVER_ARRIVED_PICKUP: 'location_on',
  ORDER_PICKED_UP: 'takeout_dining',
  DELIVERY_IN_TRANSIT: 'delivery_dining',
  DRIVER_ARRIVED_CUSTOMER: 'home_pin',
  DELIVERY_COMPLETED: 'check_circle',
}

const ACTOR_LABEL_KEYS: Record<string, MessageKey> = {
  CUSTOMER: 'timelineActorCustomer',
  MERCHANT: 'timelineActorMerchant',
  SYSTEM: 'timelineActorSystem',
  ADMIN: 'timelineActorAdmin',
  DRIVER: 'timelineActorDriver',
}

export function timelineEventLabelKey(eventType: string): MessageKey | null {
  return EVENT_LABEL_KEYS[eventType] ?? null
}

export function timelineEventIcon(eventType: string): string {
  return EVENT_ICONS[eventType] ?? 'history'
}

export function timelineActorLabelKey(actorType: string | null): MessageKey | null {
  if (!actorType) return null
  return ACTOR_LABEL_KEYS[actorType] ?? null
}

export function formatTimelineClock(occurredAt: string): string {
  try {
    return new Date(occurredAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatTimelineDateTime(occurredAt: string): string {
  try {
    return new Date(occurredAt).toLocaleString()
  } catch {
    return '—'
  }
}

/** Subtitle from known parties only — never invent names. */
export function timelineEventSubtitle(input: {
  event: OrderTimelineEvent
  t: (key: MessageKey) => string
  customerName: string | null
  merchantName: string | null
}): string {
  const { event, t, customerName, merchantName } = input
  const parts: string[] = []

  if (event.source === 'ORDER_STATUS') {
    const actorKey = timelineActorLabelKey(event.actorType)
    if (event.actorType === 'CUSTOMER' && customerName) {
      parts.push(`${t('timelineActorCustomer')}: ${customerName}`)
    } else if (event.actorType === 'MERCHANT' && merchantName) {
      parts.push(`${t('timelineActorMerchant')}: ${merchantName}`)
    } else if (actorKey) {
      parts.push(t(actorKey))
    } else if (event.actorType) {
      parts.push(event.actorType)
    } else {
      parts.push(t('timelineActorUnknown'))
    }
  } else {
    if (event.driverFullName) {
      parts.push(`${t('driver')}: ${event.driverFullName}`)
    } else if (event.driverId) {
      parts.push(t('timelineDriverIdOnly'))
    } else {
      parts.push(t('timelineSourceDelivery'))
    }
  }

  return parts.join(' · ')
}
