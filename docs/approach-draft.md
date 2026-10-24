# DomTransport: fleet allocation and daily dispatch

**Review draft · updated 24 October 2026 · synthetic data only**

Related: [road routing and extended costs](road-routing-and-costs.md), [core changes and reasoning](core-changes.md), [module calculations and rehearsal notes](prototype-review-notes.md).

## 1. Leadership recommendation

Separate a recurring fleet decision from daily dispatch. Forecast each distributor's cold and dry workload, establish a normal baseline, reserve incremental capacity for peak demand, then test the allocation against actual delivery windows, payloads and travel conditions. Revisit allocations when demand or service indicators drift.

The prototype now demonstrates this loop for all six distributors, with an overall network summary and independent local master data. It does not infer actual fleet requirements from the problem statement alone: five years of historical orders, capacities and retailer mapping were described but not supplied. Every numerical input below is an illustrative assumption.

## 2. Assumptions and synthetic data

| Input | Assumption |
|---|---|
| Mapped retailer population | 50,000 across all six distributors |
| Distributor shares | QC 11,000; Manila 10,000; Makati 9,000; Pasig 5,000; Bulacan 8,000; Cavite 7,000 |
| Demo activity | 100 synthetic retailer profiles per distributor initially (600 total); saved Pasig sample preserved. Sample orders are not extrapolated to 50,000 daily orders |
| Pasig location model | Five synthetic clusters near Kapitolyo, Ortigas, Rosario, Santolan and Pinagbuhatan, not actual retailer addresses |
| SKU unit | A synthetic case; sizes and weights are assumed, not commercial specifications |
| Cold demand | Approximately 28% chance of ice cream per basket; mixed baskets become separate frozen and dry deliveries |
| Normal basket | Each dry SKU 0–3 cases; ice cream 1–3 when present; empty basket repaired to one toothpaste case |
| Peak scenario | Order count x1.5 and each nonzero SKU quantity x1.6, rounded up; repeated transactions retain assigned retailer windows. Peak shift allowance +2 hours; proposed resources versus current resources are separate views |
| Windows | 08:00, 09:00, 10:00 or 11:00 opens, four-hour windows, full handling must finish before close |
| Shift | 06:00-18:00 normal, up to 20:00 peak by default; 25 minutes fixed depot preparation; one trip per vehicle |
| Type A | Refrigerated; 5 CBM, 900 KG; PHP 1,700 per used vehicle/day plus PHP 24/km |
| Type B | Dry; 11 CBM, 2,500 KG; PHP 1,400 per used vehicle/day plus PHP 16/km |
| Base travel | 22 km/h; haversine distance × 1.35 detour; time × 1.35 network traffic factor × destination zone factor |
| Zone traffic factors | Kapitolyo 1.20, Ortigas 1.65, Rosario 1.40, Santolan 1.30, Pinagbuhatan 1.25 |
| Fleet reserve | 15% workload buffer before rounding vehicle counts |
| Restriction | Illustrative Type B no-movement interval 07:00–09:00; origin waiting if a modeled leg would overlap; applies to all modeled travel, including depot return |
| Local masters | Six separate depot locations, five traffic zones each, seeds, retailer receiving schedules and operating assumptions. All synthetic and uncalibrated |
| Receiving hours | Editable same-day opening/closing and closed-day flag for each distributor master; full handling must fit |
| Load segregation | User-selected policy: ice cream only on Type A, dry products only on Type B. The challenge does not explicitly authorise mixed frozen/dry loads |

| SKU | CBM/box | KG/box | Load min/box | Unload min/box | Compatibility |
|---|---:|---:|---:|---:|---|
| Toothpaste | 0.035 | 12 | 0.2 | 1 | B only |
| Ice cream | 0.09 | 18 | 0.5 | 2 | A only |
| Soap | 0.05 | 16 | 0.2 | 1 | B only |
| Water purifier | 0.22 | 25 | 1 | 5 | B only |
| Tea | 0.04 | 8 | 0.2 | 1 | B only |

