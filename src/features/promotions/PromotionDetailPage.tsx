import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge, statusTone } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { UnavailablePanel } from '../../components/ui/UnavailablePanel'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { Icon } from '../../components/ui/Icon'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  formatPromoValue,
  promoLifecycle,
  promoLifecycleLabelKey,
  promoTypeLabelKey,
} from './promotionFormat'

export function PromotionDetailPage() {
  const { id = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const permissions = useSessionStore((s) => s.me?.permissions)
  const canManage = hasPermission(permissions, PERMS.PROMOTIONS_MANAGE)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [label, setLabel] = useState('')

  const q = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => adminApi.getPromotion(id),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (q.data) setLabel(q.data.customerLabel ?? '')
  }, [q.data])

  const run = useMutation({
    mutationFn: async (action: string) => {
      if (action === 'activate') return adminApi.activatePromotion(id)
      if (action === 'deactivate') return adminApi.deactivatePromotion(id)
      if (action === 'publish')
        return adminApi.publishPromotionDiscovery(id, label || undefined)
      if (action === 'hide') return adminApi.hidePromotionDiscovery(id)
      if (action === 'presentation')
        return adminApi.updatePromotionPresentation(id, label || null)
      throw new Error('noop')
    },
    onSuccess: async () => {
      setOk(t('success'))
      setErr(null)
      await qc.invalidateQueries({ queryKey: ['promotion', id] })
      await qc.invalidateQueries({ queryKey: ['promotions'] })
    },
    onError: (e) => {
      setOk(null)
      setErr(e instanceof ApiError ? e.message : t('error'))
    },
  })

  if (q.isLoading) return <LoadingState />
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />
  const p = q.data
  const life = promoLifecycle(p)

  return (
    <RequirePermission allOf={PERMS.PROMOTIONS_READ}>
      <PageHeader
        title={t('promoDetailTitle')}
        subtitle={p.id}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/promotions')}>
              <Icon name="arrow_back" /> {t('back')}
            </Button>
            {canManage && !p.active ? (
              <Button disabled={run.isPending} onClick={() => run.mutate('activate')}>
                {t('activate')}
              </Button>
            ) : null}
            {canManage && p.active ? (
              <Button
                variant="danger"
                disabled={run.isPending}
                onClick={() => run.mutate('deactivate')}
              >
                {t('deactivate')}
              </Button>
            ) : null}
          </>
        }
      />
      {ok ? <div className="banner banner-success">{ok}</div> : null}
      {err ? <div className="banner banner-error">{err}</div> : null}

      <div className="card card-body promo-detail-hero">
        <div>
          <div className="promo-detail-code">{p.code}</div>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {p.customerLabel ?? '—'}
          </p>
          <div className="entity-meta" style={{ marginTop: 8 }}>
            <Badge tone={statusTone(life === 'active' ? 'ACTIVE' : life.toUpperCase())}>
              {t(promoLifecycleLabelKey(life))}
            </Badge>
            <Badge tone={p.customerDiscoverable ? 'info' : 'neutral'}>
              {p.customerDiscoverable ? t('discoverable') : t('no')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="card card-body" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t('type')}</h3>
        <div className="promo-economics-ro">
          <div className="summary-item">
            <label>{t('type')}</label>
            <strong>{t(promoTypeLabelKey(p.type))}</strong>
            <div className="muted text-metadata mono">{p.type}</div>
          </div>
          <div className="summary-item">
            <label>{t('value')}</label>
            <strong>{formatPromoValue(p.type, p.value)}</strong>
          </div>
          <div className="summary-item">
            <label>{t('periodStart')}</label>
            <strong>{new Date(p.startsAt).toLocaleString()}</strong>
          </div>
          <div className="summary-item">
            <label>{t('periodEnd')}</label>
            <strong>{new Date(p.endsAt).toLocaleString()}</strong>
          </div>
        </div>
        <p className="promo-unsupported-note" style={{ marginTop: 12 }}>
          {t('promoEconomicsReadonly')}
        </p>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        <UnavailablePanel title={t('promoEligibilityUnavailable')} />
        <UnavailablePanel title={t('promoUsageLimitsUnavailable')} />
      </div>

      {canManage ? (
        <div className="card card-body stack" style={{ marginTop: 16 }}>
          <h3 style={{ margin: 0 }}>{t('promoEditPresentation')}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {t('presentationHint')}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {t('promoLifecycleHint')}
          </p>
          <label>
            {t('customerLabel')}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={64}
            />
          </label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button disabled={run.isPending} onClick={() => run.mutate('presentation')}>
              {t('updateCustomerLabel')}
            </Button>
            <Button disabled={run.isPending} onClick={() => run.mutate('publish')}>
              {t('publishDiscovery')}
            </Button>
            <Button
              variant="secondary"
              disabled={run.isPending}
              onClick={() => run.mutate('hide')}
            >
              {t('hideDiscovery')}
            </Button>
          </div>
        </div>
      ) : null}
    </RequirePermission>
  )
}
