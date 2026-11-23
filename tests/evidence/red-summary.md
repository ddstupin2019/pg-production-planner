# Independent acceptance suite: observed RED evidence

## Targeted error-code correction — latest evidence for two rereviews

Assignment boundary: preserved tester tree only, `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`. No new implementation or QA material, other worktree/ref, source/config/lockfile or environment file was read or edited. **No Git commands** were run in this correction. The branch/HEAD identity recorded in older sections below is historical, not a new Git verification. The orchestrator's combined **174 passed / 7 failed** report is supplied context, not an execution or GREEN result claimed here.

### Precise assertion changes

- `unit/engine.test.ts`: only the illegal-route and positive-duration same-product-setup cases now accept either structural `ok:false` with `INVALID_INPUT` and no partial report, or evaluated `ok:true` with `feasible:false` and a specific error `MACHINE_CONFLICT`/`SETUP_REQUIRED`. Evaluated cases require zero affected-machine production by both rate integration and reported quantities, and the input plan must remain unchanged. Other structural mappings remain strict.
- The null-events case alone accepts `INVALID_INPUT` or `EVENT_ORDER`. It still requires rejection, error severity and normal issue shape, no `value`/partial report and unchanged input. All other malformed-shape cases retain their exact `INVALID_INPUT` requirement.
- `unit/workflow.test.ts`: `denied` supports explicit per-call code lists, but its default remains **only `WORKFLOW_GUARD`**. In the four targeted scenarios, empty/blank acknowledgements additionally allow `INVALID_INPUT`; submitting unavailable absent-worker assignments additionally allows `STAFF_ASSIGNMENT`/`STAFF_SHORTAGE`; overwriting immutable original and custom quantities additionally allows `SOURCE_CHANGED`. These are named call-site lists, never global any-error acceptance. Rejection severity/shape, no partial state, frozen input and state-unchanged assertions remain. The direct absence edit additionally compares its full input state after rejection/return.
- No physical, material, work, staff-identity, original-commitment, agreement, immutable-prefix, comparison or passport safety assertion was removed. No evaluator mocks, skips, todos, retry/config changes or new acceptance cases were added. Total unit discovery remains **181**. UI precision/disclosed rounding was not changed.
- `reporters/browser.ts`: `onError(TestError)` now records ANSI-stripped message/value diagnostics, bounded to **16 messages × 400 characters**, while retaining the full global-error count and disclosing message-list truncation. Diagnostics appear in both bounded JSON and aggregate output. The list reporter was run alongside the custom reporter as requested.

### Checks actually run after corrections

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | **Exit 0** |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | **Exit 0**, zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | **Exit 0**, all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | **Exit 1**; **181 total, 29 passed, 152 failed, 0 other**; zero unhandled/module errors |
| `npm.cmd run test:e2e -- --reporter=list,./tests/reporters/browser.ts --output=tests/evidence/browser-review-results` | **Exit 1**; **18 total, 0 passed, 18 failed, 0 skipped/interrupted**; three repetitions, zero retries; zero global errors |

Before report generation, `Test-Path -LiteralPath` confirmed the existing `tests/evidence` parent. The final runner invocations explicitly printed `EXIT_CODE=1`. Bounded raw `unit-review-red.json` and `browser-review-red.json` were refreshed and directly reread: all 181/18 case records retained (`truncated:false`); browser global diagnostics correctly show count 0, an empty message list and no truncation. Existing evidence ignore rules are unchanged. Full list output was observed through the terminal tool; the saved bounded JSON and browser traces/context/screenshots are the retained local evidence.

The preserved baseline still yields meaningful RED: unit behavior cases reach explicit not-implemented throws; browser cases load the built local placeholder and fail at the absent planner role control. The 29 passes comprise five source tests and 24 independent work-witness checker tests. These runs do **not** establish that the seven combined-run failures are fixed against implementation; that requires the orchestrator's two rereviews/reintegration run without exposing implementation to this author. No startup/global failure occurred, so nonempty `onError` diagnostics are implemented/typechecked but were not runtime-exercised by this RED run. No downstream browser/axe/coverage GREEN is claimed.