Handling time at each delivery stop is five minutes fixed plus sum of its case quantities × (loading + unloading minutes). Both case handling components are conservatively charged at each stop, including in the receiving window. A mixed parent order needs two deliveries and incurs the fixed stop handling twice. This is a time-budget proxy; it does not simulate warehouse loading operations. Fixed depot preparation is separate.

Retailer management is scoped to the selected distributor. Add/edit synthetic identities, local coordinates and schedules; archive/restore, import/export JSON, then apply. Closed retailers stay in demand as exceptions and are excluded from serviceable allocation workload. Each stress example closes the first five active local retailers and shortens the next ten windows. No weekly calendar, dock contention or actual delivery confirmations are modeled. Distributor ownership is fixed within each editor to prevent accidental cross-master reassignment.

A separate source-linked public Metro Manila address catalog remains reference-only. It is excluded from all dispatch masters and asserts no verified receiving hours or coordinates. Active profiles in each master determine that distributor sample demand. The initial Pasig master preserves the original baseline. See network-masters.md for scoped settings and migration.

The interface edits depot/zone coordinates, traffic, receiving windows, box CBM/KG, handling, capacities, costs and PHT operating times independently for each distributor. The mapped-retailer split is an illustrative source constant. Settings export version 2 contains all six masters; legacy version 1 migrates existing Pasig edits.

## 3. Forecasting approach for supplied historical data

Aggregate five years of retailer orders by distributor, SKU and date; validate case units, cancellations, duplicates, stockouts, addresses and mapping changes. Forecast case demand and active delivery stops separately. Cold delivery workload depends on cold baskets, not only on ice cream volume.

Compare seasonal-naive, moving weekday averages and a seasonal regression or gradient-boosted model with holidays, September–December seasonality and promotions. Use rolling-origin backtesting with no future leakage. Track WAPE or MAE at distributor/SKU level, forecast bias and empirical quantile coverage; do not rely only on percentage errors for intermittent SKUs. Choose an uncertainty quantile with leadership based on cost and service requirements. The 15% prototype reserve is an assumption, not a calibrated quantile.

The browser prototype generates seeded demand; it does not train or run a forecasting model. Production should test peak order-count growth as well as larger baskets; the implemented peak scenario tests basket growth only.

## 4. Implemented allocation model

For distributor d and vehicle class t, split each basket into a frozen job for Type A and a dry job for Type B, omitting empty portions. Preserve original order IDs for completion accounting. Let:

- V_dt and W_dt be total serviceable delivery-job volume and weight before routing;
- Qv_t and Qw_t be vehicle volume and weight limits;
- Hshift = (shift end − shift start − depot preparation) / 60 hours;
- H_dt be estimated handling hours plus nominal travel hours;
- r be the reserve fraction.

The implemented nominal workload adds **2.4 km per stop**, multiplied by the detour and traffic factors and divided by speed. This is a planning proxy, not a route-length calculation. It does not directly model ban waiting or window clustering.

**N_dt = ceil[(1 + r) × max(V_dt / Qv_t, W_dt / Qw_t, H_dt / Hshift)].**

For an empty demand class N = 0. Evaluate normal and peak synthetic orders independently. The integer ceiling and reserve avoid fractional vehicles; they do not guarantee route feasibility. Vehicles are homogeneous within each type. There is no fleet procurement optimiser or endogenous Type A/B cost tradeoff in this sizing formula.

In a real rollout, evaluate candidate fleets over historical and forecast demand scenarios, route each candidate, and compare permanent fleet cost, seasonal rental, service performance and reserve utilization. Start with the heuristic counts, add capacity when misses persist, and trial reductions when capacity is consistently idle. Do not conclude that every miss requires another vehicle: route quality, time windows and restrictions can bind.

## 5. Target mathematical models

### Fleet investment / seasonal capacity

Let n_dt be integer permanent vehicles and h_dts be seasonal rental vehicles in scenario s. Minimize permanent fleet cost + expected seasonal rental/operating cost + an explicitly priced service shortfall, subject to scenario routing feasibility and an agreed service-level policy. Budget, fleet availability and cold-chain requirements add constraints. A robust or stochastic formulation can protect against demand uncertainty. This is the proposed production model, not an implemented solver.

