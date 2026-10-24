"""Build the approach PDF, its Markdown source, and deterministic evidence.

Run from repository root: python scripts/build_submission.py
Requires reportlab; pypdfium2/Pillow are used only for review images.
"""
from pathlib import Path
import json
import subprocess
from html import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
QA = ROOT / 'tmp' / 'pdfs'
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
NODE = """
import {copy,defaults,regionalAllocation} from './engine.js';
import {initializeNetwork,networkPlans,summarizeNetwork} from './network.js';
const root=initializeNetwork(copy(defaults));
console.log(JSON.stringify({allocation:regionalAllocation(root),runs:['normal-current','peak-current','peak-proposed'].map(label=>{
 const [scenario,mode]=label.split('-');const runs=networkPlans(root,scenario,mode);const p=runs.find(r=>r.name==='Pasig');
 return {label,network:summarizeNetwork(runs),pasig:{orders:p.orders.length,A:p.fleet.A,B:p.fleet.B,recommended:p.recommended,used:p.result.routes.length,served:p.result.served,partial:p.result.partial,jobs:p.result.deliveryTotal,assigned:p.result.deliveryAssigned,km:p.result.km,util:p.result.util,cost:p.result.costs.operating,base:p.result.cost,averageDrops:p.result.averageDrops}};
})}));
"""
data = json.loads(subprocess.run(['node', '--input-type=module', '-e', NODE], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
(QA / 'submission-baseline.json').write_text(json.dumps(data, indent=2), encoding='utf-8')

pages = []
def page(title, subtitle):
    entry = {'title': title, 'subtitle': subtitle, 'blocks': []}
    pages.append(entry)
    return entry['blocks']
def h(blocks, title): blocks.append(('heading', title))
def p(blocks, text): blocks.append(('paragraph', text))
def table(blocks, headers, rows, widths=None): blocks.append(('table', headers, rows, widths))
def bullet(blocks, text): blocks.append(('bullet', text))
def callout(blocks, text): blocks.append(('callout', text))
money = lambda value: f'PHP {value:,.0f}'

b=page('The fleet decision', 'DOMTRANSPORT | APPROACH AND WORKING PROTOTYPE')
p(b,'Prepared 24 October 2026. Synthetic data only. This document explains the implemented prototype, the mathematical approach, evidence and the next steps needed for operational use.')
h(b,'The problem we address')
p(b,'A regional FMCG manager must allocate refrigerated Type A vans and larger dry Type B trucks to Quezon City, Manila City, Makati, Pasig, Bulacan and Cavite. Together these distributors cover about 50,000 mapped retailers. Each retailer belongs to one distributor; 50,000 retailers does not mean 50,000 orders every day.')
p(b,'The five SKUs are toothpaste, ice cream, soap, water purifier and tea. Ice cream requires refrigerated delivery. We must recommend normal-day and September-December peak capacity, and explain when to revisit that allocation.')
h(b,'Our recommendation')
for text in ['Size frozen and dry fleets separately using the greatest requirement for CBM, KG and available working hours, then add an explicit reserve.', 'Test the fleet in daily dispatch against store receiving hours, payloads, available drivers/helpers, assumed traffic, illustrative restrictions and return-to-depot time.', 'Compare saved current resources with a proposed peak truck-and-crew package. Inspect service gaps and cost together before changing permanent capacity.']:
    bullet(b,text)
callout(b,'The brief describes five years of orders and retailer mapping, but those files were not supplied. No historical data or trained AI forecast is fabricated. All operational examples are seeded synthetic scenarios and editable assumptions.')
h(b,'One order can require two deliveries')
p(b,'Our selected operating policy uses Type A for ice cream only and Type B for all dry products. A mixed retailer basket therefore becomes two delivery portions, potentially on different vehicles. This segregation policy is an additional assumption, not an explicit requirement to prohibit dry goods in Type A in the original brief.')
table(b,['Example from the screen','Count'],[['Retailer orders','200'],['Mixed orders needing a second temperature delivery','54'],['Required delivery portions: 200 + 54','254'],['Planned portions / unserved portions','224 / 30']],[365,115])
p(b,'224/254 does not mean 224 retailers served. A parent order is fully covered only when every required portion is planned. Some of the 30 missing portions may belong to partial orders. The screenshot does not establish the full-order coverage by itself.')

b=page('Assumptions and master data','PART 1 | INPUTS AND PHILIPPINE OPERATING TERMS')
p(b,'Every distributor has its own depot, five local traffic zones, synthetic retailer master, demand settings, fleet and attendance. Pasig is the main demo example; it is not a central warehouse serving all six distributors. No stock transfer or cross-depot vehicle pooling is modeled.')
table(b,['Input','Illustrative default'],[['Demo scale','100 profiles/orders per distributor; 600 normal orders'],['Type A: refrigerated van','5 CBM; 900 KG; PHP 1,700/day used + PHP 24/KM'],['Type B: dry box truck','11 CBM; 2,500 KG; PHP 1,400/day used + PHP 16/KM'],['Normal working hours','6 AM-6 PM PHT; 25 min preparation; one tour/truck'],['Peak demand / shift','1.5x orders; 1.6x cases rounded up; +2 vehicle hours'],['Travel proxy','22 KM/h; 1.35 distance detour; 1.35 area delay factor'],['Fleet reserve','15% before integer rounding'],['Illustrative Type B restriction','7-9 AM PHT; waits before overlapping driving legs']],[165,315])
h(b,'Product packaging and handling')
table(b,['SKU','CBM/case','KG/case','Load min','Unload min'],[['Toothpaste','.035','12','.2','1'],['Ice cream','.090','18','.5','2'],['Soap','.050','16','.2','1'],['Water purifier','.220','25','1','5'],['Tea','.040','8','.2','1']],[150,82,82,82,84])
p(b,'One case represents one box. Full handling = loading allowance + unloading + 5 minutes fixed tasks per stop. Warehouse loading queues are not separately simulated. Driving, store waiting and ban waiting are separate.')
h(b,'Receiving windows, staff and provenance')
p(b,'Receiving windows and closed-day flags are editable. Default windows open at 8, 9, 10 or 11 AM for four hours. Closed stores remain demand exceptions; archived stores leave demand. One present driver and one helper per truck are initially assumed; helper requirements are editable.')
p(b,'Pasig delay factors: Kapitolyo 1.20, Ortigas 1.65, Rosario 1.40, Santolan 1.30, Pinagbuhatan 1.25. A 1.20 factor means 20% extra time, not live congestion.')
callout(b,'The public Metro Manila address reference catalog is kept separate from dispatch. Its source does not establish supplier receiving windows, verified coordinates or retailer-to-distributor relationships. All delivery master records used in this submission are synthetic.')

b=page('Forecast demand and size the fleet','PART 1 | IMPLEMENTED HEURISTIC AND PROPOSED FORECASTING')
h(b,'Production forecasting: proposed, not trained in the app')
p(b,'With the five-year dataset, validate quantities, duplicates, cancellations, stockouts, changing addresses and distributor mappings. Aggregate by distributor, SKU and date. Forecast order frequency, case quantities and cold/dry mix separately, including weekday, promotion, holiday and September-December effects.')
p(b,'Compare seasonal-naive and moving-weekday baselines with seasonal regression or gradient boosting. Use rolling-origin backtests, WAPE/MAE, forecast bias and uncertainty coverage. Choose a service quantile with leadership. The prototype instead uses a fixed seed and declared peak multipliers; its 15% reserve is not a calibrated forecast quantile.')
h(b,'The implemented binding-resource calculation')
callout(b,'Vehicles of each type = ceil[(1 + reserve) x max(total CBM / truck CBM, total KG / truck KG, workload hours / available hours)].')
p(b,'Workload includes delivery handling plus a nominal 2.4 KM per stop, adjusted for detour, speed and traffic factors. Available hours = (shift end - shift start - preparation) / 60. Only serviceable, non-closed jobs enter sizing. Empty demand requires zero trucks. This formula estimates a starting fleet; it cannot guarantee receiving-window feasibility.')
p(b,'Business example: if space needs 4 trucks, weight needs 3 and time needs 6, time sets the requirement. With a 15% reserve, ceil(6 x 1.15) = 7. Compute this separately for frozen and dry work.')
table(b,['Distributor','Normal A','Normal B','Peak A','Peak B'],[[r['name'],r['normal']['A'],r['normal']['B'],r['peak']['A'],r['peak']['B']] for r in data['allocation']],[170,77,77,78,78])
p(b,'These are fresh-default sample recommendations for 100 normal and 150 peak orders per distributor, not a fleet acquisition answer for all 50,000 retailers. Peak includes larger baskets and a later shift. Saved edits and road validation change outcomes.')
h(b,'Separate the requirement from what can run today')
p(b,'Recommended fleet is the demand-based target. Current fleet is the saved physical inventory. Crew-ready trucks = min(physical trucks, present drivers, floor(present helpers / helpers per truck)); zero required helpers removes the helper limit. No staff or vehicles are silently borrowed across depots.')
p(b,'The fleet experiment also offers explicit temporary crew cover without changing saved attendance. Proposed peak uses max(saved trucks, recommended peak trucks), capped at 500/type, and declares temporary crew cover separately. It does not edit saved inventory or actual attendance. Current-resources peak shows the same demand against the saved fleet and crew.')

b=page('Mathematical models and constraints','PART 1 | TARGET OPTIMIZATION VERSUS CURRENT IMPLEMENTATION')
p(b,'The workload formula and greedy sequencing are implemented. The optimization models below describe the proposed production upgrade; the prototype does not run a mathematical optimizer or prove a globally lowest-cost solution.')
h(b,'Fleet investment and seasonal capacity')
p(b,'For depot d, vehicle type t and demand scenario s, let n[d,t] be permanent vehicles and h[d,t,s] seasonal rentals. Minimize permanent ownership cost + expected seasonal rental and operating cost + explicitly priced service shortfalls, subject to budget, compatible routing and an agreed service-level target. Compare candidates over historical and forecast scenarios before buying permanent capacity.')
h(b,'Heterogeneous-fleet routing with time windows')
p(b,'Each node i is a frozen or dry delivery portion. Define y[i,k] = 1 when vehicle k serves it, u[i] = 1 when it is unserved, x[i,j,k] = 1 for a traveled arc, z[k] = 1 for a used vehicle, and T[i,k] as service start. A mixed parent contributes two nodes; its completion requires both assigned.')
callout(b,'Target objective: minimize sum(fixed vehicle cost x z) + sum(cost per KM x distance x x) + sum(service penalty x u).')
table(b,['Constraint','Business interpretation'],[['sum_k y[i,k] + u[i] = 1','Every portion is assigned once or explicitly unserved'],['sum_i volume[i] y[i,k] <= capacity[k] z[k]','One loaded tour fits CBM'],['sum_i weight[i] y[i,k] <= payload[k] z[k]','The same tour also fits KG'],['Cold/dry compatibility restrictions','Frozen only on A; dry only on B under our policy'],['open[i] <= T[i,k]; T[i,k] + service[i] <= close[i]','Full handling, not only arrival, fits receiving hours'],['Time propagation along selected arcs','Travel, handling and waits determine the next stop'],['Departure/return flow and subtour elimination','One connected depot tour per used truck'],['Crew-ready and shift/restriction constraints','Available staff; return by end; wait for modeled ban']],[238,242])
p(b,'Time propagation uses a justified tight big-M or indicator constraint for unselected arcs. Production needs departure-dependent travel functions and verified truck access, not just a driving-profile route. Link parent-order completion variables to all its portion assignments when pricing service outcomes.')
h(b,'Variables considered')
p(b,'Order counts, SKU cases, CBM/KG per case, temperature class, store/depot coordinates, receiving windows, handling and preparation, base and road travel, assumed area delays, illustrative ban intervals, shift hours, reserve, fleet availability, staff attendance and operating/risk cost inputs. Production additionally needs actual road restrictions, breaks, reloads, rental terms, temperature and execution observations.')

b=page('How daily dispatch is built','PART 2 | SEQUENCE, ROADS AND VISIBLE EXCEPTIONS')
for title,text in [('1. Generate and split demand','Create seeded synthetic parent orders tied to local retailer profiles. Split mixed baskets into separate frozen/dry portions, conserving quantities, CBM and KG. Peak may repeat transactions at the same assigned store with unique order IDs; repeat jobs are not automatically consolidated.'),('2. Build compatible tours','Process staffed A then B trucks. Among pending compatible jobs that fit residual tour capacity, calculate travel, ban wait, store wait, handling finish and return. Reject an append if full service misses closing or depot return exceeds shift end.'),('3. Choose the next feasible stop','The greedy score is 3 x leg KM + 0.12 x store-wait minutes + 0.012 x (receiving close - shift start). The lowest score is appended. These are declared ranking weights, not trained AI weights or a monetary objective.'),('4. Validate the existing sequence against roads','OSRM supplies ordered driving legs, distances, durations and geometry. Assumed area/zone delays adjust travel. Road validation removes failing stops and reroutes the remaining sequence, up to five passes per vehicle. Updates publish atomically; errors retain the labeled previous travel basis.'),('5. Review before dispatch','Inspect every portion, its vehicle sequence, PHT arrival/start/finish, load, costs and exception reason. Scheduled, in-progress and served map states are simulated from the clock. Unserved and partial orders stay visible.')]:
    h(b,title);p(b,text)
callout(b,'No depot reload, second tour, job exchange or reinsertion of removed road stops is implemented. A 3 PM return can be a short validated tour or search limitation; it is not proof every store was served, or proof more trucks are needed.')
h(b,'Precise reasons rather than one combined failure')
p(b,'Reasons distinguish closed receiving, handling longer than a window, oversized CBM/KG, no compatible truck, no crew, late full service, late depot return, or unresolved validation/search limits. Road failures report the attempted PHT timing and incoming drive/store/ban waits. Approximate final-tour checks disclose potential appends that were not retried. A failed sequence is not proof every possible sequence fails.')
p(b,'A restriction applies only to its configured type. A leg finishing before 7 AM may run under the default Type B example; a leg overlapping 7-9 AM waits at its origin. Store waiting and handling can continue during the interval. This is an illustrative rule, not verified Philippine regulation.')

b=page('Evidence from the working prototype','PART 2 | FRESH DEFAULTS, APPROXIMATE TRAVEL, 24 OCTOBER 2026')
p(b,'The tables below are regenerated from the checked-in engine with fresh settings, not from the user\'s saved 200-order Pasig browser sample. Road validation can produce different distances and lower coverage. All numbers are modeled outcomes, not observed deliveries or market quotes.')
labels={'normal-current':'Normal / current','peak-current':'Peak / current','peak-proposed':'Peak / proposed'}
table(b,['Network view','Orders','Complete','Used / fleet','Operating PHP'],[[labels[r['label']],r['network']['total'],r['network']['served'],f"{r['network']['vehicles']} / {r['network']['allocated']}",f"{r['network']['operatingCost']:,.0f}"] for r in data['runs']],[153,60,70,88,109])
p(b,'The proposed peak package adds 64 trucks, 64 temporary drivers and 64 helpers across the sample network. It increases complete orders from 405 to 877 out of 900 versus current-resource peak. These are hypothetical additions using standard configured rates, not a procurement commitment.')
table(b,['Pasig view','A / B','Full orders','Planned portions','Operating PHP'],[[labels[r['label']],f"{r['pasig']['A']} / {r['pasig']['B']}",f"{r['pasig']['served']} / {r['pasig']['orders']}",f"{r['pasig']['assigned']} / {r['pasig']['jobs']}",f"{r['pasig']['cost']:,.0f}"] for r in data['runs']],[137,58,89,98,98])
table(b,['Pasig view','Used','CBM use','KM','Drops/truck'],[[labels[r['label']],r['pasig']['used'],f"{r['pasig']['util']*100:.1f}%",f"{r['pasig']['km']:.1f}",f"{r['pasig']['averageDrops']:.1f}"] for r in data['runs']],[169,63,85,80,83])
h(b,'Read the measures together')
for text in ['Order coverage = fully planned parent orders / all parent orders. Partial orders are incomplete, even if one temperature portion is scheduled.', 'Window compliance = assigned portions finishing by receiving close / assigned portions. The app shows planned/required counts and excluded unserved portions. A 100% check can coexist with lower coverage.', 'Utilization = average used-truck CBM load / capacity; examine KG, route hours and staff too. It is not the share of all physical fleet capacity.', 'Average drops = assigned frozen/dry jobs / used trucks. Two temperature portions or repeat transactions at one store can count separately; it is not distinct retailers reached.', 'Distance includes depot returns. Operating cost reflects resources actually used plus stated idle/add-on allowances. Lower constrained spend with missed service is not a saving.']:
    bullet(b,text)
callout(b,'Illustrative normal Pasig: 100 orders become 125 portions; 118 are planned, 93 parent orders are fully covered and one is partial. Base transport is PHP 14,893; the fuller operating estimate is PHP 16,831. Do not mix the two cost definitions.')

b=page('Cost and business exposure','PART 1 AND 2 | TRANSPARENT PHP ASSUMPTIONS')
p(b,'The planner evaluates cost after routing. It does not optimize the complete cost model. Every rate below is an editable scenario input, not a supplier quote, statutory payroll calculation or verified toll tariff. Set add-ons to zero if they are already included in base charges.')
table(b,['Cost input','Type A','Type B'],[['Fixed / used vehicle-day','PHP 1,700','PHP 1,400'],['Base running / KM','PHP 24','PHP 16'],['Idle ownership / unused day','PHP 1,000','PHP 800'],['Additional maintenance / KM','PHP 3','PHP 2'],['Toll allowance / used tour','PHP 80','PHP 120'],['Crew overtime / hour','PHP 120','PHP 100']],[254,113,113])
h(b,'Operating estimate')
for text in ['Base transport = sum(used fixed charge + tour KM x running rate).', 'Idle = sum(unused allocated trucks x idle daily rate). A vehicle receives used or idle charges, never both.', 'Maintenance = sum(tour KM x additional maintenance rate). Tolls = flat allowance per used tour.', 'Overtime = sum(max(0, route duty hours - paid hours) x crew hourly rate). Duty starts at shift start and ends on depot return; paid hours default to eight.', 'Operating estimate = transport + idle + maintenance + tolls + overtime. A longer allowed shift does not automatically bill the whole extension.']:
    bullet(b,text)
h(b,'Separate risk from actual operating expense')
p(b,'Expected frozen damage = assigned frozen cases x assumed book value x expected damage fraction. Defaults are PHP 1,200/case and 1%. This is an exposure proxy, not temperature-derived spoiled stock.')
p(b,'Unserved contribution profit exposure = missing cases by SKU x assumed contribution margin. Default margins per case: toothpaste PHP 80, ice cream 150, soap 70, water purifier 400 and tea 60. A partial order contributes only its missing portion. A delayed order is not automatically a confirmed lost sale.')
callout(b,'Combined scenario estimate = operating + expected spoilage + unserved contribution margin. Keep this separate from operational expenditure; do not describe opportunity exposure as an invoiced or confirmed loss.')
h(b,'What still needs a production budget')
p(b,'Seasonal rental premiums, recruitment, regular temporary staff wages, absence payroll, detailed financing/insurance/tax and calibrated breakdown or spoilage models are not separately priced. The used-truck base charge assumes crew provision. The proposed seasonal package uses configured normal rates, so it is a resource scenario rather than a complete rental or staffing budget.')

b=page('Management controls and review policy','PART 1 | KEEP THE ALLOCATION RESPONSIVE')
table(b,['Module','What leadership can review'],[['Network overview','All or one depot; normal/peak service, fleet, attendance and cost'],['Depot planning','Independent order count, physical A/B trucks and crew attendance'],['Dispatch planner','Road/approximate plan, GPS simulation, manifests and unserved review'],['Fleet allocation','Six-depot normal/peak demand-based recommendations'],['Retailer management','Synthetic profiles, receiving windows, closed/archived stores'],['Data studio','Traffic, packaging CBM/KG, handling, costs, shifts and restrictions'],['CSV portability','Network/dispatch/allocation reports and validated settings/master backups']],[150,330])
h(b,'When to revisit the fleet')
for text in ['Daily: update demand, actual truck availability and present crew; review all unserved/partial portions and dispatch only reviewed plans.', 'Weekly: check bias, order frequency, cold share, workload and service; investigate more than 10% demand drift for two weeks.', 'Monthly: revisit baseline allocation when coverage is below an illustrative 98% target, or CBM utilization stays above 90% or below 55% for ten operating days.', 'Before September: test order growth, larger baskets, traffic, receiving restrictions and attendance scenarios; reserve seasonal capacity before deciding permanent additions.']:
    bullet(b,text)
p(b,'Thresholds are investigation triggers, not calibrated contractual service levels. Consider geography, receiving hours, crew and routing quality before treating every miss as a truck shortage. Cross-depot reallocation would require positioning cost, capability and mapping checks not present in this demo.')
h(b,'Limits to state openly')
p(b,'No supplied five-year history; no trained demand forecast; no live traffic, actual GPS or proof of delivery; no verified truck-access/ban geography or temperature telemetry. One tour per truck, no reload, breaks, dock queues or depot pooling. Road validation checks an existing sequence and may leave feasible alternatives undiscovered. Public routing availability and synthetic road snapping limit accuracy.')
p(b,'Browser-local storage is independent by origin/device. Apply edits before backing up. All exports are CSV; settings and synthetic retailer CSVs can be imported, with older JSON backups still accepted. Public references cannot become dispatch masters. Plan reports are not settings backups; avoid summing summary and vehicle record types together.')

b=page('Submission and panel demonstration','PART 3 | A CLEAR 30-MINUTE LEADERSHIP DISCUSSION')
table(b,['Segment','Suggested demonstration'],[['15 min: approach and live demo','Business question; explain space/weight/time; open Pasig; inspect road route and times; show one unserved reason; test attendance and peak resources'],['5 min: how it was built','React/TypeScript/Vite, MapLibre and browser logic; AI-assisted coding and debugging; seeded data; invariant tests; road validation and CSV revisions'],['10 min: Q&A','Defend assumptions, missing history, order versus portion counts, early returns, cost scope and next production steps']],[164,316])
h(b,'Three concise answers to rehearse')
for text in ['Why 254 when there are 200 orders? Fifty-four mixed baskets need separate frozen and dry deliveries. There are 254 required portions; full parent coverage needs every portion.', 'Why are trucks back at 3 PM? Their current loaded tours ended. No reload or reinsertion is planned; inspect failed timings and search limits before adding trucks.', 'Does 100% on time prove all stores were served? No. It checks only scheduled portions. The app also shows scheduled/required portions, incomplete parent orders and unserved reasons.']:
    bullet(b,text)
h(b,'Verification and practical limits')
p(b,'The updated application passes 106 automated tests and the TypeScript/Vite production build. Checks cover payload/temperature, full windows, depot return, crew, peak, costs, conservation, road fixtures, CSV round-trips and server-rendered scope views. The existing large MapLibre bundle warning remains. Server-rendered and HTTP checks do not prove browser interactions, WebGL, actual delivery feasibility or spreadsheet display.')
h(b,'Submission links')
p(b,'Source repository: https://github.com/domzxc/locusprototype')
p(b,'Application address: https://domtransport.onrender.com')
p(b,'Approach PDF: DomTransport-Approach.pdf. Accompanying email draft: docs/submission-email.md. Check the deployment record for the latest public-release verification before sending. No email is sent by this document generator.')
h(b,'Useful technical references')
p(b,'Implementation and validation: engine.js, scenarios.js, road-routing.js, staffing.js, costing.js, csv-exports.js and docs/verification.md. Rehearsal: docs/panel-guide.md. Provider references: project-osrm.org/docs/v5.24.0/api/ and render.com/docs/static-sites.')
callout(b,'Recommended next stage: obtain the real history and operating data, calibrate time/cost assumptions, benchmark a routing solver, validate truck access and cold-chain controls, then run a limited field pilot before claiming business savings.')

# The Markdown is generated from the same content as the PDF to avoid stale tables.
md=['# DomTransport: approach and working prototype','', '**Submission edition | 24 October 2026 | synthetic data only**','']
for entry in pages:
    md.extend(['## '+entry['title'],'',entry['subtitle'],''])
    for item in entry['blocks']:
        kind=item[0]
        if kind=='heading': md.extend(['### '+item[1],''])
        elif kind=='table':
            md.append('| '+' | '.join(map(str,item[1]))+' |');md.append('| '+' | '.join(['---']*len(item[1]))+' |')
            md.extend('| '+' | '.join(str(v).replace('\n',' ') for v in row)+' |' for row in item[2]);md.append('')
        elif kind=='bullet': md.extend(['- '+item[1],''])
        elif kind=='callout': md.extend(['> '+item[1],''])
        else: md.extend([item[1],''])
(ROOT/'docs'/'approach-draft.md').write_text('\n'.join(md),encoding='utf-8')

fontdir=Path('C:/Windows/Fonts')
if (fontdir/'segoeui.ttf').exists():
    pdfmetrics.registerFont(TTFont('Body',str(fontdir/'segoeui.ttf')))
    pdfmetrics.registerFont(TTFont('BodyBold',str(fontdir/'segoeuib.ttf')))
else:
    raise RuntimeError('Segoe UI fonts not available; configure an installed TTF before building.')
BLUE=colors.HexColor('#3363ff');PURPLE=colors.HexColor('#290a38');INK=colors.HexColor('#30394c');MUTED=colors.HexColor('#526077')
styles={
 'title':ParagraphStyle('Title',fontName='BodyBold',fontSize=24,leading=29,textColor=PURPLE,spaceAfter=9),
 'subtitle':ParagraphStyle('Subtitle',fontName='BodyBold',fontSize=9,leading=13,textColor=BLUE,spaceAfter=12),
 'heading':ParagraphStyle('Heading',fontName='BodyBold',fontSize=12,leading=16,textColor=PURPLE,spaceBefore=9,spaceAfter=5),
 'paragraph':ParagraphStyle('Body',fontName='Body',fontSize=10.3,leading=13.3,textColor=INK,spaceAfter=6),
 'bullet':ParagraphStyle('Bullet',fontName='Body',fontSize=10.3,leading=13.3,textColor=INK,spaceAfter=5,leftIndent=10,firstLineIndent=-10),
 'cell':ParagraphStyle('Cell',fontName='Body',fontSize=9.2,leading=11.6,textColor=INK),
 'headcell':ParagraphStyle('HeadCell',fontName='BodyBold',fontSize=9.1,leading=12,textColor=colors.white),
 'callout':ParagraphStyle('Callout',fontName='Body',fontSize=10.2,leading=13.3,textColor=PURPLE),
}
def para(text,kind='paragraph'):
    return Paragraph(escape(str(text)),styles[kind])
story=[]
for idx,entry in enumerate(pages):
    if idx:story.append(PageBreak())
    story.extend([para(entry['title'],'title'),para(entry['subtitle'],'subtitle')])
    for block in entry['blocks']:
        kind=block[0]
        if kind=='table':
            headers,rows,widths=block[1:]
            cells=[[para(v,'headcell') for v in headers]]+[[para(v,'cell') for v in row] for row in rows]
            tab=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
            tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PURPLE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f3f5fb'),colors.white]),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#dfe4ed'))]))
            story.extend([tab,Spacer(1,8)])
        elif kind=='callout':
            box=Table([[para(block[1],'callout')]],colWidths=[480])
            box.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#eef2ff')),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#cfd9ff')),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]))
            story.extend([box,Spacer(1,9)])
        else:story.append(para(('- ' if kind=='bullet' else '')+block[1],kind))
