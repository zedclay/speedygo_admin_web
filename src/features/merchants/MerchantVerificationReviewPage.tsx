import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useMemo, useState } from 'react'
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
import {
  APPLICATION_ISSUE_CODES,
  DOCUMENT_ISSUE_CODES,
  buildMerchantRejectionIssues,
  validateRejectionIssuesDraft,
  type LocalDocDecision,
} from '../verification/verificationReviewModel'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

type Doc = { id: string; type: string; status: string; expiryDate?: string | null }

export function MerchantVerificationReviewPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [messageFr, setMessageFr] = useState('Dossier incomplet ou illisible.')
  const [code, setCode] = useState<string>('PROFILE_INCOMPLETE')
  const [docRejectCode, setDocRejectCode] = useState<string>('DOCUMENT_ILLEGIBLE')
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [localByDocId, setLocalByDocId] = useState<
    Record<string, LocalDocDecision | undefined>
  >({})

  const q = useQuery({
    queryKey: ['merchant', id, 'verification'],
    queryFn: () => adminApi.getMerchantVerification(id),
    enabled: Boolean(id),
  })

  const docs = useMemo(
    () => ((q.data as { documents?: Doc[] } | undefined)?.documents ?? []) as Doc[],
    [q.data],
  )

  const rejectIssues = useMemo(
    () =>
      buildMerchantRejectionIssues({
        applicationCode: code,
        applicationMessageFr: messageFr,
        documents: docs,
        localByDocId,
        documentRejectCode: docRejectCode,
        documentRejectMessageFr: 'Document illisible ou incomplet.',
      }),
    [code, messageFr, docs, localByDocId, docRejectCode],
  )

  const rejectValidation = useMemo(
    () => validateRejectionIssuesDraft(
      rejectIssues,
      docs.map((d) => d.type),
    ),
    [rejectIssues, docs],
  )

  const approve = useMutation({
    mutationFn: () => adminApi.approveMerchant(id),
    onSuccess: async () => {
      setApproveOpen(false)
      setFlash(t('success'))
      await qc.invalidateQueries({ queryKey: ['merchants'] })
      navigate(`/merchants/${id}`)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('error')),
  })

  const reject = useMutation({
    mutationFn: () => adminApi.rejectMerchant(id, rejectIssues),
    onSuccess: async () => {
      setRejectOpen(false)
      setFlash(t('success'))
      await qc.invalidateQueries({ queryKey: ['merchants'] })
      navigate('/merchants/verification')
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('error')),
  })

  const fetchContent = useCallback(
    (documentId: string) => adminApi.downloadMerchantDocument(id, documentId),
    [id],
  )

  async function downloadDoc(documentId: string) {
    try {
      const res = await adminApi.downloadMerchantDocument(id, documentId)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merchant-${documentId}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error'))
    }
  }

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />

  const pkg = q.data as {
    status: string
    documents?: Doc[]
  }
  const activeId = selectedDocId ?? docs[0]?.id ?? null
  const active = docs.find((d) => d.id === activeId) ?? null
  const reviewedCount = docs.filter((d) => localByDocId[d.id]).length
  const rejectValid = rejectValidation.ok

  return (
    <RequirePermission allOf={PERMS.MERCHANTS_VERIFY}>
      <nav className="breadcrumb order-breadcrumb" aria-label="breadcrumb">
        <Link to="/merchants">{t('merchants')}</Link>
        <Icon name="chevron_right" />
        <Link to="/merchants/verification">{t('verificationQueue')}</Link>
        <Icon name="chevron_right" />
        <span className="order-breadcrumb__current" title={id}>
          {id.slice(0, 8)}…
        </span>
      </nav>

      <div className="verify-page-header">
        <div>
          <h1 className="text-page-title">{t('documentReview')}</h1>
          <p className="muted mono" title={id}>
            {id}
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={statusTone(pkg.status)}>{pkg.status}</Badge>
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
        <Link to={`/merchants/${id}`}>{t('merchant')}</Link>
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
          <p>{t('approve')}</p>
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
                disabled={reject.isPending || !rejectValid}
                title={!rejectValid ? t('rejectValidationHint') : undefined}
                onClick={() => reject.mutate()}
              >
                {reject.isPending ? t('busy') : t('confirm')}
              </Button>
            </>
          }
        >
          <div className="field">
            <label>{t('applicationRejectCode')}</label>
            <select value={code} onChange={(e) => setCode(e.target.value)}>
              {APPLICATION_ISSUE_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t('label')}</label>
            <textarea
              value={messageFr}
              onChange={(e) => setMessageFr(e.target.value)}
            />
          </div>
          {docs.some((d) => localByDocId[d.id] === 'reject') ? (
            <div className="field">
              <label>{t('documentRejectCode')}</label>
              <select
                value={docRejectCode}
                onChange={(e) => setDocRejectCode(e.target.value)}
              >
                {DOCUMENT_ISSUE_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <p className="muted text-metadata mono">
            {t('rejectPayloadPreview')}: {JSON.stringify(rejectIssues)}
          </p>
          {!rejectValid ? (
            <p className="muted text-metadata">
              {t('rejectValidationHint')}
              {!rejectValidation.ok ? ` — ${rejectValidation.message}` : ''}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </RequirePermission>
  )
}
