import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import type { DriverMatchingOccupancy } from '../../lib/api/types'
import { formatDzdFromMinor } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { EntityProfileHeader } from '../../components/ui/EntityProfileHeader'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { Icon } from '../../components/ui/Icon'
import { Pagination } from '../../components/ui/Pagination'
import {
  LoadingState,
  ErrorState,
  EmptyState,
  ForbiddenState,
} from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Modal } from '../../components/ui/Modal'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'

type DriverTab = 'overview' | 'mission' | 'availability' | 'ratings' | 'history' | 'cod'
type ConfirmAction = 'approve' | 'reject' | 'suspend' | 'reactivate-disabled'

function occupancyLabel(
  occupancy: DriverMatchingOccupancy | undefined,
  t: ReturnType<typeof useI18n>['t'],
): string {
  switch (occupancy) {
    case 'OFFLINE':
      return t('occupancyOffline')
    case 'ONLINE_AVAILABLE':
      return t('occupancyOnlineAvailable')
    case 'ONLINE_ON_MISSION':
      return t('occupancyOnlineOnMission')
    case 'UNKNOWN':
      return t('occupancyUnknown')
    default:
      return t('metricUnavailable')
  }
}

export function DriverDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const [tab, setTab] = useState<DriverTab>('overview')
  const [codOffset, setCodOffset] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const codLimit = 20
  const canCodRead = hasPermission(permissions, PERMS.COD_READ)

  const tabs = useMemo(
    () => [
      { id: 'overview', label: t('tabOverview') },
      { id: 'mission', label: t('tabMission') },
      { id: 'availability', label: t('tabAvailability') },
      { id: 'ratings', label: t('tabRatings') },
      { id: 'history', label: t('tabHistory') },
      { id: 'cod', label: t('tabCod') },
    ],
    [t],
  )

  const q = useQuery({
    queryKey: ['driver', id],
    queryFn: () => adminApi.getDriver(id),
    enabled: Boolean(id),
  })

  const codSummaryQ = useQuery({
    queryKey: ['cod', 'driver-summary', id],
    queryFn: () => adminApi.getCodDriverSummary(id),
    enabled: Boolean(id) && tab === 'cod' && canCodRead,
  })

  const codQ = useQuery({
    queryKey: ['cod', 'driver', id, codOffset],
    queryFn: () =>
      adminApi.listCodRemittances({ driverId: id, limit: codLimit, offset: codOffset }),
    enabled: Boolean(id) && tab === 'cod' && canCodRead,
  })

  const run = useMutation({
    mutationFn: async () => {
      if (confirm === 'approve') return adminApi.approveDriver(id)
      if (confirm === 'reject') return adminApi.rejectDriver(id)
      if (confirm === 'suspend') return adminApi.suspendDriver(id)
      throw new Error('noop')
    },
    onSuccess: async () => {
      setOk(t('success'))
      setConfirm(null)
      await qc.invalidateQueries({ queryKey: ['driver', id] })
      await qc.invalidateQueries({ queryKey: ['drivers'] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : t('error')),
  })

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const d = q.data
  const mission = d.currentMission ?? null

  const confirmTitle =
    confirm === 'approve'
      ? t('approve')
      : confirm === 'reject'
        ? t('reject')
        : confirm === 'reactivate-disabled'
          ? t('reactivateDriverTitle')
          : t('suspend')

  const missionPanel = (
    <div className="card">
      <div className="card-header">
        <strong>{t('tabMission')}</strong>
      </div>
      <div className="card-body">
        {mission ? (
          <div className="summary-grid">
            <div className="summary-item">
              <label>{t('orderLinkLabel')}</label>
              <strong>
                <Link to={`/orders/${mission.orderId}`}>
                  {mission.orderPublicReference}
                </Link>
              </strong>
            </div>
            <div className="summary-item">
              <label>{t('assignmentStatusLabel')}</label>
              <strong>
                <Badge tone={statusTone(mission.assignmentStatus)}>
                  {mission.assignmentStatus}
                </Badge>
              </strong>
            </div>
            <div className="summary-item">
              <label>{t('deliveryStatusLabel')}</label>
              <strong>
                <Badge tone={statusTone(mission.deliveryStatus)}>
                  {mission.deliveryStatus}
                </Badge>
              </strong>
            </div>
            <div className="summary-item">
              <label>{t('reference')}</label>
              <strong className="mono muted">{mission.assignmentId}</strong>
            </div>
          </div>
        ) : (
          <EmptyState label={t('emptyMission')} />
        )}
      </div>
    </div>
  )

  const availabilityPanel = (
    <div className="card">
      <div className="card-header">
        <strong>{t('tabAvailability')}</strong>
      </div>
      <div className="card-body stack">
        <div className="summary-grid">
          <div className="summary-item">
            <label>{t('availabilityStatusLabel')}</label>
            <strong>
              {d.availabilityStatus ? (
                <Badge tone={statusTone(d.availabilityStatus)}>
                  {d.availabilityStatus}
                </Badge>
              ) : (
                <span className="muted">—</span>
              )}
            </strong>
          </div>
          <div className="summary-item">
            <label>{t('matchingOccupancyLabel')}</label>
            <strong>{occupancyLabel(d.matchingOccupancy, t)}</strong>
          </div>
        </div>
        {d.matchingOccupancy === 'ONLINE_ON_MISSION' ? (
          <p className="muted text-metadata">{t('occupancyOnlineNotFreeHint')}</p>
        ) : null}
      </div>
    </div>
  )

  return (
    <RequirePermission anyOf={[PERMS.DRIVERS_READ, PERMS.DRIVERS_VERIFY]}>
      <EntityProfileHeader
        title={d.fullName}
        subtitle={t('driver')}
        status={d.verificationStatus}
        statusTone={statusTone(d.verificationStatus)}
        reference={d.id}
        kpis={[
          {
            label: t('rating'),
            value: '—',
            hint: t('capabilityUnavailable'),
          },
          {
            label: t('currentMission'),
            value: mission
              ? mission.deliveryStatus
              : d.matchingOccupancy === 'ONLINE_AVAILABLE'
                ? t('occupancyOnlineAvailable')
                : t('emptyMission'),
            hint: mission ? mission.orderPublicReference : undefined,
          },
          {
            label: t('confirmed'),
            value: d.approvedAt ? new Date(d.approvedAt).toLocaleDateString() : '—',
          },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/drivers')}>
              {t('back')}
            </Button>
            {hasPermission(permissions, PERMS.DRIVERS_VERIFY) &&
            d.verificationStatus === 'PENDING_REVIEW' ? (
              <>
                <Button size="sm" onClick={() => setConfirm('approve')}>
                  {t('approve')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirm('reject')}>
                  {t('reject')}
                </Button>
              </>
            ) : null}
            {hasPermission(permissions, PERMS.DRIVERS_SUSPEND) &&
            d.verificationStatus === 'APPROVED' ? (
              <Button variant="danger" size="sm" onClick={() => setConfirm('suspend')}>
                {t('suspend')}
              </Button>
            ) : null}
            {d.verificationStatus === 'SUSPENDED' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirm('reactivate-disabled')}
              >
                {t('reactivate')}
              </Button>
            ) : null}
          </>
        }
      />
      {ok ? <div className="banner banner-success">{ok}</div> : null}
      {err ? <div className="banner banner-error">{err}</div> : null}
      <EntityTabs tabs={tabs} active={tab} onChange={(next) => setTab(next as DriverTab)} />
      {tab === 'overview' ? (
        <div className="stack">
          {d.verificationStatus === 'PENDING_REVIEW' &&
          hasPermission(permissions, PERMS.DRIVERS_VERIFY) ? (
            <div className="card">
              <div className="card-header">
                <strong>{t('documentReview')}</strong>
              </div>
              <div className="card-body stack">
                <p className="muted">{t('openDocumentReviewHint')}</p>
                <div className="page-actions">
                  <Link
                    className="btn btn-primary btn-sm"
                    to={`/drivers/${id}/verification`}
                  >
                    <Icon name="description" /> {t('examineFile')}
                  </Link>
                  <Button size="sm" onClick={() => setConfirm('approve')}>
                    <Icon name="check_circle" /> {t('approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirm('reject')}
                  >
                    <Icon name="cancel" /> {t('reject')}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="card">
            <div className="card-header">
              <strong>{t('generalInfo')}</strong>
            </div>
            <div className="card-body">
              <div className="summary-grid">
                <div className="summary-item">
                  <label>{t('verification')}</label>
                  <strong>
                    <Badge tone={statusTone(d.verificationStatus)}>
                      {d.verificationStatus}
                    </Badge>
                  </strong>
                </div>
                <div className="summary-item">
                  <label>{t('vehicle')}</label>
                  <strong className="muted" title={t('capabilityUnavailable')}>
                    —
                  </strong>
                </div>
                <div className="summary-item">
                  <label>{t('zone')}</label>
                  <strong className="muted" title={t('capabilityUnavailable')}>
                    —
                  </strong>
                </div>
                <div className="summary-item">
                  <label>{t('createdAt')}</label>
                  <strong>{new Date(d.createdAt).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
          {missionPanel}
          {availabilityPanel}
          {hasPermission(permissions, PERMS.DRIVERS_VERIFY) ? (
            <p className="muted">
              <Link to="/drivers/verification">{t('verificationQueue')}</Link>
            </p>
          ) : null}
        </div>
      ) : null}
      {tab === 'mission' ? missionPanel : null}
      {tab === 'availability' ? availabilityPanel : null}
      {tab === 'ratings' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('tabRatings')}</strong>
          </div>
          <div className="card-body">
            <UnavailablePanel
              title={t('tabRatings')}
              detail={t('capabilityUnavailable')}
            />
          </div>
        </div>
      ) : null}
      {tab === 'history' ? (
        <div className="card">
          <div className="card-header">
            <strong>{t('tabHistory')}</strong>
          </div>
          <div className="card-body">
            <UnavailablePanel
              title={t('tabHistory')}
              detail={t('capabilityUnavailable')}
            />
          </div>
        </div>
      ) : null}
      {tab === 'cod' ? (
        <div className="stack">
          {!canCodRead ? (
            <ForbiddenState message={t('forbidden')} />
          ) : (
            <>
              {codSummaryQ.isLoading ? <LoadingState /> : null}
              {codSummaryQ.isError ? (
                <ErrorState onRetry={() => void codSummaryQ.refetch()} />
              ) : null}
              {codSummaryQ.data ? (
                <div className="finance-kpi-grid finance-kpi-grid--compact">
                  <article className="finance-kpi-card">
                    <span className="finance-kpi-card__label">
                      {t('codKpiOutstandingCustody')}
                    </span>
                    <strong className="finance-kpi-card__value finance-kpi-card__value--primary">
                      {formatDzdFromMinor(codSummaryQ.data.outstandingCustodyMinor)}
                    </strong>
                  </article>
                  <article className="finance-kpi-card">
                    <span className="finance-kpi-card__label">
                      {t('codKpiCollectedAmount')}
                    </span>
                    <strong className="finance-kpi-card__value">
                      {formatDzdFromMinor(codSummaryQ.data.collectedAmountMinor)}
                    </strong>
                  </article>
                  <article className="finance-kpi-card">
                    <span className="finance-kpi-card__label">
                      {t('codKpiConfirmedAllocated')}
                    </span>
                    <strong className="finance-kpi-card__value">
                      {formatDzdFromMinor(codSummaryQ.data.confirmedAllocatedMinor)}
                    </strong>
                  </article>
                </div>
              ) : null}
              <UnavailablePanel
                title={t('codDriverChart')}
                detail={t('codDriverChartUnavailable')}
              />
              <p className="muted text-metadata">{t('codRemittanceListNote')}</p>
              {codQ.isLoading ? <LoadingState /> : null}
              {codQ.isError ? <ErrorState onRetry={() => void codQ.refetch()} /> : null}
              {codQ.data?.items.length === 0 ? <EmptyState /> : null}
              {codQ.data && codQ.data.items.length > 0 ? (
                <>
                  <div className="table-wrap finance-table">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>{t('reference')}</th>
                          <th>{t('submitted')}</th>
                          <th>{t('confirmed')}</th>
                          <th>{t('status')}</th>
                          <th className="num">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codQ.data.items.map((r) => (
                          <tr key={r.id}>
                            <td className="mono">
                              <Link to={`/collections/cod/${r.id}`}>
                                {r.reference ?? `${r.id.slice(0, 8)}…`}
                              </Link>
                            </td>
                            <td className="money">
                              {formatDzdFromMinor(r.submittedAmountMinor)}
                            </td>
                            <td className="money">
                              {r.confirmedAmountMinor
                                ? formatDzdFromMinor(r.confirmedAmountMinor)
                                : '—'}
                            </td>
                            <td>
                              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                            </td>
                            <td className="num">
                              <Link
                                className="btn btn-secondary btn-sm"
                                to={`/collections/cod/${r.id}`}
                              >
                                {t('details')}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    total={codQ.data.total}
                    limit={codLimit}
                    offset={codOffset}
                    onChange={setCodOffset}
                  />
                </>
              ) : null}
              <UnavailablePanel
                title={t('internalNote')}
                detail={t('codDriverNoteUnavailable')}
              />
            </>
          )}
        </div>
      ) : null}
      {confirm ? (
        <Modal
          title={confirmTitle}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                {t('cancel')}
              </Button>
              {confirm === 'reactivate-disabled' ? (
                <Button disabled title={t('actionUnavailableHint')}>
                  {t('confirmActionDisabled')}
                </Button>
              ) : (
                <Button
                  variant={confirm === 'approve' ? 'primary' : 'danger'}
                  disabled={run.isPending}
                  onClick={() => run.mutate()}
                >
                  {t('confirm')}
                </Button>
              )}
            </>
          }
        >
          {confirm === 'reactivate-disabled' ? (
            <p>{t('actionUnavailableHint')}</p>
          ) : (
            <p>
              {confirmTitle} — {d.fullName}
            </p>
          )}
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