Tooling history: initial formatting checks flagged the two edited unit files; their local formatting was corrected via `apply_patch`, then the final checks above passed. Serena's instructions route timed out twice; no project activation or implementation discovery was attempted through it. Only the three targeted code files and this summary were authored/edited for this correction; runner-generated evidence remains under `tests/evidence/`.

## Previous job/display review correction evidence

The two rejected gaps were corrected only under `tests/**`, in the same isolated worktree and unchanged branch/HEAD recorded below. No implementation, other worktree/ref, Git mutation, shared config, source, lockfile or candidate-hash operation was accessed/performed for this correction.

### Job/work witness gap

- `support/ledger.ts` now calls `checkJobs` unconditionally. `support/work-witness.ts` independently transcribes all nine R7 work definitions and reconstructs work completion without taking a `feasible` flag as input.
- It checks exact sorted JobResult membership/identity, mandatory distinct-machine counts with WORK_MISSING disclosure, required operation/window/duration, complete machine coverage, maintenance/setup/repair stop precedence and zero output, applicable annotations, actual continuous positive named-product validation, normal task coverage and a distinct extra worker for every validation slice. Availability is derived from requests/forecasts and the two-person S2 absence, not trusted from a success flag.
- Complete work requires full exact-duration qualifying evidence and matching full credit. Incomplete work cannot claim more than independently qualifying minutes or be marked complete by accumulating disconnected fragments; it must expose errors and an explanation. Invalid fragments may be discarded rather than forcing an uncontracted retry/fragment-credit policy.
- The strengthened checker covers both exported alternatives and every captured baseline/failure/transfer/absence/night/current-agreement export. The original material, machine, staff and allocation checks remain in place.
- `unit/work-witness.test.ts` adds **24 passing checker self-tests**: valid work, repair/maintenance overlap and honest interruption, plus corrupted identities/rows/credit, missing/distinct-machine coverage, wrong windows/durations, hidden maintenance output, starved/wrong-product validation, gaps, missing normal/extra coverage, shared parallel extras and absent S2 identities. These are hand-built, isolated job witnesses, not evaluator or workflow mocks.

### Comparison/passport gap

- `e2e/display.ts` checks both comparison rows against their separately captured, independently ledger-checked exports: physical feasibility, packed A/B/C, summed original deficits, all four peaks, total labor and mandatory work coverage. The selected template must have visible, nonempty criterion-linked rationale identifying that template.
- Passport tables are checked against the **current export** at baseline, raw failure, transfer, failure agreement, raw absence, night revision and final agreement, plus the custom promised-order case. Checks include current revision/plan/phase, every shift's production/fulfillment/original deficit, original and promised order quantities/deadlines/fulfillment/deficits and shift allocations, every job's identity/interval/credit/completion, and staff requests/availability/peaks/labor/reserve. Duplicate, missing or extra rows fail. Null promises/forecasts cannot be displayed as zero.
- Only the necessary semantic comparison/rationale/passport region/table/column names were added to PUBLIC_UI_CONTRACT.md; no private fixture values were added. The artifact still requires orchestrator acceptance before coder handoff.

### Executed correction checks

All commands ran from `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`.

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | **Exit 0** |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | **Exit 0**, no errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | **Exit 0**, all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | **Exit 1**; **181 total, 29 passed, 152 failed, 0 other**; 0 unhandled/module errors |
| `npm.cmd run test:e2e -- --reporter=./tests/reporters/browser.ts --output=tests/evidence/browser-review-results` | **Exit 1**; **18 total, 0 passed, 18 failed, 0 skipped/interrupted**; 0 unhandled errors; 3 repetitions and 0 retries unchanged |
| `git diff --check`, `git diff --name-only`, `git status --short --untracked-files=all`, branch/HEAD inspection | Diff check **exit 0**, tracked diff empty, only intended `tests/**` additions visible; baseline unchanged |

An early checker-only run passed 23 cases before the additional parallel-extra corruption case. The final full run includes all **24** checker cases plus the original five passing source tests. Early formatting flagged the five new code files; corrections used `apply_patch` only, and the final format check passed. No assertion, discovery rule, retry/repeat setting or gate was weakened.

