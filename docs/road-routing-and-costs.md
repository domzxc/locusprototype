# Road routes and extended cost estimates

The app now prefers automatic OSRM road validation to each distributor dispatch view and editable cost assumptions to each distributor master. The app remains a static frontend with no backend or API key. Road validation requires internet and sends coordinates to the public routing service; it does not send retailer names, order quantities or costs.

## How to use it

1. Select a distributor and open Dispatch planner. Road validation starts automatically for the selected distributor; the provisional baseline is labeled and playback stays locked until roads arrive, unless you explicitly choose approximate mode.
2. Use **Use road routes & recheck** to retry or return from approximate mode. Dispatch requests road legs for each proposed vehicle sequence, with progress and cancellation controls.
3. On success, the map draws road geometry, modeled GPS follows it, and manifests/KPIs use the road-validated schedule and distance. Stops that no longer fit remain incomplete, with a road-validation reason.
4. Open **Estimated cost breakdown** for the operating estimate and separate risk/opportunity exposure. Edit inputs in Data studio and apply. Any input, scenario or fleet change invalidates the previous road result; validate again.
5. Export the selected plan to keep road geometry, schedules, costs and provenance as a review snapshot. Completed validated plans are retained for the current session (up to eight input combinations), so returning to an unchanged depot/scenario does not reload roads. Exact coordinate-sequence road responses are also cached separately in browser localStorage for up to seven days (40 responses, at most 2 million serialized characters). After reload or input changes, schedules and costs are revalidated using available cached roads; traffic, receiving windows and capacity checks are never taken from a stored road response. Storage failure or expired/invalid cache data falls back to network requests. The cache is local to this browser origin and is not part of settings exports. **Use approximate plan** returns explicitly to the initial heuristic plan.

## What road validation actually does

The existing workload allocation and heuristic establish vehicle counts and stop sequences. Road validation does not globally optimize. After initial validation it makes one bounded recovery batch for omitted jobs on unused staffed trucks. These new sequences are road-checked before publication. It does not reload used vehicles or insert jobs into existing validated tours. It asks OSRM's Route service for each existing sequence, preserving waypoint order. Returned leg KM replace detoured haversine KM; returned base minutes replace the editable base-speed calculation. Traffic multipliers still apply:

```text
Road leg minutes = OSRM duration seconds / 60 * network factor * destination factor
Road leg KM = OSRM distance metres / 1000
```

Depot return uses the network factor only. Approximate-mode speed and detour factors do not apply in road mode. There is no live traffic feed.

For each sequence, recalculate departure, illustrative restriction waiting, receiving wait, service finish and depot return. If a stop misses its full service window, remove it and request a new road route for the remaining sequence. If return exceeds shift end, remove the last stop and reroute. Up to five validation passes per original vehicle bound the work. A route still unresolved at that limit is left unassigned, with a specific pass-limit reason. Capacity and temperature segregation remain enforced. A better solver could serve jobs this procedure rejects.

Road updates publish atomically: any HTTP, timeout, invalid response or excessive snapping failure retains the previous labeled plan. Cancellation and input changes prevent an old request from replacing a new scenario. The public client spaces requests at least 1.1 seconds apart, splits long sequences into requests of at most 70 points, and caches up to 40 successful request responses. Each request has a 20-second timeout; the UI cancels a validation after two minutes and displays a retry/approximate-mode message. Progress includes the current vehicle, pass and elapsed seconds. Retrying reuses completed cached requests. Requests suppress unused OSRM routing hints; full step geometry remains available for road playback. This is an interactive demo, not a bulk routing service.

