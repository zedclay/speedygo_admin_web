import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/api/types'
import { useI18n } from '../../lib/i18n/I18nProvider'
import {
  nextRotation,
  nextZoom,
} from '../../features/verification/verificationReviewModel'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LoadingState } from '../ui/StateBoxes'
import { UnavailablePanel } from '../ui/UnavailablePanel'

type PreviewOk =
  | { kind: 'image'; url: string; contentType: string }
  | { kind: 'pdf'; url: string; contentType: string }
  | { kind: 'unsupported'; url: string; contentType: string }

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | PreviewOk
  | { kind: 'forbidden'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

function isPdfType(contentType: string): boolean {
  return contentType === 'application/pdf' || contentType.includes('pdf')
}

export function DocumentPreviewPanel({
  documentId,
  fetchContent,
  onDownload,
}: {
  documentId: string | null
  fetchContent: (documentId: string) => Promise<Response>
  onDownload?: () => void
}) {
  const { t } = useI18n()
  const [state, setState] = useState<PreviewState>({ kind: 'idle' })
  const [retryKey, setRetryKey] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    setZoom(1)
    setRotation(0)
  }, [documentId])

  useEffect(() => {
    if (!documentId) {
      setState({ kind: 'idle' })
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    setState({ kind: 'loading' })

    void (async () => {
      try {
        const res = await fetchContent(documentId)
        const blob = await res.blob()
        if (cancelled) return
        const contentType =
          res.headers.get('content-type')?.split(';')[0]?.trim() ||
          blob.type ||
          'application/octet-stream'
        objectUrl = URL.createObjectURL(blob)
        if (isImageType(contentType)) {
          setState({ kind: 'image', url: objectUrl, contentType })
        } else if (isPdfType(contentType)) {
          setState({ kind: 'pdf', url: objectUrl, contentType })
        } else {
          setState({ kind: 'unsupported', url: objectUrl, contentType })
        }
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError) {
          if (e.status === 403) {
            setState({ kind: 'forbidden', message: e.message })
            return
          }
          if (e.status === 404) {
            setState({
              kind: 'unavailable',
              message: e.message || t('documentBytesUnavailable'),
            })
            return
          }
          setState({ kind: 'error', message: e.message })
          return
        }
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : t('error'),
        })
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId, fetchContent, retryKey, t])

  if (!documentId || state.kind === 'idle') {
    return (
      <UnavailablePanel
        title={t('documentPreview')}
        detail={t('documentPreviewNoSelection')}
      />
    )
  }

  if (state.kind === 'loading') {
    return (
      <div className="verify-preview verify-preview--loading">
        <LoadingState />
        <p className="muted text-metadata">{t('documentPreviewLoading')}</p>
      </div>
    )
  }

  if (state.kind === 'forbidden') {
    return (
      <UnavailablePanel title={t('documentPreviewDenied')} detail={state.message}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRetryKey((k) => k + 1)}
        >
          <Icon name="refresh" /> {t('retry')}
        </Button>
      </UnavailablePanel>
    )
  }

  if (state.kind === 'unavailable') {
    return (
      <UnavailablePanel title={t('documentPreview')} detail={state.message}>
        {onDownload ? (
          <Button size="sm" variant="secondary" onClick={onDownload}>
            <Icon name="download" /> {t('downloadDocument')}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRetryKey((k) => k + 1)}
        >
          <Icon name="refresh" /> {t('retry')}
        </Button>
      </UnavailablePanel>
    )
  }

  if (state.kind === 'error') {
    return (
      <UnavailablePanel title={t('documentPreviewFailed')} detail={state.message}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRetryKey((k) => k + 1)}
        >
          <Icon name="refresh" /> {t('retry')}
        </Button>
        {onDownload ? (
          <Button size="sm" variant="secondary" onClick={onDownload}>
            <Icon name="download" /> {t('downloadDocument')}
          </Button>
        ) : null}
      </UnavailablePanel>
    )
  }

  if (state.kind === 'unsupported') {
    return (
      <UnavailablePanel
        title={t('documentPreview')}
        detail={t('documentPreviewUnsupported')}
      >
        <p className="muted text-metadata mono">{state.contentType}</p>
        {onDownload ? (
          <Button size="sm" variant="secondary" onClick={onDownload}>
            <Icon name="download" /> {t('downloadDocument')}
          </Button>
        ) : null}
      </UnavailablePanel>
    )
  }

  if (state.kind === 'image') {
    return (
      <div className="verify-preview verify-preview--image">
        <div className="verify-preview__toolbar" role="toolbar" aria-label={t('previewControls')}>
          <Button
            size="sm"
            variant="secondary"
            title={t('zoomOut')}
            aria-label={t('zoomOut')}
            disabled={zoom <= 0.5}
            onClick={() => setZoom((z) => nextZoom(z, -1))}
          >
            <Icon name="zoom_out" />
          </Button>
          <span className="verify-preview__zoom-label mono">{Math.round(zoom * 100)}%</span>
          <Button
            size="sm"
            variant="secondary"
            title={t('zoomIn')}
            aria-label={t('zoomIn')}
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => nextZoom(z, 1))}
          >
            <Icon name="zoom_in" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            title={t('rotatePreview')}
            aria-label={t('rotatePreview')}
            onClick={() => setRotation((r) => nextRotation(r))}
          >
            <Icon name="rotate_right" />
          </Button>
        </div>
        <div className="verify-preview__stage">
          <img
            src={state.url}
            alt={t('documentPreview')}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="verify-preview verify-preview--pdf">
      <p className="muted text-metadata verify-preview__pdf-hint">
        {t('pdfPreviewHint')}
      </p>
      <iframe title={t('documentPreview')} src={state.url} />
    </div>
  )
}