Bounded raw JSON is saved as `unit-review-red.json` and `browser-review-red.json`: all **181** and **18** case records respectively were retained (`truncated:false`). Reporters cap case records at 256/64, titles at 180 characters and error messages at 240/400 characters, omit stacks, and print only aggregate JSON to the terminal. Counts and runner exit statuses remain authoritative. Browser traces/screenshots/context are retained under `browser-review-results/`; existing evidence ignore rules remain unchanged. The older raw JSON/artifacts below are historical, not the current review run.

**Observed RED limitation:** all 152 domain behavior cases still fail on the baseline throw stubs. All 18 browser runs load the built local placeholder and fail at the missing planner role control, before comparison/passport assertions or axe can execute. Thus the new assertions are authored/typechecked but not claimed GREEN against a real product. Coverage, full physical replay and downstream browser/a11y acceptance remain unverified. Candidate-hash confirmation remains the orchestrator's responsibility; none is claimed here.

## Initial authoring evidence (historical)

## Identity, boundaries and environment

- CWD for every terminal command: `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`.
- Verified branch: `pipeline/hackathon/tests`.
- Verified initial and final HEAD: `2cd2fbd170218842b10dd69d46b5f6e9ee65f3d5`.
- Initial `git status --short`: empty. Later tracked diff: empty; all authored additions are under `tests/**`. No Git mutations, other worktrees/refs, chat archive, delegation, source/config/lock edits or global changes.
- Observed Node `v24.19.0`, npm `11.17.0`. `npm.cmd ls --depth=0` resolved all exact locked direct dependencies, including Vitest 5.1.1, Playwright 1.65.1, TypeScript 6.0.3, Prettier 3.10.1, ESLint 10.15.0 and local axe-core 4.14.1. Dependencies were already installed locally, so no install was needed or performed by this author.
- Only accepted public documents, fixture/type/stub modules and shared test conventions were inspected. No EXPERT_PLAN, new implementation, other branch or other worktree was accessed. Source transcription was used; no fresh PDF visual comparison is claimed.
- Production build/preview ran through the unchanged configured Playwright webServer at `http://127.0.0.1:4173`. Its normal ignored build/cache outputs are generated artifacts, not authored source changes. Test-runner evidence was directed under `tests/evidence/`.

## Initial authoring checks actually run

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Exit **0**, strict project typecheck including tests |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Exit **0**, no test errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Exit **0**, all matched files formatted |
| `npm.cmd run test:unit -- --reporter=json --outputFile=tests/evidence/unit-red.json` | Exit **1**, **157 total: 5 passed, 152 failed, 0 pending, 0 todo** |
| `npm.cmd run test:e2e -- --reporter=line --output=tests/evidence/browser-results` | Exit **1**, **18 failed, 0 passed, 0 skipped**; 6 independent cases × 3 repetitions, 1 Chromium worker, **0 retries** |
| `git diff --check` | Exit **0**, tracked diff empty; this does not itself inspect untracked test content |
| `git status --short --untracked-files=all`, `git diff --name-only`, `git rev-parse HEAD`, `git branch --show-current` | Only the intended test additions visible; tracked source/config/lock changes absent; baseline and branch unchanged |
| `git check-ignore tests/evidence/unit-red.json` | Evidence directory is ignored by existing rules; no ignore rules changed |

The two RED commands were explicitly wrapped to print `EXIT_CODE=1`, not treated as success. Raw final unit assertions are in `unit-red.json`. Browser evidence includes `.last-run.json` with 18 failed IDs, plus per-run failure context, screenshot and retained trace under `browser-results/`. These are generated diagnostics, not a successful demonstration backup. The existing ignore policy also ignores this summary/evidence directory: the orchestrator must deliberately retain/copy desired evidence during integration; this author did not stage or force-add anything.

## Why the failures are meaningful

