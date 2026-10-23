# Panel presentation and defence

Review draft · 30-minute session. The approach document is `approach-draft.md`.

## Opening: the decision in 30 seconds

“I separated the strategic fleet decision from daily routing. We size refrigerated capacity for cold-chain demand, use larger dry trucks for compatible baskets, reserve seasonal uplift, and validate the fleet against daily service constraints. Every figure in this demo is synthetic. I will show both a feasible plan and what happens when capacity becomes insufficient.”

## 15 minutes: approach and live demo

| Time | Action | Leadership message |
|---|---|---|
| 0–3 | State service/cost objective, retailer split and missing inputs | Explain assumptions before showing impressive numbers |
| 3–5 | Open Fleet allocation; normal vs peak counts | Separate permanent baseline from seasonal rental reserve |
| 5–7 | Explain binding volume / weight / time workload, then routing validation | Aggregate sizing alone cannot guarantee feasibility |
| 7–9 | Open Dispatch; normal seed 42; show 100 orders and coverage | Cold chain and full windows are modeled hard constraints |
| 9–10 | Select A-01 and inspect its manifest | Only ice cream on A; dry portions travel separately on B. Show kg, m³ and parent retailer IDs |
| 10–11 | Play modeled GPS, pause and scrub | Clearly label simulation and estimated travel |
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

**“What does 100% window compliance mean?”** Only assigned delivery jobs are in that denominator. The routing engine rejects jobs that cannot finish inside the receiving window, so assigned jobs can have 100% modeled compliance while original-order coverage is lower. The default normal plan fully covers 93 of 100 parent orders and has seven incomplete orders, including one partial. Actual delivery performance is unknown until confirmations exist.

**“Can you edit retailer receiving times?”** Yes. Retailer management has a searchable synthetic master with editable identity, location, one assigned distributor, opening/closing times, active/archive state and closed-day status. Update a profile in the editor, then apply the master to replan. Closed retailers and infeasible windows remain visible in exceptions. Public Metro Manila directory references are in a separate tab and are not assumed to provide supplier receiving times. The stress example is a declared scenario, not fabricated evidence of a real failure rate. Weekly calendars, lunch intervals and dock contention are future extensions.

**“Do you actually have five years of data?”** No. It is described in the challenge but not supplied. Explain the forecasting/backtesting approach, while labelling every prototype result synthetic.

**“What about traffic and truck bans?”** Editable multipliers and one conservative no-movement interval. These are assumptions, not legal guidance or live traffic. Production needs a verified road/time/vehicle restriction network and actual travel calibration.

**“Is this live GPS?”** No. Marker positions interpolate the modeled route schedule, including waiting. A GPS integration would require a telemetry source and operational validation.

**“How much money will this save?”** The demo does not establish savings. Define a current dispatch baseline and compare equal-service scenarios including lease, labour, tolls, refrigeration, failed deliveries and lost sales. Report uncertainty, not a fabricated percentage.

**“What is your biggest gap?”** Local travel and demand calibration, solver benchmarking and field validation. The regional sizing uses Pasig proxies, so Bulacan and Cavite counts especially need geographic validation.

**“How will you refresh allocation?”** Daily dispatch, weekly forecasts and monthly baseline reviews. Investigate persistent demand drift or utilization/service thresholds; prefer seasonal rental for temporary peaks before acquiring permanent fleet.

## Rehearsal checklist

- Confirm the browser opens the app, MapLibre tiles render and vehicle selection/playback work.
- Test settings Apply, failed import, successful settings export/import and reload persistence.
- Test peak scenario, zero-fleet exceptions and restore recommendation.
- Prepare final PDF only after draft review. Include app and GitHub links after deployment smoke testing.
- Choose submission date after review; the interview is the next day. No deadline has been committed on your behalf.


Philippine-unit defence: "We plan against both CBM and KG because a load can reach its space limit before its weight limit, or vice versa. SKU boxes are converted using editable packaging assumptions. All receiving, shift and truck-ban times are PHT. The demo restriction is illustrative; production needs verified MMDA/LGU rules by road, vehicle class, day and exemption."
