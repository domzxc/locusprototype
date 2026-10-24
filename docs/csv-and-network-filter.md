# Network filtering and CSV exports

Network scope now offers **All** and each of the six distributors. The selection filters the comparison rows, KPI totals, normal baseline, saved attendance, peak additions and risk estimates. It stays on Network overview. Sidebar depot selection also narrows this overview; choose All to restore the combined view. The 50,000-retailer note still describes the business footprint, not the selected sample's daily orders.

Both network export buttons use this same scope and scenario/resource selection. Dispatch, settings and retailer workspaces retain their existing depot selection. Fleet allocation remains a six-distributor comparison, and Export all settings always includes all six masters.

## Export files

| File | Contents |
|---|---|
| domtransport-network-plan.csv | One row per visible distributor: normal/scenario orders, completion, planned/required portions, fleet, proposed additions, saved/planned staff, CBM use, KM, PHT shift end and PHP costs/exposure |
| domtransport-dispatch.csv | A summary row, vehicle rows, and one delivery row per frozen/dry portion, including unserved portions and precise reasons. Filter record_type to inspect each group |
| domtransport-allocation.csv | All six distributors, mapped retailer footprint, normal/peak demand and Type A/B recommendations |
| domtransport-settings.csv | Lossless configuration backup: format, path, type and value columns for all six masters |
| domtransport-[distributor]-retailers.csv | The validated editor draft, including receiving windows, flags and notes. Apply remains necessary to use pending edits in dispatch |
| metro-manila-public-retailer-references.csv | Public reference addresses and source/date, with unknown receiving hours and unverified coordinates explicitly labeled. These are not synthetic retailer masters |

Dispatch summary costs and vehicle costs represent different aggregation levels. **Do not sum all record types together.** Summary rows contain the plan totals; vehicle rows contain tour transport charges; delivery rows contain shipment workload and assignment details. Parent order_status repeats across its delivery portions; use distinct order IDs for parent counts. Served (planned) means complete assignment, not actual proof of delivery. Schedule columns use PHT; physical columns use CBM/KG, distances KM and costs PHP. No road geometry or GPS timeline is included in these spreadsheet reports.

All files use UTF-8 with a BOM for spreadsheet compatibility, quoted cells, CRLF rows and doubled embedded quotes. Commas, Unicode and multiline notes are retained. Text that could be interpreted as a spreadsheet formula is prefixed with an apostrophe; the app removes its own protective prefix during import. Native numeric values remain numeric. Review reports are snapshots, not configuration import files.

## Importing the exported CSVs

Data studio accepts the settings CSV backup. Its typed path rows preserve arrays, booleans, numeric values, empty objects and every distributor's configuration. Keep format/path/type columns intact; use the app's settings forms for routine edits. Full existing configuration validation still runs before state changes. Duplicated/unsafe paths and malformed CSV are rejected. Maximum settings upload is 10 MB.

Retailer management accepts its master CSV and replaces the editor draft only after validation. Keep the first master metadata row and record_type/distributor fields. Receiving open/close use 24-hour PHT HH:mm (H:mm and zero-seconds HH:mm:00 are also accepted); flags use true/false. Midnight close 00:00 means the end of the day. Each retailer must belong to the selected distributor. Empty masters retain the first metadata row. Maximum retailer upload is 1 MB; click Apply to save and replan after import.

Existing JSON settings and retailer master backups remain accepted for migration, but every app export/download now produces CSV. Browser-local settings continue using localStorage internally. Public reference CSVs and plan CSVs cannot be imported as synthetic retailer master/settings backups. Downloads do not send data to a server.

Tests cover CSV quoting/Unicode/formula protection, lossless settings round-trip, retailer windows/flags/empty master and ownership, filtering, matching baselines/staff, delivery conservation/reasons and CSV download MIME/name. Server-rendered checks show one comparison row and correct totals for every selected distributor. Browser click/download and Excel/LibreOffice visual verification remain pending because no browser surface is available in this session.
