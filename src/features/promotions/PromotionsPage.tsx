import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge, statusTone } from '../../components/ui/Badge'
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui/StateBoxes'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Icon } from '../../components/ui/Icon'
import { useSetShellTitle } from '../../components/layout/ShellChromeContext'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  formatCentimesAsDzdV2,
  parseDzdInputToMinorInt,
} from '../../lib/money'
import {
  PROMO_TYPES,
  type PromoType,
  defaultPromoWindow,
  formatPromoValue,
  fromDatetimeLocalValue,
  promoLifecycle,
  promoLifecycleLabelKey,
  promoTypeIcon,
  promoTypeLabelKey,
  toDatetimeLocalValue,
  isRatePromo,
} from './promotionFormat'

type ActiveFilter = 'all' | 'true' | 'false'

export function PromotionsPage() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.PROMOTIONS_MANAGE)
  const [offset, setOffset] = useState(0)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const limit = 20

  const windowDefaults = defaultPromoWindow()
  const [code, setCode] = useState('')
  const [type, setType] = useState<PromoType>('SPEEDYGO_FIXED_MINOR')
  const [value, setValue] = useState('500.00')
  const [label, setLabel] = useState('')
  const [discoverable, setDiscoverable] = useState(false)
  const [startsLocal, setStartsLocal] = useState(
    toDatetimeLocalValue(windowDefaults.startsAt),
  )
  const [endsLocal, setEndsLocal] = useState(
    toDatetimeLocalValue(windowDefaults.endsAt),
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)

  useSetShellTitle(showCreate ? t('promoCreateTitle') : t('promotions'))

  const q = useQuery({
    queryKey: ['promotions', offset, activeFilter],
    queryFn: () =>
      adminApi.listPromotions({
        limit,
        offset,
        active:
          activeFilter === 'all' ? undefined : activeFilter === 'true',
      }),
  })

  const create = useMutation({
    mutationFn: () => {
      const startsAt = fromDatetimeLocalValue(startsLocal)
      const endsAt = fromDatetimeLocalValue(endsLocal)
      if (!startsAt || !endsAt) {
        throw new ApiError(400, t('error'), 'VALIDATION')
      }
      const payload: Parameters<typeof adminApi.createPromotion>[0] = {
        code: code.trim().toUpperCase(),
        type,
        startsAt,
        endsAt,
        active: false,
        customerDiscoverable: discoverable,
        customerLabel: label.trim() || null,
      }
      if (isRatePromo(type)) {
        payload.value = Number(value)
      } else {
        const cents = parseDzdInputToMinorInt(value)
        if (cents == null || cents <= 0) {
          throw new ApiError(400, t('error'), 'VALIDATION')
        }
        payload.valueAmount = formatCentimesAsDzdV2(cents)
      }
      return adminApi.createPromotion(payload)
    },
    onSuccess: async (created) => {
      setFormOk(t('success'))
      setFormError(null)
      setCode('')
      setLabel('')
      setShowCreate(false)
      await qc.invalidateQueries({ queryKey: ['promotions'] })
      if (created?.id) {
        /* keep list evidence; detail exercised separately */
      }
    },
    onError: (e) => {
      setFormOk(null)
      setFormError(e instanceof ApiError ? e.message : t('error'))
    },
  })

  function resetCreateForm() {
    const w = defaultPromoWindow()
    setCode('')
    setType('SPEEDYGO_FIXED_MINOR')
    setValue('500.00')
    setLabel('')
    setDiscoverable(false)
    setStartsLocal(toDatetimeLocalValue(w.startsAt))
    setEndsLocal(toDatetimeLocalValue(w.endsAt))
    setFormError(null)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) {
      setFormError(t('error'))
      return
    }
    if (isRatePromo(type)) {
      const bps = Number(value)
      if (!Number.isInteger(bps) || bps <= 0) {
        setFormError(t('error'))
        return
      }
    } else if (parseDzdInputToMinorInt(value) == null) {
      setFormError(t('error'))
      return
    }
    if (create.isPending) return
    create.mutate()
  }

  function onCancelCreate() {
    resetCreateForm()
    setShowCreate(false)
    setFormOk(null)
    setFormError(null)
  }

  return (
    <RequirePermission allOf={PERMS.PROMOTIONS_READ}>
      {formOk ? <div className="banner banner-success">{formOk}</div> : null}
      {formError ? <div className="banner banner-error">{formError}</div> : null}

      {showCreate && canManage ? (
        <form className="stack" onSubmit={onSubmit}>
          <div className="promo-create-toolbar">
            <Button variant="secondary" size="sm" onClick={onCancelCreate}>
              {t('back')}
            </Button>
          </div>
          <div className="card card-body stack">
            <h3 style={{ margin: 0 }}>{t('code')}</h3>
            <div className="promo-form-grid">
              <label>
                {t('customerLabel')}
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={64}
                  placeholder={t('customerLabel')}
                />
                <span className="muted text-metadata">{t('promoDiscoverableHint')}</span>
              </label>
              <label>
                {t('code')} *
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={64}
                  required
                  autoComplete="off"
                  className="mono"
                />
              </label>
            </div>
            <label className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={discoverable}
                onChange={(e) => setDiscoverable(e.target.checked)}
              />
              {t('discoverable')}
            </label>
            <UnavailablePanel title={t('promoInternalNotesUnavailable')} />
          </div>

          <div className="card card-body stack">
            <h3 style={{ margin: 0 }}>{t('type')}</h3>
            <div className="promo-type-options">
              {PROMO_TYPES.map((opt) => (
                <label
                  key={opt}
                  className={`promo-type-option${type === opt ? ' promo-type-option--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="promoType"
                    checked={type === opt}
                    onChange={() => {
                      setType(opt)
                      setValue(isRatePromo(opt) ? '1000' : '500.00')
                    }}
                  />
                  <span>
                    <strong>{t(promoTypeLabelKey(opt))}</strong>
                    <div className="muted text-metadata mono">{opt}</div>
                  </span>
                </label>
              ))}
            </div>
            <p className="promo-unsupported-note">{t('promoFreeDeliveryUnavailable')}</p>
            <label>
              {t('value')} *
              <input
                type={isRatePromo(type) ? 'number' : 'text'}
                min={isRatePromo(type) ? 1 : undefined}
                step={isRatePromo(type) ? 1 : undefined}
                inputMode={isRatePromo(type) ? 'numeric' : 'decimal'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <span className="muted text-metadata">
                {isRatePromo(type) ? t('promoValueHintRate') : t('promoValueHintFixed')}
              </span>
            </label>
          </div>

          <div className="card card-body stack">
            <h3 style={{ margin: 0 }}>{t('promoWindowLabel')}</h3>
            <div className="promo-form-grid">
              <label>
                {t('periodStart')} *
                <input
                  type="datetime-local"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                  required
                />
              </label>
              <label>
                {t('periodEnd')} *
                <input
                  type="datetime-local"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                  required
                />
              </label>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {t('promotionWindowHint')}
            </p>
            <UnavailablePanel title={t('promoEligibilityUnavailable')} />
            <UnavailablePanel title={t('promoUsageLimitsUnavailable')} />
          </div>

          <div className="promo-form-actions">
            <Button type="button" variant="secondary" onClick={onCancelCreate}>
              {t('promoCancelCreate')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t('loading') : t('promoCreateSubmit')}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="promo-toolbar card card-body">
            <div className="promo-toolbar__filters">
              <label className="sg-select promo-toolbar__field">
                <span className="sr-only">{t('status')}</span>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value as ActiveFilter)
                    setOffset(0)
                  }}
                >
                  <option value="all">{t('promoFilterAll')}</option>
                  <option value="true">{t('promoFilterActive')}</option>
                  <option value="false">{t('promoFilterInactive')}</option>
                </select>
                <Icon name="expand_more" className="sg-select__chevron" />
              </label>
              <label
                className="sg-select promo-toolbar__field"
                title={t('promoTypeFilterUnavailable')}
              >
                <span className="sr-only">{t('type')}</span>
                <select disabled value="">
                  <option value="">{t('promoTypeFilterAll')}</option>
                </select>
                <Icon name="expand_more" className="sg-select__chevron" />
              </label>
              <Button
                variant="secondary"
                className="promo-toolbar__refresh"
                onClick={() => void q.refetch()}
                aria-label={t('refresh')}
                title={t('refresh')}
              >
                <Icon name="refresh" />
              </Button>
            </div>
            {canManage ? (
              <Button
                className="promo-toolbar__cta"
                onClick={() => {
                  resetCreateForm()
                  setShowCreate(true)
                  setFormOk(null)
                }}
              >
                <Icon name="add" /> {t('newPromotion')}
              </Button>
            ) : null}
          </div>
          {q.isLoading ? <LoadingState /> : null}
          {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
          {q.data?.items.length === 0 ? <EmptyState /> : null}
          {q.data && q.data.items.length > 0 ? (
            <div className="card promo-table-card">
              <div className="table-wrap">
                <table className="data promo-table">
                  <thead>
                    <tr>
                      <th>{t('promoColumnPromotion')}</th>
                      <th>{t('promoColumnTypeValue')}</th>
                      <th>{t('promoEligibilityColumn')}</th>
                      <th>{t('period')}</th>
                      <th>{t('promoUsageColumn')}</th>
                      <th>{t('status')}</th>
                      <th className="col-actions">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.items.map((p) => {
                      const life = promoLifecycle(p)
                      const primaryName = p.customerLabel?.trim() || p.code
                      const iconName = promoTypeIcon(p.type)
                      return (
                        <tr key={p.id} className="row-actions-hover">
                          <td>
                            <div className="promo-name-cell">
                              <div
                                className={`promo-type-icon promo-type-icon--${
                                  isRatePromo(p.type) ? 'rate' : 'fixed'
                                }`}
                                aria-hidden
                              >
                                <Icon name={iconName} />
                              </div>
                              <div className="promo-name-cell__text">
                                <Link
                                  to={`/promotions/${p.id}`}
                                  className="promo-name-cell__title"
                                >
                                  {primaryName}
                                </Link>
                                <div className="muted text-metadata">
                                  {t('promoCodePrefix')}:{' '}
                                  <span className="mono">{p.code}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{t(promoTypeLabelKey(p.type))}</div>
                            <div className="muted text-metadata">
                              {formatPromoValue(p.type, p.value)}
                            </div>
                          </td>
                          <td
                            className="muted"
                            title={t('promoEligibilityUnavailable')}
                          >
                            —
                          </td>
                          <td>
                            <div>
                              {new Date(p.startsAt).toLocaleDateString()}
                            </div>
                            <div className="muted text-metadata">
                              {new Date(p.endsAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td
                            className="muted"
                            title={t('promoUsageLimitsUnavailable')}
                          >
                            —
                          </td>
                          <td>
                            <Badge
                              tone={statusTone(
                                life === 'active' ? 'ACTIVE' : life.toUpperCase(),
                              )}
                            >
                              {t(promoLifecycleLabelKey(life))}
                            </Badge>
                          </td>
                          <td className="col-actions">
                            <div className="row-actions">
                              <Link
                                to={`/promotions/${p.id}`}
                                className="link-action"
                              >
                                {t('view')}
                              </Link>
                              <button
                                type="button"
                                className="icon-btn"
                                disabled
                                title={t('orderRowMenuUnavailable')}
                              >
                                <Icon name="more_vert" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={q.data.total}
                limit={limit}
                offset={offset}
                onChange={setOffset}
                integrated
                rangeLabel={t('promoRangeLabel')
                  .replace('{from}', String(offset + 1))
                  .replace(
                    '{to}',
                    String(Math.min(offset + limit, q.data.total)),
                  )
                  .replace('{total}', String(q.data.total))}
              />
            </div>
          ) : null}
        </>
      )}
    </RequirePermission>
  )
}
