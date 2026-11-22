# Source requirements — v1

## Authority and traceability

Source: the unchanged root file `КЕЙС_ИТМОxP&G.pdf`, physical PDF pages 5–10 (not extracted-text line numbers). Read directly on 2026-11-22. The initial source-only baseline is `e631994f68fa09da7aec443a2e8e0be1c39d94e5`. This document transcribes the production conditions; [PUBLIC_SPEC.md](PUBLIC_SPEC.md) defines the prototype contract. Product artifacts and demonstrations will be in Russian; specifications are in English. Internal product identifiers `A`, `B`, `C` mean source products `А`, `Б`, `В`, respectively. Do not confuse Latin `B` with source Cyrillic `В`.

## R1. Purpose, users and boundaries (pp. 5–7, 10)

- Support the planner creating orders with volume, deadline and priority, then sending demand to the section manager. The manager assigns machines and people, places maintenance and validation, and submits staffing requests. Both users assess consequences, propose changes and agree updated versions inside the product. A read-only dashboard is insufficient (pp. 5–6, 10).
- Distinguish draft from agreed plans and preserve agreements. Show the daily cycle before noon and the disruption cycle, responsibilities, current information and its owner (pp. 6–7).
- No other specialist role is necessary. An optimal schedule, maximum output, a production-ready system, architecture, backend, integrations or a minute-by-minute chart of every machine is not required. A complex algorithm alone is not an advantage (p. 5).
- Automatically check constraints, warn about risks, and distinguish user decisions. Compare at least two admissible alternatives for one important decision; explain selection. If requirements conflict, show deficit, cause, escalation and agreement rather than silently changing inputs (pp. 6, 9–10).
- The training model supplies current MES-like machine product, output, status and downtime, orders, stocks, settings, work windows, requested and actual staffing. Update delays and technical integration are not modeled (p. 7). This is permission to use fixtures, not evidence of a live MES connection.

## R2. Calendar and staff (pp. 5–6, 9–10)

Planning starts at **D, 11:00**. Before **D, 12:00**, submit separate fixed requests for both shifts of D+1. Requested headcount is supplied in full; it cannot be increased after fixation. Absence reduces actual staffing. S3/S4 staffing is a forecast, fixed only in the next daily cycle (pp. 6, 9).

| Shift | Calendar interval | Working-minute coordinates |
| --- | --- | --- |
| S1 | D+1 08:00–20:00 | [0, 630) |
| S2 | D+1 20:00–D+2 08:00 | [630, 1260) |
| S3 | D+2 08:00–20:00 | [1260, 1890) |
| S4 | D+2 20:00–D+3 08:00 | [1890, 2520) |

The coordinates are a prototype convention; the following calendar exclusions are source constants.

| Exclusion | Day | Night |
| --- | --- | --- |
| Break 1 | 12:00–12:30 | 00:00–00:30 |
| Break 2 | 16:00–16:30 | 04:00–04:30 |
| Handover | 19:30–20:00 | 07:30–08:00 |

Each 12-hour shift has **630 working minutes** before maintenance, setups and events. Production and setups do not run in excluded intervals. Measure work and capacity losses by intersections with working intervals; do not subtract breaks twice (p. 5). Maintenance, validation and setup durations use working minutes. Their clocks pause at exclusions. Planned maintenance and setups cannot be interrupted for production, but may cross shifts within their allowed windows. Validation may cross shifts with the same product and an extra worker. Production waits for setup completion (p. 9).

Operators are universal; one person cannot do incompatible simultaneous work. Explain reserve purpose, use and labor impact; neither an absolute labor minimum nor monetary cost proof is required (p. 6).

## R3. Operations, equipment and staffing (p. 7)

This is discrete production, not a single conveyor. Stages are X (strip preparation), Y (rewind and grind), Z (treatment), W (packaging). Nominal speeds are **blades/minute per machine**, including packaging; strip uses blade equivalents. SKU means an individual product; A/B/C are conditional training products.

| Operation ID | Source operation | Stage | Machines | Nominal speed | Normal production staffing |
| --- | --- | --- | --- | --- | --- |
| PRESS | Press | X | 5 | 900 | 1 for all operating presses |
| THERMAL | Thermal line | X | 3 | 1540 | 1 per machine |
| PRINT | Printed marking | X | 2 | 1300 | 1 per 2 machines |
| LASER | Laser marking | X | 1 | 1500 | 1 per machine |
| REWIND | Rewind | Y | 2 | 2500 | 1 per machine |
| GRIND | Grind | Y | 5 | 800 | 1 per machine |
| WASH | Wash | Z | 1 | 7680 | 1 per machine |
| CHROME | Chrome coating | Z | 2 | 2680 | 1 per 2 machines |
| TEF | Teflon coating | Z | 2 | 3385 | 2 per machine |
| LUBE | Lubrication | Z | 1 | 7680 | 1 per machine |
| WRAP | Individual wrapping | W | 16 | 285 | 1 per 3 machines |
| PACK | Pack | W | 3 | 1350 | 2 per machine |

