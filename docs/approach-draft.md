# DomTransport: fleet allocation and daily dispatch

**Review draft · 23 October 2026 · synthetic data only**

## 1. Leadership recommendation

Separate a recurring fleet decision from daily dispatch. Forecast each distributor's cold and dry workload, establish a normal baseline, reserve incremental capacity for peak demand, then test the allocation against actual delivery windows, payloads and travel conditions. Revisit allocations when demand or service indicators drift.

The prototype demonstrates this loop for Pasig. It does not infer actual fleet requirements from the problem statement alone: five years of historical orders, capacities and retailer mapping were described but not supplied. Every numerical input below is an illustrative assumption.

## 2. Assumptions and synthetic data

| Input | Assumption |
|---|---|
| Mapped retailer population | 50,000 across all six distributors |
| Distributor shares | QC 11,000; Manila 10,000; Makati 9,000; Pasig 5,000; Bulacan 8,000; Cavite 7,000 |
| Daily activity | 2% of mapped retailers at default settings; 1,000 daily regional orders, including 100 Pasig orders |
| Pasig location model | Five synthetic clusters near Kapitolyo, Ortigas, Rosario, Santolan and Pinagbuhatan, not actual retailer addresses |
| SKU unit | A synthetic case; sizes and weights are assumed, not commercial specifications |
| Cold demand | Approximately 28% chance of ice cream per basket; mixed baskets become separate frozen and dry deliveries |
| Normal basket | Each dry SKU 0–3 cases; ice cream 1–3 when present; empty basket repaired to one toothpaste case |
| Peak scenario | Each nonzero case quantity multiplied by 1.6 and rounded up; same retailer count and seeded windows. Rounding means aggregate growth is greater than exactly 60% |
| Windows | 08:00, 09:00, 10:00 or 11:00 opens, four-hour windows, full handling must finish before close |
| Shift | 06:00–18:00; 25 minutes fixed depot preparation; one trip per vehicle |
| Type A | Refrigerated; 5 m³, 900 kg; PHP 1,700 per used vehicle/day plus PHP 24/km |
| Type B | Dry; 11 m³, 2,500 kg; PHP 1,400 per used vehicle/day plus PHP 16/km |
| Base travel | 22 km/h; haversine distance × 1.35 detour; time × 1.35 network traffic factor × destination zone factor |
| Zone traffic factors | Kapitolyo 1.20, Ortigas 1.65, Rosario 1.40, Santolan 1.30, Pinagbuhatan 1.25 |
| Fleet reserve | 15% workload buffer before rounding vehicle counts |
| Restriction | Illustrative Type B no-movement interval 07:00–09:00; origin waiting if a modeled leg would overlap; applies to all modeled travel, including depot return |
| Regional transfer | All six use the Pasig basket/handling/travel workload proxy. No regional road-network or geographic validation |
| Receiving hours | Editable same-day opening/closing times and closed-day flag for every synthetic Pasig retailer; full handling must fit |
| Load segregation | User-selected policy: ice cream only on Type A, dry products only on Type B. The challenge does not explicitly authorise mixed frozen/dry loads |

| SKU | m³/case | kg/case | Load min/case | Unload min/case | Compatibility |
|---|---:|---:|---:|---:|---|
| Toothpaste | 0.035 | 12 | 0.2 | 1 | B only |
| Ice cream | 0.09 | 18 | 0.5 | 2 | A only |
| Soap | 0.05 | 16 | 0.2 | 1 | B only |
| Water purifier | 0.22 | 25 | 1 | 5 | B only |
| Tea | 0.04 | 8 | 0.2 | 1 | B only |

Handling time at each delivery stop is five minutes fixed plus sum of its case quantities × (loading + unloading minutes). Both case handling components are conservatively charged at each stop, including in the receiving window. A mixed parent order needs two deliveries and incurs the fixed stop handling twice. This is a time-budget proxy; it does not simulate warehouse loading operations. Fixed depot preparation is separate.

