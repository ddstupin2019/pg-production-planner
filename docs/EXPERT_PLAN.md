# Provisional expert replay archive — not verified

## Status and use

This is the read-only expert's manually constructed candidate supplied in the task, archived for reproducibility. **It has not been executed or independently proven feasible.** Every number below is a hypothesis, not observed pilot data, an acceptance oracle or a production claim. Implementing the evaluator may reveal material starvation, staffing or setup conflicts. Correct campaigns/work placement/assignments without changing PDF inputs, or show the resulting deficits honestly. In particular do not force computed outputs to match these numbers.

Source conditions are in [SOURCE_REQUIREMENTS.md](SOURCE_REQUIREMENTS.md). API and calculation semantics are in [PUBLIC_SPEC.md](PUBLIC_SPEC.md). This archive does not supply complete per-machine quotas, worker assignments or internal buffer proofs: these must be made explicit and checked before any plan is called reproducible/feasible. A feasible ledger, not this shorthand, is the final passport.

Coordinates t=0…2520 are working minutes, shifts 630 each. All quantities are **thousand blades**. A=source А, B=source Б, C=source В. Intervals are [start,end). P=PRESS, T=THERMAL, Print=PRINT, R=REWIND, G=GRIND. Other names match operation IDs. Assign source initial settings in numeric machine order as the public contract prescribes. Candidate total new production demand after consuming initial stage stocks:

| Stage | A | B | C |
| --- | --- | --- | --- |
| X | 2150 | 1650 | 1950 |
| Y | 2350 | 1750 | 2100 |
| Z | 2600 | 1900 | 2100 |
| W | 2900 | 2000 | 2100 |

These totals are inventory arithmetic, not a scheduling proof. Final demand is A2900/B2000/C2100. Initial stage stock accounts for the differences.

## Candidate X and Y campaigns

- P1–P2 produce A; P4 produces B. P5 changes B→C at [0,25). P3 has TO [0,180), then A→C [180,210). C presses then produce C. Split quotas and exact finishing times remain to be encoded; do not assume every enabled machine runs to horizon.
- T1 produces A; T3 B. T2 changes A→C [0,30), then C. T1 later has TO [1800,1980).
- Print1 produces A. Print2 produces B until t=1000; B→A [1000,1020), A [1020,1240), A→B [1240,1260), then B.
- LASER produces C from t=220 to total quota1950; VAL-3 on C [1260,1500). Confirm sufficient input and positive production throughout validation rather than stopping LASER immediately when a mistaken earlier quota is reached.
- R1 first produces 850A; A→C [630,660), then 1000C; C→B [1135,1160), then 1000B.
- R2 first produces 750B; B→A [850,870), then 1500A; A→C [1770,1800), then 1100C.
- G1–G2 produce first 850A combined [0,625); G3 is initially an A-configured spare. G1–G3 change A→C [630,660), then produce 1000C combined by about1151.
- G1–G2 change C→A [1151,1181), then help produce 1500A; A→C [1770,1800). G1–G3 produce second1100C from1800. Candidate G3 remains C during the middle A campaign. Per-machine quotas must avoid duplicating the group totals.
- G4 produces B from0. G5 has TO [0,240), then B. They produce first750B combined by850. Both change B→A [850,870), produce A [870,1390), change A→B [1390,1410), then second1000B. Check actual feed at every interval.

## Candidate Z campaigns

Shared group quotas, with per-machine split to be specified:

| Product | Quota | Earliest production start | Candidate note |
| --- | --- | --- | --- |
| A | 100 | 0 | TEF1 only |
| A | 1000 | 180 | Both CHROME, TEF1 only to permit VAL-1 |
| B | 900 | 650 | B bypasses CHROME |
| C | 1000 | 915 | Both TEF after first A campaigns |
| A | 1500 | 1260 | Both TEF |
| B | 1000 | 1820 | Both TEF |
| C | 1100 | 2185 | Both TEF |

WASH, TEF and LUBE setup windows: [630,650) A→B; [890,915) B→C; [1220,1250) C→A; [1800,1820) A→B; [2160,2185) B→C. Each machine needs its own setup record and worker coverage.

