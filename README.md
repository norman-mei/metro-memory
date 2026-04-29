# Metro Memory 🚇
[Metro Memory is a modified fork of the original game by Benjamin TD](https://github.com/benjamintd/metro-memory.com)

Metro Memory is a map-based station memory game with hundreds of playable rail systems.

## Overview 🧠
- 🎯 Guess stations from memory on interactive transit maps.
- 🌍 Play cities and regions from around the world.
- 📊 Track your progress and stats.

## Tech Stack ⚙️
- Next.js 16 (App Router), React 18, TypeScript
- Tailwind CSS
- Mapbox GL + Turf.js + Fuse.js
- Prisma + PostgreSQL

## Getting Started 🚀
### Prerequisites
- Node.js 18+
- npm 9+
- A Mapbox token (`NEXT_PUBLIC_MAPBOX_TOKEN`)

### Install
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Then open:
- `http://localhost:3000/`

### Production Build
```bash
npm run build
npm run start
```

## Environment Variables 🔐
Copy `.env.example` to `.env.local` and fill in the values:

```bash
# required for map rendering
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token-here

# optional map styles
NEXT_PUBLIC_MAPBOX_STYLE=mapbox://styles/your-account/light-style
NEXT_PUBLIC_MAPBOX_STYLE_DARK=mapbox://styles/your-account/dark-style

# optional analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# optional stats backends
KV_REST_API_URL=https://<region>.kv.vercel-storage.com
KV_REST_API_TOKEN=<vercel-kv-token>
KV_REST_API_READ_ONLY_TOKEN=<vercel-kv-readonly-token>
UPSTASH_REDIS_REST_URL=https://<upstash-endpoint>
UPSTASH_REDIS_REST_TOKEN=<upstash-token>

# shared Prisma + auth/email database (Neon example)
# DATABASE_URL = pooled Neon URL for the running app
# DIRECT_URL = direct Neon URL for Prisma CLI commands
DATABASE_URL=postgresql://<user>:<password>@<project>-pooler.<region>.aws.neon.tech/<database>?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://<user>:<password>@<project>.<region>.aws.neon.tech/<database>?sslmode=require&channel_binding=require
BREVO_HOST=smtp-relay.brevo.com
BREVO_PORT=587
BREVO_USER=<brevo-user>
BREVO_PASS=<brevo-pass>
MAIL_FROM_NAME="Metro Memory"
MAIL_FROM_EMAIL=no-reply@your-domain.com
APP_BASE_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
AUTH_EMAIL_CAPTURE_DIR=/tmp/metro-memory-auth-emails

# optional gameplay controls
SOLUTIONS_PASSWORD=change-me

# optional automation review gate
AUTOMATION_ADMIN_ALLOWED_EMAILS=you@example.com
AUTOMATION_ADMIN_LABEL=ops-admin
AUTOMATION_GIT_USER_NAME="Metro Memory Automation"
AUTOMATION_GIT_USER_EMAIL=automation@metro-memory.local
AUTOMATION_GITHUB_TOKEN=<github-token-with-actions-write-and-pr-write>
AUTOMATION_GITHUB_REPO=owner/repo
AUTOMATION_BASE_BRANCH=main
AUTOMATION_APPLY_MODE=github-actions
AUTOMATION_APPLY_WORKFLOW_FILE=automation-apply.yml
AUTOMATION_RUN_REQUEST_MODE=github-actions
AUTOMATION_RUN_REQUEST_WORKFLOW_FILE=automation-run-request.yml
AUTOMATION_WORKFLOW_REF=main
AUTOMATION_AUTO_APPLY_LABEL=automation-policy
AUTOMATION_LLM_API_KEY=
AUTOMATION_LLM_MODEL=
AUTOMATION_LLM_BASE_URL=https://api.openai.com/v1
AUTOMATION_LLM_TIMEOUT_MS=45000
AUTOMATION_TIMEOUT_CEILING_MS=60000
METRO_SYNC_AUTO_APPLY_GREEN=0
METRO_SYNC_DEEP_RESEARCH_MODE=batch
METRO_SYNC_ENABLE_BROWSER_COLLECTOR=0
METRO_SYNC_BROWSER_TIMEOUT_MS=30000
METRO_SYNC_ENABLE_MEMORY=1
METRO_SYNC_MAX_CITIES_PER_RUN=
METRO_SYNC_MAX_RESEARCH_TASKS_PER_RUN=
METRO_SYNC_MAX_RESEARCH_RUN_ATTEMPTS_PER_CLAIM=4
METRO_SYNC_MAX_FETCHES_PER_DOMAIN=
METRO_SYNC_HTTP_TIMEOUT_MS=20000
METRO_SYNC_CITY_SLUGS=
METRO_SYNC_SCOPE=all
METRO_SYNC_CLAIM_TYPES=
METRO_SYNC_MANUAL_UPDATE_MODE=0
METRO_SYNC_MONTH_INDEX_OVERRIDE=
```

### Sync Local `.env` To Codespaces + Vercel
If your desktop copy of `.env.local` is the canonical source of truth, you can push the same keys into GitHub Codespaces secrets and Vercel with:

```bash
npm run env:sync
```

Useful variants:

```bash
# preview exactly what would be changed
npm run env:sync -- --dry-run

# keep watching the local .env.local file and re-push after each save
npm run env:sync -- --watch

# sync only to Vercel development + preview
npm run env:sync -- --vercel-envs development,preview

# sync only to Codespaces
npm run env:sync -- --codespaces-only

# override the repo access list when auto-detection is not enough
npm run env:sync -- --codespaces-repo owner/repo

# point at a specific env file
npm run env:sync -- --file .env
```

Requirements:
- `gh` CLI installed and authenticated
- `vercel` CLI installed and authenticated
- your repo already linked to the correct Vercel project with `vercel link`

Behavior:
- local `.env.local` is the default source of truth, with `.env` as fallback
- when `--codespaces-repo` is omitted, the script auto-detects `owner/repo` from `GITHUB_REPOSITORY` or `git remote origin`
- Codespaces sync updates GitHub Codespaces user secrets for the selected repo access list
- Vercel sync upserts the same keys into the selected Vercel environment(s)
- remote edits made directly in Vercel or GitHub are not pulled back into the local env file
- existing shells, `next dev`, and already-running processes will usually need a restart to see updated values

## City Asset Workflow
Route-level `icon.ico` and `opengraph-image.*` files now live canonically under `public/images/<continent>/<country>/<city>/`.

Commands:

```bash
# migrate/sync route assets into public/images/<continent>/<country>/<city> and regenerate the manifest
npm run sync:city-assets

# same sync, but also remove any old route-local special files and the old public/city-assets tree
node scripts/sync-city-assets.js --clean-route-assets --clean-legacy-city-assets
```

How it works:
- `src/lib/cityAssetManifest.json` is regenerated from `public/images`
- route metadata uses `src/lib/cityAssets.ts` to wire icons and Open Graph images explicitly
- mini cities and custom subsets inherit parent assets automatically unless a mini-city-specific asset exists
- `public/city-cards/*.jpg` and `public/city-icons/*.ico` are compatibility mirrors derived from `public/images`

Adding or changing assets:
- drop `icon.ico` into `public/images/<continent>/<country>/<city>/`
- drop `opengraph-image.jpg`, `.jpeg`, `.png`, or `.webp` into `public/images/<continent>/<country>/<city>/`
- run `npm run sync:city-assets`
- restart `next dev` or rerun the build if metadata output was already cached

## Local Translation Workflow
The repo now includes a zero-cost translation pipeline for the existing Rosetta catalog in `src/lib/i18n.tsx`.

Commands:

```bash
# extract the current catalog into reviewable JSON
npm run i18n:extract

# check locale parity using src/lib/i18n.tsx plus generated JSON overrides
npm run i18n:check

# fill missing plain-text keys with English fallbacks
npm run i18n:translate -- --backend copy

# fill missing plain-text keys with a local Ollama model instead
npm run i18n:translate -- --backend ollama --model qwen2.5:7b-instruct
```

How it works:
- `src/lib/i18n.tsx` remains the live source for complex formatter and JSX entries
- `src/lib/i18nAutoOverrides.json` stores generated plain-text overrides and is loaded at runtime
- `zh-TW` can be derived from `zh-CN` locally with `opencc-js`, so no paid API is needed for that pair
- legacy saved `jp` preferences are normalized to `ja`, while the existing Rosetta table still resolves safely

Recommended workflow:
- edit English in `src/lib/i18n.tsx`
- run `npm run i18n:check`
- run `npm run i18n:translate -- --backend ollama` if new plain-text keys are missing
- review `src/lib/i18nAutoOverrides.json`
- rerun `npm run i18n:check`

## Useful Scripts 🛠️
- `npm run dev` - Start dev server
- `npm run dev:core` - Core dev command (used by `dev`)
- `npm run dev:turbo` - Turbopack dev command
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Regenerate Prisma client
- `npm run db:migrate:dev` - Create/apply a local development migration using `DIRECT_URL` when set
- `npm run db:migrate:deploy` - Apply committed Prisma migrations to the configured database using `DIRECT_URL` when set
- `npm run db:push` - Push the current Prisma schema without creating a migration, preferring `DIRECT_URL` when set
- `npm run db:studio` - Open Prisma Studio
- `npm run check:auth-env` - Validate the production auth/mail/database environment and test DB connectivity
- `npm run test:automation` - Run focused automation helper tests
- `npm run test:e2e` - Run Playwright auth/browser smoke tests
- `npm run test:e2e:headed` - Run Playwright smoke tests with a visible browser
- `npm run automation:eval -- --limit=50 --cities=dc,ny` - Replay reviewed claims through the current verifier and policy stack
- `npm run automation:eval -- --limit=50 --candidate-auto-apply-min-official=3 --candidate-auto-apply-min-support=0.8` - Compare baseline replay metrics against stricter temporary policy tuning without changing production defaults
- `npm run generate:station-totals` - Rebuild station totals
- `npm run sync:city-assets` - Sync canonical city icons/Open Graph assets into `public/images/<continent>/<country>/<city>` and regenerate the manifest
- `npm run sync:icons` - Sync city icons
- `npm run sync:images` - Sync city image folders
- `npm run generate:city-data` - Export city data
- `npm run generate:available-city-data` - Regenerate availability registry

## Project Layout 🗂️
```text
.
|-- prisma/                 # Prisma schema + Postgres migrations (+ archived local SQLite files)
|-- public/                 # Static assets
|-- scripts/                # Data/build helper scripts
|-- src/
|   |-- app/
|   |   |-- (game)/         # City routes + gameplay configs/data
|   |   `-- (website)/      # Site routes (Metro Memory homepage at /)
|   |-- components/         # Shared UI + game components
|   |-- lib/                # Config, auth, stats, utilities
|   `-- styles/             # Global and Tailwind styles
|-- next.config.mjs
|-- package.json
`-- README.md
```

## Metro Memory Data Workflow 🗺️
City data typically lives at:
- `src/app/(game)/<region>/<country>/<city>/config.ts`
- `src/app/(game)/<region>/<country>/<city>/data/`

When adding or updating a city:
1. Export and clean source map data.
2. Regenerate `features.json`, `routes.json`, and `lines.json`.
3. Update `config.ts` metadata.
4. Register/update the city in shared config files.
5. Run `npm run generate:station-totals`.

## Automation Review Workflow 🤖
- Scheduled metro sync runs can collect OSM and search-backed candidates without writing directly into game data.
- The collector now supports stronger raw evidence inputs beyond OSM/search, including optional GTFS feeds, official agency pages, official map PDFs, and press/service-update pages declared in `city-registry/*.json` under `sources`.
- Expensive deep research is now batch-based by default. Cities with more lines are automatically prioritized into higher research tiers and checked more often, while lower-tier cities rotate through monthly batch slots.
- Registry keyword coverage no longer depends on manually filling every line keyword. The sync now derives fallback keywords from line ids/names, and registries can be backfilled from existing `data/lines.json` files with `node --experimental-strip-types scripts/metro-sync/backfill-registry-coverage.ts`.
- Cities with no configured lines are no longer skipped entirely. The sync now bootstraps initial `NEW_LINE` review candidates from OSM route relations so line-less registries can be onboarded through the same admin review queue.
- Future cities can be scaffolded with `npm run metro-sync:bootstrap-city -- --city=<slug> --bbox=minLat,minLon,maxLat,maxLon --continent=<continent>`, which bootstraps registry lines from OSM and assigns an automation tier automatically.
- Review candidates are stored in Prisma tables (`AutomationRun`, `AutomationCandidate`, `AutomationSource`, `AutomationDecision`).
- Human review happens in `/admin/automation`, gated by an approved signed-in account from `AUTOMATION_ADMIN_ALLOWED_EMAILS`.
- `/admin/automation` now includes an operator chat panel for targeted city research, manual city update runs, and explain-style prompts.
- Operator-triggered run requests can now execute through a dedicated GitHub Actions workflow instead of relying on a detached local child process. That makes the queue durable in hosted/serverless environments while preserving a local fallback for persistent dev servers.
- The main site settings page now links directly to `/admin/automation`, so admins can open it from the website UI after signing in to the normal site account first.
- Auth routes such as sign up, login, verification, password reset, and account deletion now assume the same shared Postgres `DATABASE_URL` as the automation system. File-based SQLite is no longer a valid production configuration.
- Auth routes now keep detailed diagnostics on the server and return only safe client-facing errors plus a `debugId` when something fails in production.
- Image candidates are staged under `public/automation-review` so reviewers can inspect proposed city-card and line-icon assets before approval.
- New line proposals now carry richer payloads including suggested IDs, keywords, colors, and optional staged icon previews with extracted colors.
- Official GTFS/page/PDF/press artifacts now feed basic fact extraction for line/operator/opening/map references, and those extracted facts are attached back onto review candidates as additional evidence for verification.
- Grounded extraction and verification can now use an OpenAI-compatible model when `AUTOMATION_LLM_API_KEY` and `AUTOMATION_LLM_MODEL` are configured. The agent stays grounded to fetched artifacts and falls back to heuristics when the model layer is disabled.
- Optional Playwright-backed collection can be enabled with `METRO_SYNC_ENABLE_BROWSER_COLLECTOR=1` for JS-rendered operator sites, delayed page content, and screenshot-backed artifacts.
- Citation-grade provenance is now stored alongside artifacts, claims, and research tasks, including excerpt hashes, offsets, selectors, page numbers, and OCR metadata.
- Long-term research memory can now reuse city/operator/domain hints to seed future official-source discovery and reduce repeated failed fetches.
- Follow-up research can now replan into new bounded task types from grounded verifier output instead of only retrying the original fixed task list.
- Replay/eval results are persisted in `AutomationEvalRun`, giving the automation stack a DB-backed harness for comparing current verifier and policy behavior against reviewed historical claims.
- Runtime observability now records model failures, queue-dispatch failures, run duration, persisted artifact/citation counts, per-domain fetch counts, and estimated token/spend usage in automation summaries and run-request context.
- Approved candidates can be applied from `/admin/automation`, which writes supported changes back into the repo files, records apply metadata in Prisma, and can open a branch/commit/PR when git credentials are configured.
- On Vercel, the admin apply route should dispatch the dedicated GitHub Actions workflow in `.github/workflows/automation-apply.yml` instead of running repo writes inside the serverless function. The workflow performs the heavy apply/git/PR work after checkout.
- Green-lane claims can now be auto-approved, auto-applied, and PR-opened by the sync job itself when `METRO_SYNC_AUTO_APPLY_GREEN=1`; yellow and red claims remain in the human review queue.
- Trust scoring now tracks source domains, cities, and change types, and uses that history to keep weaker suggestions in manual review more often.
- Admins can now override trust directly from `/admin/automation`: block/unblock domains, set manual trust scores for domains/cities/claim types, and force a claim type to stay yellow/red.
- The admin panel now includes historical monthly analytics for approval rate, revert rate, and auto-apply success rate.
- Applied automation runs can also open a manual revert PR from the same admin panel using the recorded automation commit SHA.
- Image candidates follow a source policy: official/operator-adjacent domains are preferred, Wikimedia-style sources require attribution review, and social/repost domains are blocked from auto-apply.
- GitHub Actions can use the built-in `GITHUB_TOKEN` with `contents: write` and `pull-requests: write`; app/server initiated PR creation should use `AUTOMATION_GITHUB_TOKEN`.
- Vercel-triggered workflow dispatches need a GitHub token with Actions workflow-dispatch access in `AUTOMATION_GITHUB_TOKEN`. Keep `AUTOMATION_APPLY_WORKFLOW_FILE=automation-apply.yml` unless you rename the workflow file.
- The monthly workflows now pass `METRO_SYNC_AUTO_APPLY_GREEN=1` plus `GITHUB_TOKEN`/`AUTOMATION_GITHUB_REPO`, so high-confidence changes can open PRs directly from the sync job instead of the old generic workflow PR step.
- The GitHub Actions apply workflow must use the same shared `DATABASE_URL` as the deployed admin panel. A local `file:` SQLite database cannot be shared between Vercel and GitHub Actions.
- The admin review queue will now show a production warning whenever `DATABASE_URL` still points at local SQLite.
- For Neon-backed environments, set `DATABASE_URL` to the pooled Neon connection string and `DIRECT_URL` to the matching direct Neon connection string so Prisma CLI commands avoid the pooler.
- Neon preview branches can be created per pull request with [.github/workflows/neon_workflow.yml](/workspaces/metro-memory/.github/workflows/neon_workflow.yml). Set GitHub variable `NEON_PROJECT_ID` and secret `NEON_API_KEY` before enabling it. The workflow creates a branch on PR open/sync, runs Prisma migrations against that preview branch, posts a safe PR comment with the branch status, and deletes the branch when the PR closes.
- Use the manual GitHub Actions workflow `.github/workflows/database-migrate.yml` or `npm run db:migrate:deploy` to apply the committed Postgres migrations before expecting auth or automation writes to work in a new environment.
- Use `npm run check:auth-env` before or after deploys to confirm the shared Postgres URL, public base URL, mail settings, and live DB connectivity are all ready for auth.
- A manual deployed-site browser smoke workflow now lives at [.github/workflows/auth-smoke.yml](/workspaces/metro-memory/.github/workflows/auth-smoke.yml). Set optional GitHub secrets `E2E_AUTH_LOGIN_EMAIL` and `E2E_AUTH_LOGIN_PASSWORD` if you want the workflow to verify a real login in addition to page-load checks.
- For local end-to-end auth testing without real SMTP delivery, set `AUTH_EMAIL_CAPTURE_DIR` and run `npm run test:e2e`. The local Playwright flow will read the captured verification email from disk and complete signup + verification + login automatically.
- For source-hint upkeep, you can backfill suggested `gtfsFeeds`, `officialPages`, `pressPages`, and `mapPdfs` into `city-registry/*.json` with `npm run metro-sync:backfill-source-hints -- --apply`.
- Shared Postgres cutover notes live in [docs/automation-postgres-migration.md](/workspaces/metro-memory/docs/automation-postgres-migration.md).
- Auth production follow-up steps live in [docs/auth-production-hardening.md](/workspaces/metro-memory/docs/auth-production-hardening.md).
- `METRO_SYNC_DEEP_RESEARCH_MODE=batch` is now the intended default: cheap OSM processing stays broad, while search/image/official-page deep research rotates by tier and month.
- Set `METRO_SYNC_ONLY_LINELESS=1` for a one-shot bootstrap seeding pass that only queues cities whose registries still have no lines configured.
- Set `METRO_SYNC_CITY_SLUGS=slug-a,slug-b,...` to target an explicit subset of cities for a manual sync or bootstrap pass.
- Set `METRO_SYNC_SCOPE` and `METRO_SYNC_CLAIM_TYPES` to narrow those targeted runs further, or create the same scoped requests from the admin operator panel.
- `METRO_SYNC_MANUAL_UPDATE_MODE=1` is reserved for explicit operator-directed refresh passes; the admin agent sets it automatically for manual-update requests.
- Use `METRO_SYNC_MAX_CITIES_PER_RUN`, `METRO_SYNC_MAX_RESEARCH_TASKS_PER_RUN`, and `METRO_SYNC_MAX_FETCHES_PER_DOMAIN` to cap operator spend and bound long-running automation jobs.
- Use `METRO_SYNC_MAX_RESEARCH_RUN_ATTEMPTS_PER_CLAIM` to stop claims from looping forever when official evidence never materializes.
- `AUTOMATION_LLM_TIMEOUT_MS`, `METRO_SYNC_HTTP_TIMEOUT_MS`, and `AUTOMATION_TIMEOUT_CEILING_MS` let you clamp model and network timeouts across the automation stack.
- Use `METRO_SYNC_OVERPASS_HTTP_TIMEOUT_MS` to cap per-city OSM bootstrap waits during large bootstrap passes.
- Set `METRO_SYNC_APPLY=1` only for an explicit direct-write step. The scheduled GitHub workflows keep this off so changes stay review-first.
- The next-phase architecture for a highly autonomous research/verifier/policy pipeline is documented in [docs/automation-research-agent-plan.md](docs/automation-research-agent-plan.md).

## Contributing 🤝
- Keep the app compiling and lint-clean.
- Document data sources for city updates.
- Never commit tokens or private credentials.

## License & Credits 📝
- MIT License unless otherwise noted in-file (`LICENSE.md`).
- Original Metro Memory concept and major assets by Benjamin Tran Dinh.
- Map data courtesy of OpenStreetMap contributors.