Sources: [OSRM API documentation](https://project-osrm.org/docs/v5.24.0/api/) describes ordered routes, leg distance/duration, step geometry and waypoint snapping. The [OSRM demo usage policy](https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy) requires responsible use and attribution and points to the current service operator's policy. A dedicated supported/self-hosted router is needed for production reliability and scale.

### Does this prove a truck can drive the route?

No. It provides a road-network-based **driving-profile** path. It does not verify vehicle height/weight/access restrictions, current closures, legal truck-ban geography, private retailer entrances, unloading access or temperature control. Retailer points are synthetic and snapped to nearby roads; the UI reports maximum snap distance, and points over 1 KM from a snapped road are rejected. Stops are shown at snapped points in road mode. First/last-metre access needs field verification.

GPS remains simulated. It interpolates by distance along each road leg between scheduled times, with waiting/handling phases. It does not model speed changes within a leg or actual driver events. The network overview remains the **approximate current-fleet baseline**, explicitly labeled; it does not aggregate temporary local road-validation results or local fleet overrides.

## Cost assumptions

All rates below are **illustrative PHP assumptions**, not supplier quotes, road toll schedules, measured spoilage rates or statutory wage calculations. They are independent per distributor and editable in Data studio. Set add-ons to zero when already included in base charges.

| Input | Type A default | Type B default | Meaning |
|---|---:|---:|---|
| Base fixed charge / used day | 1,700 | 1,400 | Existing used-vehicle daily charge; includes that used vehicle's ownership/crew provision |
| Base running rate / KM | 24 | 16 | Existing base transport rate, assumed to exclude the additional maintenance allowance |
| Idle ownership/lease / unused day | 1,000 | 800 | Charged only to allocated vehicles without a used route |
| Additional maintenance / KM | 3 | 2 | Allowance on traveled KM, not a breakdown simulation |
| Toll allowance / used tour | 80 | 120 | Flat scenario allowance, not detected toll plazas or verified actual fees |
| Crew overtime / hour | 120 | 100 | Assumed incremental crew cost, not a legal payroll formula |

Paid crew time defaults to 8 hours. Duty runs from shift start, including fixed preparation, until modeled depot return. Shift end remains a hard feasibility limit; overtime here is time beyond paid hours within that allowed operating shift, not permission to return late.

Frozen box book value defaults to PHP 1,200 and expected spoilage fraction to 1%. Unassigned contribution margin per box defaults to toothpaste 80, ice cream 150, soap 70, water purifier 400 and tea 60 PHP. These are assumption inputs, not actual product prices or calibrated losses.

```text
Base transport = sum(used vehicle fixed charge + route KM * base running rate)
Idle = sum(max(0, allocated type - used type) * idle daily rate)
Maintenance = sum(route KM * additional maintenance rate)
Tolls = sum(toll allowance per used tour)
Overtime = sum(max(0, (return - shift start)/60 - paid hours) * crew hourly rate)

Operating estimate = Base transport + Idle + Maintenance + Tolls + Overtime

Expected spoilage exposure = assigned frozen boxes * frozen box book value * spoilage fraction
Unassigned margin exposure = sum(unassigned job boxes by SKU * contribution margin per box)
Combined scenario estimate = Operating estimate + Spoilage exposure + Unassigned margin exposure
```

Used vehicles receive the base fixed charge; unused vehicles receive the idle allowance, never both. Lost margin uses unassigned jobs, so a partially delivered mixed order contributes only its unassigned portion. Closed retailers remain demand and can contribute opportunity exposure, but that does not assert that a delayed order is a confirmed cancelled sale. Spoilage is an expected-value proxy on assigned frozen volume, not a temperature-derived event prediction. Risk/opportunity exposure is displayed separately from operating costs to avoid presenting it as actual expense.

The legacy JSON `cost` field remains base transport for backward compatibility. The new `costs` object contains components, `operating` and `economicTotal`; network JSON adds `operatingCost`, `riskExposure` and `economicTotal`. Allocation and sequencing do not minimize these extra costs; they evaluate the resulting plan. Tax, detailed insurance/financing, seasonal rental procurement, driver breaks and calibrated failure/revenue models remain outside the calculation.

## Observed live smoke checks

On 24 October 2026, one Pasig test trip returned road geometry and CORS support. A three-order validation served all three with 16.2055 KM and 601 returned geometry points. A fresh 100-parent-order Pasig validation used all eight recommended vehicles and produced:

| Result | Observed value |
|---|---:|
| Fully planned parent orders | 84 / 100 |
| Assigned delivery jobs | 109 / 125 |
| Road distance including returns | 226.2598 KM |
| Base transport | PHP 16,000.82 |
| Idle allowance | PHP 0.00 |
| Maintenance | PHP 525.10 |
| Toll allowance | PHP 880.00 |
| Overtime | PHP 531.48 |
| Operating estimate | **PHP 17,937.40** |
| Expected spoilage exposure | PHP 612.00 |
| Unassigned contribution margin | PHP 13,490.00 |
| Combined scenario estimate | PHP 32,039.40 |
| Maximum road snap distance | 185.89 m |

These are observed outputs from a public routing response, not a stable benchmark or real delivery result. Network data, responses and saved input edits can change them. The original approximate normal sample remains 93/100 complete, 164.9 KM and PHP 14,893 **base transport**; that old cost is not the new operating-total KPI. The road result demonstrates why drawing roads must also recheck schedule feasibility.

## Verification and rollback

Automated fixtures cover road schedules/geometry, road-bend GPS interpolation, restriction waiting, trimming/rerouting, job conservation, failure/cancellation, malformed responses, caching, cost arithmetic and migration. Real service smoke checks succeeded, but browser interaction/WebGL visual QA and Render deployment remain unverified. A passing HTTP smoke check alone does not establish end-user browser behavior.

No application backend or paid dependency was added. For rollback, export settings first and revert the feature commit normally. Old settings without `costing` receive declared defaults; road results are transient and can be discarded with the approximate-plan control.


## Sales-audience and playback update

The Panel Guide now maps the business problem to Part 1 and Part 2 explicitly. Pasig serves its own assigned retailers; it is not the central depot for all six. Fleet sizing is explained as checking space, weight and delivery hours, with technical calculation available on demand. Traffic controls display extra time percentages while retaining existing internal factors; no saved numerical assumptions change. The user explicitly selected assumed traffic, so no live provider/key was added.

Roads are preferred on opening Dispatch. Straight route connections are hidden and playback/scrubbing are disabled until road data arrives, unless approximate mode is explicitly selected. Failed/cancelled requests do not unlock straight-line playback silently. Playback has Slow/Demo/Fast speeds and uses smaller time steps; map markers update in place. Store manifests separate driving, receiving/ban waiting and handling, including loading/unloading/fixed allowances. Browser interaction and smoothness remain unverified because no supported browser is available.


Current demand/inventory controls are in [Depot planning](depot-planning.md). Daily demand can select fewer active profiles without deleting them; current trucks are saved separately from normal/peak recommendations. Earlier numeric peak examples are historical experiments; see [Peak planning](peak-planning.md) for current order growth, longer shift and proposed/current resource modes.

## Navigation and loading verification (24 October 2026)

Selecting a depot in the sidebar or workspace selector keeps the current module. Explicit **Open dispatch** actions still navigate to the selected depot's Dispatch planner. Network overview and Depot planning show a fixed **All** scope because both contain all six depots.

A CLI validation of the default 100-order Pasig day took 17,957 ms with 17 public OSRM requests. Repeating validation with a recreated client and the persisted road-response cache took 18 ms with zero network requests, identical assigned-job counts and identical total distance. The saved cache was 516,975 characters. These are observed request/validation timings, not browser rendering measurements or a guaranteed service response time. Cold loading still depends on the public service and sequential feasibility passes. No live traffic was added.
