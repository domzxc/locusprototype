# Panel presentation and defence

Review draft · 30-minute session. The approach document is `approach-draft.md`.

For technical rehearsal, read [module review notes](prototype-review-notes.md); for the reasons behind the core changes, read [the decision record](core-changes.md). Both match the current six-distributor implementation and distinguish sample-day results from production recommendations.

## Problem statement and depot scope

The regional manager must allocate refrigerated Type A vans and larger dry Type B trucks to six distributors for normal days, September-December peak season, and changing demand. They serve about 50,000 mapped retailers. Each retailer has one distributor; that population is not a daily order count. Five SKUs are sold: toothpaste, ice cream, soap, water purifier and tea. Ice cream needs frozen transport.

Pasig is the main presentation example, **not one central depot serving all six distributors' retailers**. Each distributor has its own modeled depot and retailer master. Its vehicles start and return there. No stock transfers, vehicle pooling or reassignment between depots are modeled.

The challenge describes five years of orders, vehicle details, addresses and mappings, but no actual files were supplied. Our demo uses synthetic orders and declared assumptions. It does not claim trained forecasts or real execution results.

## Part 1: approach, models and variables in business terms

1. **Understand what must be delivered.** For each distributor, read product boxes, space in CBM, weight in KG, frozen/dry requirements, store locations and receiving hours. Peak increases order count and box quantities separately and allows a later shift end. Extra transactions may repeat at existing assigned stores; it does not silently create stores. Real order history would support the production forecast.
2. **Estimate the work.** Include loading/unloading allowances, fixed stop handling, assumed traffic delays, available shift hours, vehicle capacity and a safety allowance. The daily route check additionally applies road legs, full receiving windows, illustrative truck-ban waiting and return-to-depot time.
3. **Choose the limiting requirement.** Work out trucks needed for space, weight and hours; use the largest requirement, add reserve and round up. Calculate A and B separately. If space needs 4 trucks, weight needs 3 and time needs 6, time is the limiting factor; a 15% allowance gives ceil(6 x 1.15) = 7 in that illustration. The fresh Pasig sample actually recommends 2 A + 6 B; saved edits can change it.
4. **Check service and cost.** Route the proposed fleet. Keep incomplete and partial orders visible. Estimate base transport, idle fleet, maintenance, toll allowance and overtime; show estimated frozen damage and profit at risk separately. These are assumptions, not confirmed losses or invoices.
5. **Plan for change.** Compare normal/peak, replan daily, review demand weekly and fleet monthly/before peak. Investigate sustained demand drift, missed stores, unused trucks or high space use before changing permanent capacity.

The implemented models are a binding-resource workload estimate and a greedy, constraint-aware routing heuristic, followed by road validation of its existing sequence. They are not mathematical optimizers. The approach draft describes proposed production forecasting, heterogeneous-fleet routing and scenario fleet investment models.

Main variables: distributor-to-retailer assignment; order counts; product mix/box quantities; CBM/KG per box; truck capacities/costs; retailer/depot coordinates; receiving windows and closed/archive status; loading/unloading/fixed handling; road distance/base time; assumed area and zone congestion; PHT shift/preparation/ban interval; reserve; peak growth; idle/maintenance/toll/overtime rates; frozen inventory cost/damage assumption; contribution profit per undelivered SKU box.

## Part 2: what the live prototype demonstrates

| Requirement | What to show |
|---|---|
| One distributor, about 100 synthetic orders | Select Pasig. A fresh master starts with 100 profiles; saved edits may differ. The same workflow is also available for the other five distributors |
| Location, SKU mix, volume and delivery window | Order book and retailer/product masters show coordinates, boxes, CBM/KG and receiving hours |
| Vehicles allocated in Part 1 | Initial current fleet is assumed from the normal recommendation once. Save actual scenario availability in Depot planning, compare current vs recommended, and use temporary overrides for what-if tests |
| Vehicle assignment and sequence on a map | Wait for automatically requested roads, select a truck, inspect its numbered manifest and play the road-following simulation |
| Capacity, windows and frozen compatibility | Both CBM/KG limits, full handling before store close, shift return and temperature separation are enforced; road-infeasible stops remain exceptions |
| Vehicles, utilization, distance, on-time and cost | Show used/allocated vehicles, truck space use, road KM, assigned-job window compliance, complete-order coverage, drops and the cost breakdown |
| Fleet too large or too small | Compare idle trucks and missed stores. Tight receiving hours, truck bans, poor sequences or an oversized job may need a different fix from adding vehicles |