Apply group norms to simultaneously operating machines, rounding up: four WRAP need two operators. Validation extras are additional to normal staffing.

| Product | Complete operation route |
| --- | --- |
| A | PRESS → THERMAL → PRINT → REWIND → GRIND → WASH → CHROME → TEF → LUBE → WRAP → PACK |
| B | PRESS → THERMAL → PRINT → REWIND → GRIND → WASH → TEF → LUBE → WRAP → PACK |
| C | PRESS → THERMAL → LASER → REWIND → GRIND → WASH → CHROME → TEF → LUBE → WRAP → PACK |

B bypasses CHROME, C uses LASER instead of PRINT. Preserve every actual operation, including buffers inside stages.

## R4. Rates, setup, validation and maintenance (pp. 8–9)

- Effective rate = nominal rate × **0.85**; good-blade output = effective rate × available production workminutes. This coefficient already includes typical stops and production losses. Do not add scrap or apply another yield deduction between operations. Example: nominal 1000 becomes 850 blades/minute. The explicit failure is additional to 0.85 (p. 8).
- Exclude the union of maintenance, setups and disruptive downtime from working intervals. Overlaps do not cause double subtraction (pp. 8, 10).
- A setup changes one machine's product; same-product orders need none. First production must respect initial settings. That machine produces nothing during setup; others may run. Its normal operator performs setup without an extra setup specialist. Shared-operator availability matters; simultaneous setups need enough distinct people (p. 8).

| From / to | A | B | C |
| --- | --- | --- | --- |
| A | 0 | 20 | 30 |
| B | 20 | 0 | 25 |
| C | 30 | 25 | 0 |

All matrix entries are working minutes per machine. Ordinary matrix changes require **no validation**. Do not invent additional mandatory checks (p. 8).

- Validation produces the specified product at the effective rate, limited by input supply; add **one worker per validated machine** for the entire validation. No quarantine or release delay is modeled. Three parallel WRAP validations need three extra workers (p. 8).
- Maintenance and repair stop production. A separate service performs them; repair staff are excluded from the section's staffing request. The normal operator is released and may be reassigned. Maintenance and validation cannot overlap on the same machine (p. 8).

## R5. Materials and inventory (pp. 8–9)

Order quantities are **thousand blades**: 100 means 100000 blades. Fulfillment occurs after PACK; do not convert to packs. Raw input and packaging materials are unlimited. Track product-specific stocks at every actual operation boundary, not only X/Y/Z/W. The same material cannot exist at multiple boundaries simultaneously (p. 8).

Transport lag and minimum transfer batch are zero. Transfer continuously; downstream work may start with simultaneous upstream production but cannot consume more than upstream cumulative output plus stock at its own input. Slower upstream supply throttles downstream output. Internal stocks initially equal zero; stage stocks cannot be teleported to later operations. No storage capacity, water or electricity constraints are modeled (p. 8).

| Stock at D+1 08:00 | A | B | C | Actual input operation |
| --- | --- | --- | --- | --- |
| After X, before Y | 200 | 100 | 150 | REWIND |
| After Y, before Z | 250 | 150 | 0 | WASH |
| After Z, before W | 300 | 100 | 0 | WRAP |

These are fixed initial conditions, not a D forecast. Apply them **once only** at t=0. D+2 stocks are carried from D+1 execution, never reset. All initial stock remains usable throughout both days; no expiry calculation is needed (pp. 8–9).

## R6. Mandatory orders and initial settings (pp. 9–10)

| ID | Product | Thousand blades | Original due shift end | Priority |
| --- | --- | --- | --- | --- |
| ORD-1 | A | 1400 | S1 | High |
| ORD-2 | B | 1000 | S2 | Medium |
| ORD-3 | C | 1000 | S2 | High |
| ORD-4 | A | 1500 | S3 | High |
| ORD-5 | B | 1000 | S4 | Low |
| ORD-6 | C | 1100 | S4 | Medium |

D+1 demand is **3400**, D+2 demand **3600**, total **7000** thousand blades. Revisions to promises may be agreed (p. 5), but retain original quantities/deadlines and show deficits against them. Do not quietly redefine success (pp. 9–10).

| Operation | Initially A | Initially B | Initially C |
| --- | --- | --- | --- |
| PRESS | 3 | 2 | 0 |
| THERMAL | 2 | 1 | 0 |
| PRINT | 1 | 1 | 0 |
| LASER | 0 | 0 | 1 |
| REWIND | 1 | 1 | 0 |
| GRIND | 3 | 2 | 0 |
| WASH | 1 | 0 | 0 |
| CHROME | 2 | 0 | 0 |
| TEF | 2 | 0 | 0 |
| LUBE | 1 | 0 | 0 |
| WRAP | 10 | 6 | 0 |
| PACK | 2 | 1 | 0 |

