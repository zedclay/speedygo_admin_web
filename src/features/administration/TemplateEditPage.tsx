import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import { ApiError } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingState, ErrorState } from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS, hasPermission } from '../../lib/permissions'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { useI18n } from '../../lib/i18n/I18nProvider'

/** A087e — edit Admin IN_APP notification template + live preview. */
export function TemplateEditPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const actorPerms = useSessionStore((s) => s.me?.permissions) ?? []
  const canManage = hasPermission(actorPerms, PERMS.SETTINGS_MANAGE)

  const [titleTemplate, setTitleTemplate] = useState('')
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewBody, setPreviewBody] = useState('')
  const [previewLabel, setPreviewLabel] = useState('')

  const tplQ = useQuery({
    queryKey: ['admin-notification-template', id],
    queryFn: () => adminApi.getNotificationTemplate(id),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!tplQ.data) return
    setTitleTemplate(tplQ.data.titleTemplate)
    setBodyTemplate(tplQ.data.bodyTemplate)
    setActive(tplQ.data.active)
  }, [tplQ.data])

  const preview = useMutation({
    mutationFn: () =>
      adminApi.previewNotificationTemplate(id, {
        titleTemplate,
        bodyTemplate,
      }),
    onSuccess: (data) => {
      setPreviewTitle(data.title)
      setPreviewBody(data.body)
      setPreviewLabel(data.exampleLabel)
      setFormError(null)
    },
    onError: (e) => {
      setFormError(e instanceof ApiError ? e.message : t('error'))
    },
  })

  useEffect(() => {
    if (!id || !titleTemplate || !bodyTemplate) return
    const handle = window.setTimeout(() => {
      preview.mutate()
    }, 350)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce draft only
  }, [id, titleTemplate, bodyTemplate])

  const save = useMutation({
    mutationFn: () =>
      adminApi.updateNotificationTemplate(id, {
        titleTemplate: titleTemplate.trim(),
        bodyTemplate: bodyTemplate.trim(),
        active,
      }),
    onSuccess: async (updated) => {
      setFormOk(t('templateUpdatedSuccess'))
      setFormError(null)
      setTitleTemplate(updated.titleTemplate)
      setBodyTemplate(updated.bodyTemplate)
      setActive(updated.active)
      await qc.invalidateQueries({
        queryKey: ['admin-notification-template', id],
      })
      await qc.invalidateQueries({ queryKey: ['admin-notification-templates'] })
    },
    onError: (e) => {
      setFormOk(null)
      setFormError(e instanceof ApiError ? e.message : t('error'))
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (save.isPending || !canManage) return
    if (!titleTemplate.trim() || !bodyTemplate.trim()) {
      setFormError(t('templateRequiredFields'))
      return
    }
    save.mutate()
  }

  function insertPlaceholder(key: string) {
    setBodyTemplate((prev) => `${prev}{{${key}}}`)
  }

  if (!id) {
    return <Navigate to="/administration/templates" replace />
  }

  const busy = save.isPending
  const row = tplQ.data

  return (
    <RequirePermission allOf={PERMS.SETTINGS_READ}>
      <div className="form-page">
        <nav className="breadcrumb text-metadata" aria-label="Breadcrumb">
          <Link to="/administration">{t('administration')}</Link>
          <span aria-hidden> › </span>
          <Link to="/administration/templates">{t('templates')}</Link>
          <span aria-hidden> › </span>
          <span>{row?.displayName ?? t('templateEditTitle')}</span>
        </nav>

        {tplQ.isLoading ? <LoadingState /> : null}
        {tplQ.isError ? (
          <ErrorState message={t('error')} onRetry={() => tplQ.refetch()} />
        ) : null}

        {row ? (
          <>
            <PageHeader
              title={t('templateEditTitle')}
              subtitle={t('templateEditSubtitle')}
              actions={
                <Badge tone={active ? 'success' : 'neutral'}>
                  {active ? t('active') : t('inactive')}
                </Badge>
              }
            />

            {formError ? (
              <div className="banner banner-error" role="alert">
                {formError}
              </div>
            ) : null}
            {formOk ? (
              <div className="banner banner-success" role="status">
                {formOk}
              </div>
            ) : null}

            <div className="banner banner-info">{t('templatePreviewNoSendHint')}</div>

            <form className="stack" onSubmit={onSubmit}>
              <div
                className="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
                  gap: 24,
                  alignItems: 'start',
                }}
              >
                <div className="stack">
                  <section className="card">
                    <div className="card-header">
                      <h2 className="text-section-title">
                        {t('templateInfoSection')}
                      </h2>
                    </div>
                    <div className="card-body stack">
                      <div className="field">
                        <label htmlFor="tpl-name">{t('templateName')}</label>
                        <input
                          id="tpl-name"
                          value={row.displayName}
                          readOnly
                          disabled
                        />
                      </div>
                      <div
                        className="row"
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
                      >
                        <div className="field">
                          <label>{t('templateAudience')}</label>
                          <input value={row.audience} readOnly disabled />
                        </div>
                        <div className="field">
                          <label>{t('templateLocale')}</label>
                          <input
                            value={row.locale.toUpperCase()}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="field">
                          <label>{t('templateTrigger')}</label>
                          <input value={row.trigger} readOnly disabled />
                        </div>
                        <div className="field">
                          <label>{t('templateChannel')}</label>
                          <input value={row.channel} readOnly disabled />
                        </div>
                      </div>
                      <div className="field row" style={{ gap: 12, alignItems: 'center' }}>
                        <input
                          id="tpl-active"
                          type="checkbox"
                          checked={active}
                          disabled={!canManage || busy}
                          onChange={(e) => setActive(e.target.checked)}
                        />
                        <label htmlFor="tpl-active">
                          <strong>{t('templateActiveToggle')}</strong>
                          <div className="text-metadata">
                            {t('templateActiveHint')}
                          </div>
                        </label>
                      </div>
                      {row.locale === 'ar' ? (
                        <div className="banner banner-info">
                          {t('templateArEmitHint')}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="card">
                    <div className="card-header">
                      <h2 className="text-section-title">
                        {t('templateContentSection')}
                      </h2>
                    </div>
                    <div className="card-body stack">
                      <div className="field">
                        <label>{t('templatePlaceholders')}</label>
                        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                          {row.placeholders.map((key) => (
                            <button
                              key={key}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={!canManage || busy}
                              onClick={() => insertPlaceholder(key)}
                            >
                              {`{{${key}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor="tpl-title">{t('templateTitle')}</label>
                        <input
                          id="tpl-title"
                          value={titleTemplate}
                          disabled={!canManage || busy}
                          onChange={(e) => setTitleTemplate(e.target.value)}
                          maxLength={500}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="tpl-body">{t('templateBody')}</label>
                        <textarea
                          id="tpl-body"
                          rows={6}
                          value={bodyTemplate}
                          disabled={!canManage || busy}
                          onChange={(e) => setBodyTemplate(e.target.value)}
                          maxLength={4000}
                        />
                        <p className="text-metadata">
                          {t('templatePlaceholderHint')}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="card">
                  <div className="card-header">
                    <h2 className="text-section-title">{t('templatePreview')}</h2>
                  </div>
                  <div className="card-body stack">
                    <div
                      className="stack"
                      style={{
                        border: '1px solid var(--border, #c3c6d4)',
                        borderRadius: 12,
                        padding: 16,
                        background: 'var(--surface, #fff)',
                      }}
                    >
                      <div className="text-metadata">
                        SPEEDYGO · {t('templatePreviewNow')}
                      </div>
                      <strong>{previewTitle || '—'}</strong>
                      <p style={{ margin: 0 }}>{previewBody || '—'}</p>
                    </div>
                    {previewLabel ? (
                      <p className="text-metadata">{previewLabel}</p>
                    ) : null}
                    <p className="text-metadata">{t('templatePreviewExampleHint')}</p>
                  </div>
                </section>
              </div>

              <div className="form-actions sticky-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => navigate('/administration/templates')}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={!canManage || busy}
                  title={
                    canManage ? undefined : t('templateManagePermRequired')
                  }
                >
                  {busy ? t('saving') : t('save')}
                </Button>
              </div>
            </form>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}
