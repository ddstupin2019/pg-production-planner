# Phase handoff: independent tester correction and DOM snapshot optimization

## Latest: second-review VAL-2 external-placement oracle correction

Narrow correction only in the same preserved tester worktree: `tests/unit/template-boundaries.test.ts:39–90`, this handoff and generated unit evidence. No implementation/source reads, Git commands, other worktrees, QA inspection, delegation, source/configuration changes or browser changes. Serena initial instructions timed out once; no alternative discovery was attempted.

The four external GRIND-2/3 VAL-2 cases now accept **either an explained immutable refusal or an accepted bounded correction**. The unchanged transform helper checks frozen input plan/events, orders/mode/requests, finite positive quotas and schedule uniqueness on the appropriate paths. Refusals still require error issues, nonempty explanations/codes/refs and no partial value. Acceptance is no longer incorrectly forbidden merely because the original VAL-2 placement is outside GRIND-4/5.

For an accepted Plan, the four cases independently require:

- Exactly two VAL-2 Jobs, on GRIND-4 and GRIND-5 only, at [0,180)/[240,420) for staggered or both [240,420) for parallel (`:52–65`).
- Unchanged unrelated campaigns/setups outside that pair, non-VAL-2 jobs, forecasts and reserve explanations, plus later unrelated nonpooled assignments (`:66–84`). Contemporaneous/pooled worker allocation is intentionally not frozen by this assertion.
- A real evaluate report with finite numbers and the complete independent material/setup/work/staff/quota/order ledger (`:85–87`). The witness checks that feasible equals absence of physical errors; **feasible=true is not required for arbitrary external input**.

All other cases, inputs, helper policies, browser tests/reports, timeouts/repeats/retries and quality thresholds remain unchanged. Unit discovery stays 437; no tests were added, removed or skipped.

Checks actually rerun from `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`:

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Final exit **1**; **437 total / 81 passed / 356 failed / 0 other**; zero unhandled/module errors |

The refreshed `unit-review-red.json` retains all 437 records (`truncated:false`), including all four corrected titles reaching `Not implemented: applyTemplate`; headers and those records were reread. No implementation GREEN or accepted-result-path execution is claimed. Browser was **not rerun** and `browser-review-red.json`/browser artifacts were untouched; the 27-run result below remains earlier evidence, not a new check. Only apply_patch was used for authored edits; final unit/type/lint/format were rerun after local formatting.

**Both independent review gates are required again before transfer.** The accepted correction branch and implementation behavior remain unverified against the throw stubs. No private test material was sent to the coder.

## Previous: public-boundary supplement and exact order-table scoping

Work remained solely in `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`, authored writes only under `tests/**`. No Git commands, implementation/source inspection, QA reports, other worktrees, chat, delegation, installs or configuration changes. Public SPEC/PUBLIC_SPEC v1.2 and existing test conventions were read. The orchestrator's report that the current implementation passes the prior 350 cases is supplied context, **not independently executed evidence here**; the implementation was neither read nor run. Serena initial instructions timed out once. Playwright exact-name semantics were checked through Context7.

### Added public contracts (87 unit cases; original 350 unchanged)

