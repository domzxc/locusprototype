# DomTransport: approach and working prototype

**Submission edition | 24 October 2026 | synthetic data only**

## The fleet decision

DOMTRANSPORT | APPROACH AND WORKING PROTOTYPE

Prepared 24 October 2026. Synthetic data only. This document explains the implemented prototype, the mathematical approach, evidence and the next steps needed for operational use.

### The problem we address

A regional FMCG manager must allocate refrigerated Type A vans and larger dry Type B trucks to Quezon City, Manila City, Makati, Pasig, Bulacan and Cavite. Together these distributors cover about 50,000 mapped retailers. Each retailer belongs to one distributor; 50,000 retailers does not mean 50,000 orders every day.

The five SKUs are toothpaste, ice cream, soap, water purifier and tea. Ice cream requires refrigerated delivery. We must recommend normal-day and September-December peak capacity, and explain when to revisit that allocation.

### Our recommendation

- Size frozen and dry fleets separately using the greatest requirement for CBM, KG and available working hours, then add an explicit reserve.

- Test the fleet in daily dispatch against store receiving hours, payloads, available drivers/helpers, assumed traffic, illustrative restrictions and return-to-depot time.

- Compare saved current resources with a proposed peak truck-and-crew package. Inspect service gaps and cost together before changing permanent capacity.

> The brief describes five years of orders and retailer mapping, but those files were not supplied. No historical data or trained AI forecast is fabricated. All operational examples are seeded synthetic scenarios and editable assumptions.

### One order can require two deliveries

Our selected operating policy uses Type A for ice cream only and Type B for all dry products. A mixed retailer basket therefore becomes two delivery portions, potentially on different vehicles. This segregation policy is an additional assumption, not an explicit requirement to prohibit dry goods in Type A in the original brief.

| Example from the screen | Count |
| --- | --- |
| Retailer orders | 200 |
| Mixed orders needing a second temperature delivery | 54 |
| Required delivery portions: 200 + 54 | 254 |
| Planned portions / unserved portions | 224 / 30 |

224/254 does not mean 224 retailers served. A parent order is fully covered only when every required portion is planned. Some of the 30 missing portions may belong to partial orders. The screenshot does not establish the full-order coverage by itself.

## Assumptions and master data

PART 1 | INPUTS AND PHILIPPINE OPERATING TERMS

Every distributor has its own depot, five local traffic zones, synthetic retailer master, demand settings, fleet and attendance. Pasig is the main demo example; it is not a central warehouse serving all six distributors. No stock transfer or cross-depot vehicle pooling is modeled.

| Input | Illustrative default |
| --- | --- |
| Demo scale | 100 profiles/orders per distributor; 600 normal orders |
| Type A: refrigerated van | 5 CBM; 900 KG; PHP 1,700/day used + PHP 24/KM |
| Type B: dry box truck | 11 CBM; 2,500 KG; PHP 1,400/day used + PHP 16/KM |
| Normal working hours | 6 AM-6 PM PHT; 25 min preparation; one tour/truck |
| Peak demand / shift | 1.5x orders; 1.6x cases rounded up; +2 vehicle hours |
| Travel proxy | 22 KM/h; 1.35 distance detour; 1.35 area delay factor |
| Fleet reserve | 15% before integer rounding |
| Illustrative Type B restriction | 7-9 AM PHT; waits before overlapping driving legs |

### Product packaging and handling

| SKU | CBM/case | KG/case | Load min | Unload min |
| --- | --- | --- | --- | --- |
| Toothpaste | .035 | 12 | .2 | 1 |
| Ice cream | .090 | 18 | .5 | 2 |
| Soap | .050 | 16 | .2 | 1 |
| Water purifier | .220 | 25 | 1 | 5 |
| Tea | .040 | 8 | .2 | 1 |

One case represents one box. Full handling = loading allowance + unloading + 5 minutes fixed tasks per stop. Warehouse loading queues are not separately simulated. Driving, store waiting and ban waiting are separate.

### Receiving windows, staff and provenance

Receiving windows and closed-day flags are editable. Default windows open at 8, 9, 10 or 11 AM for four hours. Closed stores remain demand exceptions; archived stores leave demand. One present driver and one helper per truck are initially assumed; helper requirements are editable.

