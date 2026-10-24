# DomTransport release log

## Panel-facing current explanation

Start with [core changes and reasoning](core-changes.md) and [module review notes](prototype-review-notes.md). They describe the final combined behavior; older entries below describe the implementation at their publication date. In particular, Pasig-only routing and transferred regional workload proxies were superseded by the six-distributor update. Current sample allocations are not full-network fleet acquisition recommendations. Git history is preserved.

## 23 October 2026: initial GitHub publication

- Repository: https://github.com/domzxc/locusprototype
- Published branch: `main`.
- Initial application commit: `e5adb987dc8bbc462397f33e1fa082e237353520`.
- Verified `git ls-remote origin refs/heads/main` matched the local initial commit after push. GitHub's repository API confirmed the public repository and `main` default branch.
- Publication contains application source, lockfile, tests, Render configuration and approach/panel/deployment documents. Local workflow skills, legacy scaffold, dependency folders, generated builds, local settings and credentials were excluded.
- Checks: 17 planning tests passed; TypeScript and Vite production build passed. Vite's known large MapLibre chunk warning remains documented.
- Render Blueprint: Node 24, `npm ci && npm test && npm run build`, publish `dist`.
- Render service: not created in this session; the Render integration has not been installed/connected. No hosted URL or successful Render deployment is claimed.
- Browser/UI and hosted smoke checks remain outstanding. The final approach PDF remains pending content review.

