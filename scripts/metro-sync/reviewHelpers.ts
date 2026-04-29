export type ImageSourcePolicy = {
  status: 'PREFERRED' | 'REVIEW_REQUIRED' | 'BLOCKED'
  reason: string
  hostname: string
  licenseStatus: 'CLEAR' | 'ATTRIBUTION_REQUIRED' | 'UNKNOWN' | 'PROHIBITED'
  autoApplyEligible: boolean
  policyVersion: string
}

export function normalizeHexColor(value: string | undefined | null) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const normalized = raw.startsWith('#') ? raw : `#${raw}`
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .slice(1)
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`.toUpperCase()
  }
  return null
}

function hexToRgb(hex: string): [number, number, number] | null {
  const color = normalizeHexColor(hex)
  if (!color) return null
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ]
}

function getColorDistance(left: [number, number, number], right: [number, number, number]) {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2 + (left[2] - right[2]) ** 2,
  )
}

export function resolvePreferredLineColor(extractedColor?: string | null, osmColor?: string | null) {
  const normalizedExtracted = normalizeHexColor(extractedColor)
  const normalizedOsm = normalizeHexColor(osmColor)

  if (normalizedExtracted && normalizedOsm) {
    const extractedRgb = hexToRgb(normalizedExtracted)
    const osmRgb = hexToRgb(normalizedOsm)
    if (extractedRgb && osmRgb && getColorDistance(extractedRgb, osmRgb) > 120) {
      return normalizedOsm
    }
    return normalizedExtracted
  }

  return normalizedExtracted || normalizedOsm || '#888888'
}

export function classifyImageSourcePolicy(imageUrl: string, result: any): ImageSourcePolicy {
  let hostname = 'unknown'
  try {
    hostname = new URL(imageUrl).hostname.toLowerCase()
  } catch {
    return {
      status: 'BLOCKED',
      reason: 'Image URL is invalid or missing a hostname.',
      hostname,
      licenseStatus: 'PROHIBITED',
      autoApplyEligible: false,
      policyVersion: '2026-04',
    }
  }

  const blockedHosts = [
    'pinterest.com',
    'pinimg.com',
    'instagram.com',
    'facebook.com',
    'reddit.com',
    'tiktok.com',
    'x.com',
    'twitter.com',
  ]

  if (blockedHosts.some((blockedHost) => hostname === blockedHost || hostname.endsWith(`.${blockedHost}`))) {
    return {
      status: 'BLOCKED',
      reason: 'Social, repost, or aggregation sources are not eligible for automation.',
      hostname,
      licenseStatus: 'PROHIBITED',
      autoApplyEligible: false,
      policyVersion: '2026-04',
    }
  }

  const sourceText = `${result?.title || ''} ${result?.source || ''}`.toLowerCase()
  const isOfficialLike =
    hostname.endsWith('.gov') ||
    hostname.endsWith('.go.jp') ||
    hostname.endsWith('.gouv.fr') ||
    hostname.includes('wikimedia.org') ||
    hostname.includes('wikipedia.org') ||
    /metro|transit|rail|subway|lrt|mta|tram/.test(hostname) ||
    /official|metro|transit|rail|subway|lrt|operator/.test(sourceText)

  if (isOfficialLike) {
    const attributionRequired =
      hostname.includes('wikimedia.org') || hostname.includes('wikipedia.org')

    return {
      status: 'PREFERRED',
      reason: attributionRequired
        ? 'Source looks reusable but should retain attribution metadata before publish.'
        : 'Source looks like an official or operator-adjacent domain.',
      hostname,
      licenseStatus: attributionRequired ? 'ATTRIBUTION_REQUIRED' : 'CLEAR',
      autoApplyEligible: true,
      policyVersion: '2026-04',
    }
  }

  return {
    status: 'REVIEW_REQUIRED',
    reason: 'Source requires a human license/provenance review before approval.',
    hostname,
    licenseStatus: 'UNKNOWN',
    autoApplyEligible: true,
    policyVersion: '2026-04',
  }
}