Pasig delay factors: Kapitolyo 1.20, Ortigas 1.65, Rosario 1.40, Santolan 1.30, Pinagbuhatan 1.25. A 1.20 factor means 20% extra time, not live congestion.

> The public Metro Manila address reference catalog is kept separate from dispatch. Its source does not establish supplier receiving windows, verified coordinates or retailer-to-distributor relationships. All delivery master records used in this submission are synthetic.

## Forecast demand and size the fleet

PART 1 | IMPLEMENTED HEURISTIC AND PROPOSED FORECASTING

### Production forecasting: proposed, not trained in the app

With the five-year dataset, validate quantities, duplicates, cancellations, stockouts, changing addresses and distributor mappings. Aggregate by distributor, SKU and date. Forecast order frequency, case quantities and cold/dry mix separately, including weekday, promotion, holiday and September-December effects.

Compare seasonal-naive and moving-weekday baselines with seasonal regression or gradient boosting. Use rolling-origin backtests, WAPE/MAE, forecast bias and uncertainty coverage. Choose a service quantile with leadership. The prototype instead uses a fixed seed and declared peak multipliers; its 15% reserve is not a calibrated forecast quantile.

### The implemented binding-resource calculation

> Vehicles of each type = ceil[(1 + reserve) x max(total CBM / truck CBM, total KG / truck KG, workload hours / available hours)].

Workload includes delivery handling plus a nominal 2.4 KM per stop, adjusted for detour, speed and traffic factors. Available hours = (shift end - shift start - preparation) / 60. Only serviceable, non-closed jobs enter sizing. Empty demand requires zero trucks. This formula estimates a starting fleet; it cannot guarantee receiving-window feasibility.

Business example: if space needs 4 trucks, weight needs 3 and time needs 6, time sets the requirement. With a 15% reserve, ceil(6 x 1.15) = 7. Compute this separately for frozen and dry work.

| Distributor | Normal A | Normal B | Peak A | Peak B |
| --- | --- | --- | --- | --- |
| Quezon City | 2 | 7 | 4 | 15 |
| Manila City | 2 | 8 | 3 | 16 |
| Makati | 3 | 8 | 5 | 16 |
| Pasig | 2 | 6 | 3 | 15 |
| Bulacan | 2 | 6 | 5 | 16 |
| Cavite | 2 | 6 | 5 | 15 |

These are fresh-default sample recommendations for 100 normal and 150 peak orders per distributor, not a fleet acquisition answer for all 50,000 retailers. Peak includes larger baskets and a later shift. Saved edits and road validation change outcomes.

### Separate the requirement from what can run today

Recommended fleet is the demand-based target. Current fleet is the saved physical inventory. Crew-ready trucks = min(physical trucks, present drivers, floor(present helpers / helpers per truck)); zero required helpers removes the helper limit. No staff or vehicles are silently borrowed across depots.

The fleet experiment also offers explicit temporary crew cover without changing saved attendance. Proposed peak uses max(saved trucks, recommended peak trucks), capped at 500/type, and declares temporary crew cover separately. It does not edit saved inventory or actual attendance. Current-resources peak shows the same demand against the saved fleet and crew.

## Mathematical models and constraints

PART 1 | TARGET OPTIMIZATION VERSUS CURRENT IMPLEMENTATION

The workload formula and greedy sequencing are implemented. The optimization models below describe the proposed production upgrade; the prototype does not run a mathematical optimizer or prove a globally lowest-cost solution.

### Fleet investment and seasonal capacity

For depot d, vehicle type t and demand scenario s, let n[d,t] be permanent vehicles and h[d,t,s] seasonal rentals. Minimize permanent ownership cost + expected seasonal rental and operating cost + explicitly priced service shortfalls, subject to budget, compatible routing and an agreed service-level target. Compare candidates over historical and forecast scenarios before buying permanent capacity.

### Heterogeneous-fleet routing with time windows

Each node i is a frozen or dry delivery portion. Define y[i,k] = 1 when vehicle k serves it, u[i] = 1 when it is unserved, x[i,j,k] = 1 for a traveled arc, z[k] = 1 for a used vehicle, and T[i,k] as service start. A mixed parent contributes two nodes; its completion requires both assigned.

> Target objective: minimize sum(fixed vehicle cost x z) + sum(cost per KM x distance x x) + sum(service penalty x u).

