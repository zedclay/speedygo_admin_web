import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useState } from 'react'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Modal } from '../../components/ui/Modal'
import { DocumentPreviewPanel } from '../../components/verification/DocumentPreviewPanel'
import { DocumentReviewControls } from '../../components/verification/DocumentReviewControls'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import type { LocalDocDecision } from '../verification/verificationReviewModel'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

type Doc = { id: string; type: string; status: string; expiryDate?: string | null }

export function DriverVerificationReviewPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [localByDocId, setLocalByDocId] = useState<
    Record<string, LocalDocDecision | undefined>
  >({})

  const q = useQuery({
    queryKey: ['driver', id, 'verification'],
    queryFn: () => adminApi.getDriverVerification(id),
    enabled: Boolean(id),
  })

  const approve = useMutation({
    mutationFn: () => adminApi.approveDriver(id),
    onSuccess: async () => {
      setApproveOpen(false)
      setFlash(t('success'))
      await qc.invalidateQueries({ queryKey: ['drivers'] })
      await qc.invalidateQueries({ queryKey: ['driver', id] })
      navigate(`/drivers/${id}`)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('error')),
  })

  const reject = useMutation({
    mutationFn: () => adminApi.rejectDriver(id),
    onSuccess: async () => {
      setRejectOpen(false)
      setFlash(t('success'))
      await qc.invalidateQueries({ queryKey: ['drivers'] })
      navigate('/drivers/verification')
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('error')),
  })

  const fetchContent = useCallback(
    (documentId: string) => adminApi.downloadDriverDocument(id, documentId),
    [id],
  )

  async function downloadDoc(documentId: string) {
    try {
      const res = await adminApi.downloadDriverDocument(id, documentId)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `driver-${documentId}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error'))
    }
  }

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />

  const pkg = q.data
  const docs = (pkg.documents ?? []) as Doc[]
  const activeId = selectedDocId ?? docs[0]?.id ?? null
  const active = docs.find((d) => d.id === activeId) ?? null
  const vehicleLabel = pkg.vehicle
    ? `${pkg.vehicle.type} · ${pkg.vehicle.plateNumber}`
    : '—'
  const reviewedCount = docs.filter((d) => localByDocId[d.id]).length

  return (
    <RequirePermission allOf={PERMS.DRIVERS_VERIFY}>
      <nav className="breadcrumb order-breadcrumb" aria-label="breadcrumb">
        <Link to="/drivers">{t('drivers')}</Link>
        <Icon name="chevron_right" />
        <Link to="/drivers/verification">{t('verificationQueue')}</Link>
        <Icon name="chevron_right" />
        <span className="order-breadcrumb__current" title={pkg.fullName}>
          {pkg.fullName}
        </span>
      </nav>

      <div className="verify-page-header">
        <div>
          <h1 className="text-page-title">{t('documentReview')}</h1>
          <p className="muted" title={id}>
            {pkg.fullName}
            <span className="mono"> · {id.slice(0, 8)}…</span>
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={statusTone(pkg.verificationStatus)}>
            {pkg.verificationStatus}
          </Badge>
        </div>
      </div>

      {flash ? <div className="banner banner-success">{flash}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <div className="verify-review-layout">
        <div className="stack">
          <div className="verify-doc-tabs">
            {docs.length === 0 ? (
              <p className="muted">{t('documents')} —</p>
            ) : (
              docs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`verify-doc-tab${activeId === d.id ? ' active' : ''}`}
                  onClick={() => setSelectedDocId(d.id)}
                >
                  <strong>{d.type}</strong>
                  <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                  {localByDocId[d.id] ? (
                    <span className="verify-doc-tab__local muted text-metadata">
                      {t(
                        localByDocId[d.id] === 'approve'
                          ? 'localDecisionApprove'
                          : localByDocId[d.id] === 'reject'
                            ? 'localDecisionReject'
                            : 'localDecisionCorrection',
                      )}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="card verify-viewer">
            <div className="card-header verify-viewer__toolbar">
              <strong>{active ? active.type : t('documents')}</strong>
              {active ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void downloadDoc(active.id)}
                >
                  <Icon name="download" /> {t('downloadDocument')}
                </Button>
              ) : null}
            </div>
            <div className="card-body verify-viewer__canvas">
              <DocumentPreviewPanel
                documentId={active?.id ?? null}
                fetchContent={fetchContent}
                onDownload={
                  active ? () => void downloadDoc(active.id) : undefined
                }
              />
            </div>
          </div>
        </div>

        <aside className="stack verify-decision">
          <div className="card">
            <div className="card-header">
              <strong>
                <Icon name="description" /> {t('documentDetails')}
              </strong>
            </div>
            <div className="card-body stack">
              <div className="summary-item">
                <label>{t('type')}</label>
                <strong>{active?.type ?? '—'}</strong>
              </div>
              <div className="summary-item">
                <label>{t('status')}</label>
                <strong>
                  {active ? (
                    <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                  ) : (
                    '—'
                  )}
                </strong>
              </div>
              <div className="summary-item">
                <label>{t('period')}</label>
                <strong>{active?.expiryDate ?? '—'}</strong>
              </div>
              <div className="summary-item">
                <label>{t('vehicle')}</label>
                <strong>{vehicleLabel}</strong>
              </div>
            </div>
          </div>

          <UnavailablePanel
            title={t('extractedData')}
            detail={t('ocrUnavailable')}
          />

          {active ? (
            <div className="card">
              <div className="card-header">
                <strong>
                  <Icon name="gavel" /> {t('auditDecision')}
                </strong>
              </div>
              <div className="card-body">
                <DocumentReviewControls
                  documentId={active.id}
                  persistedStatus={active.status}
                  value={localByDocId[active.id]}
                  onChange={(next) =>
                    setLocalByDocId((prev) => ({ ...prev, [active.id]: next }))
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-header">
              <strong>
                <Icon name="checklist" /> {t('reviewProgress')}
              </strong>
            </div>
            <div className="card-body stack">
              <p className="muted text-metadata">
                {t('localReviewProgressHint')} ({reviewedCount}/{docs.length})
              </p>
              {docs.map((d) => (
                <div key={d.id} className="verify-progress-row">
                  <Icon
                    name={
                      localByDocId[d.id] === 'approve'
                        ? 'check_circle'
                        : localByDocId[d.id] === 'reject'
                          ? 'cancel'
                          : 'radio_button_unchecked'
                    }
                  />
                  <span>{d.type}</span>
                  <span className="muted text-metadata mono">{d.status}</span>
                </div>
              ))}
              {docs.length === 0 ? <p className="muted">—</p> : null}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <strong>
                <Icon name="gavel" /> {t('packageDecision')}
              </strong>
            </div>
            <div className="card-body stack">
              <p className="muted text-metadata">{t('auditDecisionHint')}</p>
              <p className="muted text-metadata">{t('driverRejectNoIssuesHint')}</p>
              <Button
                disabled={approve.isPending || reject.isPending}
                onClick={() => {
                  setError(null)
                  setApproveOpen(true)
                }}
              >
                <Icon name="check_circle" /> {t('approve')}
              </Button>
              <Button
                variant="danger"
                disabled={approve.isPending || reject.isPending}
                onClick={() => {
                  setError(null)
                  setRejectOpen(true)
                }}
              >
                <Icon name="cancel" /> {t('reject')}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <div className="verify-sticky-footer">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          {t('cancel')}
        </Button>
        <div className="page-actions">
          <Button variant="secondary" disabled title={t('actionUnavailableHint')}>
            <Icon name="info" /> {t('requestComplements')}
          </Button>
          <Button
            disabled={approve.isPending || reject.isPending}
            onClick={() => {
              setError(null)
              setApproveOpen(true)
            }}
          >
            <Icon name="check_circle" /> {t('validateDecision')}
          </Button>
        </div>
      </div>

      <p className="muted">
        <Link to={`/drivers/${id}`}>{t('driver')}</Link>
      </p>

      {approveOpen ? (
        <Modal
          title={t('approve')}
          onClose={() => !approve.isPending && setApproveOpen(false)}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={approve.isPending}
                onClick={() => setApproveOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button disabled={approve.isPending} onClick={() => approve.mutate()}>
                {approve.isPending ? t('busy') : t('confirm')}
              </Button>
            </>
          }
        >
          <p>
            {t('approve')} — {pkg.fullName}
          </p>
          <p className="muted text-metadata">{t('localSelectionsNotPersisted')}</p>
        </Modal>
      ) : null}
      {rejectOpen ? (
        <Modal
          title={t('reject')}
          onClose={() => !reject.isPending && setRejectOpen(false)}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={reject.isPending}
                onClick={() => setRejectOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={reject.isPending}
                onClick={() => reject.mutate()}
              >
                {reject.isPending ? t('busy') : t('confirm')}
              </Button>
            </>
          }
        >
          <p>
            {t('reject')} — {pkg.fullName}
          </p>
          <p className="muted text-metadata">{t('driverRejectNoIssuesHint')}</p>
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