- All five source transcription tests pass against the supplied correct fixtures. They independently check six orders, all 43 machines/settings, exact rates/routes/stocks/setups/work definitions and nested freezing.
- Calendar tests fail on explicit `Not implemented: workSpans/workingMinutes/toCalendarMinute/toWorkMinute` throws instead of accepting sentinel output.
- Evaluator/comparison tests fail on `Not implemented: evaluate/compare`. They demand both feasible and invalid reports, fractional arithmetic, complete operation queues, full mandatory work, actual task/worker evidence, PACK allocation, honest original deficits and signed deltas.
- Workflow tests fail at the real `createWorkflow` throw. No evaluator is mocked, no manually fabricated agreed state bypasses submission. A future implementation must pass real physical evaluation before the chained agreements/events can proceed.
- Every browser case actually launched Chromium against the built localhost artifact and saw the simulation disclosure. Every case then failed at the missing semantic planner role button (`simulation.test.ts`, `boot`), before orders or downstream interactions. These are product-behavior failures, not missing browser, dependency or discovery failures.
- Runtime network/error guards were installed before page creation and remained active through teardown. No additional guard assertion failure was reported on the reached placeholder state. This is **not** acceptance of later runtime/offline behavior.

## Authored suite manifest

Four unit files, discovered by the unchanged Vitest include rules:

1. `tests/unit/source.test.ts`
2. `tests/unit/calendar.test.ts`
3. `tests/unit/engine.test.ts`
4. `tests/unit/workflow.test.ts`

One browser file, discovered by the unchanged Playwright include rules:

5. `tests/e2e/simulation.test.ts`: 390/light, 390/dark, 1440/light, 1440/dark full lineages; custom/invalid/safe-text/promise/reset; roles/keyboard/actual palette changes.

Supporting authored files: `tests/support/fixture.ts`, `tests/support/ledger.ts`, `tests/e2e/browser.ts`, `tests/FIXTURE_NOTES.md`, `tests/PUBLIC_UI_CONTRACT.md`, this summary. No skips, todos, xfails, retries, gate/config changes or evaluator mocks were introduced. This manifest lists scope; it is not a signed or hashed release-candidate identity.

## Corrections and earlier runs, not hidden

- Initial test-only typecheck found two table-parameter typing errors; initial lint found ten errors (unnecessary assertions and one unawaited WebSocket close); initial format check found eight unformatted authored files. All were corrected only through `apply_patch` under `tests/**`. Final checks above are clean.
- First unit run before the final additional cases: **148 total, 5 passed, 143 failed**. Final expanded suite was rerun and its **157/5/152** counts supersede that provisional run.
- Browser RED was rerun after final source formatting and promise-form assertions: still **18 failed** at the same absent initial control. Changing reporting/output location did not change retries, repetitions, assertions or configuration gates.

## Assumptions, review dependencies and unverified areas

- The independent small witness is documented with hand arithmetic in FIXTURE_NOTES.md. Its deliberately ample staffing and honest deadline warnings are allowed by the contract; it is not an optimizer or an expert schedule checksum. Its complete physical feasibility remains an assertion to be executed against the real evaluator, not a passing claim against throw stubs.
- Semantic UI names in PUBLIC_UI_CONTRACT.md are **proposed for orchestrator acceptance**. Convey only that public artifact, not private tests/scenario values, to the coder after acceptance. No existing implemented UI names were inferred.
- Exact named-template candidate placements follow PUBLIC_SPEC v1.1. If a candidate needs correction, disclose/review the replacement within unchanged source windows before acceptance; never weaken assertions or silently relabel an infeasible alternative.
- All downstream browser steps (including actual themes, forms, named choices, comparison, staffing, agreements, repair/absence, exports/reset, passport/slide link and local axe scans) are authored but **unreached in RED** because the role control is absent. No serious/critical axe pass, responsive pass, full offline pass or workflow success is claimed.
- Coverage was not run in this authoring assignment. Final executable-file coverage thresholds remain unverified and may require further independent tests after implementation and primary/secondary reviews. This suite is not evidence of 100% implementation coverage.
- Full keyboard accessibility, lower-impact axe review, PDF/printing fidelity, screenshot delivery sequence, slide/pilot narrative and matching every passport figure still require implemented artifacts and further independent checks. Security audit/release candidate/build manifests are not claimed here.
