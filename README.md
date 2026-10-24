# DomTransport · Manila dispatch lab

A browser-only FMCG fleet allocation and daily dispatch prototype. React, TypeScript, Vite and MapLibre; no backend, credentials or runtime AI service. Dispatch demand, retailer profiles, locations and GPS positions are synthetic. A separate public reference catalog lists sourced branch names/addresses and is excluded from dispatch. Routes use heuristic sequences with an approximate baseline and optional OSRM road validation. They are not proven optimal or verified for truck access.

## Start here: panel review

The decision this prototype supports is **how much refrigerated and dry capacity to allocate, and whether that fleet can serve a modeled delivery day**. It recommends capacity from volume, weight and workload, then exposes route feasibility, partial orders and exceptions.

| Read | What it explains |
|---|---|
| [Core changes and reasoning](docs/core-changes.md) | Why the implementation changed, what is implemented now, and links to published code milestones |
| [Module-by-module review notes](docs/prototype-review-notes.md) | Calculation walkthroughs, worked examples, source links, baseline results and answers to rehearse |
| [Approach and mathematical models](docs/approach-draft.md) | Implemented heuristic, proposed production optimization, assumptions and demand-review triggers |
| [Presentation script](docs/panel-guide.md) | The 30-minute panel narrative and demo sequence |
| [Road routes and cost estimates](docs/road-routing-and-costs.md) | Road-validation workflow, cost inputs/formulas and observed live-service examples |
| [Verification record](docs/verification.md) | Automated evidence and browser/hosting verification gaps |

**Scope and interpretation:** the brief describes about 50,000 mapped retailers and requests roughly 100 synthetic orders for one distributor. The prototype began with Pasig, then expanded to six independent distributor samples, initially 600 profiles in total. The fleet figures size those sample days; actual regional fleet requirements need historical demand and local calibration. No five-year order history was supplied or used to train a forecast.

**Operating policy:** frozen and dry portions travel separately, by explicit user choice. Type A serves ice cream; Type B serves the other SKUs. A mixed basket needs both jobs assigned to count as a complete order. Multi-drop routes consolidate compatible jobs from different retailers. Dispatch also requires present drivers and the configured helpers per truck; Network overview shows attendance and crew-blocked vehicles. Truck capacity is enforced in CBM and KG; clocks use PHT. Retailer receiving hours and illustrative restrictions are assumptions.

**Leadership interpretation:** assess complete-order coverage and exceptions alongside utilization, visits per used truck, distance and cost. Assigned-job window compliance can be 100% while orders remain unassigned. All displayed performance is modeled, not actual delivery execution. The app uses seeded demand and a greedy heuristic; forecasting and mathematical optimization are proposed production steps.

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

- **Depot planning:** use + / - or type the daily order count and current Type A/B trucks for each depot, then Apply. Compare current inventory with normal/peak recommendations. Counts persist in browser settings.
- **Network overview:** combined results and a six-distributor comparison, with normal/peak scenarios and network plan export. Starts with 100 synthetic profiles per distributor (600 total), preserving saved Pasig data.
- **Dispatch planner:** select any of the six distributors; 100 seeded orders each by default, five SKUs, cold-only compatibility, volume and weight capacity, full-service windows, shift return and an illustrative truck restriction. Normal/peak scenarios; fleet overrides reveal unassigned orders. Select a vehicle, inspect its manifest and scrub or play modeled GPS. Road geometry is requested automatically when Dispatch opens; playback waits for roads unless approximate mode is explicitly selected. Retry, cancellation and speed controls are available. Traffic remains assumed, not live.
- **Fleet allocation:** normal and peak Type A/B counts for each independent synthetic sample. The assumed 50,000 mapped-retailer footprint is displayed separately; these sample fleet counts are not a full-scale recommendation.
- **Data studio:** traffic by zone, speed and detour, per-product loading/unloading time, vehicle payload/cost, extended operating/risk costs, shift, demand and a vehicle-type restriction. Apply validates and recalculates. Import/export settings for portability.
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

Synthetic packaging, traffic and costs need calibration. Approximate mode uses haversine distance and detour. Optional OSRM mode draws road geometry, uses returned leg distances/durations with traffic multipliers, and rechecks receiving/shift feasibility. GPS remains simulated and the driving profile does not verify truck access. Basemap, fonts and routing require internet. No live traffic, legal truck-ban geography, temperature telemetry, multi-trip dispatch, driver breaks or trained forecasting is implemented.

The operating estimate adds idle ownership/lease, maintenance, toll allowances and overtime to base transport. Spoilage and unassigned contribution margin are separate risk/opportunity estimates. All extra rates are editable assumptions; set them to zero if included in base costs. Read [road routing and costs](docs/road-routing-and-costs.md) for formulas, examples and exclusions. Allocation remains workload sizing and sequencing remains greedy; inspect coverage and exceptions as well as cost.


## Philippine logistics units and schedules

The app uses CBM (cubic metres) and KG for vehicle capacities, order loads and manifests; quantity remains boxes. One synthetic case represents one box. Each SKU has editable CBM/box and KG/box in Data studio. Total load is the sum of box quantity multiplied by its per-box CBM or KG; both capacity constraints must hold. These packaging measurements are assumptions, not measured supplier specifications. Existing settings without packaging arrays receive the previous defaults.

All clock fields and schedule displays use Philippine wall-clock time, PHT (UTC+8, Asia/Manila), independently of the browser timezone. Shift and illustrative truck-ban settings use clock inputs rather than raw minutes. Defaults are 6:00 AM-6:00 PM for the shift and 7:00 AM-9:00 AM for the illustrative ban. The ban is a synthetic, editable no-movement assumption, not a statement of current MMDA/LGU rules. Only same-day intervals are modeled; midnight in shift/ban end fields means the end of that day. Retailer receiving intervals remain within the same day.

Internal JSON schedule values remain minutes after midnight to preserve compatibility. Exports include unit/time-basis metadata; the numeric fields are not UTC timestamps. Fleet reserve is entered as a percentage (15 means 15%) and stored as a fraction (0.15). Costs use PHP and distance uses KM. CBM is the same volume unit previously labeled cubic metres, so renaming alone changes no allocation.


See [six-distributor data and migration](docs/network-masters.md) for scoped settings, sample-size interpretation, exports and the browser verification checklist.


Panel-friendly explanation: the in-app Panel Guide states the problem, how Parts 1 and 2 are addressed, and the six-depot scope. Fleet sizing compares space/weight/time; traffic controls show extra travel time percentages, and cost-risk inputs use plain business terms. Store manifests show driving, waiting and handling minutes separately.


See [depot orders and current trucks](docs/depot-planning.md). Current fleet is now distinct from recommended fleet: peak demand does not automatically create additional vehicles.
