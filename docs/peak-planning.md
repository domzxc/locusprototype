# Peak demand and seasonal resource planning

## What changed

Peak previously multiplied boxes per order while retaining the same number of orders and actual resources. A capacity-constrained heuristic can travel less, finish fewer deliveries and show lower operating expenditure as demand grows. That is curtailed service, not a cheaper way to deliver all peak demand.

Peak now has three independent, per-depot assumptions in Data studio:

- Order count multiplier: default 1.5, editable 1-4.
- Boxes per order multiplier: existing default 1.6, editable 1-4, rounded up per SKU.
- Extra vehicle shift allowance: default 2 hours, editable 0-6 hours, capped at midnight PHT.

Normal orders and shift settings stay saved separately. A 100-order normal day becomes 150 peak orders; a 200-order day becomes 300. Zero demand stays zero. Available shift hours are not automatically billed as overtime: the cost model charges actual modeled duty above regular paid hours. Receiving windows, closed retailers and truck-ban settings remain unchanged, so a longer shift cannot force a closed store to accept a delivery.

## More orders versus more stores

Normal demand selects enabled assigned retailer profiles in master order, up to the day target. Peak selects a larger number from that active pool. When transactions exceed the available profiles, it repeats orders at existing assigned stores with unique transaction IDs such as RET-001-P2 and an explicit retailerId pointing to RET-001. The original receiving hours, coordinates, SKU pattern and ownership stay attached. No new retailer is invented or silently added to the saved master. Empty masters remain empty, and archived retailers stay excluded. The maximum is 2,000 peak transactions from a 500-order normal sample.

Repeat transactions are separate modeled delivery jobs. The heuristic does not consolidate repeat orders into a single service transaction; per-job handling remains conservative. Average drops still counts assigned frozen/dry delivery jobs per used vehicle, not unique retailers or proven physical unloading visits. The map can therefore show fewer distinct locations than parent orders.

## Two views of peak execution

**Proposed seasonal resources** is the default peak UI view. It temporarily models, by type/depot:

`scenario trucks = max(saved physical trucks, recommended peak trucks)`

Truck counts are capped at 500 per type. It then proposes enough temporary drivers and helpers to staff that fleet, including replacement cover for saved absences. Each assumed hire increases proposed scheduled/present staff equally, so existing absence counts are not erased. Counts are bounded by the 1,500-person per-role/type demo limit; at the cap, shortages remain visible. The scenario reports added trucks, temporary drivers and helpers explicitly. It is not a purchase, booking, approved roster or edit to actual attendance.

**Current resources only** uses the same peak demand and later shift allowance, but the saved physical fleet and attendance. This exposes unmet deliveries and operating limitations. More demand can leave fewer assigned orders, lower KM, less overtime and lower operating expenditure; review coverage and risk exposure alongside spending.

Normal views always use saved resources. Proposed mode does not mutate local settings. Depot planning and Data studio continue to edit actual saved assumptions; Network overview retains a saved-attendance card while its scenario table distinguishes saved versus scenario vehicles and planned headcounts. Selecting a depot carries the chosen scenario/resource mode into Dispatch. Temporary truck overrides remain explicit local experiments.

The engine-facing networkPlans function defaults to current resources for compatibility; the UI explicitly requests proposed peak mode. Fleet-allocation tables size demand using the effective peak shift and show normal/peak order counts.

## Cost interpretation

All resource modes use the same cost arithmetic: used vehicle fixed charges and route KM, idle physical/scenario trucks, maintenance, toll allowance and actual route-duty overtime. No artificial uplift or minimum normal-cost floor is applied. Proposed extra trucks use the configured standard used/idle vehicle rates; a rental premium, recruitment fees, regular temporary staff wages and paid absence payroll are not separately priced. Adjust rate assumptions before using the result as a financial budget. Damage/profit-at-risk remain separate exposures. Unassigned orders do not silently acquire invented transport costs.

Observed deterministic approximate default network results (all six fresh masters):

| View | Orders | Fully planned | Available/scenario trucks | Used | Operating estimate | Overtime component |
|---|---:|---:|---:|---:|---:|---:|
| Normal, current | 600 | 545 | 54 | 53 | PHP 117,463.63 | PHP 4,904.65 |
| Peak, current only | 900 | 405 | 54 | 54 | PHP 107,617.33 | PHP 4,424.03 |
| Peak, proposed seasonal | 900 | 877 | 118 | 116 | PHP 240,011.73 | PHP 9,268.51 |

The proposed package adds 64 trucks, 64 temporary drivers and 64 helpers under these defaults. Normal shift ends at 6 PM; peak shift allowance ends at 8 PM. Actual saved edits, routing geometry, resource caps and receiving restrictions change results. These are synthetic approximate-mode observations, not actual deliveries, market quotations or validated full-network procurement requirements. OSRM validation can reduce coverage further. More resources do not prove a globally optimal plan.

## Panel explanation

Say: "Peak has both more transactions and larger baskets. We first expose what the current team cannot serve, then price a proposed seasonal truck-and-crew package using the same assumptions. The larger funded plan costs more because more resources actually run; lower constrained spend with missed deliveries is not a saving. Longer shifts help only where retailer hours and driving restrictions allow them."

The order and basket multipliers and extra hours are declared assumptions, not estimates trained from the unavailable five-year dataset. Review them against real historical seasonal order frequency, SKU mix and observed operating times in production.

## Verification and rollback

Tests cover deterministic uplift, unique transaction IDs and retailer mapping, unchanged closed/archived receiving data, zero demand, longer shifts with unchanged receiving windows, midnight cap, proposed versus current resource isolation, temporary replacement crews, input bounds and a default network cost/resource increase. All existing cold-chain, CBM/KG, window, shift, road-validation, idle and attendance invariants remain. SSR checks cover both peak views, cost comparison, saved/scenario labels and shift end. Browser interaction and hosted verification remain outstanding. Export settings before reverting the feature; older code ignores the optional peakOrders and peakExtraMinutes fields.