### Heterogeneous fleet vehicle routing with time windows

Here node i represents a frozen or dry delivery job. A mixed retailer order contributes two jobs at the same location, with the same receiving window. A parent order counts as fully covered only when all its jobs are assigned. A job cannot be split across vehicles; its parent order can be split by temperature class.

For retailer nodes i, vehicles k and arcs (i,j), define:

- z_k ∈ {0,1}: used vehicle;
- x_ijk ∈ {0,1}: vehicle k traverses i → j;
- y_ik ∈ {0,1}: order i assigned to k;
- u_i ∈ {0,1}: unserved order;
- T_ik: service start; s_i: full handling duration;
- v_i and w_i: payload; a_i and b_i: delivery window;
- τ_ijk: estimated travel time, including restriction waiting where applicable.

Objective: **min Σ_k F_k z_k + Σ_ijk c_k distance_ij x_ijk + Σ_i P_i u_i**.

Core constraints:

1. Σ_k y_ik + u_i = 1 for each order (explicit shortfall).
2. Per-vehicle arrival/departure flow at assigned nodes equals y_ik; one depot departure and return for each used vehicle.
3. Σ_i v_i y_ik ≤ Qv_k z_k and Σ_i w_i y_ik ≤ Qw_k z_k for a one-trip depot tour.
4. Frozen job assignments y_ik = 0 for Type B vehicles, and dry job assignments y_ik = 0 for Type A, under the selected segregation policy.
5. Service start T_ik ≥ a_i and T_ik + s_i ≤ b_i when assigned.
6. Time propagation T_jk ≥ T_ik + s_i + τ_ijk − M(1 − x_ijk), with a justified tight M or indicator constraints.
7. Dispatch after loading; return to depot by shift end; no movement during the modeled prohibited interval.
8. Flow/subtour constraints or monotonic positive-time propagation eliminate disconnected cycles.

Real time-dependent travel and road restrictions need a road graph and departure-dependent travel functions. The simplified restriction in this prototype is a blanket interval, not a representation of a legal truck-ban network. A production solver must model driver breaks and cold-chain conditions too.

## 6. Implemented daily heuristic

First split retailer orders into frozen and dry delivery jobs. Process Type A then Type B vehicles. Consider only jobs of the vehicle's temperature class with remaining volume/weight capacity. Skip closed retailers. For every candidate, estimate travel, origin restriction wait, window wait and service finish. Reject a candidate if full service misses its receiving close or its direct modeled return would exceed shift end.

Choose the feasible candidate with the lowest score:

**3 × leg km + 0.12 × window-wait minutes + 0.012 × (window close − shift start).**

The coefficients are illustrative ranking weights, not money or learned values. Append it to the route, update payload and time, and repeat. Return to the depot. Unassigned orders remain in an exception table with a capacity or combined fleet/time review reason. Those reasons are diagnostic categories, not exact proofs of the binding constraint.

The heuristic is deterministic for a fixed seed/configuration, indivisible frozen/dry jobs and one trip per vehicle. There is no mid-route replenishment or driver-break model. It may miss feasible plans. The system never relaxes constraints silently to improve coverage. Incomplete parent orders remain visible; an order with only one of its two jobs assigned is labeled partially planned.

## 7. Metrics and baseline evidence

