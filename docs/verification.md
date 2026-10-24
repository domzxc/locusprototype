# Change Report: DomTransport prototype

RESULT: partial
RISK: medium

## Summary

Added a visible Depot planning module with saved per-depot day-order and current Type A/B controls, plus navigation shortcuts and current/recommended comparisons. Demand reductions preserve profiles; increases append synthetic profiles when necessary, subject to limits and global IDs. Dispatch/Network overview now use saved current availability, so peak demand exposes shortages instead of creating trucks. All 58 tests and production build pass; SSR checks pass. Browser clicks, layout and hosted deployment remain unverified.

## Files changed

| Path | Change |
|---|---|
| src/App.tsx | Navigation, dispatch, manifests, order book, fleet overrides, allocation view, panel guide, local persistence and import/export |
| src/MapView.tsx | MapLibre raster basemap, colored routes, unassigned markers, depot and scheduled simulated positions |
| src/DepotPlanning.tsx | Six per-depot count steppers, applied/draft state, persistent current availability and normal/peak comparisons |
| src/PanelGuide.tsx, src/PlanningSteps.tsx, src/planning-explanation.js, src/planning-explanation.d.ts | Sales-audience problem/solution walkthrough, business sizing explanation, traffic percent conversion and stop timeline |
| src/Settings.tsx | Scoped logistics form, local depot/zone coordinates, CBM/KG packaging and PHT clocks |
| road-routing.js, road-routing.d.ts, src/useRoadPlan.ts | Public OSRM client/parser, rate spacing/cache, atomic fixed-sequence road validation and stale-request protection |
| costing.js, costing.d.ts, src/CostSummary.tsx | Editable assumptions, operating/risk components and breakdown UI |
| network.js, network.d.ts, src/NetworkOverview.tsx | Six-master migration, atomic settings import, local configuration updates, ID allocation and sample-day totals/UI |
| src/styles.css, src/palette.ts | Responsive interface and route colors |
| src/types.ts, engine.d.ts | Product loading configuration and typed engine boundary |
| engine.js | Peak case accounting, separate frozen/dry jobs, parent-order completion, receiving-hour validation/enforcement, regional sizing proxy and modeled GPS |
| src/RetailerManagement.tsx | Synthetic profile CRUD/archive, receiving schedules, validated import/export and separate public-reference catalog; replaces RetailerHours.tsx |
| src/data/metro-manila-retailer-references.json | Ten source-attributed public address references; receiving windows and verified coordinates deliberately null |
| tests/planning.test.mjs, tests/retailers.test.mjs, tests/ph-conventions.test.mjs, tests/network.test.mjs, tests/road-cost.test.mjs, tests/explanation.test.mjs, tests/depot-planning.test.mjs | Fifty-eight meaningful planning, KPI, master-data and provenance-boundary tests |
| .gitignore | Exclude environment variants and local tool/settings directories |
| README.md, docs | Usage, approach equations, baseline results, panel defence, deployment and this record |

## Verification (evidence)

| Command | Outcome |
|---|---|
| npm test | 58 tests passed, zero failures; added saved demand/current-fleet, profile preservation/growth, depot isolation, zero/peak/idle cases and migration checks |
| npm run build | TypeScript passed; Vite production build succeeded. Known large MapLibre chunk warning |
| Vite SSR + renderToString smoke | Overview and all six local settings/retailer views rendered with expected local zone/profile content; not a browser interaction test |
| node --input-type=module baseline calculation | Normal 2 A + 6 B, 8 used, 93 fully planned parent orders, 1 partial, 118/125 jobs, 164.921 km, PHP 14,892.953; peak 3 A + 10 B, 12 used, 100 fully planned, 125/125 jobs, 184.970 km, PHP 20,736.425 |
| node --input-type=module receiving-hour stress calculation | Default seed with first 5 retailers closed and next 10 given 15-minute windows: 84 fully planned orders, 16 incomplete including 2 partial, 107/125 jobs assigned, all 5 closed retailers remain incomplete |
| Invoke-WebRequest http://127.0.0.1:5173/ | HTTP 200 from the local Vite server |
| cua.getState / createBrowserTab('iab', ...) | No apps or browsers reported; tab creation returned Browser is not available: iab |