- `tests/unit/template-boundaries.test.ts:39`: four immutable, explained refusals for VAL2_STAGGERED/PARALLEL with VAL-2 placed on GRIND-2/3, outside the expressly bounded GRIND-4/5 pair. No private helper or exact arbitrary template error-code mapping is used.
- `tests/unit/template-boundaries.test.ts:52`: three independently specified repairs with six distinct small-quota GRIND-1 permissions before/across/after t=120, including exhausted permissions and crossing quotas .51/.68/1.02. Positive pre-cut production is derived as 1.36 + .68 + .68×.5 = 2.38; REWIND provides 20 from its one-time input stock. Any returned Plan must retain finite positive quotas, unique schedules, demand/mode/requests and immutable inputs, pass structural evaluation and the independent ledger, and preserve the full executed prefix with identical events. An explained refusal is also allowed for this external schedule; no optimizer/general recovery success is demanded.
- `tests/unit/template-boundaries.test.ts:114`: two external repair/night schedules carry nondefault completed setup state, accumulated intermediate material and distinct high-numbered S1 workers. Night also changes WRAP-1 A→B and WRAP-14 B→A before t=630, with positive A/B wrapping. Accepted transformations must preserve complete machine/settings/material/task-worker prefix evidence through the independent sameExecution checker, including equivalent splits; explained unsupported-precondition failure is acceptable. These external schedules deliberately lack mandatory jobs and are **not claimed feasible**. A physically invalid report cannot be relabeled feasible or used as an agreement.
- `tests/unit/template-boundaries.test.ts:148`: two required-factory VAL-2 checks preserve exact later unrelated nonpooled setup/validation Assignment records, irrespective of collection order. The filter uses separately identified setup/job task IDs outside the affected pair/VAL-2 and starts at or after t=630, after either VAL-2 placement ends. This follows §4.5's explicit unchanged-unrelated-records contract without assuming pooled run-task identities or contemporaneous worker allocations stay fixed. No general pooled-assignment preservation requirement was added.
- `tests/unit/workflow-boundaries.test.ts:60`, `:231`: 28 finite-JSON corruptions each exercise immutable transition rejection and D2 export preservation/INVALID_INPUT/deterministic formatting: scenarioPlan; nonobject/duplicate revisions; nonexistent/self/nontext parents; status; duplicate/null/unknown-role approvals; workflow role; malformed acknowledgements; events; and nested revision plans. A separate uncorrupted externally constructed **draft** control must allow a legal role switch and export its real infeasible evaluation. No agreed history, evaluator output or private implementation is mocked.
- `tests/unit/workflow-boundaries.test.ts:272`, `:315`, `:342`: 17 malformed order/plan action payloads are submitted only after real createWorkflow/send-demand and, for plan edits, switch-role. State role/demand/draft/unfixed status is asserted; recognizable plan payloads retain null draft requests so an unapproved-request-smuggling guard cannot mask malformed fields. Rejections must be explained with relevant input/source/workflow issues and leave both state and action unchanged.
- `tests/unit/workflow-boundaries.test.ts:359`: two shape-valid externally supplied failure drafts have an idle GRIND-1 target. The evaluator must expose EVENT_TARGET; otherwise correctly authorized fixation/submission cannot succeed, mutate the draft or manufacture approvals. Submission uses fixed counts and explicit risk acknowledgements. This is a negative external-data contract, not a fabricated accepted event lineage.

### Browser correction and executed baseline evidence

`tests/e2e/simulation.test.ts:237`: the custom-order/XSS display, no-image check and edit-row lookup are now confined to the exact `Заказы` table. The row key accepts exact cell/rowheader semantics and must match one row. A sweep of all intentional named-table queries in `tests/e2e/**` confirmed `exact:true`; valid duplicate passport text is no longer an ambiguity. Literal XSS text/no-img assertions and modal cancellation/keyboard/reset checks remain. `tests/e2e/order-table.test.ts:5` adds one real-DOM helper regression with duplicate literal user text and identically named edit buttons in both `Заказы` and `Паспорт: заказы`; the intended primary-table button remains uniquely operable. It uses a synthetic helper page, not application state or force-clicking.

All commands below ran in the sole tester CWD with local existing dependencies:

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Final exit **1**; **437 total / 81 passed / 356 failed / 0 other**; zero unhandled/module errors |
| `npm.cmd run test:e2e -- --reporter=./tests/reporters/browser.ts --output=tests/evidence/browser-boundaries-results` | Exit **1**; **27 runs / 9 helper passes / 18 product boot failures / 0 skipped / 0 interrupted**; zero global errors; three repetitions, zero retries |
| Scoped reread/content search of changed tests and evidence | Original unit files untouched; all named E2E tables exact; generated report headers and new-case records reread |

Unit discovery is **350 + 87 = 437** (76 workflow/control/action cases and 11 template cases). Existing 81 source/witness passes remain; all 87 new domain cases are RED on public throw stubs, with no missing imports or discovery failures. Browser discovery is nine cases × three repetitions = **27**. All three new duplicate-table helper repetitions pass, alongside six earlier helper runs; the 18 product repetitions still fail at the placeholder's missing planner role control. Timeout **90s**, repeats **3**, retries **0**, all physical assertions, modal checks and quality gates are unchanged.

Bounded `unit-review-red.json` and `browser-review-red.json` were refreshed without reporter changes: all **437/27** records retained, `truncated:false`, within the existing 512/64 bounds. Failure traces/context/screenshots for this baseline run are in `browser-boundaries-results/`; older directories remain. Existing ignored-evidence policy is unchanged, so explicitly retain the new handoff/artifacts during orchestrator integration.

Initial typecheck passed; typed lint found one inferred-label stringification issue, corrected by explicitly typing the test table rather than suppressing a rule. Formatting initially identified one file, then passed after apply_patch-only correction; final unit/type/lint/format were rerun. The browser run used the final browser test code before subsequent whitespace-only unit formatting.

**Both independent reviews remain required before transfer.** Real-implementation execution/coverage, accepted external-template branches, new malformed-input behavior and downstream full-product custom-order/lineage performance remain unverified. No heavy real-implementation browser run was performed; only the preserved built-stub baseline plus synthetic DOM helpers ran here. The supplied single-repeat diagnostic GREEN and prior 350 implementation passes are not claimed as this session's results. No private new test material was sent to the coder.

## Previous: narrow second-review structural-rejection correction

