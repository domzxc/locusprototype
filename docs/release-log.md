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
