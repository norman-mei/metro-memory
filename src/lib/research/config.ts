// ============================================================================
// Research agent configuration — EDIT THIS FILE to control what the AI produces.
// ============================================================================
//
// Which claim types the agent is allowed to file into your review queue.
// Comment a line out to disable it: the AI is told not to look for that type,
// and any such claim it produces anyway is dropped before it reaches the queue.

import type { ResearchClaimType } from './types'

export const ENABLED_CLAIM_TYPES: ResearchClaimType[] = [
  'station_opened',
  'station_closed',
  'station_renamed',
  'station_moved',
  'line_added',
  'line_removed',
  'line_extended',
  'line_shortened',
  'line_color_changed',

  // --- Disabled by default. Uncomment any you DO want to see: ---
  // 'operator_changed',        // system operator / who-runs-it changes
  // 'header_metadata_changed', // header text, ridership blurbs, metadata tweaks
  // 'icon_candidate',          // line-icon opportunities
  // 'image_candidate',         // photo / social-preview image opportunities
  // 'new_city_candidate',      // suggestions to add a brand-new city
]

export const ENABLED_CLAIM_TYPE_SET: ReadonlySet<string> = new Set(ENABLED_CLAIM_TYPES)
