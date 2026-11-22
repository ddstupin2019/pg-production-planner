# Internal implementation and acceptance specification — v1.1

## Accepted contract and present status

Implement [PUBLIC_SPEC.md](PUBLIC_SPEC.md) in full, including its exact public module contracts, and all [SOURCE_REQUIREMENTS.md](SOURCE_REQUIREMENTS.md) R1–R9. The public specification is the canonical product/API text; this internal document adds ownership and acceptance detail, not different behavior. Public material must not include private test paths, names, scenarios or QA artifacts. Read the original PDF pp. 5–10 before interpreting any ambiguity.

**D1 (v1.1):** narrow supported demo interactions to the prescribed GRIND-1/A failure and named manager templates; retain general physical evaluation without a generic validation recovery subsystem. This supersedes v1's arbitrary operating-GRIND workflow target, not PDF conditions, public signatures or schemaVersion. Shipped VAL-2 remains assigned to GRIND-4/5.

This authoring stage creates documentation only. Verified starting point: absolute worktree `C:\Users\ddstu\Desktop\hacatons\p&g`, branch `master`, HEAD `e631994f68fa09da7aec443a2e8e0be1c39d94e5`, clean, with the source PDF as its only tracked file. There are no product sources/configuration/tests at that baseline to inspect or execute. API snippets are prospective contracts, not observed working imports. No feasibility, browser, install or coverage pass is claimed.

Use TypeScript + Vite + vanilla DOM, zero runtime packages, Vitest and Playwright as development tools. A small deterministic fluid-flow evaluator for handcrafted campaigns is sufficient. Do not build a backend, optimizer, generic scheduling DSL, authentication system, MES integration or extra specialist role. Preserve original quantities/deadlines, the one-time initial stock, operation-by-operation material conservation, one 0.85 rate factor, four 630-minute shifts, failure-before-absence and immutable agreements.

## Ownership and independent execution

| Owner | Exclusive write scope |
| --- | --- |
| Product coder | `src/**`, `index.html`, `public/**` |
| Independent tester | `tests/**`, including `tests/unit` and `tests/e2e` |
| Documentation writer | `docs/**`; this assignment only the six named Markdown files |
| Separate gpt-helper bootstrap/QA agent | shared root configs, package manifest/lockfile, tool scripts and their evidence tooling |
| Orchestrator | Git operations, accepted-baseline coordination and third-worktree integration |

**No author edits another author's scope.** Request an owner change instead. Tester and coder work on distinct branches/worktrees from the same accepted baseline; integrate in a third worktree. Only the orchestrator mutates Git. No nested delegation, chat archive or side files. Bootstrap creates imports/exports and a runnable skeleton with behavior absent, not implementation or disguised answers. If a specified model/tool route is unavailable, report it to the orchestrator; do not silently substitute it.

## Required acceptance evidence

| Area | Observable acceptance | Authority |
| --- | --- | --- |
| Source data | Exact six orders, all routes/machines/settings/speeds/stocks/setup matrix/work definitions | R3–R7, pp. 7–10 |
| Calendar | Four shifts, exact exclusions and conversion edges; failure 180 calendar =150 workminutes | R2/R8, pp. 5, 9–10 |
| Materials | Full per-machine production and per-operation stock intervals; nonnegative queues; no stage shortcut, no repeated initial stock | R4/R5, p. 8 |
| Staff | Assigned distinct workers, pooled normal tasks, separate simultaneous setup allocations, validation extras, peaks, integral labor/reserve | R2–R4, pp. 6–8 |
| Work | Every mandatory machine count/duration/window; validation during actual named production; repair never credits TO-2 | R7/R8, p. 10 |
| Commitments | PACK allocation, original-deadline deficits even after revised promises, no double allocation | R5/R6, pp. 8–9 |
| Collaboration | Functional forms and send-demand, manager edits/work placement, before-noon fixed requests, comparison, two-role approval, immutable predecessors | R1/R2, pp. 5–6 |
| Changes | Prescribed GRIND-1/A failure with verified production and no validation on that machine during repair; successor agreement, then absence with fixed request−2; frozen prefixes and cumulative stock | R8, p. 10; implementation choice D1 |
| Delivery | Russian UI/passport/slides/pilot; HTML, PDF if available, screenshot backup; matching figures and visible simulation disclosure | R9, pp. 6–7 |

Tester independently derives expectations from source constants, capacities, route flow and conservation, not expert checksums. Test source transcription, all public API guards and errors, epsilon boundaries, calendar exclusions/shift handovers, initial setup, partial supply, quota exhaustion, internal queues, stop unions, work coverage, staff identity conflicts, allocation, sequential events, approvals, reset and stable export. Exercise custom-order validation without altering the required dataset. Test the physical ledger of each selected replay and alternative, not merely aggregate totals or a screenshot.