Baseline: `src/App.tsx` and `src/styles.css` were missing; `npm test` referenced a nonexistent tests directory. The initial targeted tests exposed peak payload/quantity inconsistency and acceptance of invalid imported coordinates. Both are corrected. One added GPS restriction test initially assumed a 06:25 departure crossed the 07:00 restriction; that assumption was wrong because a short trip can arrive before 07:00 and wait at the retailer. The fixture now dispatches at the start of the restriction to test origin waiting directly.

The sandboxed Vite dev server could not traverse dependency directories. It was rerun through the required escalation flow and then served successfully. No production deployment was attempted.

## Acceptance criteria

- [x] Six independently scoped synthetic normal/peak allocations, dispatch plans and masters, with overall sample-day totals; mapped retailer footprint is separate.
- [x] Default 100 synthetic Pasig orders, five SKUs, integer case quantities and cold compatibility.
- [x] Assigned routes enforce both payload limits, service start/open, full service/close and depot return/shift constraints. Infeasible orders remain explicit.
- [x] Editable travel, traffic factors, product loading/unloading, capacities, cost, shift and illustrative vehicle-type restriction.
- [x] Implemented map, manifests, modeled GPS, coverage, volume utilization, distance and cost; browser rendering remains unverified.
- [x] Local browser persistence and versioned settings import/export; full plan JSON export.
- [x] Model limitations and absence of live routing/GPS/forecasting clearly documented in app and approach.
- [x] Panel guidance, approach draft and Render static hosting handoff prepared before final PDF.
- [ ] Browser critical journeys, map visual QA and narrow-screen QA: no supported browser available in this session.
- [ ] Final PDF and Render deployment remain pending; GitHub publication of prior updates is verified below.

## NOT verified

- Actual browser rendering, WebGL availability, external basemap/font loading, layout, keyboard journeys, runtime console, playback controls, file downloads/import UI and reload persistence.
- Fresh npm ci from the network or a clean machine, and Render build/deployment smoke tests.
- Real demand, legal truck restrictions, navigable roads, real GPS, temperature feasibility, forecasting performance, solver optimality or real savings.
- Browser and Render smoke testing remain outstanding; Git was initialized for the explicitly authorized publication after the original implementation review.

## Decisions / assumptions

All six distributors now have detailed synthetic sample-day routing. Each master owns depot coordinates, zones/traffic, profiles/receiving hours, vehicle/product assumptions and operating times; all values remain illustrative. The displayed 50,000-retailer footprint is distinct from initially 600 sample profiles. Per-master allocation sizes each sample, not full-network demand. Legacy Pasig data and profiles formerly mapped elsewhere migrate into their owners. Separate frozen/dry jobs, modeled windows/return limits and visible infeasibility remain enforced. Network totals use recommended local fleets; temporary overrides are local experiments and vehicles are not shared. The app invokes no runtime AI service.

## Review

Average drops KPI: added `averageDrops` to the plan and JSON export, calculated as assigned delivery stops divided by used vehicles, with a zero guard. A new dispatch KPI card shows one decimal and its numerator/denominator; five cards adapt to three/two columns on narrower screens. Tests first failed on the absent metric and then passed for split frozen/dry deliveries, idle vehicles, a normal plan and zero-used-vehicle cases. Depot legs and unassigned deliveries are excluded; distinct parent-order coverage is unchanged. Browser visual QA remains unavailable.

