# DomTransport · Manila dispatch lab

A browser-only FMCG fleet allocation and daily dispatch prototype. React, TypeScript, Vite and MapLibre; no backend, credentials or runtime AI service. All demand, locations and GPS positions are synthetic. Routes are heuristic sequences with estimated connections, not road directions or proven optimal solutions.

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

- **Dispatch planner:** 100 seeded Pasig orders by default, five SKUs, cold-only compatibility, volume and weight capacity, full-service windows, shift return and an illustrative truck restriction. Normal/peak scenarios; fleet overrides reveal unassigned orders. Select a vehicle, inspect its manifest and scrub or play modeled GPS.
- **Fleet allocation:** normal and peak Type A/B counts for six distributors covering an assumed 50,000 mapped retailers. Click any distributor in the sidebar or use the allocation-page selector to view its figures and highlight its row. Regional estimates transfer Pasig workload assumptions; only Pasig has a route-feasibility demo.
- **Data studio:** traffic by zone, speed and detour, per-product loading/unloading time, vehicle payload/cost, shift, demand and a vehicle-type restriction. Apply validates and recalculates. Import/export settings for portability.
- **Panel guide:** demo timing, model rationale, tradeoffs and Q&A.

Data studio also manages every Pasig retailer's receiving opening/closing time and closed-day status. Apply edits to recalculate routes, or load the labeled receiving-hours stress example. These are synthetic same-day schedules, not a verified retailer calendar.

Frozen and dry products travel separately: Type A carries only ice cream; Type B carries only the other four SKUs. Mixed baskets generate two delivery jobs, while the original order book still contains 100 retailer orders. Full order coverage requires all jobs of that order to be assigned. Partially planned orders remain in the incomplete-order list. Assigned-job window compliance is a modeled planning measure; actual deliveries are not tracked. Dispatch and allocation exports use version 2 to reflect the segregation policy and order/job accounting; settings exports remain backward-compatible version 1, with receiving hours added as an optional imported field.

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
