# Automation Research Agent Plan

This document defines the next automation phase for Metro Memory: a highly autonomous monthly research pipeline that collects, verifies, and applies safe transit updates while keeping risky changes behind human review.

## Goal

Move from:
- one sync script that produces review candidates

To:
- `collect -> claim -> verify -> policy -> apply -> audit`

The target is not "AI decides everything." The target is:
- autonomous collection
- autonomous claim generation
- autonomous verification
- policy-based auto-apply for safe changes
- human review only for uncertain or risky changes

## Current Base

Already implemented:
- scheduled metro sync workflows
- Prisma-backed review queue
- admin review panel
- candidate approval / rejection
- apply approved candidates
- branch / commit / PR creation
- revert PR creation
- staged image candidates
- richer new-line proposals

The next phase should build on the existing automation system instead of replacing it.

## Target Architecture

### 1. Collect

Per city, gather raw artifacts from:
- OSM / Overpass
- GTFS feeds when available
- official agency websites
- official PDF maps and legends
- official press releases / service notices
- trusted transit news domains
- approved image domains

Output:
- raw HTML / JSON / PDF / image artifacts
- fetch metadata
- source domain metadata
- fetched timestamps

### 2. Claim

Turn raw artifacts into structured claims.

Claim types:
- `station_opened`
- `station_closed`
- `station_renamed`
- `station_moved`
- `line_added`
- `line_removed`
- `line_extended`
- `line_shortened`
- `line_color_changed`
- `operator_changed`
- `header_metadata_changed`
- `icon_candidate`
- `image_candidate`
- `new_city_candidate`

Each claim must include:
- `citySlug`
- `claimType`
- `beforeValue`
- `afterValue`
- `sourceArtifactIds`
- `sourceUrls`
- `evidenceText`
- `claimReason`

### 3. Verify

Run a second verification pass over each claim.

Verifier responsibilities:
- cross-check claim against multiple sources
- prefer official sources
- detect contradiction
- score source quality
- score recency
- score internal consistency
- produce a confidence score

Verifier output:
- `confidence`
- `sourceTierScore`
- `evidenceCount`
- `contradictionFlag`
- `recommendedLane`
- `verificationNotes`

### 4. Policy

Assign each claim to one lane:

- `GREEN`
  Safe enough for auto-apply + auto-PR

- `YELLOW`
  Requires admin review before apply

- `RED`
  Never auto-apply

### 5. Apply

Green lane:
- convert claims into repo edits
- run validations
- create branch
- create commit
- open PR automatically

Yellow lane:
- keep in review queue

Red lane:
- keep visible for manual inspection only

### 6. Audit

Track automation quality over time:
- approval rate
- rejection rate
- revert rate
- bad-domain rate
- bad-claim-type rate
- city-specific precision

Use this to tune future thresholds.

## File / Module Layout

Refactor the current sync flow into these modules:

### `scripts/metro-sync/collect.ts`
- fetch raw artifacts
- save artifact records
- save raw snapshots to disk if needed

### `scripts/metro-sync/claim.ts`
- generate structured claims from collected artifacts
- no policy decisions here

### `scripts/metro-sync/verify.ts`
- score and verify claims
- assign confidence and contradiction metadata

### `scripts/metro-sync/policy.ts`
- assign `GREEN / YELLOW / RED`
- decide whether auto-apply is allowed

### `scripts/metro-sync/run.ts`
- orchestration only
- call collect / claim / verify / policy
- persist run summary

### `src/lib/automationApply.ts`
- apply only policy-approved safe claims

### `src/lib/automationGit.ts`
- branch / commit / PR / revert operations

### `src/lib/automationReview.ts`
- admin review actions for non-green claims

## Prisma Additions

Extend the automation schema with the following models.

### `AutomationArtifact`
- `id`
- `runId`
- `citySlug`
- `artifactType`
- `sourceUrl`
- `sourceDomain`
- `mimeType`
- `localPath`
- `contentHash`
- `fetchedAt`
- `metadataJson`

Purpose:
- persist raw collected inputs separately from claims

### `AutomationClaim`
- `id`
- `runId`
- `citySlug`
- `claimType`
- `title`
- `summary`
- `beforeValueJson`
- `afterValueJson`
- `reason`
- `confidence`
- `lane`
- `status`
- `autoApplyEligible`
- `verificationNotes`
- `createdAt`

