/**
 * Local review selections vs persisted document status, and merchant reject
 * payloads aligned with backend allowlists (PROFILE_INCOMPLETE, etc.).
 */

export const APPLICATION_ISSUE_CODES = [
  'PROFILE_INCOMPLETE',
  'IDENTITY_MISMATCH',
  'OTHER_APPLICATION',
] as const

export const DOCUMENT_ISSUE_CODES = [
  'DOCUMENT_MISSING',
  'DOCUMENT_ILLEGIBLE',
  'DOCUMENT_EXPIRED',
  'DOCUMENT_MISMATCH',
  'OTHER_DOCUMENT',
] as const

export type ApplicationIssueCode = (typeof APPLICATION_ISSUE_CODES)[number]
export type DocumentIssueCode = (typeof DOCUMENT_ISSUE_CODES)[number]

/** Local-only per-document selection — not persisted until package mutate. */
export type LocalDocDecision = 'approve' | 'reject' | 'request_correction'

export type RejectionIssueDraft = {
  scope: 'APPLICATION' | 'DOCUMENT'
  code: string
  messageFr: string
  documentType?: string
}

export const MESSAGE_FR_MAX = 500

export function isApplicationIssueCode(code: string): code is ApplicationIssueCode {
  return (APPLICATION_ISSUE_CODES as readonly string[]).includes(code)
}

export function isDocumentIssueCode(code: string): code is DocumentIssueCode {
  return (DOCUMENT_ISSUE_CODES as readonly string[]).includes(code)
}

export function clampZoom(scale: number): number {
  return Math.min(3, Math.max(0.5, Math.round(scale * 100) / 100))
}

export function nextZoom(scale: number, direction: 1 | -1): number {
  return clampZoom(scale + direction * 0.25)
}

export function nextRotation(degrees: number): number {
  return (degrees + 90) % 360
}

/** Map fetch failures to preview recovery UI states (no invented content). */
export function classifyPreviewHttpStatus(
  status: number,
): 'forbidden' | 'unavailable' | 'error' {
  if (status === 403) return 'forbidden'
  if (status === 404) return 'unavailable'
  return 'error'
}

export function validateRejectionIssuesDraft(
  issues: RejectionIssueDraft[],
  existingDocumentTypes: readonly string[],
): { ok: true } | { ok: false; message: string } {
  if (issues.length === 0) {
    return { ok: false, message: 'At least one rejection issue is required' }
  }
  if (issues.length > 20) {
    return { ok: false, message: 'At most 20 rejection issues are allowed' }
  }
  for (const issue of issues) {
    const messageFr = issue.messageFr.trim()
    if (messageFr.length === 0 || messageFr.length > MESSAGE_FR_MAX) {
      return {
        ok: false,
        message: `messageFr must be 1-${MESSAGE_FR_MAX} characters`,
      }
    }
    if (issue.scope === 'APPLICATION') {
      if (!isApplicationIssueCode(issue.code)) {
        return { ok: false, message: 'Unsupported APPLICATION issue code' }
      }
      if (issue.documentType) {
        return {
          ok: false,
          message: 'APPLICATION issues must not carry a documentType',
        }
      }
      continue
    }
    if (issue.scope === 'DOCUMENT') {
      if (!isDocumentIssueCode(issue.code)) {
        return { ok: false, message: 'Unsupported DOCUMENT issue code' }
      }
      const docType = issue.documentType?.trim() ?? ''
      if (!docType) {
        return { ok: false, message: 'DOCUMENT issues require documentType' }
      }
      if (!existingDocumentTypes.includes(docType)) {
        return {
          ok: false,
          message: 'DOCUMENT issue documentType must match a submitted document',
        }
      }
      continue
    }
    return { ok: false, message: 'Unsupported issue scope' }
  }
  return { ok: true }
}

/**
 * Build merchant reject payload from package-level reason + optional per-doc
 * local rejects. `request_correction` never produces issues (capability blocked).
 */
export function buildMerchantRejectionIssues(input: {
  applicationCode: string
  applicationMessageFr: string
  documents: Array<{ id: string; type: string }>
  localByDocId: Record<string, LocalDocDecision | undefined>
  documentRejectCode?: string
  documentRejectMessageFr?: string
}): RejectionIssueDraft[] {
  const issues: RejectionIssueDraft[] = []
  const appMsg = input.applicationMessageFr.trim()
  if (input.applicationCode.trim() && appMsg) {
    issues.push({
      scope: 'APPLICATION',
      code: input.applicationCode.trim(),
      messageFr: appMsg,
    })
  }
  const docCode = (input.documentRejectCode ?? 'DOCUMENT_ILLEGIBLE').trim()
  const docMsg =
    (input.documentRejectMessageFr ?? 'Document illisible ou incomplet.').trim()
  for (const doc of input.documents) {
    if (input.localByDocId[doc.id] !== 'reject') continue
    issues.push({
      scope: 'DOCUMENT',
      code: docCode,
      messageFr: docMsg,
      documentType: doc.type,
    })
  }
  return issues
}

export function localDecisionLabelKey(
  decision: LocalDocDecision | undefined,
): 'localDecisionApprove' | 'localDecisionReject' | 'localDecisionCorrection' | 'localDecisionNone' {
  if (decision === 'approve') return 'localDecisionApprove'
  if (decision === 'reject') return 'localDecisionReject'
  if (decision === 'request_correction') return 'localDecisionCorrection'
  return 'localDecisionNone'
}