- Planned order coverage = fully assigned parent retailer orders / all parent retailer orders. Both jobs of a mixed order must be assigned. Partially planned orders count as incomplete and are also counted separately.
- Planned window compliance = assigned delivery jobs whose full handling fits their window / assigned jobs. Because feasibility is enforced, this usually equals 100%; it must be paired with order coverage. This is the interface's on-time planning measure, not actual delivery performance. Actual on-time rate cannot be measured without delivery confirmations.
- Volume utilization = mean(route volume / vehicle volume limit) across **used** vehicles. The manifest also shows weight payload and capacity; volume utilization alone can understate weight or time pressure.
- Average drops per truck = assigned delivery stops / used vehicles, displayed to one decimal place. Frozen and dry portions delivered separately to the same retailer count as two drops. Depot departure/return, unassigned jobs and idle vehicles are excluded. Zero used vehicles produces zero. This is planned stop productivity, not proof of actual deliveries or distinct retailers reached. The normal default is 118 / 8 = 14.75, displayed as 14.8.
- Distance includes depot returns. Approximate mode uses detoured haversine distance; optional road validation uses OSRM road-leg distance and rechecks schedules. Road validation trims an existing sequence and does not optimize it.
- Base transport cost = used-vehicle daily charge + route KM times base running rate. The operating KPI now also includes editable idle ownership, maintenance, toll allowance and overtime. Expected spoilage and unassigned contribution margin are separate risk/opportunity exposure. See road-routing-and-costs.md for exact formulas and assumed rates.
- GPS is simulated along road geometry in road mode and straight connections in approximate mode. It respects modeled waits and returns; it is not a telemetry feed.

For the Pasig distributor at seed 42 in approximate mode, observed baseline results below show base transport only; the current operating KPI adds allowances:

| Scenario | Allocated A/B | Used | Served | Mean volume utilization | Estimated km | Modeled cost |
|---|---|---:|---:|---:|---:|---:|
| Normal | 2 / 6 | 8 | 93 / 100 | 65.6% | 164.9 | PHP 14,893 |
| Peak | 3 / 10 | 12 | 100 / 100 | 84.4% | 185.0 | PHP 20,736 |

The 100 original retailer orders produce 125 frozen/dry jobs. Normal assigns 118 jobs, leaving seven original orders incomplete, including one partially planned order. Peak assigns all 125 jobs with a larger allocation. Increasing demand together with fleet capacity can improve coverage; this is not a prediction that peak operations are easier. At default settings the receiving-hours stress example produces 84 fully planned orders, 16 incomplete including two partial, and five closed retailers. Missing assignments arise from modeled constraints and heuristic results; no arbitrary failure percentage was injected.

| Distributor | Normal A | Normal B | Peak A | Peak B |
|---|---:|---:|---:|---:|
| Quezon City | 2 | 7 | 3 | 10 |
| Manila City | 2 | 8 | 3 | 11 |
| Makati | 3 | 8 | 4 | 11 |
| Pasig | 2 | 6 | 3 | 10 |
| Bulacan | 2 | 6 | 3 | 11 |
| Cavite | 2 | 6 | 3 | 10 |

These counts size the independently generated 100-order sample days, not the full 50,000-retailer footprint. Normal network results: 545/600 complete orders, 53/54 used/allocated vehicles, 1,319.9 KM and PHP 102,581. Peak: 578/600 complete, 80/82 used/allocated, 1,756.2 KM and PHP 149,296. These are synthetic demonstrations, not a general sizing recommendation. Exact figures change with settings. Spare allocated vehicles can coexist with missed orders when time windows, geography or the heuristic prevent service.

## 8. Reallocation policy

Daily: replan using available fleet and new orders, inspect exceptions and dispatch only reviewed routes. Weekly: monitor forecast bias, demand mix, cold share, coverage and route hours. Monthly: revisit baseline allocation, including local capacity sharing. Before September: stress-test Christmas scenarios and reserve seasonal rentals.

Illustrative investigation triggers: more than 10% demand drift for two consecutive weeks; coverage below 98%; utilization above 90% or below 55% for ten operating days. Tune these with leadership and local service objectives. Do not shift vehicles between distributors without considering repositioning cost and depot capability, which are absent from this prototype.

## 9. Validation and next steps

The automated suite checks repeatability, peak payload accounting, cold compatibility, capacity, full windows, return time, order conservation, visible infeasibility, ban waiting, regional consistency, GPS endpoints and invalid settings. Build/type checking validates integration. Browser journeys remain a separate verification gate; see the verification record for actual status.

