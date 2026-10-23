import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import type { DeliveryPricingRule, DeliveryZone } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { Badge } from '../../components/ui/Badge'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { Modal } from '../../components/ui/Modal'
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Icon } from '../../components/ui/Icon'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { formatDzdFromMinor } from '../../lib/money'
import {
  ISOLATED_EVIDENCE_POLYGON,
  dzdMajorsToMinor,
  speedyGoShareMinor,
  timeBandLabelKey,
} from './deliveryPricingUi'

type ActiveFilter = 'all' | 'true' | 'false'
type ConfirmToggle = {
  kind: 'zone' | 'pricing'
  id: string
  name: string
  currentlyActive: boolean
} | null

export function ZonesPage() {
  const { t, locale } = useI18n()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManageZones = hasPermission(permissions, PERMS.DELIVERY_ZONES_MANAGE)
  const canManagePricing = hasPermission(
    permissions,
    PERMS.DELIVERY_PRICING_MANAGE,
  )
  const canReadZones = hasPermission(permissions, PERMS.DELIVERY_ZONES_READ)
  const canReadPricing = hasPermission(permissions, PERMS.DELIVERY_PRICING_READ)

  const [offset, setOffset] = useState(0)
  const [tab, setTab] = useState<'zones' | 'pricing' | 'wilaya'>('zones')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [nameQuery, setNameQuery] = useState('')
  const [pricingZoneId, setPricingZoneId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmToggle>(null)
  const [showCreateZone, setShowCreateZone] = useState(false)
  const [showCreateRule, setShowCreateRule] = useState(false)
  const limit = 20

  const [zoneName, setZoneName] = useState('')
  const [zoneGeometryJson, setZoneGeometryJson] = useState(
    JSON.stringify(ISOLATED_EVIDENCE_POLYGON, null, 2),
  )

  const [ruleZoneId, setRuleZoneId] = useState('')
  const [ruleName, setRuleName] = useState('')
  const [ruleBand, setRuleBand] = useState<'DAY' | 'NIGHT' | 'CUSTOM'>('DAY')
  const [ruleFeeMajors, setRuleFeeMajors] = useState('200')
  const [ruleDriverMajors, setRuleDriverMajors] = useState('150')
  const [ruleEffectiveFrom, setRuleEffectiveFrom] = useState(
    () => new Date().toISOString().slice(0, 16),
  )
  const [ruleStartLocal, setRuleStartLocal] = useState('')
  const [ruleEndLocal, setRuleEndLocal] = useState('')

  const tabs = useMemo(
    () => [
      { id: 'zones', label: t('zonesTabZones') },
      { id: 'pricing', label: t('pricing') },
      { id: 'wilaya', label: t('wilayas') },
    ],
    [t],
  )

  const activeParam =
    activeFilter === 'all' ? undefined : activeFilter === 'true'

  const zonesQ = useQuery({
    queryKey: ['zones', offset, activeFilter],
    queryFn: () =>
      adminApi.listDeliveryZones({
        limit,
        offset,
        active: activeParam,
        sortBy: 'name',
        sortDir: 'ASC',
      }),
    enabled: tab === 'zones' && canReadZones,
  })

  const zonesForSelectQ = useQuery({
    queryKey: ['zones', 'select'],
    queryFn: () =>
      adminApi.listDeliveryZones({ limit: 100, offset: 0, sortBy: 'name' }),
    enabled: (tab === 'pricing' || showCreateRule) && canReadZones,
  })

  const pricingQ = useQuery({
    queryKey: ['pricing', offset, activeFilter, pricingZoneId],
    queryFn: () =>
      adminApi.listPricingRules({
        limit,
        offset,
        active: activeParam,
        zoneId: pricingZoneId || undefined,
        sortBy: 'effectiveFrom',
        sortDir: 'DESC',
      }),
    enabled: tab === 'pricing' && canReadPricing,
  })

  const wilayasQ = useQuery({
    queryKey: ['wilayas'],
    queryFn: () => adminApi.listWilayas(),
    enabled: tab === 'wilaya',
  })

  const createZone = useMutation({
    mutationFn: async () => {
      let geometry: object
      try {
        geometry = JSON.parse(zoneGeometryJson) as object
      } catch {
        throw new ApiError(400, t('zoneGeometryInvalid'), 'VALIDATION')
      }
      return adminApi.createDeliveryZone({
        name: zoneName.trim(),
        geometry,
      })
    },
    onSuccess: async () => {
      setOk(t('success'))
      setErr(null)
      setShowCreateZone(false)
      setZoneName('')
      setZoneGeometryJson(JSON.stringify(ISOLATED_EVIDENCE_POLYGON, null, 2))
      await qc.invalidateQueries({ queryKey: ['zones'] })
    },
    onError: (e) => {
      setOk(null)
      setErr(e instanceof ApiError ? e.message : t('error'))
    },
  })

  const createRule = useMutation({
    mutationFn: async () => {
      const fee = dzdMajorsToMinor(ruleFeeMajors)
      const driver = dzdMajorsToMinor(ruleDriverMajors)
      if (fee === null || driver === null) {
        throw new ApiError(400, t('pricingMoneyInvalid'), 'VALIDATION')
      }
      if (driver > fee) {
        throw new ApiError(400, t('pricingDriverExceedsFee'), 'VALIDATION')
      }
      const effectiveFrom = new Date(ruleEffectiveFrom).toISOString()
      const body: Parameters<typeof adminApi.createPricingRule>[0] = {
        zoneId: ruleZoneId,
        name: ruleName.trim(),
        timeBand: ruleBand,
        customerDeliveryFeeMinor: fee,
        driverRemunerationMinor: driver,
        effectiveFrom,
      }
      if (ruleBand === 'CUSTOM') {
        if (!ruleStartLocal || !ruleEndLocal) {
          throw new ApiError(400, t('pricingCustomTimesRequired'), 'VALIDATION')
        }
        body.startLocalTime = ruleStartLocal.length === 5
          ? `${ruleStartLocal}:00`
          : ruleStartLocal
        body.endLocalTime = ruleEndLocal.length === 5
          ? `${ruleEndLocal}:00`
          : ruleEndLocal
      }
      return adminApi.createPricingRule(body)
    },
    onSuccess: async () => {
      setOk(t('success'))
      setErr(null)
      setShowCreateRule(false)
      await qc.invalidateQueries({ queryKey: ['pricing'] })
    },
    onError: (e) => {
      setOk(null)
      setErr(e instanceof ApiError ? e.message : t('error'))
    },
  })

  const toggle = useMutation({
    mutationFn: async (input: ConfirmToggle & object) => {
      if (!input) throw new Error('none')
      if (input.kind === 'zone') {
        return input.currentlyActive
          ? adminApi.deactivateDeliveryZone(input.id)
          : adminApi.activateDeliveryZone(input.id)
      }
      return input.currentlyActive
        ? adminApi.deactivatePricingRule(input.id)
        : adminApi.activatePricingRule(input.id)
    },
    onSuccess: async () => {
      setOk(t('success'))
      setErr(null)
      setConfirm(null)
      await qc.invalidateQueries({ queryKey: ['zones'] })
      await qc.invalidateQueries({ queryKey: ['pricing'] })
    },
    onError: (e) => {
      setOk(null)
      setErr(e instanceof ApiError ? e.message : t('error'))
    },
  })

  const zoneItems = useMemo(() => {
    const items = zonesQ.data?.items ?? []
    const q = nameQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter((z) => z.name.toLowerCase().includes(q))
  }, [zonesQ.data?.items, nameQuery])

  const pricingItems = pricingQ.data?.items ?? []
  const wilayas = wilayasQ.data?.wilayas ?? []

  const feeMinorPreview = dzdMajorsToMinor(ruleFeeMajors)
  const driverMinorPreview = dzdMajorsToMinor(ruleDriverMajors)
  const sharePreview =
    feeMinorPreview !== null && driverMinorPreview !== null
      ? speedyGoShareMinor(feeMinorPreview, driverMinorPreview)
      : null

  function onCreateZone(e: FormEvent) {
    e.preventDefault()
    if (!zoneName.trim() || createZone.isPending) return
    createZone.mutate()
  }

  function onCreateRule(e: FormEvent) {
    e.preventDefault()
    if (!ruleZoneId || !ruleName.trim() || createRule.isPending) return
    createRule.mutate()
  }

  function zoneNameById(id: string): string {
    const fromSelect = zonesForSelectQ.data?.items.find((z) => z.id === id)
    if (fromSelect) return fromSelect.name
    return id.slice(0, 8) + '…'
  }

  return (
    <RequirePermission
      anyOf={[PERMS.DELIVERY_ZONES_READ, PERMS.DELIVERY_PRICING_READ]}
    >
      <PageHeader
        title={t('zones')}
        subtitle={t('zonesPageSubtitle')}
        actions={
          tab !== 'wilaya' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void (tab === 'pricing' ? pricingQ.refetch() : zonesQ.refetch())
              }
            >
              <Icon name="refresh" /> {t('refresh')}
            </Button>
          ) : null
        }
      />
      <EntityTabs
        tabs={tabs}
        active={tab}
        onChange={(id) => {
          setTab(id as typeof tab)
          setOffset(0)
          setOk(null)
          setErr(null)
          setShowCreateZone(false)
          setShowCreateRule(false)
        }}
      />
      {ok ? <div className="banner banner-success">{ok}</div> : null}
      {err ? <div className="banner banner-error">{err}</div> : null}

      {tab === 'wilaya' ? (
        <div className="stack">
          <UnavailablePanel
            title={t('wilayasAdminBlockedTitle')}
            detail={t('wilayasUnavailableHint')}
          />
          <p className="muted">{t('wilayasReadOnlyHint')}</p>
          {wilayasQ.isLoading ? <LoadingState /> : null}
          {wilayasQ.isError ? (
            <ErrorState onRetry={() => void wilayasQ.refetch()} />
          ) : null}
          {wilayas.length > 0 ? (
            <div className="card">
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t('wilayaCode')}</th>
                      <th>{t('wilayaNameFr')}</th>
                      <th>{t('wilayaNameAr')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wilayas.map((w) => (
                      <tr key={w.code}>
                        <td className="mono">{w.code}</td>
                        <td>{w.nameFr}</td>
                        <td dir="rtl">{w.nameAr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'zones' && canReadZones ? (
        <div className="stack">
          <p className="muted">{t('zonesPricingHint')}</p>
          <div className="promo-toolbar card card-body">
            <div className="promo-toolbar__filters">
              <label className="geo-search">
                <Icon name="search" />
                <input
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder={t('zoneSearchPlaceholder')}
                  aria-label={t('zoneSearchPlaceholder')}
                />
              </label>
              <label className="sg-select">
                <span className="sr-only">{t('status')}</span>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value as ActiveFilter)
                    setOffset(0)
                  }}
                >
                  <option value="all">{t('promoFilterAll')}</option>
                  <option value="true">{t('zoneFilterActive')}</option>
                  <option value="false">{t('zoneFilterInactive')}</option>
                </select>
                <Icon name="expand_more" className="sg-select__chevron" />
              </label>
              {nameQuery.trim() ? (
                <span className="muted text-metadata">{t('zoneSearchPageHint')}</span>
              ) : null}
            </div>
            {canManageZones ? (
              <Button
                size="sm"
                onClick={() => {
                  setShowCreateZone((v) => !v)
                  setShowCreateRule(false)
                }}
              >
                <Icon name="add" /> {t('zoneCreate')}
              </Button>
            ) : null}
          </div>

          {showCreateZone && canManageZones ? (
            <form className="card card-body stack" onSubmit={onCreateZone}>
              <h3 style={{ margin: 0 }}>{t('zoneCreate')}</h3>
              <p className="muted text-metadata">{t('zoneCreateHint')}</p>
              <label className="field">
                <span>{t('label')} *</span>
                <input
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  maxLength={255}
                  required
                />
              </label>
              <label className="field">
                <span>{t('zoneGeometryLabel')} *</span>
                <textarea
                  rows={8}
                  className="mono"
                  value={zoneGeometryJson}
                  onChange={(e) => setZoneGeometryJson(e.target.value)}
                  required
                />
                <span className="muted text-metadata">{t('zoneGeometryHint')}</span>
              </label>
              <div className="row" style={{ gap: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateZone(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={createZone.isPending || !zoneName.trim()}>
                  {createZone.isPending ? t('loading') : t('save')}
                </Button>
              </div>
            </form>
          ) : null}

          {zonesQ.isLoading ? <LoadingState /> : null}
          {zonesQ.isError ? (
            <ErrorState onRetry={() => void zonesQ.refetch()} />
          ) : null}
          {zonesQ.data && zoneItems.length === 0 ? <EmptyState /> : null}
          {zoneItems.length > 0 ? (
            <>
              <div className="card promo-table-card">
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>{t('label')}</th>
                        <th>{t('zoneCoverageKind')}</th>
                        <th>{t('active')}</th>
                        <th className="col-actions">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zoneItems.map((z: DeliveryZone) => (
                        <tr key={z.id}>
                          <td>
                            <strong>{z.name}</strong>
                            <div className="muted text-metadata mono">
                              {z.id.slice(0, 8)}…
                            </div>
                          </td>
                          <td className="muted">{t('zoneCoveragePolygon')}</td>
                          <td>
                            <Badge tone={z.active ? 'success' : 'neutral'}>
                              {z.active ? t('active') : t('inactive')}
                            </Badge>
                          </td>
                          <td className="col-actions">
                            {canManageZones ? (
                              <Button
                                size="sm"
                                variant={z.active ? 'danger' : 'primary'}
                                disabled={toggle.isPending}
                                onClick={() =>
                                  setConfirm({
                                    kind: 'zone',
                                    id: z.id,
                                    name: z.name,
                                    currentlyActive: z.active,
                                  })
                                }
                              >
                                {z.active ? t('deactivate') : t('activate')}
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  total={zonesQ.data?.total ?? 0}
                  limit={limit}
                  offset={offset}
                  onChange={setOffset}
                  integrated
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'pricing' && canReadPricing ? (
        <div className="stack">
          <p className="muted">{t('pricingSplitHint')}</p>
          <div className="promo-toolbar card card-body">
            <div className="promo-toolbar__filters">
              <label className="sg-select">
                <span className="sr-only">{t('zone')}</span>
                <select
                  value={pricingZoneId}
                  onChange={(e) => {
                    setPricingZoneId(e.target.value)
                    setOffset(0)
                  }}
                >
                  <option value="">{t('pricingAllZones')}</option>
                  {(zonesForSelectQ.data?.items ?? []).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
                <Icon name="expand_more" className="sg-select__chevron" />
              </label>
              <label className="sg-select">
                <span className="sr-only">{t('status')}</span>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value as ActiveFilter)
                    setOffset(0)
                  }}
                >
                  <option value="all">{t('promoFilterAll')}</option>
                  <option value="true">{t('zoneFilterActive')}</option>
                  <option value="false">{t('zoneFilterInactive')}</option>
                </select>
                <Icon name="expand_more" className="sg-select__chevron" />
              </label>
            </div>
            {canManagePricing ? (
              <Button
                size="sm"
                onClick={() => {
                  setShowCreateRule((v) => !v)
                  setShowCreateZone(false)
                  const first = zonesForSelectQ.data?.items[0]?.id
                  if (first && !ruleZoneId) setRuleZoneId(first)
                }}
              >
                <Icon name="add" /> {t('pricingCreate')}
              </Button>
            ) : null}
          </div>

          {showCreateRule && canManagePricing ? (
            <form className="card card-body stack pricing-create" onSubmit={onCreateRule}>
              <h3 style={{ margin: 0 }}>{t('pricingCreate')}</h3>
              <p className="muted text-metadata">{t('pricingCreateHint')}</p>
              <label className="field">
                <span>{t('zone')} *</span>
                <select
                  value={ruleZoneId}
                  onChange={(e) => setRuleZoneId(e.target.value)}
                  required
                >
                  <option value="">{t('pricingSelectZone')}</option>
                  {(zonesForSelectQ.data?.items ?? []).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                      {z.active ? '' : ` (${t('inactive')})`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('label')} *</span>
                <input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  maxLength={255}
                  required
                />
              </label>
              <label className="field">
                <span>{t('pricingTimeBand')} *</span>
                <select
                  value={ruleBand}
                  onChange={(e) =>
                    setRuleBand(e.target.value as 'DAY' | 'NIGHT' | 'CUSTOM')
                  }
                >
                  <option value="DAY">{t('pricingTimeBandDay')}</option>
                  <option value="NIGHT">{t('pricingTimeBandNight')}</option>
                  <option value="CUSTOM">{t('pricingTimeBandCustom')}</option>
                </select>
              </label>
              {ruleBand === 'CUSTOM' ? (
                <div className="promo-form-grid">
                  <label className="field">
                    <span>{t('pricingStartLocal')} *</span>
                    <input
                      type="time"
                      step={1}
                      value={ruleStartLocal}
                      onChange={(e) => setRuleStartLocal(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{t('pricingEndLocal')} *</span>
                    <input
                      type="time"
                      step={1}
                      value={ruleEndLocal}
                      onChange={(e) => setRuleEndLocal(e.target.value)}
                      required
                    />
                  </label>
                </div>
              ) : null}
              <div className="promo-form-grid">
                <label className="field">
                  <span>{t('pricingCustomerFee')} (DZD) *</span>
                  <input
                    inputMode="numeric"
                    value={ruleFeeMajors}
                    onChange={(e) => setRuleFeeMajors(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>{t('pricingDriverPay')} (DZD) *</span>
                  <input
                    inputMode="numeric"
                    value={ruleDriverMajors}
                    onChange={(e) => setRuleDriverMajors(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="pricing-share-preview">
                <span className="muted">{t('pricingSpeedyGoShare')}</span>
                <strong>
                  {sharePreview !== null
                    ? formatDzdFromMinor(sharePreview)
                    : '—'}
                </strong>
                <span className="muted text-metadata">
                  {t('pricingShareDerivedHint')}
                </span>
              </div>
              {driverMinorPreview !== null &&
              feeMinorPreview !== null &&
              driverMinorPreview > feeMinorPreview ? (
                <div className="banner banner-warn">{t('pricingDriverExceedsFee')}</div>
              ) : null}
              <label className="field">
                <span>{t('pricingEffectiveFrom')} *</span>
                <input
                  type="datetime-local"
                  value={ruleEffectiveFrom}
                  onChange={(e) => setRuleEffectiveFrom(e.target.value)}
                  required
                />
                <span className="muted text-metadata">{t('pricingTimezoneHint')}</span>
              </label>
              <p className="muted text-metadata">{t('pricingHistoricalImmutable')}</p>
              <div className="row" style={{ gap: 8 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateRule(false)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createRule.isPending ||
                    !ruleZoneId ||
                    !ruleName.trim() ||
                    (driverMinorPreview !== null &&
                      feeMinorPreview !== null &&
                      driverMinorPreview > feeMinorPreview)
                  }
                >
                  {createRule.isPending ? t('loading') : t('save')}
                </Button>
              </div>
            </form>
          ) : null}

          {pricingQ.isLoading ? <LoadingState /> : null}
          {pricingQ.isError ? (
            <ErrorState onRetry={() => void pricingQ.refetch()} />
          ) : null}
          {pricingQ.data && pricingItems.length === 0 ? <EmptyState /> : null}
          {pricingItems.length > 0 ? (
            <div className="card promo-table-card">
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t('label')}</th>
                      <th>{t('zone')}</th>
                      <th>{t('pricingTimeBand')}</th>
                      <th className="num">{t('pricingCustomerFee')}</th>
                      <th className="num">{t('pricingDriverPay')}</th>
                      <th className="num">{t('pricingSpeedyGoShare')}</th>
                      <th>{t('active')}</th>
                      <th className="col-actions">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingItems.map((r: DeliveryPricingRule) => {
                      const share = speedyGoShareMinor(
                        r.customerDeliveryFeeMinor,
                        r.driverRemunerationMinor,
                      )
                      return (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.name}</strong>
                            <div className="muted text-metadata">
                              {new Date(r.effectiveFrom).toLocaleString(locale)}
                            </div>
                          </td>
                          <td>{zoneNameById(r.zoneId)}</td>
                          <td>{t(timeBandLabelKey(r.timeBand))}</td>
                          <td className="num money">
                            {formatDzdFromMinor(r.customerDeliveryFeeMinor)}
                          </td>
                          <td className="num money">
                            {formatDzdFromMinor(r.driverRemunerationMinor)}
                          </td>
                          <td className="num money">
                            {share !== null ? formatDzdFromMinor(share) : '—'}
                          </td>
                          <td>
                            <Badge tone={r.active ? 'success' : 'neutral'}>
                              {r.active ? t('active') : t('inactive')}
                            </Badge>
                          </td>
                          <td className="col-actions">
                            {canManagePricing ? (
                              <Button
                                size="sm"
                                variant={r.active ? 'danger' : 'primary'}
                                disabled={toggle.isPending}
                                onClick={() =>
                                  setConfirm({
                                    kind: 'pricing',
                                    id: r.id,
                                    name: r.name,
                                    currentlyActive: r.active,
                                  })
                                }
                              >
                                {r.active ? t('deactivate') : t('activate')}
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={pricingQ.data?.total ?? 0}
                limit={limit}
                offset={offset}
                onChange={setOffset}
                integrated
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {confirm ? (
        <Modal
          title={
            confirm.currentlyActive ? t('deactivate') : t('activate')
          }
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                {t('cancel')}
              </Button>
              <Button
                variant={confirm.currentlyActive ? 'danger' : 'primary'}
                disabled={toggle.isPending}
                onClick={() => toggle.mutate(confirm)}
              >
                {toggle.isPending ? t('loading') : t('confirm')}
              </Button>
            </>
          }
        >
          <p>
            <strong>{confirm.name}</strong>
          </p>
          <p className="muted">{t('zonesPricingHint')}</p>
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