This section supersedes the earlier two setup cases' structural-result restrictions below. All work stayed in the same tester worktree. No Git commands, QA/new implementation, source files, other worktrees, chat or delegation were accessed; no browser/helper/configuration changes were made. Serena's instructions route timed out once during this correction; no alternate discovery was attempted.

- `tests/unit/contract-edges.test.ts:107` and `:140`: both cases now freeze the complete evaluation input (plan and events), snapshot it beforehand and explicitly compare it afterward on either returned-result path.
- `tests/unit/contract-edges.test.ts:111` and `:147`: both structural `ok:false` paths use the same existing rejection checker and explicit allowed codes `INVALID_INPUT`, `SETUP_REQUIRED`, `MACHINE_CONFLICT`. The checker requires no `value`, at least one relevant code, error severity, nonempty explanatory messages and issue refs. The repair case no longer unwraps an assumed successful evaluation.
- Both evaluated `ok:true` paths retain their prior assertions: infeasibility, MACHINE_CONFLICT, unchanged A configuration, zero forbidden B production, zero output during stops, pre-repair A output, stop priority/setup/job annotations, and no repair-as-TO credit. No physical expectation was relaxed.
- The separate already-configured-A quantitative union case, now at `tests/unit/contract-edges.test.ts:170`, was reread and remains unchanged. No cases were added/removed and no shared helper/default error policy changed.

Checks actually rerun from the tester CWD, using existing local dependencies:

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Exit **1**; **350 total / 81 passed / 269 failed / 0 other**; zero unhandled/module errors |

`unit-review-red.json` was regenerated and reread: all 350 records remain retained, `truncated:false`; both corrected cases and the unchanged arithmetic case still reach `Not implemented: evaluate`. This is meaningful stub RED, not successful implementation verification. Browser code was untouched, so browser tests were **not rerun** and `browser-review-red.json`/browser artifacts were left unchanged; their prior 24-run evidence below is historical, not a new browser result. Only the two test bodies, this handoff and the unit reporter's generated evidence were written for this correction. Both independent review gates remain required before transfer; real implementation/result-path verification and the previously disclosed browser/performance limits remain unverified.

## Previous phase handoff (historical checks and line references)

## Scope and identity

- Sole worktree/CWD: `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`.
- Read-only Git verified `pipeline/hackathon/tests`, HEAD `e616f9d`, initially clean; final branch/HEAD unchanged. No Git mutations, other worktree/ref access, chat archive or delegation.
- Read SPEC/PUBLIC_SPEC v1.2 and existing test/tool conventions. No `src/**` file (including scenario stubs) or new implementation was read for expectations/tuning; execution imports the public APIs normally.
- All authored changes are `tests/**`. Unchanged Playwright webServer performed its normal production build/loopback preview, with generated build/cache output only; no shared config, source, dependency, environment or public-contract edits. No installs or dependency downloads.

## Exact delta

1. `tests/unit/contract-edges.test.ts:102`: maintenance-conflicting A→B setup now requires MACHINE_CONFLICT, zero output during the stop and afterward, retained A configuration, and maintenance/job/setup annotations. Structural rejection, if used, must explain MACHINE_CONFLICT and return no partial report. The invalid changeover no longer demands 15.3 units of B.
2. `tests/unit/contract-edges.test.ts:130`: repair-conflicting A→B setup now requires MACHINE_CONFLICT, no output over [120,270) or afterward for B, retained A configuration, the original pre-repair A output, repair priority/setup annotation and no TO-2 credit. It no longer demands an additional 20.4 units of B.
3. `tests/unit/contract-edges.test.ts:159`: a separate **already configured A** case retains exact maintenance and repair/maintenance-union arithmetic: PRESS resumes for 20 minutes, GRIND excludes [120,440) once and runs 120+30 minutes, explicitly scheduled TO receives exactly 240 minutes, and repair remains the displayed overlap kind. No setup-completion assumption is involved.
4. `tests/support/table-snapshot.ts:17` and `tests/e2e/display.ts:10`: one table-scoped rendered-DOM evaluation per validation attempt, followed by local assertions. Readiness may poll whole snapshots for up to 5 seconds; there are no per-cell browser-read/await loops in the product display checks. Reader supports native/ARIA rows and rowheaders, checks rendering/visibility/box size rather than viewport intersection, and permits horizontal clipping. No application state is read.
5. `tests/support/table-snapshot.ts:71`: all headings unique and rendered; required headings present; exact expected row membership/count and unique keys; rectangular, visible cells; finite numbers with integer tolerance 1e-6 / fractional tolerance .000501; nonempty nonnumeric null disclosure; textual boolean statuses. Comparison tokens still match only in the variant column. Current passport plan/revision/phase, all shift/staff/order/job fields and both alternative reports remain checked against their captured current exports. `tests/e2e/simulation.test.ts:14` only imports the relocated visibleNumbers helper; all calls, physical checks, modal cancellation and label-token corrections remain.
6. Added `tests/unit/table-snapshot.test.ts`: 27 validator self-tests, including missing/extra/duplicate rows and headings, hidden cells, precision, null/boolean handling, column-scoped tokens and stale plan/revision/value rejection. Added `tests/e2e/table-snapshot.test.ts`: two real Chromium helper tests covering native/ARIA DOM, same keys in a different table, clipped cells and display/visibility/content-visibility-hidden rejection. Synthetic fixture mutations are confined to these helper pages, never the application.