def chrome(canvas,doc):
    canvas.setTitle('DomTransport - Fleet allocation and daily dispatch approach')
    canvas.setAuthor('DomTransport prototype submission')
    canvas.setStrokeColor(BLUE);canvas.setLineWidth(3);canvas.line(48,802,547,802)
    canvas.setFont('BodyBold',9);canvas.setFillColor(PURPLE);canvas.drawString(48,813,'DomTransport')
    canvas.setFont('Body',8);canvas.setFillColor(MUTED);canvas.drawRightString(547,813,'MANILA FMCG | SYNTHETIC PROTOTYPE')
    canvas.setStrokeColor(colors.HexColor('#dfe4ed'));canvas.setLineWidth(.5);canvas.line(48,43,547,43)
    canvas.setFont('Body',8);canvas.drawString(48,29,'24 October 2026 | Assumptions, not actual delivery results')
    canvas.drawRightString(547,29,f'{doc.page}')
pdf=OUT/'DomTransport-Approach.pdf'
doc=SimpleDocTemplate(str(pdf),pagesize=A4,leftMargin=50,rightMargin=50,topMargin=60,bottomMargin=51)
doc.build(story,onFirstPage=chrome,onLaterPages=chrome)
print(json.dumps({'pdf':str(pdf),'markdown':'docs/approach-draft.md','logical_pages':len(pages),'bytes':pdf.stat().st_size}))