Production next steps: obtain real data under proper access controls, geocode/validate mapping, calibrate travel and stop distributions, verify current restrictions, benchmark a solver against dispatcher plans, and conduct a limited field pilot with temperature monitoring. Quantify service/cost improvement against an agreed baseline before claiming savings.

## 10. Submission and review

Review the assumptions, narrative and results before creating the final PDF. The user has explicitly authorized source publication, and the code is now at [domzxc/locusprototype](https://github.com/domzxc/locusprototype). Render account connection and hosted smoke testing remain pending. After deployment, include the finalized approach PDF, GitHub link and verified live app link in the submission. No email has been sent and no hosted service has been deployed from this session; see the release log for publication evidence.


## Philippine logistics units and schedules

The app uses CBM (cubic metres) and KG for vehicle capacities, order loads and manifests; quantity remains boxes. One synthetic case represents one box. Each SKU has editable CBM/box and KG/box in Data studio. Total load is the sum of box quantity multiplied by its per-box CBM or KG; both capacity constraints must hold. These packaging measurements are assumptions, not measured supplier specifications. Existing settings without packaging arrays receive the previous defaults.

All clock fields and schedule displays use Philippine wall-clock time, PHT (UTC+8, Asia/Manila), independently of the browser timezone. Shift and illustrative truck-ban settings use clock inputs rather than raw minutes. Defaults are 6:00 AM-6:00 PM for the shift and 7:00 AM-9:00 AM for the illustrative ban. The ban is a synthetic, editable no-movement assumption, not a statement of current MMDA/LGU rules. Only same-day intervals are modeled; midnight in shift/ban end fields means the end of that day. Retailer receiving intervals remain within the same day.

Internal JSON schedule values remain minutes after midnight to preserve compatibility. Exports include unit/time-basis metadata; the numeric fields are not UTC timestamps. Fleet reserve is entered as a percentage (15 means 15%) and stored as a fraction (0.15). Costs use PHP and distance uses KM. CBM is the same volume unit previously labeled cubic metres, so renaming alone changes no allocation.


Current inventory extension: [Depot planning](depot-planning.md) saves the day demand and current A/B counts. Recommendation tables remain fleet-sizing outputs. Earlier peak performance rows use recommended peak fleets; saved current inventory no longer expands automatically on peak selection. Dispatch and Network overview test saved availability, with temporary Try recommended fleet experiments available locally.


## Daily crew availability extension

The demand-based normal/peak fleet remains the capacity target. Daily dispatch additionally restricts each depot/type to `min(physical trucks, present drivers, floor(present helpers / helpers required per truck))`; zero required helpers removes the helper limit. One driver per truck and one helper per truck initially are declared assumptions; helper requirement is editable. Scheduled and present headcounts are saved per type/depot, with no pooling or employee-level scheduling. Both approximate and road validation enforce the limit. Unassigned demand and idle physical truck costs remain visible. More vehicles alone cannot solve a staff shortage. Attendance history, leave forecasting and headcount-dependent payroll are not implemented.

Preparation readiness is distinct from departure. The configured no-movement interval applies only to its selected vehicle type; pre-ban legs may run if they finish by the start, while overlapping legs wait before travel. The manifest adds first-leg ban wait to readiness to show modeled departure. The default 7-9 AM Type B setting remains illustrative, editable and unverified against local regulations.

## Updated peak scenario: order frequency, working hours and proposed capacity

[Peak planning](peak-planning.md) supersedes earlier boxes-only peak results. Orders increase by an editable 1.5x default, boxes per order by 1.6x, and the vehicle shift limit by two hours (capped at midnight). Receiving windows do not extend. Repeat transactions retain their assigned retailer master, have unique order IDs and are not silently consolidated. Demand recommendations use the longer peak shift. The default Peak UI models max(saved trucks, recommended peak trucks) plus declared temporary driver/helper cover as a hypothetical package, with Current resources only as the constrained comparator. Inventory/attendance saved in masters stay unchanged. Costs use the same route/resource arithmetic; no normal-cost floor or artificial peak charge is applied. Normal/peak results are synthetic assumptions pending historical calibration.