Purpose:
- represent one structured proposed fact

### `AutomationClaimArtifact`
- `id`
- `claimId`
- `artifactId`

Purpose:
- many-to-many mapping from claims to source artifacts

### `AutomationVerification`
- `id`
- `claimId`
- `sourceTierScore`
- `evidenceCount`
- `recencyScore`
- `consistencyScore`
- `contradictionFlag`
- `verifierVersion`
- `verificationJson`
- `createdAt`

### `AutomationPolicyDecision`
- `id`
- `claimId`
- `lane`
- `decisionReason`
- `autoApplyAllowed`
- `policyVersion`
- `createdAt`

### `AutomationSourceDomain`
- `id`
- `domain`
- `tier`
- `trustScore`
- `blocked`
- `notes`
- `lastSeenAt`

Purpose:
- maintain per-domain trust and blocking rules

## Source Tiers

### Tier 1
- official agency sites
- official GTFS
- official maps
- OSM / Overpass

Rule:
- trusted for structured changes

### Tier 2
- established transit news
- Wikipedia as supporting evidence only

Rule:
- cannot be sole source for auto-apply

### Tier 3
- blogs
- repost sites
- social posts
- unofficial fan pages

Rule:
- never sole source
- usually `YELLOW` or `RED`

## Lane Rules

### Green Lane

Requirements:
- structured claim type
- no contradiction
- strong source tier
- strong confidence
- patchable repo target

Examples:
- station addition confirmed by OSM + GTFS
- station rename confirmed by official agency page + official map
- line color change confirmed by official legend/icon

### Yellow Lane

Requirements:
- plausible but not strong enough for auto-apply

Examples:
- operator change from a single official page
- header/subheader suggestion
- new line proposal with partial evidence
- image candidates
- icon candidates

### Red Lane

Requirements:
- risky, contradictory, or licensing-sensitive

Examples:
- unclear image rights
- conflicting rename reports
- random social post claims
- large hand-maintained config rewrite

## Confidence Scoring

Start with a 0 to 1 score.

Suggested weights:
- source quality: `0.35`
- evidence count: `0.20`
- recency: `0.10`
- consistency with existing repo data: `0.20`
- contradiction penalty: `-0.25`
- previous source/domain trust: `0.15`

Suggested thresholds:
- `>= 0.88` and no contradictions: candidate for `GREEN`
- `0.55 - 0.879`: `YELLOW`
- `< 0.55` or contradiction present: `RED`

Do not rely on score alone. Claim type matters.

## Claim-Type Policy Defaults

### Safe early auto-apply candidates
- `station_opened`
- `station_closed`
- `station_renamed`
- `line_color_changed`

### Review-first candidates
- `operator_changed`
- `header_metadata_changed`
- `line_added`
- `icon_candidate`
- `image_candidate`

### Never auto-apply initially
- `new_city_candidate`
- large config rewrites
- anything with unclear licensing

## Apply Safety Rules

Only auto-apply when:
- claim is `GREEN`
- city file shape is supported
- patch is deterministic
- validation passes

Validation should include:
- no duplicate station IDs
- no missing line references
- no invalid icon paths
- no JSON corruption
- no config parse failures

If validation fails:
- downgrade to review queue
- never silently write partial output

## Admin Panel Changes

Add:
- lane filter
- source-tier filter
- claim-type filter
- confidence filter
- "green auto-applied"
- "yellow pending review"
- "red blocked"
- artifact viewer for raw evidence
- verification panel with score breakdown

## Missing Pieces To Reach A True Research Agent

The current system already has:
- queueing
- follow-up research tasks
- evidence graphs
- verifier scoring
- policy lanes
- audit metrics
- auto-apply for bounded green-lane changes

The missing pieces are what turn the pipeline from "strong automation" into a true autonomous research agent.

### 1. Grounded Model Layer

Add a model-backed reasoning layer for:
- claim extraction from fetched artifacts
- contradiction analysis across multiple artifacts
- verifier reasoning over evidence already collected
- next-step planning when evidence is weak or conflicting

Rules:
- the model may only reason over fetched artifacts already stored by the system
- every model output must be strict JSON
- every claim/fact must include citations back to source URL plus exact excerpt/span metadata
- model output never bypasses policy gates or validation

Primary use cases:
- converting raw page/PDF/GTFS evidence into normalized structured claims
- explaining why two sources conflict
- proposing the next best research action when heuristics are insufficient