Retailer management: implemented a dedicated navigation page with up to 500 synthetic profiles, stable IDs, editable names/addresses/cities/distributor assignments/coordinates, one same-day receiving interval, active/archive status, closed-day flag and notes. Applied active Pasig profiles feed generated orders; archived and non-Pasig profiles do not silently become Pasig demand. The original unedited 100-profile master preserves the original baseline. JSON replacement is validated atomically and clears old receiving overrides; legacy settings remain usable. A regression test caught that spreading legacy receiving entries could alter profile identity; overrides now copy only opening, closing and closed fields. The seeded generator still consumes archived records so archiving does not change remaining baskets. Map bounds now include edited/assigned/unassigned points. The small public merchant-directory sample is separate from dispatch; unknown receiving times and coordinates are not fabricated. The app runs no live directory lookup/geocoding. Added source and workflow notes in retailer-management.md. Browser interaction/layout tests remain unavailable.

Publication preparation: the user explicitly authorized `https://github.com/domzxc/locusprototype.git`. Verified the remote was empty, initialized a local release branch and selected application files explicitly, leaving the archived development skill library and legacy local scaffold outside the publication set. Retested all 17 planning checks and built successfully. Added Node 24 selection and Render's lockfile-install/test/build command. Render's plugin was discovered but is not yet installed/connected; no hosted URL or successful Render deploy is claimed. Documented browser-local JSON persistence and manual localhost-to-hosted settings transfer. GitHub publication status is recorded in the release log after remote verification.

Publication verified: initial application commit `e5adb987dc8bbc462397f33e1fa082e237353520` was pushed to `main`; `git ls-remote` matched the local commit, and GitHub's repository API confirmed the public repository and default branch. The local publication branch was then renamed to `main` with tracking retained. Existing GitHub credentials worked after explicitly selecting the `domzxc` account; no new credential was requested or printed. Render remains pending account connection.

Distributor navigation and receiving-hour update: replaced static sidebar labels with accessible buttons, added selected distributor summary/dropdown and matching table highlighting, and scoped exports to the regional allocation or explicit Pasig plan. Returning to Dispatch/Data studio selects Pasig consistently. Added editable retailer receiving hours and closed-day state, validation and backward-compatible settings defaults. Tests first reproduced ignored hours, ignored closed state and missing legacy normalization, then passed after the engine changes. Added frozen/dry job conservation, segregation and partial-parent coverage tests for the user's selected separate-delivery policy. Updated UI metric labels to planned coverage and planned window compliance; no random delivery failures are fabricated. The former exact weight-error string assertion now checks unassigned jobs, since parent error messages include job-class prefixes; zero complete orders and 100 incomplete parents are still asserted. Browser interaction tests remain unavailable, so the new selectors, receiving editor, import/export flows and responsive layout need manual review.

