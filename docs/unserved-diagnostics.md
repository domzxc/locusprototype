# Unserved deliveries and early depot returns

An order with no scheduled portion is **Unserved (planned)**. An order missing only its frozen or dry portion is **Partially planned**, and is included among incomplete orders. These are planning outcomes; no actual delivery failures are recorded.

The delivery-window card shows scheduled portions / total required portions. For example, 118/125 planned portions with 100% window compliance means seven portions remain unserved, not 100% service. Parent-order coverage is separate: every required portion must be planned to count its order as covered.

## What each reason means

| Reason code | Evidence / interpretation |
|---|---|
| receiving-closed | Store is marked closed in receiving master data |
| handling-window | Required full handling minutes exceed the entire receiving interval |
| oversized | Required CBM or KG exceeds the compatible Type A/B limit, shown numerically |
| no-truck | No compatible physical truck allocated |
| no-crew | Compatible trucks are unavailable because staffed capacity is zero/exhausted |
| tour-capacity | Appending to final loaded tours would exceed CBM or KG; this is initial tour load, not goods still onboard after deliveries |
| receiving-window | Attempted full service finishes after the receiving close, with PHT times and minutes late |
| shift-service | Road service would finish after the vehicle shift ends |
| shift-return | Attempted depot return exceeds the shift-end deadline |
| search-not-retried | Approximate final-tour append screening found a possible fit, but the greedy search did not retry it; roads have not verified that insertion |
| search-limit | Road validation reached its bounded passes; the remaining sequence has unresolved feasibility, not a proven physical impossibility |

Road reasons state vehicle/attempted stop and arrival, service start/finish, handling, incoming driving, store wait and incoming truck-ban wait when a service check fails. A return failure identifies the late tour return and the tail stop removed by the algorithm. Earlier stops and waits also contribute to the attempted clock. These are failed attempts in a particular sequence; another sequence might fit.

For jobs excluded by the approximate planner, final-tour screening checks every used compatible tour plus one representative unused staffed truck if available. Capacity is checked first, then receiving close, then depot return. Counts show which checks blocked appending; one representative attempt is described (a possible fit first, otherwise smallest deadline overrun, otherwise capacity). This does not test inserting between stops or verify roads. Road validation retains these explicitly approximate reasons for jobs it never tried.

## Why a truck can return at 3 PM with unserved orders

The prototype loads one tour per truck. The greedy planner builds a sequence; road validation removes failed stops and reroutes the remaining sequence, up to five passes per truck. It does not reinsert omitted jobs, exchange stops between trucks or schedule a depot reload and second trip. Removing stops can therefore leave substantial unused shift time.

The early-return table shows each returning vehicle, its PHT return and shift end, unused minutes, and the shared number of missing compatible portions. Counts repeat the same frozen/dry pool across vehicles and must not be summed. It does not claim the remaining jobs fit after returning, and does not invent actual delivery events.

Review window deadlines, tour loads, crew and the disclosed search limits before recommending more trucks. A production extension would test resequencing and multiple tours with explicit reload duration, new road legs and full receiving/return validation. Those are not implemented by this diagnostic change.

The changes are read-only diagnostics and wording: they do not alter dispatch assignments, route distance, cost, allocation, receiving hours or saved master data. Reason codes are included in JSON plan exports. Browser interaction/WebGL verification remains pending; deterministic planning tests and server-rendered UI checks cover the underlying behavior.