The original **322** unit cases remain discovered: only the two authorized expectations changed; all other cases remain unchanged. Added **28** cases (one physical arithmetic case plus 27 helper cases) gives **350**. Original six product browser cases × three repetitions remain; two helper cases × three repetitions increase browser runs from **18 to 24**. No skips, retries, forced clicks, evaluator mocks, timeout increases or reduced assertions. Global product test timeout remains **90 seconds**, repeatEach **3**, retries **0**. The optional unrelated-template-task-assignment strengthening was not added; it is not a new acceptance requirement or a claimed correction here.

## Checks actually executed

All commands below used the CWD above and already-installed local dependencies.

| Command | Observed result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/unit/table-snapshot.test.ts --reporter=dot` | Exit 0; **27 passed** |
| `npm.cmd run typecheck` | Final exit 0; strict project typecheck includes owned tests |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; typed lint, no errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Exit **1**; **350 total / 81 passed / 269 failed / 0 other**, zero unhandled/module errors |
| `npm.cmd run test:e2e -- --reporter=list,./tests/reporters/browser.ts --output=tests/evidence/browser-handoff-results` | Initial full browser run: exit **1**; **24 total / 6 passed / 18 failed**, zero skipped/interrupted/global errors; three repetitions, zero retries; ~2.1 minutes |
| `npm.cmd run test:e2e -- --reporter=./tests/reporters/browser.ts --output=tests/evidence/browser-handoff-final-results` | Final full browser run: exit **1**; **24 total / 6 passed / 18 failed / 0 skipped / 0 interrupted**, zero global errors; three repetitions, zero retries |
| `git diff --check` | Exit 0; only line-ending notices, no whitespace findings |
| `git status --short --untracked-files=all`, `git diff --stat`, scoped actual diff inspection, current branch/HEAD checks | Only intended `tests/**` tracked/untracked changes; branch/HEAD unchanged |

Bounded reporters were not changed. `tests/evidence/unit-review-red.json` retains all **350** records within its 512-record bound; `tests/evidence/browser-review-red.json` retains all **24** within its 64-record bound. Both disclose `truncated:false`; browser records show all repeat indices 0/1/2 and retry 0. Raw summaries were reread, and the unit evidence confirms the corrected cases/new union case reach `Not implemented: evaluate`. Existing older evidence directories were retained; the two full browser runs' failure traces/screenshots/context are under `browser-handoff-results/` and `browser-handoff-final-results/`.

The 81 unit passes are the prior 54 source/witness cases plus 27 new validator cases. The 269 domain failures are meaningful RED on behavior-free public APIs, not import/discovery/tool failures. All 18 product browser runs loaded the built placeholder/disclosure and then failed on the absent planner role button; all six synthetic helper runs passed. The helper passes are not product acceptance, physical feasibility or accessibility evidence.

New evidence summaries and generated browser directories follow the existing ignored-evidence policy; the orchestrator must explicitly retain them when integrating. No ignore rule or staging was changed here.

Tool history: Serena initial-instructions route timed out twice, with no activation or alternate-worktree exploration. Current Playwright docs were consulted through Context7 for evaluate/assertion polling/visibility semantics. Initial typecheck/lint and helper unit run passed; initial formatting identified five files, then one remaining file, corrected only with apply_patch; final format check passed. Both full suites and typecheck/lint/format were rerun after formatting and explicit four-shift display assertions; the final counts above refer to those runs.

## Review gates and unverified outcome

**Both independent reviews are still required before transfer/integration.** This session did not delegate or claim either review, send private test material to the coder, or transfer any files. Orchestrator owns arranging/reviewing those gates.

The two contract corrections and new arithmetic case cannot pass against throw stubs; actual implementation verification belongs to the independent combined run. Real baseline/second-passport timing and full-lineage completion within the unchanged 90-second timeout remain unmeasured here. Snapshot architecture and DOM visibility/scoping were executed on helper fixtures, but no real-product speedup is claimed. Product downstream passport/comparison, full physical replay, axe, responsive/offline-lineage acceptance and coverage remain unreached/unverified because the placeholder fails at boot. No audit, release manifest or unrelated assignment-preservation improvement is claimed.
