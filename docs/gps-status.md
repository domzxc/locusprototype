# GPS playback: served versus unserved

The map uses **order status icons** instead of vehicle-colored delivery dots. Vehicle route lines retain their colors. Each original parent order has one icon, even if frozen/dry portions use different vehicles. Counts cover all orders at the active depot, including dimmed orders when a single route is selected.

| Icon | Status | Rule |
|---|---|---|
| Blue hollow circle | Scheduled | Fully assigned, no completed portion and no assigned portion has arrived yet |
| Purple progress circle | In progress | Fully assigned and at least one portion has arrived (including store waiting/handling), or some portions have finished |
| Green check | Served (simulated) | Every required portion is assigned and every full handling finish is at/before the playback clock |
| Orange diamond / ! | Partially planned | Some required delivery portions are missing; this never becomes fully served merely because the assigned portion finished |
| Red cross | Unserved (planned) | No delivery portion has a route assignment; no arrival or finish time is invented |

Partial and unassigned exceptions stay fully visible when selecting a vehicle; other routes' normally planned orders can be dimmed. Each icon includes a distinct shape/glyph, not color alone. Green signifies simulated completion, not a real delivery receipt. On-time compliance remains governed by the route engine's full-window constraints.

## Playback versus the full-day plan

Operations review's **Served (planned)** filter describes complete route assignment for the entire day. A green map marker describes completion **at the playback clock**. These are intentionally different views. Rewinding to the start restores scheduled states; pause/reset/scrub produce deterministic results rather than recording events.

For fresh approximate Pasig defaults, at 6 AM there are 0 simulated served, 93 scheduled, 1 partial and 6 unassigned parent orders. At the end of the day, 93 are simulated served, 1 remains partial and 6 remain unassigned. Operations review's 7 incomplete orders include that partial order. Both frozen and dry portions must finish before a mixed parent becomes green.

While road loading keeps playback locked, complete assignments stay scheduled rather than showing progress based on an unavailable road plan. Explicit approximate mode still permits clearly labeled approximate playback. There is no live GPS, proof of delivery or capture of actual retailer handovers.

## Marker details and overlapping orders

Click an order icon for its transaction/retailer identity, receiving window, completed/required portion count, each vehicle's arrival/service-start/finish in PHT and any missing reason. Popup text is constructed with DOM text nodes, so imported retailer names are not interpreted as HTML. Overlapping rendered icons are listed together, with unassigned/partial exceptions prioritized visually. Repeat peak orders retain separate transaction identities and completion states even at the same store.

Map positions use the first assigned portion's road-snapped location when available; completely unassigned orders use their synthetic retailer coordinates. This does not verify retailer entrance access or remove first/last-metre limitations. The same detail is available in the accessible Operations review table.

## Truck states

Truck pins retain the vehicle ID and add a short state label:

- Preparing: before depot preparation finishes.
- Travelling / Returning: movement along the selected travel basis.
- Ban wait: held at the previous location by the illustrative no-movement interval.
- Store wait: arrived before receiving opens.
- Handling: modeled loading/unloading/fixed handling; not unloading alone.
- Returned: modeled depot return is complete.

Pin colors distinguish movement, handling, waiting, preparation and return. Their status labels supplement color, and title text includes the full state and simulated qualifier. A truck returning to the depot does not imply every demand order was served; orange/red retailer exceptions remain.

## Implementation and verification

playback-status.js prepares parent/vehicle timing data once per plan and derives status from the playback minute. MapLibre order features update only when state/finished count, route selection or the plan changes; static road geometry is not resent on every GPS tick. Existing truck marker elements are reused. Generated icons follow the official [MapLibre generated icon API example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-generated-icon-to-the-map/); no additional icon/font service is called.

Tests cover both-temperature finish thresholds, partial/unassigned persistence, no invented unassigned timestamps, count conservation, final coverage agreement, rewind/empty days and independent repeat peak transactions. SSR verifies the legend labels and zero-versus-final simulated served count. Production build validates the MapLibre types. Browser/WebGL rendering, popup hit testing, overlap ordering, map icon legibility and real playback clicks remain unverified because the supported browser inventory is empty. No routing, cost, saved settings schema or actual completion database is changed. Rollback is a normal feature revert.

## Precise reasons and early returns

Red now says **Unserved (planned)** rather than Unassigned. It means no portion is scheduled, not a confirmed real-world failed handover. Orange remains partially planned. The [diagnostic guide](unserved-diagnostics.md) explains attempted receiving/shift times, search-limit exceptions, and why trucks can return early with orders still unserved.
