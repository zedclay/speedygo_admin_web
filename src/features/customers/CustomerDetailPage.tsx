import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/adminApi'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { EntityProfileHeader } from '../../components/ui/EntityProfileHeader'
import { Modal } from '../../components/ui/Modal'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import { RefKpiCard, RefKpiGrid } from '../../components/ui/RefKpiCard'
import {
  ScopedOrdersPanel,
  useScopedOrdersTotal,
} from '../orders/ScopedOrdersPanel'
import { ApiError } from '../../lib/api/types'

function osmEmbedSrc(lat: number, lng: number): string {
  const d = 0.012
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
}

type CustomerTab = 'overview' | 'addresses' | 'orders' | 'complaints' | 'notes'
type LifecycleAction = 'suspend' | 'reactivate' | null

/** A013–A019 customer detail: addresses, orders, complaints, Account lifecycle, internal notes. */
export function CustomerDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canReadOrders = hasPermission(permissions, PERMS.ORDERS_READ)
  const canSuspend = hasPermission(permissions, PERMS.CUSTOMERS_SUSPEND)
  const canManageNotes = hasPermission(permissions, PERMS.CUSTOMERS_NOTES_MANAGE)
  const canOpenSupport = hasPermission(permissions, PERMS.SUPPORT_READ)
  const [tab, setTab] = useState<CustomerTab>('overview')
  const [action, setAction] = useState<LifecycleAction>(null)
  const [auditNote, setAuditNote] = useState('')
  const [lifecycleError, setLifecycleError] = useState<string | null>(null)
  const [complaintsOffset, setComplaintsOffset] = useState(0)
  const complaintsLimit = 20
  const [notesOffset, setNotesOffset] = useState(0)
  const notesLimit = 20
  const [noteCategory, setNoteCategory] = useState('GENERAL')
  const [noteBody, setNoteBody] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [noteSavedId, setNoteSavedId] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['customer', id],
    queryFn: () => adminApi.getCustomer(id),
    enabled: Boolean(id),
  })

  const addressesQ = useQuery({
    queryKey: ['customer-addresses', id],
    queryFn: () => adminApi.listCustomerAddresses(id),
    enabled: Boolean(id) && tab === 'addresses',
  })

  const complaintsQ = useQuery({
    queryKey: ['customer-complaints', id, complaintsOffset],
    queryFn: () =>
      adminApi.listCustomerComplaints(id, {
        limit: complaintsLimit,
        offset: complaintsOffset,
      }),
    enabled: Boolean(id) && (tab === 'complaints' || tab === 'overview'),
  })

  const ordersTotal = useScopedOrdersTotal(
    id ? { kind: 'customer', customerId: id } : null,
    canReadOrders,
  )

  const notesQ = useQuery({
    queryKey: ['customer-notes', id, notesOffset],
    queryFn: () =>
      adminApi.listCustomerNotes(id, { limit: notesLimit, offset: notesOffset }),
    enabled: Boolean(id) && tab === 'notes',
  })

  const createNote = useMutation({
    mutationFn: () =>
      adminApi.createCustomerNote(id, {
        category: noteCategory,
        body: noteBody,
      }),
    onSuccess: async (created) => {
      setNoteError(null)
      setNoteBody('')
      setNoteSavedId(created.id)
      setNotesOffset(0)
      await queryClient.invalidateQueries({ queryKey: ['customer-notes', id] })
    },
    onError: (err) => {
      setNoteError(err instanceof ApiError ? err.message : t('error'))
    },
  })

  const lifecycle = useMutation({
    mutationFn: async () => {
      if (!id || !action) throw new Error('missing')
      const body = { auditNote: auditNote.trim() || undefined }
      return action === 'suspend'
        ? adminApi.suspendCustomer(id, body)
        : adminApi.reactivateCustomer(id, body)
    },
    onSuccess: async () => {
      setLifecycleError(null)
      setAction(null)
      setAuditNote('')
      await queryClient.invalidateQueries({ queryKey: ['customer', id] })
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => {
      setLifecycleError(err instanceof ApiError ? err.message : t('error'))
    },
  })

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('tabOverview') },
      { id: 'addresses', label: t('tabAddresses') },
      { id: 'orders', label: t('tabOrders') },
      { id: 'complaints', label: t('tabComplaints') },
      { id: 'notes', label: t('tabNotes') },
    ],
    [t],
  )

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const c = q.data
  const statusText =
    c.accountStatus === 'ACTIVE'
      ? t('accountStatusActive')
      : c.accountStatus === 'SUSPENDED'
        ? t('accountStatusSuspended')
        : c.accountStatus === 'DISABLED'
          ? t('accountStatusDisabled')
          : t('accountStatusUnknown')
  const statusTone =
    c.accountStatus === 'ACTIVE'
      ? 'success'
      : c.accountStatus === 'SUSPENDED'
        ? 'error'
        : 'neutral'
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

  const complaintsKpi =
    complaintsQ.data != null
      ? { label: t('complaintsCount'), value: String(complaintsQ.data.total) }
      : tab === 'complaints' && complaintsQ.isLoading
        ? { label: t('complaintsCount'), value: '—', hint: t('loading') }
        : {
            label: t('complaintsCount'),
            value: '—',
            hint: t('complaintsKpiHint'),
          }

  const blockedByAdmin = c.colocated.hasAdminProfile
  const suspendAllowed =
    canSuspend &&
    !blockedByAdmin &&
    c.accountStatus === 'ACTIVE'
  const reactivateAllowed =
    canSuspend &&
    !blockedByAdmin &&
    c.accountStatus === 'SUSPENDED'

  return (
    <RequirePermission allOf={PERMS.CUSTOMERS_READ}>
      <EntityProfileHeader
        title={c.fullName}
        subtitle={t('customer')}
        avatarUrl={c.avatarUrl}
        reference={c.id}
        status={statusText}
        statusTone={statusTone}
        kpis={[
          ordersKpi,
          complaintsKpi,
          {
            label: t('createdAt'),
            value: new Date(c.createdAt).toLocaleDateString(),
          },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/customers')}>
              {t('back')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!suspendAllowed}
              title={
                !canSuspend
                  ? t('customersSuspendPermRequired')
                  : blockedByAdmin
                    ? t('customerLifecycleAdminBlocked')
                    : c.accountStatus !== 'ACTIVE'
                      ? t('customerSuspendWrongState')
                      : undefined
              }
              onClick={() => {
                setLifecycleError(null)
                setAuditNote('')
                setAction('suspend')
              }}
            >
              {t('suspend')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!reactivateAllowed}
              title={
                !canSuspend
                  ? t('customersSuspendPermRequired')
                  : blockedByAdmin
                    ? t('customerLifecycleAdminBlocked')
                    : c.accountStatus !== 'SUSPENDED'
                      ? t('customerReactivateWrongState')
                      : undefined
              }
              onClick={() => {
                setLifecycleError(null)
                setAuditNote('')
                setAction('reactivate')
              }}
            >
              {t('reactivate')}
            </Button>
          </>
        }
      />
      <EntityTabs tabs={tabs} active={tab} onChange={(next) => setTab(next as CustomerTab)} />
      {tab === 'overview' ? (
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <strong>{t('generalInfo')}</strong>
            </div>
            <div className="card-body">
              <div className="summary-grid">
                <div className="summary-item">
                  <label>{t('customer')}</label>
                  <strong>{c.fullName}</strong>
                </div>
                <div className="summary-item">
                  <label>{t('phone')}</label>
                  <strong>{c.phone ?? '—'}</strong>
                </div>
                <div className="summary-item">
                  <label>{t('accountStatusLabel')}</label>
                  <strong>{statusText}</strong>
                  <p className="muted text-metadata" style={{ margin: '4px 0 0' }}>
                    {t('accountStatusScopeHint')}
                  </p>
                </div>
                <div className="summary-item">
                  <label>{t('createdAt')}</label>
                  <strong>{new Date(c.createdAt).toLocaleString()}</strong>
                </div>
              </div>
              {(c.colocated.hasAdminProfile ||
                c.colocated.hasDriverProfile ||
                c.colocated.hasMerchantMembership) && (
                <div className="banner banner-warn" style={{ marginTop: 12 }}>
                  {t('customerColocatedBanner')}
                  <ul className="muted" style={{ margin: '8px 0 0', paddingInlineStart: 18 }}>
                    {c.colocated.hasAdminProfile ? (
                      <li>{t('colocatedAdmin')}</li>
                    ) : null}
                    {c.colocated.hasDriverProfile ? (
                      <li>{t('colocatedDriver')}</li>
                    ) : null}
                    {c.colocated.hasMerchantMembership ? (
                      <li>{t('colocatedMerchant')}</li>
                    ) : null}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <strong>{t('recentOrders')}</strong>
            </div>
            <div className="card-body">
              <ScopedOrdersPanel
                scope={{ kind: 'customer', customerId: id }}
                partyColumn="merchant"
                compact
              />
            </div>
          </div>
        </div>
      ) : null}
      {tab === 'addresses' ? (
        <div className="card">
          <div className="card-header">
            <strong>
              {t('authorizedAddresses')}
              {addressesQ.data ? ` (${addressesQ.data.items.length})` : ''}
            </strong>
          </div>
          <div className="card-body stack">
            {addressesQ.isLoading ? <LoadingState /> : null}
            {addressesQ.isError ? (
              <ErrorState onRetry={() => void addressesQ.refetch()} />
            ) : null}
            {addressesQ.data && addressesQ.data.items.length === 0 ? (
              <p className="muted">{t('noAddresses')}</p>
            ) : null}
            {addressesQ.data && addressesQ.data.items.length > 0 ? (
              <div className="address-shell-grid">
                {addressesQ.data.items.map((addr) => {
                  const hasCoords =
                    Number.isFinite(addr.latitude) && Number.isFinite(addr.longitude)
                  return (
                    <article key={addr.id} className="address-shell-card">
                      <div className="address-shell-card__map">
                        {addr.isDefault ? (
                          <span className="address-shell-card__badge">
                            <Icon name="verified" />
                            {t('defaultAddress')}
                          </span>
                        ) : null}
                        {hasCoords ? (
                          <iframe
                            title={`${t('mapPreviewOsm')} — ${addr.label}`}
                            src={osmEmbedSrc(addr.latitude, addr.longitude)}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        ) : (
                          <div className="address-shell-card__map-fallback">
                            <Icon name="location_on" />
                            {t('locationCoords')}
                          </div>
                        )}
                      </div>
                      <div className="address-shell-card__body">
                        <div className="address-shell-card__label">
                          <Icon name="home" />
                          {addr.label}
                        </div>
                        <div className="address-shell-card__meta">
                          {t('addressUpdatedAt')}:{' '}
                          {new Date(addr.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="summary-item">
                          <label>{t('addressLabel')}</label>
                          <strong>{addr.addressText}</strong>
                        </div>
                        {hasCoords ? (
                          <div className="address-shell-card__coords">
                            <Icon name="pin_drop" />
                            <span>
                              {t('locationCoords')}: {addr.latitude.toFixed(5)},{' '}
                              {addr.longitude.toFixed(5)}
                            </span>
                          </div>
                        ) : null}
                        <div className="address-shell-card__footer">
                          <button type="button" disabled title={t('openAddressDisabled')}>
                            {t('openAuthorizedAddress')}
                            <Icon name="arrow_forward" />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {tab === 'orders' ? (
        <div className="stack">
          <RefKpiGrid>
            <RefKpiCard
              icon="receipt_long"
              label={t('kpiTotalOrders')}
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
              label={t('kpiTotalSpend')}
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
                scope={{ kind: 'customer', customerId: id }}
                partyColumn="merchant"
              />
            </div>
          </div>
        </div>
      ) : null}
      {tab === 'complaints' ? (
        <div className="card">
          <div className="card-header row" style={{ justifyContent: 'space-between' }}>
            <strong>
              {t('tabComplaints')}
              {complaintsQ.data ? ` (${complaintsQ.data.total})` : ''}
            </strong>
            <p className="muted text-metadata" style={{ margin: 0 }}>
              {t('complaintsSourceHint')}
            </p>
          </div>
          <div className="card-body stack">
            {complaintsQ.isLoading ? <LoadingState /> : null}
            {complaintsQ.isError ? (
              <ErrorState onRetry={() => void complaintsQ.refetch()} />
            ) : null}
            {complaintsQ.data && complaintsQ.data.items.length === 0 ? (
              <EmptyState />
            ) : null}
            {complaintsQ.data && complaintsQ.data.items.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>{t('complaintReference')}</th>
                        <th>{t('complaintSubject')}</th>
                        <th>{t('createdAt')}</th>
                        <th>{t('priority')}</th>
                        <th>{t('status')}</th>
                        <th>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaintsQ.data.items.map((row) => (
                        <tr key={row.id}>
                          <td className="mono">{row.publicReference}</td>
                          <td>{row.subject ?? row.topicCode ?? '—'}</td>
                          <td>{new Date(row.createdAt).toLocaleString()}</td>
                          <td>{row.priority}</td>
                          <td>{row.status}</td>
                          <td>
                            {canOpenSupport ? (
                              <Link className="btn btn-ghost btn-sm" to={`/support/${row.id}`}>
                                {t('open')}
                              </Link>
                            ) : (
                              <span className="muted" title={t('supportReadRequired')}>
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={complaintsOffset === 0}
                    onClick={() =>
                      setComplaintsOffset((o) => Math.max(0, o - complaintsLimit))
                    }
                  >
                    {t('previous')}
                  </Button>
                  <span className="muted text-metadata">
                    {complaintsOffset + 1}–
                    {Math.min(
                      complaintsOffset + complaintsLimit,
                      complaintsQ.data.total,
                    )}{' '}
                    / {complaintsQ.data.total}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      complaintsOffset + complaintsLimit >= complaintsQ.data.total
                    }
                    onClick={() => setComplaintsOffset((o) => o + complaintsLimit)}
                  >
                    {t('next')}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {tab === 'notes' ? (
        <div className="stack">
          <div className="banner banner-info">{t('customerNotesInternalBanner')}</div>
          <div className="card">
            <div className="card-header">
              <strong>{t('customerNotesComposeTitle')}</strong>
            </div>
            <div className="card-body stack">
              {!canManageNotes ? (
                <p className="muted">{t('customersNotesManageRequired')}</p>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="customer-note-category">{t('customerNoteCategory')}</label>
                    <select
                      id="customer-note-category"
                      value={noteCategory}
                      disabled={createNote.isPending}
                      onChange={(e) => setNoteCategory(e.target.value)}
                    >
                      <option value="GENERAL">{t('customerNoteCatGeneral')}</option>
                      <option value="SUPPORT">{t('customerNoteCatSupport')}</option>
                      <option value="SECURITY">{t('customerNoteCatSecurity')}</option>
                      <option value="PAYMENT">{t('customerNoteCatPayment')}</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="customer-note-body">{t('customerNoteBody')}</label>
                    <textarea
                      id="customer-note-body"
                      rows={4}
                      value={noteBody}
                      disabled={createNote.isPending}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder={t('customerNoteBodyPlaceholder')}
                      maxLength={4000}
                    />
                  </div>
                  {noteError ? (
                    <div className="banner banner-danger">{noteError}</div>
                  ) : null}
                  {noteSavedId ? (
                    <p className="muted text-metadata">
                      {t('customerNoteSaved')} · {noteSavedId.slice(0, 8)}…
                    </p>
                  ) : null}
                  <div className="row" style={{ gap: 8 }}>
                    <Button
                      disabled={
                        createNote.isPending || noteBody.trim().length === 0
                      }
                      onClick={() => {
                        setNoteSavedId(null)
                        createNote.mutate()
                      }}
                    >
                      {createNote.isPending ? t('busy') : t('customerNoteSave')}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled
                      title={t('customerNoteEditUnavailable')}
                    >
                      {t('customerNoteEditUnavailableShort')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <strong>
                {t('customerNotesFeedTitle')}
                {notesQ.data ? ` (${notesQ.data.total})` : ''}
              </strong>
            </div>
            <div className="card-body stack">
              {notesQ.isLoading ? <LoadingState /> : null}
              {notesQ.isError ? (
                <ErrorState onRetry={() => void notesQ.refetch()} />
              ) : null}
              {notesQ.data && notesQ.data.items.length === 0 ? <EmptyState /> : null}
              {notesQ.data?.items.map((note) => (
                <article key={note.id} className="card" style={{ margin: 0 }}>
                  <div className="card-body stack" style={{ gap: 6 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="badge badge-neutral">
                        {note.category === 'GENERAL'
                          ? t('customerNoteCatGeneral')
                          : note.category === 'SUPPORT'
                            ? t('customerNoteCatSupport')
                            : note.category === 'SECURITY'
                              ? t('customerNoteCatSecurity')
                              : note.category === 'PAYMENT'
                                ? t('customerNoteCatPayment')
                                : note.category}
                      </span>
                      <span className="muted text-metadata">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <strong>{note.authorDisplayName}</strong>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{note.body}</p>
                  </div>
                </article>
              ))}
              {notesQ.data && notesQ.data.total > notesLimit ? (
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={notesOffset === 0}
                    onClick={() =>
                      setNotesOffset((o) => Math.max(0, o - notesLimit))
                    }
                  >
                    {t('previous')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={notesOffset + notesLimit >= notesQ.data.total}
                    onClick={() => setNotesOffset((o) => o + notesLimit)}
                  >
                    {t('customerNotesLoadMore')}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {action ? (
        <Modal
          title={
            action === 'suspend' ? t('suspendCustomerTitle') : t('reactivateCustomerTitle')
          }
          onClose={() => {
            if (lifecycle.isPending) return
            setAction(null)
            setLifecycleError(null)
          }}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={lifecycle.isPending}
                onClick={() => {
                  setAction(null)
                  setLifecycleError(null)
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                variant={action === 'suspend' ? 'danger' : 'primary'}
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate()}
              >
                {lifecycle.isPending
                  ? t('busy')
                  : action === 'suspend'
                    ? t('confirmSuspendAccount')
                    : t('confirmReactivateAccount')}
              </Button>
            </>
          }
        >
          <div className="stack">
            <p className="mono">{c.fullName}</p>
            <div className="banner banner-warn">
              {action === 'suspend'
                ? t('customerSuspendConsequences')
                : t('customerReactivateConsequences')}
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              <li>{t('customerLifecycleConsequenceAccount')}</li>
              <li>{t('customerLifecycleConsequenceSessions')}</li>
              <li>{t('customerLifecycleConsequenceNoOrderCancel')}</li>
              <li>{t('customerLifecycleConsequenceNoDuration')}</li>
            </ul>
            {(c.colocated.hasDriverProfile || c.colocated.hasMerchantMembership) && (
              <p className="muted">{t('customerLifecycleConsequenceColocated')}</p>
            )}
            <div className="field">
              <label htmlFor="customer-audit-note">{t('customerLifecycleAuditNote')}</label>
              <textarea
                id="customer-audit-note"
                rows={3}
                value={auditNote}
                disabled={lifecycle.isPending}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder={t('customerLifecycleAuditNoteHint')}
                maxLength={2000}
              />
            </div>
            {lifecycleError ? (
              <div className="banner banner-danger">{lifecycleError}</div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