Retailer management contains editable synthetic profiles and receiving hours for the Pasig demo, replacing the former receiving-hours-only editor in Data studio. Add/edit identities, locations, distributor assignments and schedules; archive/restore profiles; import/export JSON; then apply. Closed retailers remain in demand and count as incomplete, while being excluded from allocation's serviceable workload. Archived profiles leave daily demand. A labeled stress example closes the first five active Pasig retailers and gives the next ten short receiving windows. It is a chosen sensitivity scenario, not a forecast of failed deliveries. No weekly calendar, holidays, multiple daily intervals, receiving-dock capacity or actual delivery confirmations are modeled. Pasig-specific profiles and hour overrides are not copied to the other distributors' synthetic retailer IDs.

A separate, source-linked Metro Manila public branch/address catalog is available for reference only. It is not used as dispatch data and contains no asserted receiving windows or verified coordinates. See the retailer-management guide for provenance and separation from the synthetic panel dataset. After an explicit master is applied, the number of active Pasig profiles determines that demo's order count; the configured generated-order count remains the regional proxy baseline. The initial unedited master preserves the 100-order baseline.

All assumptions above can be reviewed. The interface edits demand, time, payload, cost and traffic inputs; case dimensions and weight constants and the mapped-retailer split are documented source constants. Settings JSON preserves the complete editable configuration, including zone coordinates.

## 3. Forecasting approach for supplied historical data

Aggregate five years of retailer orders by distributor, SKU and date; validate case units, cancellations, duplicates, stockouts, addresses and mapping changes. Forecast case demand and active delivery stops separately. Cold delivery workload depends on cold baskets, not only on ice cream volume.

Compare seasonal-naive, moving weekday averages and a seasonal regression or gradient-boosted model with holidays, September–December seasonality and promotions. Use rolling-origin backtesting with no future leakage. Track WAPE or MAE at distributor/SKU level, forecast bias and empirical quantile coverage; do not rely only on percentage errors for intermittent SKUs. Choose an uncertainty quantile with leadership based on cost and service requirements. The 15% prototype reserve is an assumption, not a calibrated quantile.

The browser prototype generates seeded demand; it does not train or run a forecasting model. Production should test peak order-count growth as well as larger baskets; the implemented peak scenario tests basket growth only.

## 4. Implemented allocation model

For distributor d and vehicle class t, split each basket into a frozen job for Type A and a dry job for Type B, omitting empty portions. Preserve original order IDs for completion accounting. Let:

- V_dt and W_dt be total assigned basket volume and weight;
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
- Distance includes estimated depot return legs. Travel is straight-line distance adjusted by detour, not navigable road distance.
- Cost = used-vehicle daily fixed charge + estimated km × per-km charge. Idle ownership, tolls, overtime, separate spoilage and lost-sales costs are excluded.
- GPS is interpolated simulation along planned connections. It respects modeled waits and returns; it is not a telemetry feed.

At seed 42 and initial defaults, observed engine results:

| Scenario | Allocated A/B | Used | Served | Mean volume utilization | Estimated km | Modeled cost |
|---|---|---:|---:|---:|---:|---:|
| Normal | 2 / 6 | 8 | 93 / 100 | 65.6% | 164.9 | PHP 14,893 |
| Peak | 3 / 10 | 12 | 100 / 100 | 84.4% | 185.0 | PHP 20,736 |

The 100 original retailer orders produce 125 frozen/dry jobs. Normal assigns 118 jobs, leaving seven original orders incomplete, including one partially planned order. Peak assigns all 125 jobs with a larger allocation. Increasing demand together with fleet capacity can improve coverage; this is not a prediction that peak operations are easier. At default settings the receiving-hours stress example produces 84 fully planned orders, 16 incomplete including two partial, and five closed retailers. Missing assignments arise from modeled constraints and heuristic results; no arbitrary failure percentage was injected.

| Distributor | Normal A | Normal B | Peak A | Peak B |
|---|---:|---:|---:|---:|
| Quezon City | 3 | 13 | 6 | 22 |
| Manila City | 3 | 12 | 5 | 20 |
| Makati | 3 | 11 | 5 | 18 |
| Pasig | 2 | 6 | 3 | 10 |
| Bulacan | 3 | 10 | 4 | 16 |
| Cavite | 2 | 9 | 3 | 15 |

These are synthetic demonstrations, not a general sizing recommendation. Exact figures change with settings. The peak example has one idle allocated vehicle; reserve is not automatically waste.

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
