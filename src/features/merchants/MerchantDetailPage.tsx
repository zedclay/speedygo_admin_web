import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import type { MerchantBranchStoreItem } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { EntityProfileHeader } from '../../components/ui/EntityProfileHeader'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Modal } from '../../components/ui/Modal'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { RefKpiCard, RefKpiGrid } from '../../components/ui/RefKpiCard'
import {
  ScopedOrdersPanel,
  useScopedOrdersTotal,
} from '../orders/ScopedOrdersPanel'

function storeChooserKind(
  branch: MerchantBranchStoreItem | undefined,
): 'open' | 'temp' | 'closed' {
  if (!branch) return 'closed'
  const mode = branch.availability.effectiveMode
  if (mode === 'TEMPORARY_CLOSED') return 'temp'
  if (mode === 'FORCE_CLOSED') return 'closed'
  if (branch.availability.acceptingOrders) return 'open'
  return 'closed'
}

type MerchantTab =
  | 'overview'
  | 'store'
  | 'catalog'
  | 'orders'
  | 'commission'
  | 'performance'
  | 'documents'
  | 'notes'

export function MerchantDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const [tab, setTab] = useState<MerchantTab>('overview')
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('tabOverview') },
      { id: 'store', label: t('tabStore') },
      { id: 'catalog', label: t('tabCatalog') },
      { id: 'orders', label: t('tabOrders') },
      { id: 'commission', label: t('tabCommission') },
      { id: 'performance', label: t('tabPerformance') },
      { id: 'documents', label: t('documents') },
      { id: 'notes', label: t('tabNotes') },
    ],
    [t],
  )

  const q = useQuery({
    queryKey: ['merchant', id],
    queryFn: () => adminApi.getMerchant(id),
    enabled: Boolean(id),
  })

  const branchesQ = useQuery({
    queryKey: ['merchant-branches', id],
    queryFn: () => adminApi.listMerchantBranches(id),
    enabled: Boolean(id) && tab === 'store',
  })

  useEffect(() => {
    const first = branchesQ.data?.items[0]
    if (!first) return
    setSelectedBranchId((prev) =>
      prev && branchesQ.data?.items.some((b) => b.id === prev) ? prev : first.id,
    )
  }, [branchesQ.data])

  const selectedBranch =
    branchesQ.data?.items.find((b) => b.id === selectedBranchId) ??
    branchesQ.data?.items[0]
  const chooserKind = storeChooserKind(selectedBranch)

  const suspend = useMutation({
    mutationFn: () => adminApi.suspendMerchant(id),
    onSuccess: async () => {
      setMsg(t('success'))
      setSuspendOpen(false)
      await qc.invalidateQueries({ queryKey: ['merchant', id] })
      await qc.invalidateQueries({ queryKey: ['merchants'] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : t('error')),
  })

  const canReadOrders = hasPermission(permissions, PERMS.ORDERS_READ)
  const ordersTotal = useScopedOrdersTotal(
    id ? { kind: 'merchant', merchantId: id } : null,
    canReadOrders,
  )

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const m = q.data
  const ordersKpi =
    !canReadOrders
      ? { label: t('ordersCount'), value: '—', hint: t('ordersReadRequired') }
      : ordersTotal.total != null
        ? { label: t('ordersCount'), value: String(ordersTotal.total) }
        : {
            label: t('ordersCount'),
            value: '—',
            hint: ordersTotal.isLoading ? t('loading') : t('metricUnavailable'),
          }

  return (
    <RequirePermission anyOf={[PERMS.MERCHANTS_READ]}>
      <EntityProfileHeader
        title={m.name}
        subtitle={t('merchant')}
        status={m.status}
        statusTone={statusTone(m.status)}
        reference={m.publicReference ?? m.id}
        kpis={[
          ordersKpi,
          {
            label: t('storeState'),
            value:
              tab === 'store' && selectedBranch
                ? selectedBranch.availability.acceptingOrders
                  ? t('storeStatusOpen')
                  : t('storeStatusClosed')
                : '—',
            hint:
              tab === 'store' && selectedBranch
                ? `${t('merchantAccountStatus')}: ${m.status}`
                : t('metricUnavailable'),
          },
          {
            label: t('confirmed'),
            value: m.verifiedAt ? new Date(m.verifiedAt).toLocaleDateString() : '—',
          },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/merchants')}>
              {t('back')}
            </Button>
            {hasPermission(permissions, PERMS.MERCHANTS_VERIFY) ? (
              <Link className="btn btn-secondary btn-sm" to={`/merchants/${id}/verification`}>
                {t('documents')}
              </Link>
            ) : null}
            {hasPermission(permissions, PERMS.MERCHANTS_SUSPEND) && m.status === 'ACTIVE' ? (
              <Button variant="danger" size="sm" onClick={() => setSuspendOpen(true)}>
                {t('suspend')}
              </Button>
            ) : null}
            {m.status === 'SUSPENDED' ? (
              <Button variant="secondary" size="sm" onClick={() => setReactivateOpen(true)}>
                {t('reactivate')}
              </Button>
            ) : null}
          </>
        }
      />
      {msg ? <div className="banner banner-success">{msg}</div> : null}
      {err ? <div className="banner banner-error">{err}</div> : null}
      <EntityTabs tabs={tabs} active={tab} onChange={(next) => setTab(next as MerchantTab)} />
      {tab === 'overview' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('generalInfo')}</strong>
          </div>
          <div className="card-body">
            <div className="summary-grid">
              <div className="summary-item">
                <label>{t('verification')}</label>
                <strong>
                  <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                </strong>
              </div>
              <div className="summary-item">
                <label>{t('category')}</label>
                <strong className="muted">—</strong>
              </div>
              <div className="summary-item">
                <label>{t('wilaya')}</label>
                <strong className="muted">—</strong>
              </div>
              <div className="summary-item">
                <label>{t('reference')}</label>
                <strong className="mono">{m.publicReference ?? '—'}</strong>
              </div>
              <div className="summary-item">
                <label>{t('createdAt')}</label>
                <strong>{new Date(m.createdAt).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {tab === 'store' ? (
        <div className="store-layout">
          <div className="stack">
            <div className="card">
              <div className="card-header">
                <strong>{t('tabStore')}</strong>
              </div>
              <div className="card-body stack">
                <div className="summary-grid">
                  <div className="summary-item">
                    <label>{t('merchantAccountStatus')}</label>
                    <strong>
                      <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                    </strong>
                  </div>
                  <div className="summary-item">
                    <label>{t('verifiedAt')}</label>
                    <strong>
                      {m.verifiedAt ? new Date(m.verifiedAt).toLocaleString() : '—'}
                    </strong>
                  </div>
                  <div className="summary-item">
                    <label>{t('reference')}</label>
                    <strong className="mono">{m.publicReference ?? m.id}</strong>
                  </div>
                </div>
                {branchesQ.isLoading ? <LoadingState /> : null}
                {branchesQ.isError ? (
                  <ErrorState onRetry={() => void branchesQ.refetch()} />
                ) : null}
                {branchesQ.data && branchesQ.data.items.length === 0 ? (
                  <p className="muted">—</p>
                ) : null}
                {branchesQ.data && branchesQ.data.items.length > 1 ? (
                  <div className="store-branch-tabs" role="tablist" aria-label={t('storeBranchSelect')}>
                    {branchesQ.data.items.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        role="tab"
                        aria-selected={branch.id === selectedBranch?.id}
                        className={`store-branch-tab${branch.id === selectedBranch?.id ? ' is-active' : ''}`}
                        onClick={() => setSelectedBranchId(branch.id)}
                      >
                        {branch.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {selectedBranch ? (
                  <article className="party-card">
                    <h3>
                      <Icon name="storefront" />
                      {selectedBranch.name}
                    </h3>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <label>{t('storeOperationalStatus')}</label>
                        <strong>{selectedBranch.operationalStatus}</strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeOpenState')}</label>
                        <strong>
                          {selectedBranch.availability.acceptingOrders
                            ? t('storeStatusOpen')
                            : t('storeStatusClosed')}
                        </strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeHoursConfigured')}</label>
                        <strong>
                          {selectedBranch.availability.hoursConfigured ? t('yes') : t('no')}
                        </strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeAvailabilityMode')}</label>
                        <strong>{selectedBranch.availability.availabilityMode}</strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeEffectiveMode')}</label>
                        <strong>{selectedBranch.availability.effectiveMode}</strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeTimezone')}</label>
                        <strong>{selectedBranch.availability.timezone}</strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeClosesAt')}</label>
                        <strong>
                          {selectedBranch.availability.currentClosesAt
                            ? new Date(
                                selectedBranch.availability.currentClosesAt,
                              ).toLocaleString()
                            : '—'}
                        </strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeNextOpen')}</label>
                        <strong>
                          {selectedBranch.availability.nextOpenAt
                            ? new Date(
                                selectedBranch.availability.nextOpenAt,
                              ).toLocaleString()
                            : '—'}
                        </strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('storeClosedUntil')}</label>
                        <strong>
                          {selectedBranch.availability.closedUntil
                            ? new Date(
                                selectedBranch.availability.closedUntil,
                              ).toLocaleString()
                            : '—'}
                        </strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('wilaya')}</label>
                        <strong>{selectedBranch.wilayaCode ?? '—'}</strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('addressLabel')}</label>
                        <strong>{selectedBranch.addressText}</strong>
                      </div>
                      <div className="summary-item">
                        <label>{t('phone')}</label>
                        <strong>{selectedBranch.phone}</strong>
                      </div>
                      {selectedBranch.availability.customerMessage ? (
                        <div className="summary-item">
                          <label>{t('storeCustomerMessage')}</label>
                          <strong>{selectedBranch.availability.customerMessage}</strong>
                        </div>
                      ) : null}
                    </div>
                    <p className="muted text-metadata">{t('storeScheduleDetailUnavailable')}</p>
                  </article>
                ) : null}
                <div className="banner banner-info">{t('storeMutationsDisabled')}</div>
                <div className="store-status-shell" aria-disabled="true">
                  <button
                    type="button"
                    className={`store-status-option${chooserKind === 'open' ? ' is-current' : ''}`}
                    disabled
                    title={t('actionUnavailableHint')}
                  >
                    {t('storeStatusOpen')}
                    <small>{t('storeStatusOpenHint')}</small>
                  </button>
                  <button
                    type="button"
                    className={`store-status-option${chooserKind === 'temp' ? ' is-current' : ''}`}
                    disabled
                    title={t('actionUnavailableHint')}
                  >
                    {t('storeStatusTempClose')}
                    <small>{t('storeStatusTempHint')}</small>
                  </button>
                  <button
                    type="button"
                    className={`store-status-option${chooserKind === 'closed' ? ' is-current' : ''}`}
                    disabled
                    title={t('actionUnavailableHint')}
                  >
                    {t('storeStatusClosed')}
                    <small>{t('storeStatusClosedHint')}</small>
                  </button>
                </div>
                <Button disabled title={t('actionUnavailableHint')}>
                  {t('storeApplyChange')}
                </Button>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <strong>{t('storeImpactUnavailable')}</strong>
              </div>
              <div className="card-body">
                <UnavailablePanel
                  title={t('storeImpactUnavailable')}
                  detail={t('unavailableHint')}
                />
              </div>
            </div>
          </div>
          <aside className="stack">
            <div className="card">
              <div className="card-header">
                <strong>{t('storeOpsNotesUnavailable')}</strong>
              </div>
              <div className="card-body">
                <UnavailablePanel
                  title={t('storeOpsNotesUnavailable')}
                  detail={t('unavailableHint')}
                />
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <strong>{t('storeStatusHistoryUnavailable')}</strong>
              </div>
              <div className="card-body">
                <UnavailablePanel
                  title={t('storeStatusHistoryUnavailable')}
                  detail={t('unavailableHint')}
                />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
      {tab === 'catalog' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('tabCatalog')}</strong>
          </div>
          <div className="card-body">
            <UnavailablePanel title={t('tabCatalog')} detail={t('unavailableHint')} />
          </div>
        </div>
      ) : null}
      {tab === 'orders' ? (
        <div className="stack">
          <RefKpiGrid>
            <RefKpiCard
              icon="receipt_long"
              label={t('kpiMerchantOrders')}
              value={
                !canReadOrders
                  ? '—'
                  : ordersTotal.total != null
                    ? String(ordersTotal.total)
                    : '—'
              }
              hint={
                !canReadOrders
                  ? t('ordersReadRequired')
                  : ordersTotal.total != null
                    ? t('kpiOrdersSinceStart')
                    : ordersTotal.isLoading
                      ? t('loading')
                      : t('metricUnavailable')
              }
            />
            <RefKpiCard
              icon="payments"
              label={t('kpiMerchantVolume')}
              value="—"
              hint={t('metricUnavailable')}
            />
            <RefKpiCard
              icon="star"
              label={t('kpiSatisfaction')}
              value="—"
              hint={t('metricUnavailable')}
            />
          </RefKpiGrid>
          <div className="card">
            <div className="card-header">
              <strong>{t('tabOrders')}</strong>
            </div>
            <div className="card-body">
              <ScopedOrdersPanel
                scope={{ kind: 'merchant', merchantId: id }}
                partyColumn="customer"
              />
            </div>
          </div>
        </div>
      ) : null}
      {tab === 'commission' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('tabCommission')}</strong>
          </div>
          <div className="card-body stack">
            <div className="field">
              <label>{t('tabCommission')}</label>
              <input disabled value="—" />
            </div>
            <Button disabled title={t('actionUnavailableHint')}>
              {t('save')}
            </Button>
            <UnavailablePanel title={t('tabCommission')} detail={t('unavailableHint')} />
          </div>
        </div>
      ) : null}
      {tab === 'performance' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('tabPerformance')}</strong>
          </div>
          <div className="card-body">
            <UnavailablePanel title={t('tabPerformance')} detail={t('unavailableHint')} />
          </div>
        </div>
      ) : null}
      {tab === 'documents' ? (
        <div className="card card-body stack">
          <p className="muted">{t('documents')}</p>
          {hasPermission(permissions, PERMS.MERCHANTS_VERIFY) ? (
            <Link className="btn btn-primary" to={`/merchants/${id}/verification`}>
              {t('verificationQueue')}
            </Link>
          ) : (
            <UnavailablePanel />
          )}
        </div>
      ) : null}
      {tab === 'notes' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('tabNotes')}</strong>
          </div>
          <div className="card-body stack">
            <textarea rows={4} disabled placeholder="—" />
            <Button disabled title={t('actionUnavailableHint')}>
              {t('save')}
            </Button>
          </div>
        </div>
      ) : null}
      {suspendOpen ? (
        <Modal
          title={t('suspend')}
          onClose={() => setSuspendOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setSuspendOpen(false)}>
                {t('cancel')}
              </Button>
              <Button variant="danger" disabled={suspend.isPending} onClick={() => suspend.mutate()}>
                {t('confirm')}
              </Button>
            </>
          }
        >
          <p>{t('suspend')} — {m.name}</p>
        </Modal>
      ) : null}
      {reactivateOpen ? (
        <Modal
          title={t('reactivateMerchantTitle')}
          onClose={() => setReactivateOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setReactivateOpen(false)}>
                {t('cancel')}
              </Button>
              <Button disabled title={t('actionUnavailableHint')}>
                {t('confirmActionDisabled')}
              </Button>
            </>
          }
        >
          <p>{t('actionUnavailableHint')}</p>
          <p className="muted">{m.name}</p>
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
