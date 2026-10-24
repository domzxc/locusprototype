# Core changes and the reasoning behind them

Panel review entry point. This describes the current implementation and why the decisions were made. Historical commit messages record their scope at the time; this document and the README explain the final combined behavior.

## Decision record

| Change | Reason | Current behavior | Evidence / limitation |
|---|---|---|---|
| Expand the Pasig pilot to all six distributors | The brief required one routed distributor; regional management benefits from inspecting each distributor independently | Quezon City, Manila City, Makati, Pasig, Bulacan and Cavite have separate masters, routes and depot-based playback; Network overview aggregates them | [Network implementation](../network.js), [network tests](../tests/network.test.mjs). All local demand and geography remain synthetic |
| Keep the business footprint separate from sample demand | The brief says approximately 50,000 retailers, not 50,000 orders every day | Default samples contain 100 profiles per distributor, 600 total; saved Pasig samples are preserved. Normal day uses one order per selected profile; peak can include repeat transactions | Demo fleet counts size these samples; they are not a calibrated recommendation for the whole retail population |
| State the missing historical-data boundary | Five years of daily orders were described but never supplied | Seeded synthetic demand supports a reproducible demo; the approach document proposes forecasting and rolling backtests | No fabricated five-year history, trained forecast or measured forecast accuracy is claimed |
| Separate frozen and dry deliveries | The challenge restricts ice cream to refrigerated vehicles; the user explicitly selected separate deliveries | Type A carries only ice cream, Type B only dry SKUs. Mixed orders create two temperature-specific jobs | [splitOrders](../engine.js), [planning tests](../tests/planning.test.mjs). The no-dry-on-A policy is an additional operating assumption, not wording explicitly required by the brief |
| Preserve parent-order completion accounting | Two visits to one retailer must not inflate order coverage | A mixed order is complete only when both jobs are assigned. One assigned job gives a partial order, still counted incomplete | Coverage, delivery visits and average drops use different denominators |
| Use editable CBM and KG per box | A truck can run out of space or payload first; packaging assumptions must be inspectable | Quantity remains boxes; per-SKU measurements calculate both loads; both vehicle constraints apply | [PH convention tests](../tests/ph-conventions.test.mjs). CBM equals cubic metres; the label change alone changes no volume |
| Use Philippine clock time | Dispatchers should edit operating hours as clock times | Receiving, shift and illustrative ban times use PHT (UTC+8); stored values remain minutes after local midnight | No browser-timezone conversion. Ban geography, exemptions, calendars and current legal rules are not modeled |
| Add retailer receiving-window management | Receiving availability can cause a missed delivery even when capacity exists | Per-retailer opening/closing, closed-day and archive status; full handling must finish before close | Closed retailers remain demand/exceptions. Archived profiles leave demand. No randomly injected failure percentage |
| Distinguish allocation from dispatch feasibility | Aggregate workload counts cannot capture every local route constraint | Workload sizing recommends A/B counts; a separate greedy planner checks each assigned route | A vehicle-count increase may help, but a better sequence or different windows may be needed. No optimality claim |
| Label the on-time measure precisely | Assigned-only compliance can show 100% while other orders are missed | Planned window compliance is displayed alongside complete-order coverage and exceptions | It is not actual on-time delivery: no delivery confirmations exist |
| Add average drops per used truck | Show planned stop productivity alongside capacity utilization | Assigned delivery visits divided by used vehicles, excluding idle vehicles and depot legs | Separate frozen/dry visits count separately; it is not unique retailers per vehicle |
| Aggregate network results from local plans | Summing visits/vehicles gives meaningful regional productivity | Coverage uses total complete orders / total orders; drops uses total visits / total used vehicles; distance and costs sum | Network overview uses saved current fleets, not temporary local fleet overrides; no inter-depot pooling |
| Keep browser data portable on static hosting | The authorized scope is a frontend prototype without a backend | Browser localStorage plus validated settings/master import/export; Render static-site configuration | Each browser/origin has its own settings. GitHub hosts source; a live Render deployment has not been verified in this session |
| Keep public references separate | Public store addresses do not establish supplier receiving hours or synthetic demand | Reference catalog is visible but excluded from dispatch and rejected as a master import | No real delivery customer relationship, verified receiving schedule or geocode is inferred |

New road/cost extension: optional OSRM validation now replaces straight connections with road geometry and returned leg metrics, rechecking the existing sequence and exposing trimmed jobs. Operating estimates include editable idle, maintenance, toll and overtime assumptions; spoilage and unassigned margin are separate exposure. See [road/cost guide](road-routing-and-costs.md) for formulas and live smoke results. No truck-specific access or live traffic is claimed.

## Published code milestones