| Constraint | Business interpretation |
| --- | --- |
| sum_k y[i,k] + u[i] = 1 | Every portion is assigned once or explicitly unserved |
| sum_i volume[i] y[i,k] <= capacity[k] z[k] | One loaded tour fits CBM |
| sum_i weight[i] y[i,k] <= payload[k] z[k] | The same tour also fits KG |
| Cold/dry compatibility restrictions | Frozen only on A; dry only on B under our policy |
| open[i] <= T[i,k]; T[i,k] + service[i] <= close[i] | Full handling, not only arrival, fits receiving hours |
| Time propagation along selected arcs | Travel, handling and waits determine the next stop |
| Departure/return flow and subtour elimination | One connected depot tour per used truck |
| Crew-ready and shift/restriction constraints | Available staff; return by end; wait for modeled ban |

Time propagation uses a justified tight big-M or indicator constraint for unselected arcs. Production needs departure-dependent travel functions and verified truck access, not just a driving-profile route. Link parent-order completion variables to all its portion assignments when pricing service outcomes.

### Variables considered

Order counts, SKU cases, CBM/KG per case, temperature class, store/depot coordinates, receiving windows, handling and preparation, base and road travel, assumed area delays, illustrative ban intervals, shift hours, reserve, fleet availability, staff attendance and operating/risk cost inputs. Production additionally needs actual road restrictions, breaks, reloads, rental terms, temperature and execution observations.

## How daily dispatch is built

PART 2 | SEQUENCE, ROADS AND VISIBLE EXCEPTIONS

### 1. Generate and split demand

Create seeded synthetic parent orders tied to local retailer profiles. Split mixed baskets into separate frozen/dry portions, conserving quantities, CBM and KG. Peak may repeat transactions at the same assigned store with unique order IDs; repeat jobs are not automatically consolidated.

### 2. Build compatible tours

Process staffed A then B trucks. Among pending compatible jobs that fit residual tour capacity, calculate travel, ban wait, store wait, handling finish and return. Reject an append if full service misses closing or depot return exceeds shift end.

### 3. Choose the next feasible stop

The greedy score is 3 x leg KM + 0.12 x store-wait minutes + 0.012 x (receiving close - shift start). The lowest score is appended. These are declared ranking weights, not trained AI weights or a monetary objective.

### 4. Validate the existing sequence against roads

OSRM supplies ordered driving legs, distances, durations and geometry. Assumed area/zone delays adjust travel. Road validation removes failing stops and reroutes the remaining sequence, up to five passes per vehicle. Updates publish atomically; errors retain the labeled previous travel basis.

### 5. Review before dispatch

Inspect every portion, its vehicle sequence, PHT arrival/start/finish, load, costs and exception reason. Scheduled, in-progress and served map states are simulated from the clock. Unserved and partial orders stay visible.

> No depot reload, second tour, job exchange or reinsertion of removed road stops is implemented. A 3 PM return can be a short validated tour or search limitation; it is not proof every store was served, or proof more trucks are needed.

### Precise reasons rather than one combined failure

Reasons distinguish closed receiving, handling longer than a window, oversized CBM/KG, no compatible truck, no crew, late full service, late depot return, or unresolved validation/search limits. Road failures report the attempted PHT timing and incoming drive/store/ban waits. Approximate final-tour checks disclose potential appends that were not retried. A failed sequence is not proof every possible sequence fails.

A restriction applies only to its configured type. A leg finishing before 7 AM may run under the default Type B example; a leg overlapping 7-9 AM waits at its origin. Store waiting and handling can continue during the interval. This is an illustrative rule, not verified Philippine regulation.

## Evidence from the working prototype

PART 2 | FRESH DEFAULTS, APPROXIMATE TRAVEL, 24 OCTOBER 2026

The tables below are regenerated from the checked-in engine with fresh settings, not from the user's saved 200-order Pasig browser sample. Road validation can produce different distances and lower coverage. All numbers are modeled outcomes, not observed deliveries or market quotes.

| Network view | Orders | Complete | Used / fleet | Operating PHP |
| --- | --- | --- | --- | --- |
| Normal / current | 600 | 545 | 53 / 54 | 117,464 |
| Peak / current | 900 | 405 | 54 / 54 | 107,617 |
| Peak / proposed | 900 | 877 | 116 / 118 | 240,012 |