This is a synthetic day tested under operational constraints, not a record of actual deliveries. A mixed order has frozen and dry jobs; both must fit to count complete. The chosen policy keeps dry products on B as well as ice cream on A. There is no same-truck frozen/dry co-loading.

## Plain-language labels to rehearse

| Interface label | Explain it this way |
|---|---|
| Extra travel time in this zone (%) | An assumed congestion delay. 65% turns 20 minutes into 33 minutes before the area-wide delay |
| Extra travel time across the area (%) | Another assumed delay applied across the distributor. It combines by multiplication with the local delay, not simple addition |
| Regular paid working hours / day | The assumed paid-hours allowance before the model adds overtime cost |
| Estimated frozen boxes damaged or spoiled (%) | An assumed risk fraction, not a measured failure rate |
| Cost value of one frozen box (PHP) | Inventory cost used to estimate damage exposure, not selling price |
| Estimated profit at risk per undelivered box | Contribution profit potentially missed on unassigned boxes, not full sales revenue or a confirmed cancellation |

The user chose **road routes with assumed traffic only**. No live traffic provider is connected. A short road trip can still take substantial total time once truck-ban waiting, receiving wait and handling are added. The manifest separates those minutes. Per-box loading and unloading are conservatively budgeted inside stop handling; there is no separate warehouse loading queue simulation.

## Opening: the decision in 30 seconds

“I separated the strategic fleet decision from daily routing. We size refrigerated capacity for cold-chain demand, use larger dry trucks for compatible baskets, reserve seasonal uplift, and validate the fleet against daily service constraints. Every figure in this demo is synthetic. I will show both a feasible plan and what happens when capacity becomes insufficient.”

## 15 minutes: approach and live demo

| Time | Action | Leadership message |
|---|---|---|
| 0–3 | State service/cost objective, retailer split and missing inputs | Explain assumptions before showing impressive numbers |
| 3–5 | Open Network overview, then Fleet allocation; normal vs peak samples | Separate permanent baseline from seasonal rental reserve |
| 5–7 | Explain binding volume / weight / time workload, then routing validation | Aggregate sizing alone cannot guarantee feasibility |
| 7–9 | Open Dispatch; normal seed 42; show 100 orders and coverage | Cold chain and full windows are modeled hard constraints |
| 9–10 | Select A-01 and inspect its manifest | Only ice cream on A; dry portions travel separately on B. Show KG, CBM and parent retailer IDs |
| 10–11 | Wait for road validation; play road simulation, pause and scrub | Clearly label simulation and estimated travel |
| 11–12 | Switch to peak | Larger baskets increase payload/handling, with integer case rounding |
| 12–13 | Set both fleet counts to zero or sharply reduce them | Coverage collapses; unassigned orders remain visible; on-time alone is insufficient |
| 13–14 | Restore recommendation; change network traffic to 2 in Data studio and Apply | The model recalculates allocation and dispatch under changed assumptions |
| 14–15 | State limitations and validation roadmap | Offer a credible pilot rather than unsupported savings claims |

Before rehearsing, load default settings in Data studio and apply. Restore them after the traffic stress example. Export a default normal and peak plan JSON as backup evidence. Have an offline screenshot and manifests available if basemap tiles fail; this app does not implement an offline tile cache.

## 5 minutes: build story

1. **Tools:** React, TypeScript, Vite, MapLibre and Node's built-in test runner; AI coding assistance. No runtime model/API, backend or production data.
2. **Prompts that explain the method:** “Generate reproducible synthetic orders with SKU cases and windows”; “Preserve full-service windows, cold-chain compatibility, both payload limits and depot return”; “Leave infeasible orders visible”; “Write tests that fail if these constraints are broken.” These are representative implementation prompts, not a claim of a separate saved prompt transcript.
3. **Useful failure:** peak payloads initially increased without changing displayed case quantities. A test exposed the mismatch; peak cases now round up first, then payload and service time derive from those cases.
4. **Data quality:** invalid imported zone coordinates were accepted; validation was tightened. Settings are exported as versioned JSON and saved only in the browser.
5. **Honest status:** TypeScript/build and automated planning tests were run. Browser automation availability and actual UI verification must be reported separately. No live deployment is claimed until verified.