Run domain unit checks under `tests/unit` and interaction/accessibility/offline checks under `tests/e2e`. Deliberately malformed or infeasible inputs must return the contracted errors/issues. Tests must not require universal on-time fulfillment: PDF explicitly permits genuine conflicts. A deficit warning can be acknowledged, but cannot turn an invalid physical plan into a feasible one. Do not use [EXPERT_PLAN.md](EXPERT_PLAN.md) as an oracle; it is an unexecuted candidate and may need schedule-only corrections.

### D1 acceptance additions — required, not executed here

- Independently verify that the selected baseline has actual positive-rate A production on GRIND-1 immediately before and at t=120, not merely an A setting or an enabled campaign; no validation on GRIND-1 intersects [120,270). Shipped VAL-2 uses the two distinct machines GRIND-4/5 on B in both staggered and parallel choices.
- Exercise `VAL2_STAGGERED`, `VAL2_PARALLEL`, `REPAIR_G1_TO_G3` and `NIGHT_WRAP_STAGGERED` through real Plan changes and full evaluate reports. Independently check supply, per-machine quotas, setup states, staff identity/concurrency, mandatory work and original-deadline allocation in each coupled replay. Template names, the expert's predicted transfer of 102 thousand blades or rounded stock figures are not feasibility assertions. Require two physically admissible alternatives before presenting a valid comparison; expose/revise a failed candidate rather than relabeling it feasible.
- Verify the prescribed repair on GRIND-1 is [120,270), removes 150 workminutes once, preserves the prefix, and allows only the supported future A/operator transfer to GRIND-3. No transfer counts as TO or validation. Check sequential agreement and absence behavior, fixed requests, the night WRAP changes and cumulative stocks independently.
- Check that any other workflow failure target returns `UNSUPPORTED_FAILURE_TARGET`. A manager's baseline draft containing a GRIND-1 validation intersecting repair must return `UNSUPPORTED_FAILURE_VALIDATION` with machine/job refs, [120,270) evidence and an actionable explanation, before the generic not-agreed guard. For an otherwise eligible baseline lacking actual GRIND-1/A production, expect `EVENT_TARGET`. Rejections must leave versions, approvals, phase and events unchanged. A post-failure edit introducing the same validation conflict must also be rejected.
- Verify half-open repair/validation boundaries and that concurrent VAL-2 on GRIND-4/5 is not rejected merely for sharing time with GRIND-1 repair. The physical evaluator still handles other structurally valid machine plans and reports stopped/incomplete validation honestly; do not add acceptance requirements for automatic retry, fragment accumulation or universal hypothetical-event recovery.
- Browser acceptance must show Russian disclosure of the selected GRIND-1/A event, named editing choices and custom-order limits; no arbitrary target selector. Keep functional order forms, draft/agreed state, physical issues and restoration. A custom-order change must be reevaluated and may disable/reject the demo event if its production precondition no longer holds.

Quality gates, tool-version caveats and evidence rules are in [QUALITY.md](QUALITY.md); coordination is in [ORCHESTRATION.md](ORCHESTRATION.md). Bootstrap must finalize/install-check commands and accepted pins before RED. Coder must not see private tester cases; give the coder PUBLIC_SPEC and SOURCE_REQUIREMENTS, not private acceptance artifacts. The independently authored tests may intentionally remain RED against the behavior-free skeleton; capture observed failures rather than making a skipped-tests claim.

## Release content decisions

- Required scenario mode is immutable as a dataset; editable demands are custom copies. Restore recovers original orders and source data. Scenario-plan corrections may change campaigns, assignments and work placement, never fixed source conditions.
- The public constants/flow/transition contracts take precedence over the provisional expert IDs, shorthand and requested peaks. Translate expert `P1` to `PRESS-1`, etc.; do not expose ambiguous A/B/C mappings to Russian readers.
- D1's supported manager edits are the four named templates in PUBLIC_SPEC, editable requests/forecasts and the existing planner/custom-order/promise workflow. Do not implement a general equipment-event optimizer, arbitrary interactive validation relocation or a validation retry subsystem. The engine's broader physical input shapes do not promise broader workflow recovery.
- Freeze historical production at t=120 after failure and t=630 after absence. The absence is disclosed at the S1 handover, before S2; this cutoff deliberately preserves all completed S1 output. Prior versions remain unchanged even when future work changes.
- Agreement may record acknowledged deadline shortfalls. Missing maintenance, invalid validation, negative material, missing assignments or excess simultaneous workers block agreement. No requirement to prove minimum labor or meet all deadlines is added.
- Suggested human deliverable locations are `public/slides.html` and `public/deliverables/` for passport exports, printable PDF and backup captures; coder owns these paths. Documentation writer writes narrative instructions only; QA/tool owner generates evidence in its agreed scope. Final exact generated filenames belong to the delivery manifest, not speculative links here.
- No package installation, demo build or product behavior change is part of this documentation assignment. Signatures/provenance and a fully offline rebuild are advisory due to external availability; offline **runtime** over localhost is mandatory.
