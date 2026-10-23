# DomTransport · Manila dispatch lab

A browser-only FMCG fleet allocation and daily dispatch prototype. React, TypeScript, Vite and MapLibre; no backend, credentials or runtime AI service. Dispatch demand, retailer profiles, locations and GPS positions are synthetic. A separate public reference catalog lists sourced branch names/addresses and is excluded from dispatch. Routes are heuristic sequences with estimated connections, not road directions or proven optimal solutions.

## Run locally

Requires Node.js 20.19+ or 22.12+ (Node 24 is also supported).

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The app saves applied assumptions in browser localStorage. Export versioned settings JSON before changing browsers. Export plan JSON includes settings, synthetic orders, manifests and unassigned orders. Plan imports are intentionally not accepted as settings; use the separate settings export.

```powershell
npm test
npm run build
```

The Vite build in `dist` is the deployment artifact. Node 24 is selected for Render. Legacy local scaffolding and the local development skill library are not required for the published app.

## What to explore

- **Network overview:** combined results and a six-distributor comparison, with normal/peak scenarios and network plan export. Starts with 100 synthetic profiles per distributor (600 total), preserving saved Pasig data.
- **Dispatch planner:** select any of the six distributors; 100 seeded orders each by default, five SKUs, cold-only compatibility, volume and weight capacity, full-service windows, shift return and an illustrative truck restriction. Normal/peak scenarios; fleet overrides reveal unassigned orders. Select a vehicle, inspect its manifest and scrub or play modeled GPS.
- **Fleet allocation:** normal and peak Type A/B counts for each independent synthetic sample. The assumed 50,000 mapped-retailer footprint is displayed separately; these sample fleet counts are not a full-scale recommendation.
- **Data studio:** traffic by zone, speed and detour, per-product loading/unloading time, vehicle payload/cost, shift, demand and a vehicle-type restriction. Apply validates and recalculates. Import/export settings for portability.
- **Retailer management:** add/edit synthetic profiles, addresses, local distributor ownership, coordinates, receiving windows and closed-day status; archive/restore; search and JSON import/export. A separate tab provides ten source-linked Metro Manila public reference records, with unknown receiving hours and coordinates left empty.
- **Panel guide:** demo timing, model rationale, tradeoffs and Q&A.

The dedicated Retailer management page now handles receiving schedules previously shown in Data studio. Apply the master to recalculate routes, or load the labeled receiving-hours stress example. These are synthetic same-day schedules, not a verified retailer calendar. See [retailer data guide](docs/retailer-management.md) for the workflow, public data source and JSON formats.

Frozen and dry products travel separately: Type A carries only ice cream; Type B carries only the other four SKUs. Mixed baskets generate two delivery jobs, while each local order book retains its parent retailer orders. Full order coverage requires all jobs of that order to be assigned. Partially planned orders remain in the incomplete-order list. Assigned-job window compliance is a modeled planning measure; actual deliveries are not tracked. Dispatch and allocation exports use version 2 to reflect the segregation policy and order/job accounting; settings exports use kind domtransport-settings, version 2 and contain all six masters. Legacy version-1 settings imports migrate the Pasig data without discarding edits.

Read [the approach draft](docs/approach-draft.md), [panel script](docs/panel-guide.md), [deployment handoff](docs/deployment.md) and [verification record](docs/verification.md). The PDF is deferred until the approach is finalized, as requested.

## Hosting

The checked-in `render.yaml` defines a Render **Static Site** on branch `main`, build `npm ci && npm test && npm run build`, publish `dist`. The deployment installs exactly the lockfile, runs planning checks and builds on Node 24. See [Render's static-site documentation](https://render.com/docs/static-sites). GitHub target: [domzxc/locusprototype](https://github.com/domzxc/locusprototype). Render requires a connected account before a live service can be created.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/domzxc/locusprototype)

## JSON settings after hosting

Settings and retailer receiving hours remain usable on Render. They are JSON-serializable configuration saved to localStorage in each visitor's browser; this app has no shared JSON server database. Synthetic orders and routes are regenerated from the saved configuration and seed.

- Export **settings** on localhost, then import them in Data studio at the Render URL to move your edits. Localhost and the hosted site have different browser storage origins, so edits do not transfer automatically.
- Reloads and app redeploys at the same hosted origin normally retain localStorage. Clearing site data, using private browsing, a different browser/device, or changing the hostname does not share that storage.
- Imported settings include receiving hours; apply any unsaved edits before exporting. Full plan exports are snapshots for review and are not settings imports.
- Different visitors have independent settings. A shared, synchronized database would require a separate backend/data service, outside this browser-only prototype.

## Important limits

Synthetic case sizes, traffic and costs need calibration. Travel is haversine distance × detour factor at an adjusted speed. MapLibre draws straight connections; simulated GPS follows that modeled schedule. Basemap tiles come from OpenStreetMap and fonts from Google Fonts, requiring internet; failures do not change the planning engine. No geocoding, live traffic, legal truck-ban validation, temperature telemetry, splitting a frozen/dry job across vehicles, multi-trip dispatch, driver breaks or real forecasting is implemented.

The daily cost includes fixed charges only for used vehicles plus per-km costs. Idle ownership costs are excluded. Allocation is a workload sizing heuristic; daily routing is greedy and may miss a feasible solution. Always examine full parent-order coverage and partial assignments alongside assigned-delivery window compliance.


## Philippine logistics units and schedules

The app uses CBM (cubic metres) and KG for vehicle capacities, order loads and manifests; quantity remains boxes. One synthetic case represents one box. Each SKU has editable CBM/box and KG/box in Data studio. Total load is the sum of box quantity multiplied by its per-box CBM or KG; both capacity constraints must hold. These packaging measurements are assumptions, not measured supplier specifications. Existing settings without packaging arrays receive the previous defaults.

All clock fields and schedule displays use Philippine wall-clock time, PHT (UTC+8, Asia/Manila), independently of the browser timezone. Shift and illustrative truck-ban settings use clock inputs rather than raw minutes. Defaults are 6:00 AM-6:00 PM for the shift and 7:00 AM-9:00 AM for the illustrative ban. The ban is a synthetic, editable no-movement assumption, not a statement of current MMDA/LGU rules. Only same-day intervals are modeled; midnight in shift/ban end fields means the end of that day. Retailer receiving intervals remain within the same day.

Internal JSON schedule values remain minutes after midnight to preserve compatibility. Exports include unit/time-basis metadata; the numeric fields are not UTC timestamps. Fleet reserve is entered as a percentage (15 means 15%) and stored as a fraction (0.15). Costs use PHP and distance uses KM. CBM is the same volume unit previously labeled cubic metres, so renaming alone changes no allocation.


See [six-distributor data and migration](docs/network-masters.md) for scoped settings, sample-size interpretation, exports and the browser verification checklist.
