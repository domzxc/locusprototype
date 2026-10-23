# Retailer management and Metro Manila reference data

Updated 23 October 2026.

## Use the synthetic retailer master

Open **Retailer management → Synthetic retailer master**. The editor initially materializes the existing approximately 100 synthetic Pasig retailers, including any previously saved receiving-hour overrides. This does not change their original payloads, coordinates or windows.

1. Select **Edit** or **Add synthetic retailer**.
2. Enter a fictional name/address, city, one assigned distributor, coordinates and traffic assumption zone. Coordinates must be within the supported Greater Manila bounds; this is input validation, not geocoding or proof that an address exists.
3. Set one same-day receiving opening/closing interval, closed-day status and active status. Receiving times are assumptions or user edits. The app does not verify them against retailer contracts.
4. Select **Update profile in editor**, then **Apply retailer master** to save and replan. Profile and archive changes remain drafts until applied.
5. Use **Export editor master** / **Import master** for a standalone version-1 retailer JSON file. Import validates the entire replacement before changing the editor; apply afterward. The full Data studio settings export also includes the applied master.

The master supports up to 500 profiles and stable unique RET- IDs. Archive/restore is reversible. Closed retailers remain active demand and can be unassigned; archived retailers are removed from the demo day's demand. Moving a profile to another distributor removes it from the Pasig dispatch pilot without pretending that local routing exists for the other distributor. Archiving a profile preserves the seeded SKU baskets of remaining profiles. Explicitly replacing/reordering a master or changing the seed may change demand.

Once a master is applied, Pasig generates one synthetic order per active Pasig profile. An empty active master produces no orders. The generated-order setting in Data studio remains a separate baseline for the other distributors' allocation proxies and for Pasig when no explicit master exists. The 50,000-retailer regional population is still an illustrative aggregate; editing this small catalog does not create a full regional retailer register.

The **receiving-hours stress example** closes the first five active Pasig profiles and gives the next ten short windows. Apply it to demonstrate exceptions. It is a declared scenario, not an estimated real failure rate.

## Public Metro Manila reference sample

The second tab contains ten branch-name/address facts across five Metro Manila cities from [Maya's Robinsons Supermarket merchant directory](https://www.maya.ph/partner-merchants/grocery/robinsons-supermarket), retrieved 23 October 2026. The checked-in sample is [metro-manila-retailer-references.json](../src/data/metro-manila-retailer-references.json); it can also be downloaded from the app.

This is a reference catalog, not FMCG order history, a verified customer master, proof of current operation or an actual retailer/distributor relationship. Addresses are normalized factual summaries of the listing. Supplier receiving windows and verified coordinates are not supplied by that source, so their fields are deliberately null. Customer shopping hours are not interpreted as supplier receiving windows. There is no live web lookup or geocoder in the application.

Public reference records have a separate file kind and cannot be imported as the synthetic dispatch master. This keeps the challenge's synthetic-only dispatch requirement explicit. Use the reference catalog to discuss the data needed in a real implementation; obtain confirmed receiving schedules and validated geocodes directly before operational use.

Public OpenStreetMap/Overpass research was attempted but endpoints rejected requests, reported capacity limits or timed out. No unreturned OSM coordinates were fabricated or inserted into the sample. The final sample uses the cited merchant directory instead.

## Persistence and limits

Applied profiles remain in the browser's localStorage and settings JSON. There is no shared server database. Export/import transfers them between localhost, Render, devices or browsers. Public reference data is bundled with the app and requires no live API call.

Only one receiving interval on the modeled day is supported. Weekly calendars, lunch breaks, holidays, receiving-dock contention, actual delivery confirmations, address verification and source freshness checks remain outside this feature. The shared Pasig traffic zones are assumptions, including when a user enters a new point.

## Verification and rollback

Automated checks cover master materialization, identity/location/window propagation, archive and distributor filtering, remaining-basket stability, closed-retailer exceptions, schema validation, duplicate/public-data rejection, atomic replacement and legacy receiving-hour boundaries. The production build checks the React/TypeScript integration. Browser interaction checks remain unverified because no supported browser was available in this session.

Before replacing/importing a master, export it. To restore default generated mode, load and apply default assumptions in Data studio; this resets all operating assumptions, so preserve a settings export first. Source rollback uses a normal Git revert of the retailer-management change, preserving published history. The current baseline before applying edits remains 93 fully planned orders out of 100 under separate frozen/dry delivery.
