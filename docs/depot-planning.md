# Daily orders and current trucks per depot

Open **Depot planning** in the sidebar, **Edit depot orders & current trucks** on Network overview, or **Change depot orders & trucks** in Dispatch.

Each depot card provides order/truck inputs plus attendance controls with minus/plus buttons and direct number entry:

- Orders for the demo day: 0-500 parent retailer orders.
- Current Type A refrigerated vans in the physical fleet: 0-500.
- Current Type B dry trucks in the physical fleet: 0-500.

Click **Apply [depot] plan** to save and recalculate. Unsaved drafts do not affect the plan. Recommendations shown on the card refer to the applied orders, not unsaved input. Each card compares saved current counts with normal and peak recommendations separately by vehicle type; spare dry trucks do not compensate for missing refrigerated vans.

## Daily demand and retailer profiles

The day count selects the first N enabled retailer profiles in master order. It counts original orders, not boxes or the additional frozen/dry visits. A closed selected store still produces demand and a receiving exception. Archived profiles are excluded. On a normal day, the same store gets at most one parent order; peak can generate additional uniquely identified transactions at the same assigned store; there is no real order-entry or calendar backend.

Lowering demand preserves all profiles. Raising it beyond the active profile count appends fictional profiles using local zones/receiving assumptions and globally unique IDs. Existing identities, receiving edits and seeded baskets remain unchanged. The master limit is 500 total profiles, including archived ones. If growth would exceed that limit, the edit is rejected atomically; restore archived profiles or request fewer orders. No profiles are silently deleted or reactivated.

If a retailer import/archive later leaves fewer active profiles than the saved day target, actual generated demand is limited to the active supply. The depot card displays the actual applied count and the saved target in its input. Apply can add synthetic profiles to reach the target, or lower it deliberately.

## Current versus recommended fleet

No actual truck inventory was supplied. On migration, missing current counts are initialized once from the normal recommendation, capped at the prototype limit of 500 per type. These are declared synthetic availability assumptions, not measured fleet assets.

Normal Dispatch and Network overview use the **saved current fleet**. Peak adds order-frequency and basket growth plus extra working hours. Its default proposed-resource view temporarily models seasonal trucks/crews; Current resources only retains saved limits. Neither changes saved inventory or actual attendance. See [Peak planning](peak-planning.md). The fleet allocation view continues to show normal/peak recommendations. A depot can have a shortage for one type and spare trucks of the other type.

The Dispatch **Try recommended fleet** button runs a temporary comparison. **Use saved current fleet** removes that override. Permanent scenario availability changes belong in Depot planning. Temporary overrides are not saved to settings and do not change Network overview. The cost model charges idle allowance for available but unused vehicles, including days with zero demand.

## Storage and compatibility

Local configuration adds optional `dailyOrders` and `currentFleet: {A, B}`. Absent `dailyOrders` preserves the old all-active-profile behavior. Current fleet migration is idempotent and preserves explicitly saved zeros. Full version-2 settings export/import includes the fields and all six masters; standalone retailer exports remain profile-only. Applying a local edit preserves other depots. Data studio's operating-default reset preserves day demand, current inventory and attendance.

## Verification

Tests cover non-destructive reductions, synthetic profile growth/global ID uniqueness, depot isolation, zero demand, zero trucks, fixed inventory during peak, idle cost, closed/archived profiles, bounds, settings migration and round-trip import. SSR checks render six sets of controls and current/recommended comparisons. Actual browser clicks, layout and hosted deployment remain unverified because this session has no enabled browser. Export settings before a normal Git revert if rollback is needed.


## Driver and helper attendance

Each depot saves scheduled and present drivers/helpers separately for Type A and Type B, plus required helpers per truck (0-3, default 1). Counts are synthetic day-level headcounts, not named employee, time-clock or payroll records. Present cannot exceed scheduled; headcounts must be integers from 0 to 1500. Defaults assume one scheduled/present driver and helper for each initial truck once. Saved zeros are preserved. Adding vehicles does not create people; change the roster and attendance explicitly. Counts persist until edited, with no automatic calendar reset.

For each truck type:

`crew-ready trucks = min(physical trucks, present drivers, floor(present helpers / required helpers per truck))`

When no helpers are required, only physical trucks and present drivers limit availability. One driver and the configured helpers are dedicated to each vehicle's single tour; no cross-type or cross-depot staff pooling, split shifts, replacement staff or skill certification is modeled. The demand-based fleet recommendation stays independent; staff shortages limit the daily execution of that recommendation rather than reducing the capacity target.

Apply the depot card to save attendance alongside orders and trucks. Network overview has an attendance card showing present/scheduled drivers and helpers, absences and trucks blocked by staff shortages, with a Manage attendance shortcut. Its comparison table shows crew-ready A/B trucks and attendance per depot. Dispatch shows physical inventory versus crew-ready fleet. Both approximate and road-validated routes enforce crew limits, including temporary fleet experiments. In Current resources only, extra trucks in Try recommended fleet still require saved present crews. Proposed peak mode separately declares temporary staffing assumptions.

Unavailable trucks remain physical assets and retain the modeled idle vehicle allowance. Staff wages, paid absences, replacement labor and headcount-based payroll are not separately modeled; the existing per-vehicle overtime allowance is unchanged. Spare present staff do not generate vehicles, and staff attendance remains recorded even on a zero-truck or zero-order day.

Worked approximate Pasig example (default 100 orders): 2 A + 6 B physical trucks with full attendance fully plan 93 orders. Keeping those trucks but reducing present Type B helpers from 6 to 3 (one helper/truck) leaves 2 A + 3 B crew-ready trucks, fully plans 47 orders and incurs PHP 2,400 idle allowance for the three blocked dry trucks. These are deterministic model outputs, not observed attendance or delivery performance. Road validation can reduce coverage further.