The proposed peak package adds 64 trucks, 64 temporary drivers and 64 helpers across the sample network. It increases complete orders from 405 to 877 out of 900 versus current-resource peak. These are hypothetical additions using standard configured rates, not a procurement commitment.

| Pasig view | A / B | Full orders | Planned portions | Operating PHP |
| --- | --- | --- | --- | --- |
| Normal / current | 2 / 6 | 93 / 100 | 118 / 125 | 16,831 |
| Peak / current | 2 / 6 | 68 / 150 | 96 / 184 | 15,583 |
| Peak / proposed | 3 / 15 | 150 / 150 | 184 / 184 | 33,663 |

| Pasig view | Used | CBM use | KM | Drops/truck |
| --- | --- | --- | --- | --- |
| Normal / current | 8 | 65.6% | 164.9 | 14.8 |
| Peak / current | 8 | 95.1% | 107.8 | 12.0 |
| Peak / proposed | 17 | 86.6% | 247.1 | 10.8 |

### Read the measures together

- Order coverage = fully planned parent orders / all parent orders. Partial orders are incomplete, even if one temperature portion is scheduled.

- Window compliance = assigned portions finishing by receiving close / assigned portions. The app shows planned/required counts and excluded unserved portions. A 100% check can coexist with lower coverage.

- Utilization = average used-truck CBM load / capacity; examine KG, route hours and staff too. It is not the share of all physical fleet capacity.

- Average drops = assigned frozen/dry jobs / used trucks. Two temperature portions or repeat transactions at one store can count separately; it is not distinct retailers reached.

- Distance includes depot returns. Operating cost reflects resources actually used plus stated idle/add-on allowances. Lower constrained spend with missed service is not a saving.

> Illustrative normal Pasig: 100 orders become 125 portions; 118 are planned, 93 parent orders are fully covered and one is partial. Base transport is PHP 14,893; the fuller operating estimate is PHP 16,831. Do not mix the two cost definitions.

## Cost and business exposure

PART 1 AND 2 | TRANSPARENT PHP ASSUMPTIONS

The planner evaluates cost after routing. It does not optimize the complete cost model. Every rate below is an editable scenario input, not a supplier quote, statutory payroll calculation or verified toll tariff. Set add-ons to zero if they are already included in base charges.

| Cost input | Type A | Type B |
| --- | --- | --- |
| Fixed / used vehicle-day | PHP 1,700 | PHP 1,400 |
| Base running / KM | PHP 24 | PHP 16 |
| Idle ownership / unused day | PHP 1,000 | PHP 800 |
| Additional maintenance / KM | PHP 3 | PHP 2 |
| Toll allowance / used tour | PHP 80 | PHP 120 |
| Crew overtime / hour | PHP 120 | PHP 100 |

### Operating estimate

- Base transport = sum(used fixed charge + tour KM x running rate).

- Idle = sum(unused allocated trucks x idle daily rate). A vehicle receives used or idle charges, never both.

- Maintenance = sum(tour KM x additional maintenance rate). Tolls = flat allowance per used tour.

- Overtime = sum(max(0, route duty hours - paid hours) x crew hourly rate). Duty starts at shift start and ends on depot return; paid hours default to eight.

- Operating estimate = transport + idle + maintenance + tolls + overtime. A longer allowed shift does not automatically bill the whole extension.

### Separate risk from actual operating expense

Expected frozen damage = assigned frozen cases x assumed book value x expected damage fraction. Defaults are PHP 1,200/case and 1%. This is an exposure proxy, not temperature-derived spoiled stock.

Unserved contribution profit exposure = missing cases by SKU x assumed contribution margin. Default margins per case: toothpaste PHP 80, ice cream 150, soap 70, water purifier 400 and tea 60. A partial order contributes only its missing portion. A delayed order is not automatically a confirmed lost sale.

> Combined scenario estimate = operating + expected spoilage + unserved contribution margin. Keep this separate from operational expenditure; do not describe opportunity exposure as an invoiced or confirmed loss.

### What still needs a production budget

Seasonal rental premiums, recruitment, regular temporary staff wages, absence payroll, detailed financing/insurance/tax and calibrated breakdown or spoilage models are not separately priced. The used-truck base charge assumes crew provision. The proposed seasonal package uses configured normal rates, so it is a resource scenario rather than a complete rental or staffing budget.

## Management controls and review policy

PART 1 | KEEP THE ALLOCATION RESPONSIVE

