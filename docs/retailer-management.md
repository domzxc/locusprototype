# Retailer management and Metro Manila reference data

Updated 23 October 2026.

## Use the synthetic retailer master

Choose a distributor in the sidebar/workspace selector, then open **Retailer management > Synthetic retailer master**. Each of the six masters starts with about 100 profiles. Migration preserves existing Pasig profiles and any profiles previously assigned elsewhere, including receiving overrides.

1. Select **Edit** or **Add synthetic retailer**.
2. Enter a fictional name/address, city, one assigned distributor, coordinates and traffic assumption zone. Coordinates must be within the supported Greater Manila bounds; this is input validation, not geocoding or proof that an address exists.
3. Set one same-day receiving opening/closing interval, closed-day status and active status. Receiving times are assumptions or user edits. The app does not verify them against retailer contracts.
4. Select **Update profile in editor**, then **Apply retailer master** to save and replan. Profile and archive changes remain drafts until applied.
5. Use **Export editor master** / **Import master** for a standalone version-1 retailer JSON file. Import validates the entire replacement before changing the editor; apply afterward. The full Data studio settings export also includes the applied master.

Each master supports up to 500 profiles and globally unique RET- IDs. Distributor ownership is fixed to the active workspace. Archive/restore is reversible; closed retailers remain demand, archived retailers leave demand. Archiving preserves remaining seeded baskets; replacing/reordering a master or changing the seed may change baskets. New IDs consider all applied masters and local draft IDs.

Each distributor selects active profiles in master order up to its saved daily order count; if no count is saved, all active profiles participate. An empty master produces no orders. The 50,000 mapped-retailer footprint remains a separate illustrative aggregate, not the size of this synthetic sample or daily order count. The generated-order fallback is hidden once a master exists; use Depot planning to change day demand, or edit/archive the underlying profiles.

The **receiving-hours stress example** closes the first five active local profiles and gives the next ten short windows. Apply it to demonstrate exceptions. It is a declared scenario, not an estimated real failure rate.

## Public Metro Manila reference sample

The second tab contains ten branch-name/address facts across five Metro Manila cities from [Maya's Robinsons Supermarket merchant directory](https://www.maya.ph/partner-merchants/grocery/robinsons-supermarket), retrieved 23 October 2026. The checked-in sample is [metro-manila-retailer-references.json](../src/data/metro-manila-retailer-references.json); it can also be downloaded from the app.

This is a reference catalog, not FMCG order history, a verified customer master, proof of current operation or an actual retailer/distributor relationship. Addresses are normalized factual summaries of the listing. Supplier receiving windows and verified coordinates are not supplied by that source, so their fields are deliberately null. Customer shopping hours are not interpreted as supplier receiving windows. There is no live web lookup or geocoder in the application.

Public reference records have a separate file kind and cannot be imported as the synthetic dispatch master. This keeps the challenge's synthetic-only dispatch requirement explicit. Use the reference catalog to discuss the data needed in a real implementation; obtain confirmed receiving schedules and validated geocodes directly before operational use.

Public OpenStreetMap/Overpass research was attempted but endpoints rejected requests, reported capacity limits or timed out. No unreturned OSM coordinates were fabricated or inserted into the sample. The final sample uses the cited merchant directory instead.

## Persistence and limits

Applied profiles remain in the browser's localStorage and settings JSON. There is no shared server database. Export/import transfers them between localhost, Render, devices or browsers. Public reference data is bundled with the app and requires no live API call.

Only one receiving interval on the modeled day is supported. Weekly calendars, lunch breaks, holidays, receiving-dock contention, actual delivery confirmations, address verification and source freshness checks remain outside this feature. Traffic assumptions belong to each distributor; all are illustrative.

## Verification and rollback

Automated checks cover master materialization, identity/location/window propagation, archive and distributor filtering, remaining-basket stability, closed-retailer exceptions, schema validation, duplicate/public-data rejection, atomic replacement and legacy receiving-hour boundaries. The production build checks the React/TypeScript integration. Browser interaction checks remain unverified because no supported browser was available in this session.

Before replacing/importing a master, export it. To restore default generated mode, load and apply default assumptions in Data studio; this resets all operating assumptions, so preserve a settings export first. Source rollback uses a normal Git revert of the retailer-management change, preserving published history. The current baseline before applying edits remains 93 fully planned orders out of 100 under separate frozen/dry delivery.

Full settings use version 2 with kind `domtransport-settings` and contain all six masters; standalone retailer files remain version 1 and include the distributor. Importing a different distributor master is rejected. All times are PHT. See [network master guide](network-masters.md).
