import { describe, expect, it } from 'vitest'
import {
  APPLICATION_ISSUE_CODES,
  buildMerchantRejectionIssues,
  classifyPreviewHttpStatus,
  nextRotation,
  nextZoom,
  validateRejectionIssuesDraft,
} from './verificationReviewModel'

describe('verificationReviewModel — preview recovery', () => {
  it('classifies permission denial, missing file, and generic errors', () => {
    expect(classifyPreviewHttpStatus(403)).toBe('forbidden')
    expect(classifyPreviewHttpStatus(404)).toBe('unavailable')
    expect(classifyPreviewHttpStatus(500)).toBe('error')
    expect(classifyPreviewHttpStatus(418)).toBe('error')
  })

  it('bounds zoom and rotates in 90° steps', () => {
    expect(nextZoom(1, 1)).toBe(1.25)
    expect(nextZoom(0.5, -1)).toBe(0.5)
    expect(nextZoom(3, 1)).toBe(3)
    expect(nextRotation(0)).toBe(90)
    expect(nextRotation(270)).toBe(0)
  })
})

describe('verificationReviewModel — decision validation', () => {
  it('accepts PROFILE_INCOMPLETE application reject', () => {
    const issues = buildMerchantRejectionIssues({
      applicationCode: 'PROFILE_INCOMPLETE',
      applicationMessageFr: 'Dossier incomplet.',
      documents: [{ id: '1', type: 'BUSINESS_IDENTITY' }],
      localByDocId: {},
    })
    expect(issues).toEqual([
      {
        scope: 'APPLICATION',
        code: 'PROFILE_INCOMPLETE',
        messageFr: 'Dossier incomplet.',
      },
    ])
    expect(
      validateRejectionIssuesDraft(issues, ['BUSINESS_IDENTITY']),
    ).toEqual({ ok: true })
  })

  it('rejects invented application codes', () => {
    const issues = [
      {
        scope: 'APPLICATION' as const,
        code: 'INCOMPLETE_APPLICATION',
        messageFr: 'bad',
      },
    ]
    const result = validateRejectionIssuesDraft(issues, [])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/Unsupported APPLICATION/)
    }
    expect(APPLICATION_ISSUE_CODES).toContain('PROFILE_INCOMPLETE')
    expect(APPLICATION_ISSUE_CODES).not.toContain('INCOMPLETE_APPLICATION')
  })

  it('adds DOCUMENT issues only for local reject selections', () => {
    const docs = [
      { id: 'a', type: 'BUSINESS_IDENTITY' },
      { id: 'b', type: 'BUSINESS_REGISTRATION' },
    ]
    const issues = buildMerchantRejectionIssues({
      applicationCode: 'PROFILE_INCOMPLETE',
      applicationMessageFr: 'Dossier incomplet.',
      documents: docs,
      localByDocId: { a: 'reject', b: 'approve' },
      documentRejectCode: 'DOCUMENT_ILLEGIBLE',
    })
    expect(issues).toHaveLength(2)
    expect(issues[1]).toMatchObject({
      scope: 'DOCUMENT',
      code: 'DOCUMENT_ILLEGIBLE',
      documentType: 'BUSINESS_IDENTITY',
    })
    expect(validateRejectionIssuesDraft(issues, docs.map((d) => d.type))).toEqual({
      ok: true,
    })
  })

  it('fails when documentType is not in the package', () => {
    const result = validateRejectionIssuesDraft(
      [
        {
          scope: 'DOCUMENT',
          code: 'DOCUMENT_MISSING',
          messageFr: 'Manquant',
          documentType: 'UNKNOWN_TYPE',
        },
      ],
      ['BUSINESS_IDENTITY'],
    )
    expect(result.ok).toBe(false)
  })

  it('ignores request_correction for payload building', () => {
    const issues = buildMerchantRejectionIssues({
      applicationCode: 'PROFILE_INCOMPLETE',
      applicationMessageFr: 'Incomplet.',
      documents: [{ id: 'a', type: 'BUSINESS_IDENTITY' }],
      localByDocId: { a: 'request_correction' },
    })
    expect(issues).toHaveLength(1)
    expect(issues[0]?.scope).toBe('APPLICATION')
  })
})