### 2. Browser-Capable Collector

Add a browser collector for:
- JS-heavy operator sites
- delayed rendering
- cookie banners
- file download flows
- click-through navigation
- search forms
- session-aware follow-up scraping

Likely tool:
- Playwright worker running in a controlled collector sandbox

Artifacts produced:
- rendered HTML snapshots
- DOM text snapshots
- screenshot evidence
- downloaded PDFs/files
- action trace metadata

### 3. Replanning, Not Just Retries

Current retries are mostly fixed-task reruns.

Add an explicit planner/replanner that can:
- inspect failed or weak research runs
- decide whether to retry, branch, downgrade, or stop
- create new task types dynamically
- stop once evidence is sufficient
- stop once budget is exhausted

Planner inputs:
- current claim state
- prior artifacts
- contradiction summary
- domain trust
- remaining budget
- prior failed actions

Planner outputs:
- next tasks
- stop reason
- confidence in further research value

### 4. Citation-Grade Provenance

Store exact provenance for every extracted fact.

Add:
- URL
- fetch timestamp
- DOM selector or XPath when from HTML
- PDF page number when from PDF
- OCR confidence when from OCR
- excerpt text
- excerpt hash
- byte/span offsets when possible
- artifact-local citation id

Purpose:
- make verifier output auditable
- support reviewer trust in auto-applied changes
- support replay/eval datasets
- support better contradiction resolution

### 5. Long-Term Research Memory

Add memory at multiple levels.

Per city:
- preferred official domains
- recurring aliases
- known weak sources
- common line naming patterns
- recurring false-positive patterns

Per operator/domain:
- site-specific extraction recipes
- login/cookie handling notes
- PDF/map naming patterns
- known GTFS feed locations
- known press page URLs

Per claim/entity:
- prior approved facts
- prior rejected facts
- contradiction history
- revert history

### 6. Eval Harness

Build a replay/evaluation framework that can test:
- claim extraction precision
- verifier precision/recall
- lane assignment quality
- auto-apply safety
- domain trust tuning
- planner/replanner usefulness

Sources for eval sets:
- prior approved candidates
- prior rejected candidates
- reverted automation runs
- curated hand-labeled city update scenarios

Core metrics:
- precision by claim type
- precision by city
- precision by source domain
- green-lane revert rate
- planner task resolution rate
- evidence citation completeness

## Operator-Directed Research And Manual City Updates

The autonomous system also needs an explicit operator-directed mode.

### Goals

Allow an admin to:
- ask the AI to research one city or a set of cities on demand
- run research only for chosen claim types
- ask for a manual city refresh even outside the batch schedule
- request a direct structured update pass for a chosen city
- request a review-first report before any apply step

### Required Modes

#### Targeted Research Mode
- choose one or more `citySlug`s
- optionally choose scope such as station changes, line changes, metadata, imagery
- run collect -> claim -> verify -> policy only for those cities

#### Manual Update Mode
- choose one or more `citySlug`s
- run a stronger update pass intended for operator-driven maintenance
- keep apply review-first by default unless the resulting claims independently qualify for green lane

#### Compare / Explain Mode
- ask why a city is blocked, yellow, or low-confidence
- have the agent summarize missing evidence and next actions

### Existing Partial Support

Already present under the hood:
- explicit city targeting through `METRO_SYNC_CITY_SLUGS`
- scope filtering through `METRO_SYNC_SCOPE`
- follow-up rerun controls in the admin panel

What is still missing:
- an operator-facing UI for targeted city research
- persistent job records for operator-requested runs
- natural-language requests that map to structured run parameters
- a manual city update workflow from the admin panel

### Proposed Data Model Additions

#### `AutomationAgentSession`
- `id`
- `createdBy`
- `sessionType` (`CHAT`, `TARGETED_RUN`, `MANUAL_UPDATE`)
- `status`
- `title`
- `summary`
- `contextJson`
- `createdAt`
- `updatedAt`

#### `AutomationAgentMessage`
- `id`
- `sessionId`
- `role` (`USER`, `ASSISTANT`, `SYSTEM`, `TOOL`)
- `content`
- `structuredJson`
- `citationsJson`
- `createdAt`