The team chooses machine IDs. Initial setting does not require starting a machine (p. 10).

Teams may choose machine/people allocation, product sequence, work placement within windows, staffing reserve and demonstration detail. They may not change orders, rates, 0.85, staffing norms, routes, work durations/windows, initial stocks or events. State extra assumptions explicitly; they cannot cancel constraints. Do not introduce unnecessary new production restrictions (p. 9).

## R7. Mandatory work (p. 10)

All work must **finish** inside its allowed shifts; windows do not prescribe start minutes. Duration is per machine where multiple machines are specified. Validation requires actual production of the named product.

| Source code / API ID | Work | Working minutes | Allowed shifts |
| --- | --- | --- | --- |
| ТО-1 / TO-1 | 1 PRESS | 180 | S1 |
| ТО-2 / TO-2 | 1 GRIND | 240 | S1–S2 |
| ТО-3 / TO-3 | 1 THERMAL | 180 | S1–S4 |
| ТО-4 / TO-4 | 1 CHROME | 240 | S1–S4 |
| ТО-5 / TO-5 | 1 PACK | 180 | S3–S4 |
| ВАЛ-1 / VAL-1 | 1 TEF, A | 240 | S1–S2 |
| ВАЛ-2 / VAL-2 | 2 distinct GRIND, B | 180 each | S1–S4 |
| ВАЛ-3 / VAL-3 | LASER, C | 240 | S3–S4 |
| ВАЛ-4 / VAL-4 | 3 distinct WRAP, A | 180 each | S3–S4 |

VAL-2 and VAL-4 may be parallel or sequential; extra headcount follows actual concurrency. Repair does not replace mandatory maintenance.

## R8. Sequential disruptions (p. 10)

1. On **D+1 at 10:00**, one **operating GRIND** fails until **13:00**. Identify the machine. Repair lasts **180 calendar minutes**, includes the 12:00–12:30 break and removes **150 working minutes**, t=[120,270). Repair continues across the break. Its operator is available for reassignment during work intervals. It does not complete TO-2. Count actual overlap with planned downtime only once.
2. On **D+1 at 19:30**, learn that **two workers** will miss **S2**: actual S2 headcount = fixed request − 2. No additional staff may be called. Reconsider assignments/work within their allowed windows.

Apply failure **then** absence to the **same** baseline lineage. For each, show affected work and orders, available actions, decision, updated output/stocks/staffing and both-role agreement. If obligations cannot all be maintained, report consequences honestly; a conflict need not be removable.

**Implementation choice D1 (v1.1), not an additional PDF requirement:** the bounded shipped demo selects GRIND-1 producing A for this failure, with no validation on GRIND-1 intersecting repair, and keeps VAL-2 on GRIND-4/5 producing B. Named, physically checked editing templates and an explained rejection of unsupported interrupted-validation cases delimit the interactive prototype. The PDF permits choosing machine IDs/allocations (pp. 9–10) and an explicitly disclosed simulation (p. 6); it does not prescribe these IDs or require a general validation-retry mechanism. All original event timing, repair duration, validation counts/products/windows, machine rates, stocks and other fixed inputs above remain unchanged.

## R9. Deliverables and evaluation (pp. 6–7, 10)

- Provide a presentation of approach, process, demonstration and metrics; a reproducible scenario passport with calculations and explicit extra assumptions; an interactive prototype plus backup recording or screenshot sequence; a short pilot plan and sources of borrowed approaches, if any (p. 7).
- Show the complete interactive path through orders, planning, mandatory work, fixed staffing, failure, absence and revised agreement. Simulation and preprogrammed responses are permitted if explicitly labeled and consistent with the passport (p. 6).
- For every shift show output, order fulfillment, quantity missing its deadline, stage stocks and decision-critical internal buffers. Show S1/S2 requests, concurrent normal/validation peaks, explained reserves, S3/S4 forecasts, and intervals proving material/staff feasibility and mandatory work (p. 6).
- Propose **4–6 metrics**, each with formula, required data, improvement direction and pilot verification. If baseline data are missing, describe measurement; do not invent results. Describe participants, stages, success criteria, risks and controls (p. 6).
- Evaluate realistic sequencing, equipment, people, setups, maintenance, validation, stocks, adaptation and useful collaboration, not just aggregate capacities or visual effects (p. 10).
- The separate competition rules are unavailable. There is **no known** submission deadline, slide count, team-size or defense-time limit. Do not invent one; these are not production constraints (p. 7).