## 10 minutes: likely questions

**“Why this fleet size?”** Show the maximum of volume, weight and work-hour requirements plus a declared 15% buffer. Then show the daily route check. Emphasise that the reserve is illustrative, not derived from five years of actual data.

**“Why not use only Type A?”** Refrigerated vans are smaller and cost more per kilometre in our assumptions. The selected operating policy keeps ice cream on A and dry products on B. The problem requires frozen delivery on A but does not explicitly permit frozen/dry co-loading. We chose separate deliveries; a mixed retailer basket needs both jobs assigned before it counts as fully planned.

**“Are the routes optimal?”** No. Greedy, window-aware sequencing offers speed and explainability. Assigned orders respect the modeled constraints, but a solver could find better distance, cost or coverage. Benchmark with a heterogeneous VRPTW solver before operational use.

**“What does 100% window compliance mean?”** Only assigned delivery jobs are in that denominator. The routing engine rejects jobs that cannot finish inside the receiving window, so assigned jobs can have 100% modeled compliance while original-order coverage is lower. The default approximate normal plan fully covers 93 of 100 parent orders and has seven incomplete orders, including one partial. Actual delivery performance is unknown until confirmations exist.

**“Can you edit retailer receiving times?”** Yes. Retailer management has a searchable synthetic master with editable identity, location, one assigned distributor, opening/closing times, active/archive state and closed-day status. Update a profile in the editor, then apply the master to replan. Closed retailers and infeasible windows remain visible in exceptions. Public Metro Manila directory references are in a separate tab and are not assumed to provide supplier receiving times. The stress example is a declared scenario, not fabricated evidence of a real failure rate. Weekly calendars, lunch intervals and dock contention are future extensions.

**“Do you actually have five years of data?”** No. It is described in the challenge but not supplied. Explain the forecasting/backtesting approach, while labelling every prototype result synthetic.

**“What about traffic and truck bans?”** Editable multipliers and one conservative no-movement interval. These are assumptions, not legal guidance or live traffic. Production needs a verified road/time/vehicle restriction network and actual travel calibration.

**“Is this live GPS?”** No. Marker positions interpolate the modeled route schedule, including waiting. A GPS integration would require a telemetry source and operational validation.

**“How much money will this save?”** The demo does not establish savings. Define a current dispatch baseline and compare equal-service scenarios including lease, labour, tolls, refrigeration, failed deliveries and lost sales. Report uncertainty, not a fabricated percentage.

**“What is your biggest gap?”** Local travel and demand calibration, solver benchmarking and field validation. All six now have independent synthetic masters, but their traffic, depot coordinates and demand remain assumptions. Sample-day fleets are not full-network acquisition recommendations.

**“How will you refresh allocation?”** Daily dispatch, weekly forecasts and monthly baseline reviews. Investigate persistent demand drift or utilization/service thresholds; prefer seasonal rental for temporary peaks before acquiring permanent fleet.

## Rehearsal checklist

- Confirm the browser opens the app, MapLibre tiles render and vehicle selection/playback work.
- Test settings Apply, failed import, successful settings export/import and reload persistence.
- Test peak scenario, zero-fleet exceptions and restore recommendation.
- Prepare final PDF only after draft review. Include app and GitHub links after deployment smoke testing.
- Choose submission date after review; the interview is the next day. No deadline has been committed on your behalf.


Philippine-unit defence: "We plan against both CBM and KG because a load can reach its space limit before its weight limit, or vice versa. SKU boxes are converted using editable packaging assumptions. All receiving, shift and truck-ban times are PHT. The demo restriction is illustrative; production needs verified MMDA/LGU rules by road, vehicle class, day and exemption."


**Why all six now?** The challenge required only one routed distributor; we expanded it to six independent synthetic masters to demonstrate regional visibility. Select Manila or Cavite, inspect different local traffic zones/retailers, edit a receiving window, and return to Network overview. Explain that 600 demo profiles are a sample; 50,000 is the stated retailer footprint and does not mean 50,000 daily orders. Production fleet sizing requires actual distributor demand and order frequency.


## Updated road and cost defence

**Does GPS prove the route is drivable?** No. Use road routes & recheck obtains OSRM driving-profile geometry, road-leg distances and base durations, then checks the existing sequence against modeled traffic factors, full receiving windows and shift return. GPS follows that road geometry but remains simulated. Truck dimensions, legal access, closures and retailer entrances need verification. Approximate mode remains clearly labeled. More realistic road times may reduce coverage; show exceptions rather than claiming a perfect plan.

