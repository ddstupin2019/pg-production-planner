# Phase handoff: independent tester correction and DOM snapshot optimization

## Latest: narrow second-review structural-rejection correction

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