#### `AutomationRunRequest`
- `id`
- `sessionId`
- `requestedBy`
- `mode` (`SCHEDULED`, `TARGETED_RESEARCH`, `MANUAL_UPDATE`, `FOLLOW_UP`)
- `scope`
- `citySlugsJson`
- `claimTypesJson`
- `applyPolicy`
- `status`
- `createdRunId`
- `createdAt`

Purpose:
- tie admin chat, operator intent, and spawned automation runs together

## Admin AI Chatbot Screen

Add a dedicated AI operator console inside `/admin/automation`.

### Core UX

A chat panel where the admin can type requests like:
- "Research Tokyo and Osaka for line renames and station openings."
- "Why is Paris still yellow?"
- "Run a manual update for Santiago."
- "Only investigate operator metadata for Chicago."
- "What evidence is missing for the Berlin station rename claims?"

### Chat Responsibilities

The chat assistant should:
- interpret the operator request
- convert it into a structured run request
- show the plan before execution when the action is expensive or broad
- start the run
- stream back progress
- summarize evidence and resulting claims
- link directly to the created run / claim / candidate records

### Safety Rules

The chat assistant may:
- create targeted research jobs
- create manual update jobs
- explain current queue state
- summarize evidence
- recommend apply actions

The chat assistant may not:
- bypass policy
- auto-approve non-green claims
- auto-apply changes solely because an operator asked in chat
- mutate city files directly without creating normal run/candidate/audit records

### Initial UI Components

Add:
- chat thread panel
- structured action preview card
- city picker / autocomplete
- mode picker (`research`, `manual update`, `explain`)
- run status timeline
- evidence/citation drawer
- links to created runs and claims

### API Surface

Add routes such as:
- `POST /api/admin/automation/agent/chat`
- `GET /api/admin/automation/agent/sessions/:id`
- `POST /api/admin/automation/run-requests`
- `POST /api/admin/automation/run-requests/:id/execute`

## Revised Rollout Plan

### Phase 0
- document current capabilities vs missing pieces
- add eval dataset format
- define citation schema
- define agent session / run request schema

### Phase 1
- add citation-grade provenance fields and persistence
- upgrade artifact extraction to keep excerpt hashes, selectors, page numbers, OCR confidence
- expose raw evidence details in admin review

### Phase 2
- add grounded model layer for claim extraction and contradiction analysis
- require strict JSON outputs with citations
- keep heuristic verifier as fallback during rollout

### Phase 3
- add Playwright browser collector worker
- support rendered HTML, file downloads, screenshots, and action traces
- add per-domain collector recipes

### Phase 4
- add planner/replanner
- allow dynamic research tasks
- add stop reasons and budget-aware planning

### Phase 5
- add long-term research memory
- add city/operator/domain memory tables
- use replay/evals to tune policy thresholds

### Phase 6
- add targeted-city operator workflows
- add manual city update mode
- add AI chat screen in `/admin/automation`
- wire chat actions to structured run requests and normal automation runs

### Phase 7
- expand green-lane coverage only after replay metrics support it
- keep high-risk claim types review-first
- add canary auto-apply and rollback guardrails

## First Tasks

1. Add provenance fields for exact citations on artifacts, facts, and verifier outputs.
2. Add eval/replay fixtures from approved, rejected, and reverted automation history.
3. Introduce agent session + run request Prisma models for chat-driven and targeted runs.
4. Add operator-facing targeted-city run creation on top of existing `METRO_SYNC_CITY_SLUGS` support.
5. Add an admin AI chat screen that only emits structured run requests and explanations.
6. Add a grounded model layer for claim extraction and contradiction analysis with strict JSON citations.
7. Add a Playwright collector for JS-heavy official sites and download flows.
8. Add a planner/replanner that can branch, stop, or downgrade based on evidence and budget.
9. Expand memory and trust systems only after eval metrics exist for safe tuning.

## Success Metrics

Initial realistic target:
- 80%+ of candidate generation autonomous
- 50%+ of structured safe claims green-lane auto-applied
- <5% revert rate on green-lane PRs
- human review focused on branding, imagery, and unusual diffs
- operator-requested city research can be launched from the admin panel without touching env vars
- every model-generated fact used for review or apply has citation-grade provenance

## Non-Goals

Not a goal:
- zero-review automation for all internet-derived updates
- automatic publishing of unclear-rights images
- trusting one source because an LLM says it looks correct

The system should be highly autonomous, but still evidence-based and reversible.