Branding refresh: renamed the product to **DomTransport** across navigation, browser title, footer, export filenames, package/lock metadata, Render service name and documentation. Applied a Locus-inspired visual theme across existing features: deep-purple navigation, electric-blue actions, white cards, cool neutral tables and multicolor route accents. Reference: [Locus](https://locus.sh/) and its [public homepage stylesheet](https://locus.sh/assets/css/custom/home/home-2026.css), inspected on 23 October 2026. The implementation retains its own fonts, components and branding. Existing version-1 settings exports remain importable; browser loading falls back to the prior storage key before saving under the DomTransport key. All 11 planning tests passed after the rename, and the production build passed with the existing MapLibre size warning. Browser inventory again returned no available surfaces; visual and interactive UI checks remain unverified. No new behavioral tests were added for this cosmetic change.

Follow-up IDE declaration fix: added `src/vite-env.d.ts` referencing `vite/client` for CSS side-effect imports, explicitly imported `Feature` / `FeatureCollection` from `geojson`, and declared `@types/geojson` as a direct development dependency. Reproduced all four reported errors with `tsc --noEmit --noUncheckedSideEffectImports --types react,react-dom` before the fix; that stricter check passed afterward. The production build also passed with the existing MapLibre chunk-size warning. No runtime planning behavior changed.

Stage 1: self-reviewed against the supplied acceptance criteria and traced demand, settings, allocation, plan, exports and metric definitions. Documented regional-proxy and cold-chain limits rather than representing them as calibrated results.

Stage 2: self-reviewed compatibility, input validation, schedule consistency, conservation, cost calculation, local-only persistence and map resource cleanup. No independent agent review was performed; the project instructions prohibit compulsory agent delegation. Source formatting is compact, matching the supplied scaffold; a later maintainability pass can split the App views once behavior is browser-verified.

## Risks & follow-ups

- Browser QA is the immediate review gate; use the checklist below before public publication.
- MapLibre remains a roughly 1.06 MB minified lazy-loaded module (about 286 KB gzip). Vite emits its standard >500 KB chunk warning. Lazy loading reduced the initial app JS from about 1.325 MB to 268 KB (85 KB gzip); the map download is still required for the dispatch map. Warning is not suppressed.
- OpenStreetMap tiles and Google Fonts require external network availability; the app handles map errors but does not implement offline tiles.
- Legacy build.mjs and server.mjs remain unused; they were preserved to avoid removing user scaffold files.

## Manual browser checks to complete

1. Open the default app and confirm 100 parent orders, 125 jobs, 8 used vehicles, 93% full coverage, 7 incomplete orders including 1 partial, and visible basemap attribution.
2. Select A-01, then a B route. Confirm only ice cream on A and only dry SKUs on B, route emphasis, parent retailer IDs, m³/kg manifest, complete receiving windows and return before 18:00.
3. Play, pause, reset and scrub GPS; verify waiting and depot endpoints. Confirm it is labeled simulated.
4. Switch to peak: expect 13 allocated, 12 used, all 100 parents / 125 jobs fully assigned at defaults.
5. Set fleet A/B to zero: expect no routes, zero coverage and 100 explicit unassigned orders. Restore recommendation.
6. In Data studio raise traffic, Apply, verify recalculation. Reload and confirm persistence. Load defaults and Apply afterward.
7. Export settings, import the same settings and confirm equivalence. Test malformed JSON and a wrong-version file for visible errors. Export full plan JSON.
8. Search the order book. Open all navigation views. Test a narrow mobile viewport and keyboard focus.
9. Inspect runtime console/network, then repeat key checks on the final Render URL after publication.
10. Select each distributor: view its allocation summary and highlighted row. Use the dropdown at a narrow viewport. Returning to the Pasig dispatch demo must restore Pasig selection; allocation export must identify the selected distributor, and dispatch export must identify Pasig and the separate-frozen-dry policy.
11. In Retailer management edit RET-001, update the profile in the editor, then Apply master. Verify identity, receiving times and coordinates in orders/map/manifests. Mark it closed; it must remain incomplete. Archive and restore it; verify Pasig demand changes and other baskets stay stable. Load the stress example and Apply (84 full orders at the original defaults). Reload and export/import to check persistence. Old settings without a master remain valid.
12. Add a synthetic profile, assign it to another distributor and verify it stays in the catalog while being excluded from Pasig dispatch. Test duplicate-ID, invalid-coordinate and reversed-time imports without replacing good data. Inspect the Metro Manila reference tab and download its JSON; receiving windows must say unknown and direct import into the synthetic master must fail.

## Rollback

The app is now committed and published to GitHub; the initial application commit is recorded in the release log. Preserve published history. For later changes, create a branch, revert the relevant reviewed change with a normal Git revert, then publish the resulting commit; do not force-push or erase the repository. Render has not been deployed from this session; after a hosted release, use the prior successful deployment or reviewed Git version for rollback. To reset only application assumptions, use Data studio → Load defaults into form → Apply; this replaces browser-saved assumptions and recalculates the plan. Export settings first if you want to keep them.


Philippine conventions update (24 October 2026): added src/ph-conventions.js and its type declarations, shared PHT wall-clock helpers, clock inputs for shift/illustrative ban, CBM/KG labels and editable SKU box measurements. Order book separates CBM/KG columns, manifests format fractional KG, reserve input shows percent, and exports declare units/time basis. Existing minute-based schedules and default payload values are preserved. New tests initially failed because the helper module was absent, then passed after implementation. Production build passes with the existing MapLibre bundle warning. Browser inventory again returned no apps/browsers; visual/time-input interaction QA and Render deployment remain unverified. GitHub publication of earlier work is verified below; this update is recorded in the release log.


Six-distributor expansion (24 October 2026): added nine regression/integration tests (39 total). Test-first failure reproduced the absent network module. Migration initially compared complete generated objects and found the newly materialized synthetic address property; the check now verifies every original field unchanged while allowing that additive profile field. Legacy hour overrides are resolved before splitting profiles into owners. Scoped imports reject wrong-region empty masters, mixed ownership, invalid depots, nested/incomplete networks, duplicate network IDs and plan files. Applying changes validates synchronously before replacing state, so form error handlers can report rejection. New retailer IDs account for all masters and pending local profiles. Existing legacy-only engine tests remain intact and pass.

Server rendering smoke: Vite SSR loader plus React renderToString successfully rendered NetworkOverview and all six Settings/RetailerManagement views, asserting each local zone/profile. This does not verify events, downloads, persistence or WebGL. Browser inventory again returned no apps/browsers. The production build passes with the existing MapLibre bundle-size warning. Network baseline calculation: normal 545/600 complete, 53/54 used/allocated vehicles, 1,319.944 KM, PHP 102,581.312; peak 578/600, 80/82, 1,756.208 KM, PHP 149,295.799. Docs now describe sample sizing rather than transferred Pasig proxies. Review: checked requested six-workspace/master-data scope first, then migration/ownership/constraint/React-state/export boundaries. See network-masters.md for the browser checklist and rollback.


Panel documentation alignment (24 October 2026): added core-changes.md with decision rationale and published milestone links; prototype-review-notes.md documents each module, equations, worked CBM/KG/handling/travel/allocation examples, KPI denominators and default results. README now provides the panel entry point, clearly states sample-size/history/segregation boundaries and links the notes. Corrected remaining approach-table case labels to box units and clarified that allocation consumes serviceable demand before routing. Documentation-only update: no application behavior or dependencies changed. Numerical examples and default totals were recomputed directly from the engine; relative documentation links and report structure were checked. Production build evidence remains from the preceding implementation milestone; browser and Render verification gaps are unchanged. Rollback for this update is a normal revert of the documentation commit.


Road routing and costs (24 October 2026): test-first import failed while the road/cost modules were absent; extracting summarizePlan then exposed an out-of-scope deliveries variable, fixed by deriving the job total from splitOrders. All legacy invariants remain unchanged. Added 12 new tests (51 total), including distance-weighted interpolation through a road bend, road-leg schedule/capacity/return invariants, conservative trimming and conservation, partial parent coverage/unassigned-only margin, early and mid-request cancellation, malformed responses, one-kilometre snap boundary, caching/HTTP failure, overtime/idle/risk arithmetic and backward-compatible cost defaults. Extra costs are evaluated, not optimized. The legacy cost field remains base transport.

Live service evidence: an identified CLI request to OSRM returned Ok, road geometry and Access-Control-Allow-Origin: *. Three-order Pasig road validation served 3/3, 16.2055 KM, 601 geometry points, maximum snap 89.72 m. A single fresh 100-order validation used eight vehicles, assigned 109/125 jobs and fully planned 84/100 parents over 226.2598 KM; operating estimate PHP 17,937.3984, risk/opportunity PHP 14,102, combined PHP 32,039.3984, maximum snap 185.89 m. These are observations, not stable live benchmarks or actual execution results. Requests were sequential and rate-spaced; no road matrix/bulk service was queried.

SSR smoke passed for Network overview, all six costing forms and cost breakdowns, checking expected labels and absence of NaN. Browser inventory still reported no enabled apps/browsers. Production build passes with the known MapLibre chunk warning. Reviewed the requested map/cost scope first, then request cancellation/atomicity, coordinate-only transmission, stale response handling, no-silent-fallback labels, cost boundaries/double counting and export provenance. Public driving-profile routes do not verify truck access or live traffic. Network overview remains labeled as the approximate baseline. docs/road-routing-and-costs.md provides formulas, provider docs, workflow and rollback. Browser event/WebGL visual QA, hosted CORS and Render smoke testing remain outstanding. Rollback: export settings and revert this feature commit; no data service migration is required.


Sales-audience explanation and playback update (24 October 2026): clarified Pasig serves its assigned master, while all six distributors retain independent depots. Extracted PanelGuide and PlanningSteps from App and mapped both requested parts explicitly. Traffic fields display extra-time percentages but retain the existing factors on save (65% maps to 1.65); area/zone effects still multiply. Changed paid hours, frozen damage percentage/value and undelivered-box profit labels with examples. Formula details are optional; primary explanation compares space, weight and delivery hours.

Road-first UI review: useRoadPlan requests roads only when Dispatch is active and road preference is selected; base/input or page changes abort stale work. Approximate selection is explicit and persistent for the session. The UI suppresses straight connections and disables play/scrub while no valid road result is available (waiting, cancelled or failed), unless approximate mode is chosen. A previously valid road result can remain playable during a same-input retry. In-flight errors retain the labeled basis. Reused map markers remove per-frame recreation, and 50 ms playback updates replace 3-minute jumps; Slow/Demo/Fast controls use 1/5/15 modeled minutes per second. This is still simulated GPS with assumed traffic. No live provider/key was added after the user's explicit preference.

Verification: all 53 tests pass, including traffic percentage round-trip and exact driving + restriction wait + receiving wait + handling timeline accounting. SSR checks rendered the new guide with Problem/Part 1/Part 2/depot clarification, all six plain-language settings/planning steps and the main overview. Browser inventory remains empty, so automatic requests, disabled controls, speed selection and visual road smoothness are reviewed in code but not interaction-tested. Production build passes with the pre-existing MapLibre size warning. Existing road-provider HTTP smoke evidence above remains applicable; no redundant full-day API request was made. Rollback is a normal revert; numeric settings and cost assumptions are unchanged. New UI behavior and labeling are documented in panel-guide.md and road-routing-and-costs.md.


Depot planning (24 October 2026): test-first failure reproduced missing setDepotWorkload export. Added optional dailyOrders and currentFleet validation, normal-inventory migration once, atomic per-depot updates and non-destructive synthetic profile extension. Initial inventory is explicitly assumed, not provided real fleet data. Full settings preserve fields/zeros. Engine day selection filters active ownership then takes the requested count; it still generates random draws before selection to preserve remaining baskets. Counts are bounded 0-500 per day/type; total profiles also stay within 500, with archived-capacity rejection. Current fleet drives dispatch/network baseline; recommendations remain separate normal/peak outputs. Data studio reset preserves inventory and day target. Temporary dispatch fleet experiments stay unsaved/local.

Verification: five new depot tests bring the total to 58, all passing. They cover zero inventory/unserved demand, zero demand/idle expense, peak inventory preservation, current-count import, malformed input atomicity, profile preservation/global ID growth, depot isolation, selected closed-store exceptions and archived-master capacity. The former empty-network fixture now explicitly sets both demand and current fleets to zero: empty retailer masters alone no longer imply zero idle cost. A separate new test checks that retained inventory incurs idle cost on a zero-demand day. No invariant was relaxed to conceal a failure. Production build passes with the existing MapLibre warning.

SSR initially matched raw HTML and failed because React inserts comment boundaries around dynamic text. Normalizing those comments for visible-text checks then passed for all six depot controls, applied day count, Apply action, current/recommended columns and navigation. Browser inventory remains empty; interactions and layout are not claimed verified. Reviewed demand versus master ownership, saved inventory versus recommendations, zero/peak behavior, idle costs, scoped storage and form errors. Source/docs identify earlier peak fleet figures as recommended-fleet experiments. Rollback is a normal feature revert after settings export; no profiles are removed by the control.