| Module | What leadership can review |
| --- | --- |
| Network overview | All or one depot; normal/peak service, fleet, attendance and cost |
| Depot planning | Independent order count, physical A/B trucks and crew attendance |
| Dispatch planner | Road/approximate plan, GPS simulation, manifests and unserved review |
| Fleet allocation | Six-depot normal/peak demand-based recommendations |
| Retailer management | Synthetic profiles, receiving windows, closed/archived stores |
| Data studio | Traffic, packaging CBM/KG, handling, costs, shifts and restrictions |
| CSV portability | Network/dispatch/allocation reports and validated settings/master backups |

### When to revisit the fleet

- Daily: update demand, actual truck availability and present crew; review all unserved/partial portions and dispatch only reviewed plans.

- Weekly: check bias, order frequency, cold share, workload and service; investigate more than 10% demand drift for two weeks.

- Monthly: revisit baseline allocation when coverage is below an illustrative 98% target, or CBM utilization stays above 90% or below 55% for ten operating days.

- Before September: test order growth, larger baskets, traffic, receiving restrictions and attendance scenarios; reserve seasonal capacity before deciding permanent additions.

Thresholds are investigation triggers, not calibrated contractual service levels. Consider geography, receiving hours, crew and routing quality before treating every miss as a truck shortage. Cross-depot reallocation would require positioning cost, capability and mapping checks not present in this demo.

### Limits to state openly

No supplied five-year history; no trained demand forecast; no live traffic, actual GPS or proof of delivery; no verified truck-access/ban geography or temperature telemetry. One tour per truck, no reload, breaks, dock queues or depot pooling. Road validation checks an existing sequence and may leave feasible alternatives undiscovered. Public routing availability and synthetic road snapping limit accuracy.

Browser-local storage is independent by origin/device. Apply edits before backing up. All exports are CSV; settings and synthetic retailer CSVs can be imported, with older JSON backups still accepted. Public references cannot become dispatch masters. Plan reports are not settings backups; avoid summing summary and vehicle record types together.

## Submission and panel demonstration

PART 3 | A CLEAR 30-MINUTE LEADERSHIP DISCUSSION

| Segment | Suggested demonstration |
| --- | --- |
| 15 min: approach and live demo | Business question; explain space/weight/time; open Pasig; inspect road route and times; show one unserved reason; test attendance and peak resources |
| 5 min: how it was built | React/TypeScript/Vite, MapLibre and browser logic; AI-assisted coding and debugging; seeded data; invariant tests; road validation and CSV revisions |
| 10 min: Q&A | Defend assumptions, missing history, order versus portion counts, early returns, cost scope and next production steps |

### Three concise answers to rehearse

- Why 254 when there are 200 orders? Fifty-four mixed baskets need separate frozen and dry deliveries. There are 254 required portions; full parent coverage needs every portion.

- Why are trucks back at 3 PM? Their current loaded tours ended. No reload or reinsertion is planned; inspect failed timings and search limits before adding trucks.

- Does 100% on time prove all stores were served? No. It checks only scheduled portions. The app also shows scheduled/required portions, incomplete parent orders and unserved reasons.

### Verification and practical limits

The updated application passes 106 automated tests and the TypeScript/Vite production build. Checks cover payload/temperature, full windows, depot return, crew, peak, costs, conservation, road fixtures, CSV round-trips and server-rendered scope views. The existing large MapLibre bundle warning remains. Server-rendered and HTTP checks do not prove browser interactions, WebGL, actual delivery feasibility or spreadsheet display.

### Submission links

Source repository: https://github.com/domzxc/locusprototype

Application address: https://domtransport.onrender.com

Approach PDF: DomTransport-Approach.pdf. Accompanying email draft: docs/submission-email.md. Check the deployment record for the latest public-release verification before sending. No email is sent by this document generator.

### Useful technical references

Implementation and validation: engine.js, scenarios.js, road-routing.js, staffing.js, costing.js, csv-exports.js and docs/verification.md. Rehearsal: docs/panel-guide.md. Provider references: project-osrm.org/docs/v5.24.0/api/ and render.com/docs/static-sites.

> Recommended next stage: obtain the real history and operating data, calibrate time/cost assumptions, benchmark a routing solver, validate truck access and cold-chain controls, then run a limited field pilot before claiming business savings.
