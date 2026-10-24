# Six-distributor dispatch and master data

The brief required six-distributor fleet allocation and a dispatch demonstration for one chosen distributor. Pasig met that initial scope. The expanded prototype now routes all six distributors and presents their combined sample-day results.

## Data ownership

Each workspace owns its depot, five traffic zones with names/coordinates/time factors, network traffic factor, speed/detour, retailer profiles/receiving hours, shift and illustrative truck-ban interval, vehicle capacities/costs, product box CBM/KG and handling assumptions. The five SKU categories and frozen/dry segregation policy are shared business rules. Equal default vehicle/product values are independently editable copies.

Choose a distributor in the sidebar or workspace selector; selection keeps the current page. Network overview and Depot planning display a fixed All scope. Use an explicit Open dispatch button to navigate to a depot's plan. Dispatch, Data studio and Retailer management use that distributor; changing pages retains the choice. From Network overview, opening a distributor shows its dispatch. Editing one master recalculates its allocation/routes and the overall summary without changing other masters. Pending form edits must be applied before switching workspaces to save them.

Each region initially has 100 synthetic profiles; existing Pasig data and previously assigned non-Pasig profiles are preserved. There may therefore be a different total after migration. The approximate 50,000-retailer business footprint is separate from these samples. Allocation figures size the demo samples, not the entire regional operation. No historical model is trained.

Depot coordinates, local clusters, traffic, demand and windows are illustrative. Zone-centre changes do not move existing retailers: edit their coordinates in the retailer master. PHT, CBM, KG and PHP conventions apply throughout. Truck restrictions remain conservative synthetic assumptions, not verified MMDA/LGU rules.

## Plans and totals

Each distributor starts/returns at its own modeled depot; its simulated GPS uses that depot. Type A carries frozen jobs, B dry jobs; volume, weight, full receiving window and shift-return constraints remain enforced. Jobs left unassigned stay visible. Network coverage is complete parent orders divided by total parent orders; average drops is total assigned visits divided by used vehicles. Network costs/distances are sums, not averages. Local fleet overrides are temporary experiments; Network overview uses each saved current fleet and does not pool vehicles between depots.

## Persistence and migration

The root settings contain a `network` record keyed by all six distributor names. Each entry is a complete local configuration; nested networks are rejected. Legacy Pasig fields remain mirrored at root for compatibility. Existing minute-based PHT schedules and packaging values are retained. Retailer IDs must be unique across all masters; new IDs consider the entire network.

Export all settings in Data studio to move the complete network between browsers/origins. These files use kind `domtransport-settings`, version 2. Version-1 legacy settings are accepted and upgraded. Dispatch/allocation exports are snapshots and cannot be imported as settings. Standalone retailer exports remain version 1 and replace only the matching distributor editor; imports are validated before applying. A shared public reference catalog remains separate from all synthetic masters.

## Verification and rollback

Automated checks cover migration, isolation, unique IDs, owned retailers, depot-based routes/GPS, constraints, summary arithmetic, empty masters, and malformed/plan-file imports. A server-rendering smoke check covers the network page and scoped settings/retailer views; this does not exercise browser events or WebGL.

Browser checklist: open each distributor; confirm map/depot/manifest locality; edit a local receiving window and traffic factor; apply; switch elsewhere and confirm unchanged values; return and confirm persistence; compare network totals; export/import all settings; reject wrong-region retailer files; test empty and overloaded fleets. Supported browser tools were unavailable for this session, so these interactions remain unverified.

Export all settings before rollback. Revert the feature commit to restore the previous Pasig UI; the old app reads the mirrored Pasig fields but cannot expose the other five masters. Keep the exported network JSON to restore them with the expanded app.


Optional road validation and cost extension: [road/cost guide](road-routing-and-costs.md). Each local dispatch can request OSRM road validation; overall Network overview remains an explicitly approximate baseline with saved current fleets. Each master now also stores editable operating allowances and risk/opportunity inputs.


Current demand/inventory controls are in [Depot planning](depot-planning.md). Daily demand can select fewer active profiles without deleting them; current trucks are saved separately from normal/peak recommendations. Earlier peak results are historical experiments. Current order growth, longer shifts and explicit proposed/current seasonal resources are documented in [Peak planning](peak-planning.md).