**What does the cost now include?** The operating estimate includes base transport, idle ownership/lease, additional maintenance, a flat toll allowance and assumed crew overtime beyond paid hours. Expected spoilage and unassigned contribution margin are separate scenario exposure, not confirmed expenses. Rates are editable assumptions, not actual invoices or statutory wage calculations. Set extras to zero if already included in base rates. Tax, financing/insurance detail and seasonal procurement pricing are not separately modeled. See [road/cost guide](road-routing-and-costs.md) for the worked example.


## Daily orders and current trucks

Open **Depot planning** in the sidebar. Each depot has + / - controls for daily parent-order count, current Type A vans and current Type B trucks. Apply the depot plan to save and recalculate. Initial current counts are synthetic assumptions copied from the normal recommendation once; peak demand does not create trucks automatically. Compare saved availability with normal/peak recommendations. Normal views use saved fleets; Peak defaults to a clearly labeled proposed seasonal package. Current resources only tests saved trucks/attendance under peak demand. Proposed additions are not confirmed hires or saved assets. Lowering orders preserves retailer profiles; raising demand beyond active profiles adds synthetic stores.


## Attendance and the 6 AM departure question

Say: "Having trucks is not the same as having dispatch capacity. Each truck needs a present driver and its required helpers. We show attendance, crew-ready vehicles and trucks blocked by absences. If service falls because people are absent, buying more trucks is not the first solution."

Open Depot planning, reduce Pasig Type B helpers present to 3 while keeping six dry trucks and one helper per truck, and Apply. Network overview shows three trucks blocked by crew shortages; Dispatch has only three crew-ready dry trucks. Restore attendance and Apply after the demonstration. Normal/peak recommendations remain demand targets; daily attendance is a separate execution constraint. Payroll and replacement labor are not separately priced.

Say: "The model is ready at 6:25 AM after preparation. Our editable illustrative Type B ban starts at 7 AM and ends at 9 AM, so a leg that finishes before 7 AM can move. A leg that would overlap waits before travel. The manifest distinguishes readiness from modeled departure. This demonstrates constraint logic; it does not establish current MMDA/LGU restrictions."

## Why peak orders and cost now rise in the proposed plan

The earlier model enlarged baskets without increasing transactions. A constrained fleet could deliver less and spend less, so that operating figure did not describe the cost of serving full peak demand. [Peak planning](peak-planning.md) now separates current-resource shortfall from a proposed seasonal truck/crew package. Defaults increase 100 normal orders to 150 peak orders (200 becomes 300), enlarge baskets by 1.6x and allow two additional working hours. Receiving hours stay binding. The default six-depot approximate proposed plan has 900 orders and PHP 240,011.73 operating cost, versus 600 and PHP 117,463.63 normally. These are assumptions and simulated outcomes, not historical forecasts or quotations. Do not claim spending must always rise: lower constrained spending with unserved demand is a service failure indicator, not a saving.


## Review which orders fit and which need action

Depot planning now uses one tab per distributor, with unapplied drafts retained while switching tabs on that page. In Dispatch, open Operations review. Served (planned) requires both frozen/dry portions of a mixed order to be assigned. Unserved / incomplete includes the partial subset; inspect its missing-portion reason and available crews before adding vehicles. Priority is earlier receiving close first, not the vehicle visit order.

Inspect vehicle, arrival, service start and finish together. A truck arriving at 12:00 with unloading still required cannot be on time for a window closing at 12:00. The model checks full handling, not arrival alone. Retailer type is inferred from demo names, and unloading is a required allowance. Say explicitly that these are planned outcomes, not actual delivery confirmations. [Operations review notes](operations-review.md) explain all columns and the default 93 served / 7 incomplete split.

## Explain the GPS colors

Blue is scheduled, purple is in progress, green-check is fully served in the simulation, orange is partial planning and red-cross is unassigned. A mixed order needs both frozen and dry portions finished to turn green. Click an icon for its timing and missing reason. Rewind to demonstrate that these statuses follow the simulated clock rather than recording actual deliveries. Truck pins separately label travelling, handling, store/ban waiting, preparation and return. See [GPS status notes](gps-status.md).
