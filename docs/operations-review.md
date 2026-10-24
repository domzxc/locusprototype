# Depot tabs and operations review

## Depot planning tabs

Depot planning has one tab for each of the six distributors. Only the selected depot panel is visible. The sidebar, workspace selector and tabs share the selected distributor; selecting a depot keeps the current page. Network overview still shows All. Tabs support left/right arrows, Home and End, with linked ARIA tab/tabpanel states.

All six depot forms remain mounted while this page is open. Switching tabs preserves unsaved orders, truck and attendance drafts. Apply each depot plan to persist its values; leaving the page discards unapplied drafts. Applying one depot resets that depot to the saved values without editing other depots. This is browser-local configuration, not a shared backend.

## Dispatch Operations review

The previous separate incomplete-order list and synthetic order book are combined into a single searchable review table. It is below fleet controls and above cost/manifest details. Results update with normal/peak, current/proposed resources and road validation.

- All orders: one row for every original parent order.
- Served (planned): every required frozen/dry delivery portion has a vehicle assignment.
- Unserved / incomplete: at least one portion is unassigned, including partially planned orders. This matches the coverage KPI's incomplete count.
- Partial: a subset of incomplete orders with some assigned and some missing portions.
- Outside window: at least one assigned portion does not fit full receiving service. It normally contains zero rows because the planner rejects infeasible assignments.

Partial and Outside window are diagnostic subsets, so tab counts must not all be added together. Search matches order/retailer IDs, store name, area, inferred retailer type, vehicle and exception reasons. Switching depot resets the review filters; changing the plan within a depot keeps the chosen filter. Vehicle buttons select that route for the existing map/manifest. The review component is memoized so modeled GPS time ticks alone do not rebuild the order table.

## Columns and calculations

| Column | Interpretation |
|---|---|
| Priority | Review ordering by earlier receiving close, then open, then order ID; not an imported business priority or vehicle visit sequence |
| Order / retailer | Unique transaction ID, assigned retailer ID and name; repeat peak orders retain their retailer mapping |
| Area | The local master zone |
| Retailer type | Inferred from synthetic names: sari-sari, supermarket, grocery/minimart or trading store. Custom names without a recognized pattern show Not recorded. It is not a verified classification master |
| Ordered / Cases | Full parent basket and sum of ordered case quantities; one synthetic case represents one box |
| CBM / KG | Full parent-order payload, retaining Philippine planning units |
| Unloading | Required allowance = sum(ordered cases x editable SKU unloading minutes). It is demand workload, not measured completed unloading |
| Delivery window | Parent receiving interval in PHT, or Closed |
| Vehicle / stop | Every assigned portion, its Type A/B vehicle and its sequence in that route |
| Arrival | Modeled arrival before receiving-window waiting: stop.arrival - stop.wait |
| Service start | Engine stop.arrival, after receiving-window waiting |
| Finish | Full handling finish, including modeled loading allowance, unloading and fixed stop tasks |
| Status / reason | Complete on-time assignment, complete window issue, partial or entirely unassigned, with missing-portion reasons |

A mixed order is one review row but can have both A and B assignments. Each arrival/start/finish line identifies its vehicle and frozen/dry portion. No single Type A row silently carries the dry basket. A full order is on time only when every portion starts at/after its receiving opening and finishes at/before closing; closed receiving cannot be on time. Arriving at 12:00 for a window ending 12:00 with handling remaining is not on time.

The table is a modeled plan review, not proof of execution. It does not invent actual arrival/completion records, late outcomes, delivery failures or proof-of-delivery. An unassigned job is not automatically classified as late. The engine normally admits only feasible assignments, so assigned on-time compliance may still be 100% while incomplete orders remain visible. Real operations review would compare these planned columns with a separately captured actual-delivery record.

Fresh approximate Pasig defaults produce 100 rows: 93 served/planned and 7 incomplete, including 1 partial (6 have no assignment at all). Frozen/dry jobs remain separate within those rows, matching coverage and job conservation. Road validation can change the counts and timings; the table labels its travel basis. No route-planning arithmetic or allocation was changed for this UI extension.

## Verification and rollback

Unit checks cover parent aggregation, separate cold/dry assignments, partial/incomplete classification, required unloading, arrival versus service wait, closing-time handling violations, search, review priority, empty days and coverage conservation. SSR checks render all six selected tab states (one active, five hidden), preserve six panel forms in markup and verify review status/timing labels. They do not simulate browser clicks or prove draft retention/focus/layout behavior. Supported browser inventory is empty in this session; interaction and visual QA remain pending. Revert this feature commit to restore the previous layout; no saved data schema migration is required.