Use [Deploy to Render](https://render.com/deploy?repo=https://github.com/domzxc/locusprototype) to open the repository's Blueprint in your Render account. Review the single static-site resource and deploy it. Alternatively, connect the Render integration to continue deployment from this chat.

Applied JSON settings remain local to each browser origin. Export settings from localhost and import them at the Render URL; hosting does not automatically transfer browser storage or turn it into a shared database.

## 23 October 2026: retailer-management update

Added synthetic retailer profile management and a separate ten-record Metro Manila public reference catalog. Existing receiving windows migrate into editable profiles. Applied active Pasig profiles drive the demo; public references stay out of dispatch. Added data source/workflow notes, schema tests and a browser-QA checklist. Twenty-five automated tests and the production build pass; browser and hosted verification remain outstanding. This update does not establish verified retailer receiving schedules or current branch operation.


## 24 October 2026: Philippine logistics conventions

Standardised capacity and payload labels to CBM/KG, added editable per-box CBM and KG, PHT clock inputs for shifts and illustrative truck bans, PHT schedule displays and export metadata. Reserve is entered as a percentage. Legacy browser settings retain minute-based times and gain default packaging measurements. Thirty automated tests and production build pass; supported browser and Render checks remain unavailable/pending. The illustrative ban does not claim verified local regulatory coverage.


## 24 October 2026: six-distributor dispatch and master data

Expanded routing from the Pasig pilot to all six distributors with independent synthetic depots, local zones/traffic, retailer receiving schedules and operating assumptions. Added overall Network overview, scoped navigation/editors, aggregate export and version-2 all-settings export with version-1 migration. Existing Pasig data and legacy non-Pasig profile ownership are preserved. Default samples total 600 profiles; 50,000 remains the distinct business footprint, not demo daily demand. All 39 tests and production build pass; server-rendering smoke checks pass for the overview and six local editors. Browser/WebGL and Render verification remain outstanding. See network-masters.md for data ownership, migration, limits and rollback.


## 24 October 2026: optional road routes and extended cost estimates

Added a manual OSRM road-validation action to each local dispatch: sequential/cached requests, returned road geometry and metrics, window/shift rechecks, conservative stop trimming, road-following simulated GPS, progress/cancel and explicit approximate fallback. Added per-distributor idle, maintenance, toll and overtime allowances plus separate spoilage and unassigned contribution-margin exposure. Legacy base transport cost remains available; operating and combined scenario totals are additive fields. No backend or API key added. All 51 tests, production build and SSR checks pass; live three-order and 100-order Pasig road checks succeeded. Browser/WebGL and Render verification remain outstanding. See [road/cost guide](road-routing-and-costs.md) for assumptions, observed costs, service limits and rollback.


## 24 October 2026: sales-audience panel guide and road-first playback

Added in-app problem statement and Part 1/Part 2 requirement mapping; clarified six independent depots and Pasig's example scope. Replaced binding-resource jargon with space/weight/time comparisons and optional calculation details. Traffic fields now show assumed extra-time percentages; cost-risk labels use business language with examples. Dispatch prefers automatic road validation and locks/hides straight-line playback until roads arrive, unless approximate mode is explicitly selected. Added playback speed controls, smaller time steps, marker reuse and driving/waiting/handling columns. The user chose assumed traffic only; no live feed was connected. All 53 tests, production build and SSR checks pass; browser interaction/visual QA and Render remain unverified.


## 24 October 2026: depot orders and current fleet controls

Added Depot planning navigation and + / - / direct inputs for each depot's daily order target and current A/B availability. Apply saves/recalculates per depot; normal/peak recommendations stay distinct. Dispatch and Network overview use saved current fleets, with optional temporary recommended-fleet experiments. Demand reductions preserve profiles; extra demand can append synthetic profiles within the 500-master limit. Legacy current counts are assumed once from normal recommendations, not claimed real inventory. All 58 tests, production build and SSR checks pass. Browser interaction/layout and Render remain unverified. See depot-planning.md for data semantics and rollback.

## 24 October 2026: readable manifest timing breakdown

Split store and truck-ban waiting into separate columns, and exposed loading allowance, unloading, stop tasks and total handling in the vehicle manifest. Added a visible explanation of the minute values and conservative loading assumption. Calculations and route feasibility are unchanged.

## 24 October 2026: workspace navigation and faster repeat road loading

Removed implicit Dispatch redirects from depot selection while preserving explicit Open dispatch actions. Network-wide pages now show All. Added bounded, seven-day browser road-response caching, an eight-plan session cache, elapsed progress and actionable timeout handling. Road responses cache geometry/base travel only; changed assumptions still revalidate schedules and costs. A 100-order CLI check took about 18 seconds cold versus 18 milliseconds from the saved cache, with no warm network requests and unchanged results. Public service speed and browser/WebGL interactions are not guaranteed or verified by that check.


## 24 October 2026: driver/helper attendance and departure clarity

Added per-depot/type scheduled and present driver/helper counts and helpers-per-truck requirements in Depot planning. Network overview shows attendance, absences and crew-ready/blocked trucks; dispatch and road validation enforce staffing while preserving physical inventory and idle cost. Defaults assume full attendance once; no payroll or HR integration is included. Separated preparation readiness from modeled departure, corrected the pre-departure GPS status and prevented snapped depot geometry from moving a waiting marker away from the warehouse. The configured default Type B ban remains 7-9 AM, with an explicit explanation of pre-ban travel versus overlapping-leg waits.

## 24 October 2026: peak order frequency and proposed seasonal resources

Added editable peak order multiplier (1.5x default) and extra shift hours (2 default) alongside basket uplift (1.6x). Peak orders retain retailer mapping/receiving windows and use unique transaction IDs when stores repeat. Peak UI now defaults to an explicit proposed seasonal truck-and-crew package, with Current resources only exposing shortages. Saved inventory/attendance remain unchanged. Network overview compares normal/peak orders and cost, saved versus scenario resources, temporary additions and shift limits. Default approximate network changes from 600 orders / PHP 117,463.63 normal to 900 / PHP 240,011.73 proposed peak; the constrained peak has lower spending but only 405 fully planned orders. No artificial cost uplift or floor was added. See peak-planning.md for scope and financial limits.

## 24 October 2026: depot tabs and Operations review

Added six linked depot tabs, a selected-depot workspace selector and hidden/mounted forms to retain unsaved drafts while switching tabs. Added the Dispatch parent-order Operations review with served/planned, incomplete, partial and outside-window filters, search, cases/CBM/KG, required unloading, split vehicles, arrival, service start/finish and exception reasons. Full handling determines planned window compliance. Retailer types are inferred from demo names; actual delivery events are not tracked. The new table replaces the previous duplicate order book and exception list. Planning/cost arithmetic and saved data schemas are unchanged.

## 24 October 2026: visible GPS order and truck statuses

Replaced route-colored order dots with shape/color status icons and a live-count legend. Added per-parent simulated finish thresholds across both temperatures, persistent partial/unassigned exceptions, safe-text click details and overlapping-order lists. Truck pins show preparing, travel, store/ban waiting, handling and returned states. Routes retain vehicle colors; status features update only when their state changes. No actual delivery confirmations, routing changes or cost changes were added.

## 24 October 2026: precise unserved diagnostics

- Replaced combined road/window/shift text with failed attempt times and distinct reason codes; unresolved search limits remain explicit.
- Added approximate final-tour capacity/window/return screening and an early-return review table. No routes were changed or extra deliveries assumed feasible.
- Renamed map/review exceptions Unserved (planned); window card now exposes planned/required delivery portions and excluded unserved counts.
- No backend, live traffic, second tours or delivery-confirmation events were added. See unserved-diagnostics.md and verification.md.