| Commit | Published scope | Reviewer takeaway |
|---|---|---|
| [e5adb98](https://github.com/domzxc/locusprototype/commit/e5adb987dc8bbc462397f33e1fa082e237353520) | Initial browser-only DomTransport prototype | Establishes the synthetic planning workflow and declared limitations |
| [b7b756e](https://github.com/domzxc/locusprototype/commit/b7b756e) | Retailer management and public-reference catalog | Receiving-window ownership and public-data provenance are explicit |
| [7f38717](https://github.com/domzxc/locusprototype/commit/7f3871730b54b08cc477165f2a48dd963bc4b0cd) | Average drops per used truck | Adds a productivity metric with a defined denominator |
| [e5176b1](https://github.com/domzxc/locusprototype/commit/e5176b18129ea3443fa80192322ee00561b9607f) | CBM/KG packaging and PHT clock inputs | Localizes units while preserving saved numeric schedules |
| [d34e6ad](https://github.com/domzxc/locusprototype/commit/d34e6ad08ed42cd95c246d033bfd87ba976c3085) | Six-distributor dispatch and independent masters | Extends the pilot with isolated configuration, migration and overall sample-day reporting |

## What the evidence supports

The latest implementation has 58 passing automated checks and a successful TypeScript/Vite production build. A server-rendering smoke check covered the overview and all six settings/retailer views. Browser interactions, map/WebGL visual behavior and hosted Render smoke tests remain unverified. The known large MapLibre bundle warning remains documented.

These checks support the modeled invariants and reproducibility. They do not establish real-world fleet sufficiency, navigable roads, temperature compliance, actual delivery performance, regulatory compliance or cost savings.

Read the [module review notes](prototype-review-notes.md) for calculations and the [approach document](approach-draft.md) for proposed production models and review triggers.


Panel simplicity update: Panel Guide now states the brief and maps Parts 1/2 to implemented behavior. Pasig depot ownership is explicit. Binding-resource math has a space/weight/time explanation; traffic is entered as extra time percentages, and risk inputs use plain business labels. Roads are preferred before playback, with an explicit approximate fallback. The user chose assumed traffic rather than a live-provider integration.


Depot planning extension: daily order-count and current A/B availability inputs are saved per distributor. Recommendations are displayed separately. Current fleet is initially assumed once from the normal estimate, then remains fixed across normal/peak and demand changes. Day-demand reductions preserve profiles; increases can append synthetic profiles. See [module guide](depot-planning.md).


## Crew availability and honest depot departure

Physical inventory now differs from daily crew-ready capacity. Scheduled/present driver and helper counts by type/depot limit dispatch, without hiding the asset cost of crew-blocked trucks or lowering the demand-based recommendation. Full initial attendance is assumed, not observed. Helpers per truck is editable; no pooling or payroll integration is implied. The Network overview attendance card exposes this operating risk before leadership buys more trucks. See [Depot planning](depot-planning.md).

Playback now distinguishes depot preparation from restriction waiting and stays at the actual depot while waiting, even when OSRM snaps the depot onto a nearby road. The manifest reports readiness and modeled departure separately. The default Type B 7-9 AM interval is still an illustrative no-movement assumption; pre-ban travel is permitted only when the driving leg finishes before the interval begins.

## Peak demand and seasonal resources

Peak now models more orders (default 1.5x), larger baskets (1.6x) and two additional allowed shift hours. The UI compares an explicit proposed seasonal fleet/crew package with current resources only; actual inventory and attendance are unchanged. This addresses the earlier boxes-only model, whose constrained routes could cost less while missing more orders. Costs remain calculated from routes and resources, with no forced uplift. [Peak planning](peak-planning.md) gives formulas, current results, limits and panel reasoning.

## Depot tabs and operations review

A selected depot now has its own tab panel while all six forms retain page-local drafts. Dispatch replaces duplicate order/exception lists with one searchable parent-order review, including served, incomplete, partial and window diagnostics. Multiple frozen/dry assignments are shown explicitly with per-vehicle arrival/start/finish. Arrival by closing alone is insufficient for on-time service, and actual execution is not fabricated. See [Operations review](operations-review.md) for the calculation and evidence boundaries.

## Distinguish served and unserved on GPS playback

Order markers now represent scheduled, in-progress, simulated served, partially planned and unassigned parents. This avoids route colors being mistaken for completion status. Mixed orders require both portions finished before green, while partial/unassigned exceptions remain prominent for any route selection. Click details and truck-state labels explain why a marker is waiting or incomplete. The simulated clock does not become proof of delivery. [GPS status notes](gps-status.md) record rules and verification limits.

## Unserved reasons and early depot returns

The current UI calls deliveries excluded from the plan **Unserved (planned)**; partial baskets remain incomplete. The dashboard shows **scheduled portions / total required portions**, then states window compliance only for the scheduled subset and explicitly counts excluded unserved portions. A 100% window check never means all demand is served.

Road exceptions now identify the failed receiving close, service shift deadline, depot-return deadline or search limit, with attempted PHT times. Approximate exceptions distinguish capacity, no trucks, absent crew and final-tour append checks. Reasons describe attempts, not proof that no alternative route could work. See [precise unserved reasons](unserved-diagnostics.md).

**Panel response to trucks back at 3 PM:** ?That is the end of the current single loaded tour, not proof all orders were delivered. The prototype does not reload trucks or retry removed road stops. We inspect failed timings, initial-tour CBM/KG, crew and possible resequencing before concluding we need more trucks. We show early returns and unused shift time explicitly. Actual delivery confirmation is outside this simulation.?

## Network filtering and spreadsheet exports

The previously disabled All selector is now an active All/six-depot filter. Overview KPIs, normal/peak baseline, attendance, comparisons, risk and both exports follow the same selection. All export/download actions now produce CSV. Settings and retailer CSVs round-trip through validated imports; old JSON backups are still accepted. Network/dispatch/allocation CSVs are review reports, not configuration imports. See [CSV formats](csv-and-network-filter.md) for row types, PHT units and avoiding double-counting summary/vehicle rows.