CHROME setup windows: A→C [870,900), C→A [1220,1250), A→C [1830,1860). CHROME2 TO [630,870). Check both machines' individual states; B does not change CHROME to B. Do not inject the initial after-Y stock into TEF: it is before WASH.

## Candidate W campaigns

Use fifteen WRAP (ten A, five B initially), leaving the sixteenth idle. PACK1–PACK2 initially A, PACK3 B. First-shift output goal A1400/B100. All W then run group campaigns B900 from650, C1000 from940, A1500 from1290, B1000 from1840, C1100 from2190.

Candidate W setups: only A→B at [630,650); B→C [915,940); C→A [1260,1290); A→B [1820,1840); B→C [2165,2190). Expand to individual WRAP/PACK records; machines already configured for the target need no same-product setup. Count separate simultaneous setup workers conservatively, with no one person changing three machines at once. Normal WRAP production requires ceil(active/3); this group norm does not justify sharing a worker across simultaneous setups. PACK3 TO [1440,1620).

## Required work and an alternative

| Work | Candidate machine(s) | Candidate interval |
| --- | --- | --- |
| TO-1 | P3 | [0,180) |
| TO-2 | G5 | [0,240) |
| TO-3 | T1 | [1800,1980) |
| TO-4 | CHROME2 | [630,870) |
| TO-5 | PACK3 | [1440,1620) |
| VAL-1 | TEF1, A | [180,420) |
| VAL-2 | G4, B; G5, B | [0,180); [240,420) respectively |
| VAL-3 | LASER, C | [1260,1500) |
| VAL-4 | WRAP1–WRAP3, A | [1290,1470) each |

Alternative VAL-2: validate both G4 and G5 in parallel [240,420). The expert conjectures material feasibility with end buffer13.3, at the price of one extra concurrent validation worker versus the staggered variant. The precise buffer boundary and the actual staffing delta must be identified in computed evidence; neither is established here. Compare both physically evaluated candidates before selecting one.

## Provisional staffing, disruptions and output

Suggested fixed S1/S2 requests: **28,41**. Suggested S3/S4 forecasts: **41,32**. These are **not verified peaks**. Compute normal, setup and validation tasks, assign individual workers, enumerate all peak intervals, justify reserve and integrate labor. Counts may need plan-only revision before fixation, never after it.

Failure: operating G1 stops at [120,270) workminutes (D+1 10:00–13:00,150 workminutes). Transfer its operator and A output to spare G3. The expert predicts G1 −102 and G3 +102 thousand, conserving total A. Verify G3's input, setup state and worker identity; retain separate mandatory TO on G5. G1 does not produce during repair.

Absence: S2 actual headcount becomes39 if41 was fixed. Proposed W adaptation: only13 WRAP change B→C during [915,940), remaining2 during [940,965); the13 produce while the2 change. Temporary WRAP group capacity is **3.14925**, versus **3.4425** thousand/minute for all15. Expert estimates the campaign finishes near1233, before1260. This estimate is not a computed completion time. Check coupled PACK setup/flow and the other simultaneous operations, not only WRAP capacity.

Provisional PACK output by shift (candidate base expectation; expert did not provide a separately computed complete result for every successor):

| Shift | A | B | C |
| --- | --- | --- | --- |
| S1 | 1400 | 100 | 0 |
| S2 | 0 | 900 | 1000 |
| S3 | 1500 | 172.125 | 0 |
| S4 | 0 | 827.875 | 1100 |

Nonzero internal stocks explicitly anticipated by the expert include REWIND→GRIND A≈190.91 at1260, WASH→TEF B≈54.145 and WRAP→PACK B≈9.5625 at1890. These rounded values are **illustrations requiring verification**, not exact assertions. All internal queues, including other nonzero ones, must be computed. Stage-only stocks or an asserted all-zero internal ledger would not establish feasibility.

## Completion procedure for the later implementer

Encode explicit per-machine quotas/windows, setups, jobs and worker assignments; evaluate the common baseline and both alternative work placements; inspect every error, quota residual, stock and peak interval. Apply failure and absence sequentially while preserving the executed prefix. Export actual full-precision reports and use those in the Russian passport/slides. Record any departure from this candidate and its reason. Do not alter immutable source constants to obtain the predicted table, and do not present this archive as a verified solution.
