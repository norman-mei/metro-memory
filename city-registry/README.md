# City Registry

Each file in this folder defines how the metro sync should process a city.

## Fields
- `city`: slug (matches city path and public city data file name)
- `continent`: lowercase continent (`asia`, `europe`, `north america`, `south america`, `oceania`)
- `bbox`: [minLat, minLon, maxLat, maxLon]
- `localLanguages`: array of ISO language codes to include in `alternate_names`
- `modes`: rail-based modes to include
- `lines`: array of line specs with `id`, `name`, `keywords`
  - `keywords` can still be set manually for tricky systems, but the sync now auto-generates fallback keyword coverage from line names and ids.
  - if the registry is missing lines entirely, the tooling will try to backfill them from `src/app/(game)/**/data/lines.json` when available.
- `stationAliases`: optional name overrides
- `stationLocalNames`: optional local name overrides by station
- `manualCoords`: optional manual coordinates keyed as `LineId|StationName`
- `sources`: optional normalized collector hints
  - `gtfsFeeds`: GTFS or GTFS-RT feed URLs
  - `officialPages`: official agency/operator pages
  - `pressPages`: official press-release or service-alert pages
  - `mapPdfs`: official map or timetable PDF URLs
  - highest-tier cities should pin these explicitly instead of relying only on discovery, because stronger source coverage improves verifier quality and reduces noisy review queues
- `automation`: optional batching overrides for expensive deep-research work
  - `researchTier`: `tier1`, `tier2`, or `tier3`
  - `cadenceMonths`: `1`, `3`, or `6`
  - `batchSlot`: stable slot inside that cadence
  - `alwaysDeepResearch`: force this city into the expensive batch every run

## Default Batching
If `automation` is omitted, the sync derives the tier automatically from `lines.length`:
- `tier1`: `8+` lines, deep research every month
- `tier2`: `4-7` lines, deep research every 3 months
- `tier3`: `1-3` lines, deep research every 6 months

Cities with more lines are prioritized into higher tiers automatically.

## Keyword Coverage
- New registries generated from game data now start with generated keyword coverage instead of empty arrays.
- Existing registries can be normalized with:
  - `npm run metro-sync:backfill-registry-coverage`
- Manual keywords are still respected and merged on top of generated ones.

## Bootstrap Workflow
- If a registry has no configured lines, the monthly sync now bootstraps initial `NEW_LINE` review candidates from OSM route relations instead of skipping the city outright.
- Those candidates are marked as bootstrap proposals in `/admin/automation` so you can review initial registry creation separately from normal updates.
- To scaffold a new registry for a future city directly from OSM:
  - `npm run metro-sync:bootstrap-city -- --city=<slug> --bbox=minLat,minLon,maxLat,maxLon --continent=<continent>`
- If the city already exists in `src/lib/cityPathMap.ts` and local data files are present, the bootstrap script can infer missing `bbox`, `continent`, and local languages automatically.

## Example
See `hanoi.json` and `hochiminhcity.json`.
