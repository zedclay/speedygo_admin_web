import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../lib/api/adminApi'
import type { AuditListItem } from '../../lib/api/types'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { EntityTabs } from '../../components/ui/EntityTabs'
import { Drawer } from '../../components/ui/Drawer'
import { Icon } from '../../components/ui/Icon'
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui/StateBoxes'
import { RequirePermission } from '../../components/ui/RequirePermission'
import { PERMS } from '../../lib/permissions'
import { useI18n } from '../../lib/i18n/I18nProvider'

type AdminTab = 'audit' | 'admins' | 'roles' | 'templates'

function JsonBlock({ value, emptyLabel }: { value: unknown; emptyLabel: string }) {
  if (value === null || value === undefined) {
    return <span className="muted">{emptyLabel}</span>
  }
  return (
    <pre className="mono audit-json" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function AdministrationPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<AdminTab>('audit')
  const [offset, setOffset] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const [selected, setSelected] = useState<AuditListItem | null>(null)
  const limit = 20

  const tabs = useMemo(
    () => [
      { id: 'audit', label: t('auditJournalTitle') },
      { id: 'admins', label: t('admins') },
      { id: 'roles', label: t('roles') },
      { id: 'templates', label: t('templates') },
    ],
    [t],
  )

  const q = useQuery({
    queryKey: ['audit', offset, actionFilter],
    queryFn: () =>
      adminApi.listAudit({
        limit,
        offset,
        action: actionFilter.trim() || undefined,
      }),
    enabled: tab === 'audit',
  })

  return (
    <RequirePermission allOf={PERMS.AUDIT_READ}>
      <PageHeader
        title={tab === 'audit' ? t('auditJournalTitle') : t('administration')}
        subtitle={tab === 'audit' ? t('auditJournalHint') : undefined}
        actions={
          tab === 'audit' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled
                title={t('auditExportUnavailable')}
              >
                <Icon name="download" /> {t('auditExportUnavailable')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
                {t('refresh')}
              </Button>
            </>
          ) : null
        }
      />
      <EntityTabs tabs={tabs} active={tab} onChange={(id) => setTab(id as AdminTab)} />
      {tab === 'audit' ? (
        <>
          <div className="toolbar filter-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
            <label className="scoped-orders-search">
              {t('search')}
              <input
                disabled
                placeholder={t('auditSearchUnavailable')}
                title={t('auditSearchUnavailable')}
              />
            </label>
            <label>
              {t('actionLabel')}
              <input
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setOffset(0)
                }}
                placeholder="support.resolve…"
                className="mono"
              />
            </label>
            <span className="muted text-metadata" title={t('auditRoleFilterUnavailable')}>
              {t('auditRoleFilterUnavailable')}
            </span>
            <span className="muted text-metadata" title={t('auditResultFilterUnavailable')}>
              {t('auditResultFilterUnavailable')}
            </span>
          </div>
          {q.isLoading ? <LoadingState /> : null}
          {q.isError ? <ErrorState onRetry={() => void q.refetch()} /> : null}
          {q.data?.items.length === 0 ? <EmptyState /> : null}
          {q.data && q.data.items.length > 0 ? (
            <>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th className="col-date">{t('createdAt')}</th>
                      <th className="col-meta">{t('administrator')}</th>
                      <th className="col-meta">{t('auditRoleColumn')}</th>
                      <th className="col-ref">{t('actionLabel')}</th>
                      <th className="col-party">{t('target')}</th>
                      <th className="col-status">{t('auditResultColumn')}</th>
                      <th className="col-meta">{t('auditContextColumn')}</th>
                      <th className="col-meta">{t('auditSessionId')}</th>
                      <th className="col-actions">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.items.map((a) => (
                      <tr key={a.id} className="row-actions-hover">
                        <td className="col-date">{new Date(a.createdAt).toLocaleString()}</td>
                        <td className="col-meta mono" title={a.adminId}>
                          {a.adminId.slice(0, 8)}…
                        </td>
                        <td className="col-meta muted" title={t('auditRoleFilterUnavailable')}>
                          —
                        </td>
                        <td className="col-ref mono">{a.action}</td>
                        <td className="col-party">
                          {a.targetType}{' '}
                          <span className="mono">{a.targetId.slice(0, 8)}…</span>
                        </td>
                        <td className="col-status muted" title={t('auditResultFilterUnavailable')}>
                          —
                        </td>
                        <td className="col-meta muted">—</td>
                        <td className="col-meta mono muted text-metadata">
                          {a.sessionId ?? t('auditNotRecorded')}
                        </td>
                        <td className="col-actions">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelected(a)}
                          >
                            {t('auditViewEvent')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={q.data.total}
                limit={limit}
                offset={offset}
                onChange={setOffset}
              />
            </>
          ) : null}
        </>
      ) : null}
      {tab === 'admins' ? (
        <div className="stack">
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn btn-primary btn-sm" to="/administration/admins">
              {t('admins')}
            </Link>
            <Link className="btn btn-secondary btn-sm" to="/administration/admins/new">
              {t('adminCreateTitle')}
            </Link>
          </div>
          <p className="muted text-metadata">{t('adminsHubHint')}</p>
        </div>
      ) : null}
      {tab === 'roles' ? (
        <div className="stack">
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <Link className="btn btn-primary btn-sm" to="/administration/roles">
              {t('rolesHubTitle')}
            </Link>
          </div>
          <p className="muted text-metadata">{t('rolesHubHint')}</p>
        </div>
      ) : null}
      {tab === 'templates' ? (
        <div className="stack">
          <div className="row">
            <Link className="btn btn-primary btn-sm" to="/administration/templates">
              {t('templatesHubTitle')}
            </Link>
          </div>
          <p className="muted text-metadata">{t('templatesInAppScopeHint')}</p>
          <p className="muted text-metadata">{t('templatesDeferredChannelsHint')} SMS, EMAIL, PUSH.</p>
        </div>
      ) : null}
      {selected ? (
        <Drawer title={t('auditEventDetail')} onClose={() => setSelected(null)}>
          <div className="audit-drawer">
            <section className="audit-drawer__section">
              <h3 className="audit-drawer__heading">{t('auditMetadataTitle')}</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>{t('actionLabel')}</label>
                  <strong className="mono">{selected.action}</strong>
                </div>
                <div className="summary-item">
                  <label>{t('target')}</label>
                  <strong>
                    {selected.targetType}{' '}
                    <span className="mono">{selected.targetId}</span>
                  </strong>
                </div>
                <div className="summary-item">
                  <label>{t('administrator')}</label>
                  <strong className="mono">{selected.adminId}</strong>
                </div>
                <div className="summary-item">
                  <label>{t('auditRoleColumn')}</label>
                  <strong className="muted">—</strong>
                </div>
                <div className="summary-item">
                  <label>{t('createdAt')}</label>
                  <strong>{new Date(selected.createdAt).toLocaleString()}</strong>
                </div>
                <div className="summary-item">
                  <label>{t('auditResultColumn')}</label>
                  <strong className="muted">—</strong>
                </div>
                <div className="summary-item">
                  <label>{t('auditIpAddress')}</label>
                  <strong className="mono">
                    {selected.ipAddress ?? t('auditNotRecorded')}
                  </strong>
                </div>
                <div className="summary-item">
                  <label>{t('auditSessionId')}</label>
                  <strong className="mono">
                    {selected.sessionId ?? t('auditNotRecorded')}
                  </strong>
                </div>
              </div>
            </section>
            <section className="audit-drawer__section">
              <h3 className="audit-drawer__heading">{t('auditDiffTitle')}</h3>
              <div className="audit-diff-grid">
                <div className="summary-item audit-diff-pane">
                  <label>{t('auditBefore')}</label>
                  <JsonBlock value={selected.beforeJson} emptyLabel={t('auditNoPayload')} />
                </div>
                <div className="summary-item audit-diff-pane">
                  <label>{t('auditAfter')}</label>
                  <JsonBlock value={selected.afterJson} emptyLabel={t('auditNoPayload')} />
                </div>
              </div>
            </section>
            <p className="muted text-metadata" style={{ marginTop: 12 }}>
              {t('auditRiskUnavailable')}
            </p>
          </div>
        </Drawer>
      ) : null}
    </RequirePermission>
  )
}
