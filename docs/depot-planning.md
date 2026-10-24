# Daily orders and current trucks per depot

Open **Depot planning** in the sidebar, **Edit depot orders & current trucks** on Network overview, or **Change depot orders & trucks** in Dispatch.

Each depot card provides three inputs with minus/plus buttons and direct number entry:

- Orders for the demo day: 0-500 parent retailer orders.
- Current Type A refrigerated vans available to dispatch: 0-500.
- Current Type B dry trucks available to dispatch: 0-500.

Click **Apply [depot] plan** to save and recalculate. Unsaved drafts do not affect the plan. Recommendations shown on the card refer to the applied orders, not unsaved input. Each card compares saved current counts with normal and peak recommendations separately by vehicle type; spare dry trucks do not compensate for missing refrigerated vans.

## Daily demand and retailer profiles

The day count selects the first N enabled retailer profiles in master order. It counts original orders, not boxes or the additional frozen/dry visits. A closed selected store still produces demand and a receiving exception. Archived profiles are excluded. The same store gets at most one parent order on the modeled day; there is no real order-entry or calendar backend.

Lowering demand preserves all profiles. Raising it beyond the active profile count appends fictional profiles using local zones/receiving assumptions and globally unique IDs. Existing identities, receiving edits and seeded baskets remain unchanged. The master limit is 500 total profiles, including archived ones. If growth would exceed that limit, the edit is rejected atomically; restore archived profiles or request fewer orders. No profiles are silently deleted or reactivated.

If a retailer import/archive later leaves fewer active profiles than the saved day target, actual generated demand is limited to the active supply. The depot card displays the actual applied count and the saved target in its input. Apply can add synthetic profiles to reach the target, or lower it deliberately.

## Current versus recommended fleet

No actual truck inventory was supplied. On migration, missing current counts are initialized once from the normal recommendation, capped at the prototype limit of 500 per type. These are declared synthetic availability assumptions, not measured fleet assets.

Dispatch and Network overview use the **saved current fleet**. Peak changes basket sizes and recommendations; it does not create trucks automatically. The fleet allocation view continues to show normal/peak recommendations. A depot can have a shortage for one type and spare trucks of the other type.

The Dispatch **Try recommended fleet** button runs a temporary comparison. **Use saved current fleet** removes that override. Permanent scenario availability changes belong in Depot planning. Temporary overrides are not saved to settings and do not change Network overview. The cost model charges idle allowance for available but unused vehicles, including days with zero demand.

## Storage and compatibility

Local configuration adds optional `dailyOrders` and `currentFleet: {A, B}`. Absent `dailyOrders` preserves the old all-active-profile behavior. Current fleet migration is idempotent and preserves explicitly saved zeros. Full version-2 settings export/import includes the fields and all six masters; standalone retailer exports remain profile-only. Applying a local edit preserves other depots. Data studio's operating-default reset preserves day demand and current inventory.

## Verification

Tests cover non-destructive reductions, synthetic profile growth/global ID uniqueness, depot isolation, zero demand, zero trucks, fixed inventory during peak, idle cost, closed/archived profiles, bounds, settings migration and round-trip import. SSR checks render six sets of controls and current/recommended comparisons. Actual browser clicks, layout and hosted deployment remain unverified because this session has no enabled browser. Export settings before a normal Git revert if rollback is needed.
