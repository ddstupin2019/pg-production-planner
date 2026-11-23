# Phase handoff: independent tester correction and DOM snapshot optimization

## Latest: optional editable-ID copy may retain the original visible order

Changed only the accepted editable branch in `tests/e2e/order-origin.test.ts:52–58` and this note. Y must still be accepted with original quantity 10/due 1. X may be absent (replacement) or remain (copy); if present, its quantity/due must still be 10/1. The shared later attempt to create X with changed originals still must reject with an alert and unchanged complete export/state. Readonly/disabled handling and every unconditional domain deletion/rename/reuse case are unchanged. No new UI feature or mutable-original allowance was introduced.

Checks from the sole tester CWD: `npm.cmd run typecheck` **exit 0**; `node node_modules/eslint/bin/eslint.js tests/e2e/order-origin.test.ts --max-warnings=0` **exit 0**, zero errors/warnings; `node node_modules/prettier/bin/prettier.cjs tests/e2e/order-origin.test.ts --check` **exit 0**. No browser/unit rerun; their reports remain untouched historical evidence, not new passes. Case counts are unchanged. Orchestrator owns the actual-UI RED rerun and requested rereview. No Git, implementation reads, source/configuration changes, other worktrees or coder communication.

## Previous: second D3 review — browser ID editability is an optional capability

Corrected only `tests/e2e/order-origin.test.ts`, the permitted clarification in `tests/PUBLIC_UI_CONTRACT.md`, this handoff and regenerated browser evidence, in the same tester worktree. No Git, implementation/source inspection, other worktrees, chat, delegation, coder communication, unit-test edits, source/configuration changes or new UI feature was introduced. All unconditional domain removal/rename/reuse/origin-ledger regressions remain unchanged.

`order-origin.test.ts:40–71` now reads the actual semantic textbox's DOM editability through `isEditable()` after checking that its visible value is the original custom ID:

- **Editable branch (`:44`)**: assert editability and exercise the optional new-custom-ID replacement, saving Y while preserving its copied original quantity/due. The accepted export becomes the comparison snapshot for the attempted reuse of X with changed originals. This is a new custom identity, not rewriting the old identity's ledger.
- **Readonly/disabled branch (`:57`)**: assert noneditability and unchanged original ID, cancel via the normal enclosing modal button, and compare complete export bytes/workflow with the original accepted snapshot. Confirm X still has quantity 10/originalDue 1. No fill, force-click, attribute rewrite or application-state bypass is attempted on the protected control.
- **Shared mandatory rejection (`:73–94`)**: attempt creation of X with changed originals. The editable branch tests historical-ID reuse; the protected-ID branch tests an existing-ID conflict. Both require a changed semantic alert snapshot, a visible nonempty alert, retained entered values and unchanged complete exported state after normal modal cancellation. Capture alerts before opening/filling this invalid form so live validation is not incorrectly required to wait for submit. Neither branch skips the test or omits rejection/state assertions.

`PUBLIC_UI_CONTRACT.md:3/:17` now identifies v1.3 and explicitly permits readonly/disabled existing IDs. Optional editable-code custom-copy/replacement does not release or overwrite the prior identity's originals; no UI rename/removal/history feature is required. Existing semantic names and all mandatory domain constraints remain unchanged. The clarification contains no private case values/paths or new coder feature request.

### Checks actually run

All commands used `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests` and existing local dependencies.

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:e2e -- --reporter=./tests/reporters/browser.ts --output=tests/evidence/browser-origin-capability-results` | Exit **1**; **30 total / 9 helper passes / 21 product placeholder failures / 0 skipped / 0 interrupted**; zero global errors; three repetitions, zero retries |
| Read-only SHA-256 on the two edited code/public-contract paths | Exit 0; current-byte identities below |
| Browser report header/new title and scoped browser-code reread | All 30 records retained, `truncated:false`; revised case still fails at the placeholder's absent planner control |

**Delta: zero new/removed cases.** Browser discovery remains 10 cases × three repetitions = 30. Both runtime editability branches are authored/typechecked but **unreached in stub RED**, because boot fails before opening the order form. No corrected real-product browser GREEN or executed branch coverage is claimed. Existing 90-second timeout, repeat=3, retry=0 and runtime guards were not changed.

Unit tests/report were **not rerun or edited** for this UI-only correction. Their last recorded result remains the prior **494 total / 81 passed / 413 failed** stub run, not a new unit check. The previous eight unconditional unit regressions, four added baseline D1 cases, registry tests and all positive alternatives remain mandatory regardless of browser ID editability. Old browser artifact directories were preserved; this run's failures are under `browser-origin-capability-results/`.

Initial typed lint detected an unused initial snapshot assignment; it was replaced with an explicit exported-result type and definite assignment in both branches, without disabling a rule. Final type/lint/format and the full baseline browser run then passed their tooling checks / retained the expected product RED. The attempted Context7 lookup was unavailable due to quota; no alternate network fetch, install or credential change was made. Installed Playwright types accepted the DOM capability API; actual product branch selection remains unverified as stated above.

### Current actual-byte SHA-256

| Path | SHA-256 |
| --- | --- |
| `tests/e2e/order-origin.test.ts` | `67207726a8dc090e82f85ee2eec71fd8f101ac4d28a72e1e352088335254f52c` |
| `tests/PUBLIC_UI_CONTRACT.md` | `8ec9aae36483316f2812dfa4b20d8733755076bd151fa5f16c62e1a098d5eb2d` |

The revised browser case/public clarification require the requested rereview before transfer/freeze. No new coder input or production patch was supplied. The source v1.3 contract and unconditional domain behavior have not been narrowed.

## Previous: primary D3 test-review corrections — mutable corruption copies and all-four-template preflight

Narrow corrections only in the preserved tester worktree: `tests/unit/order-origins-contract.test.ts`, `tests/unit/template-d1-regression.test.ts`, this handoff and regenerated unit evidence. No implementation/source inspection, Git commands, other worktrees, chat, delegation, source/configuration edits or browser run. Existing positive baseline alternatives, common lineages, earlier regression cases and all quality thresholds remain unchanged.

### 1. Malformed inputs are cloned before deliberate corruption

`order-origins-contract.test.ts:444` now uses `structuredClone((build ?? withCustom)())`; `:455` uses `structuredClone(withCustom())` before nonfinite-field corruption. This allows legitimate immutable historical/registry-node sharing in public transition outputs. No transition result is required to expose mutable shared subnodes. Only the owned external-input copy is deliberately corrupted, then the existing denied/export helpers still deep-freeze it and assert exact input immutability, rejection/no value and original-data INVALID_INPUT export. The 41 registry cases and all their assertions remain; this corrects fixture construction, not the contract oracle.

### 2. Added four baseline D1 negatives without removing GRIND-4/5 work

`template-d1-regression.test.ts:42` now supplies the documented phase-specific event inputs for all four names: [] for baseline VAL-2 variants, failure for repair, failure→absence for night. Existing repair/night inputs remain equivalent.

- `:120` verifies the two original GRIND-4/5 VAL-2 Job placements at the exact selected variant's intervals and B production permissions covering those intervals. Neither new negative case removes or relocates that expected work.
- `:148`: two new baseline cases change only the independently constructed GRIND-1 production to B, with a completed A→B setup [0,20), a separately assigned setup worker, and quota 80 ensuring positive production across t=120 (.68×100=68<80). The existing B feed supports the two original validations; their Jobs/permissions remain at the correct staggered/parallel positions. Real evaluation, independent configuration/material/work/staff ledger checks and actual positive B intervals must succeed before template refusal is asserted.
- `:180`: two new baseline cases retain the original two GRIND-4/5 Jobs/permissions and add a distinct GRIND-1 validation on [90,270), with its own extra worker. GRIND-1/A still actually produces around t=120; the general physical report may honestly disclose the impossible/conflicting validation. Both baseline template APIs must reject the D1 overlap rather than treating missing expected work as the negative input.

The refusal checks preserve Plan/events/source constants, require explained error issues and no partial value, and never demand feasible=true for these arbitrary negative inputs. All four templates now have explicit wrong-product and overlapping-validation negatives. No mock, private import, skipped test or replacement evaluator was added.

### Executed checks and bounded results

All commands ran from `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests` with installed local dependencies.

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Final exit **1**; **494 total / 81 passed / 413 failed / 0 other**; zero unhandled/module errors |
| Read-only SHA-256 command on the four paths below | Exit 0; final current-byte identities recorded |
| Scoped correction/report reread | Both pre-corruption clones and all four new case records confirmed; new records reach `Not implemented: evaluate` |

Delta is **+4 unit cases: 490→494**, below the unchanged **512-record** bound. Refreshed `unit-review-red.json` retains all **494** records with `truncated:false`. Source/witness passes remain 81. The expected stub throws are meaningful RED, not proof that implementation accepts immutable sharing or enforces the new baseline guards; those paths still need the independent implementation run. Final unit/type/lint/format were rerun after apply_patch-only formatting.

**Browser was not rerun** and all browser files/reports/artifacts are unchanged; the prior 30-run evidence remains historical only. Neither timeouts/repeats/retries nor any existing positive acceptance assertion was relaxed.

### Current actual-byte SHA-256

| Path | SHA-256 |
| --- | --- |
| `docs/PUBLIC_SPEC.md` (v1.3, unchanged) | `dba0fb0f17977da2b2b2a485d9fc58fbaf978dbd30bef7bb92f195df73916df9` |
| `docs/SPEC.md` (v1.3, unchanged) | `f6cf0837c70260b9a1c25f4420ee95001025a23f7deeae86c5dc33cf0ab77fff` |
| `tests/unit/order-origins-contract.test.ts` | `85f3829ec4817efae88fd2f057d8ce61e9552225c4207ada69629bed370e5a3e` |
| `tests/unit/template-d1-regression.test.ts` | `fa2c07c25c14319a9082ee6d5ea976e9f1a133349f03609e62f97cfff8027d09` |

These are file-byte hashes, not a candidate/Git identity. **Primary rereview and the second gate are pending before code fixes/freeze.** No coder handoff, production patch, implementation GREEN or coverage pass is claimed.

## Previous: approved public v1.3 / D3 registry contract supplement

Read the transferred PUBLIC_SPEC/SPEC **v1.3**, especially PUBLIC_SPEC §4.4 lines 218/237–249 and D2 failure export. Only tester files were written in `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`. No implementation/source inspection, Git commands, other-worktree access, chat, delegation, installs, source/configuration edits or browser execution. Documentation itself was read/hashed, not modified. The eight prior unit regressions and their browser case remain intact; no existing assertion or quality gate was weakened.

### New public registry checks — 41 unit cases

`tests/unit/order-origins-contract.test.ts:13` declares only the documented local intersection `Workflow & { orderOrigins: { id: string; quantity: number; originalDue: Shift }[] }`. It is applied to real createWorkflow/transition results and explicit JSON boundaries. No new bootstrap import, any-cast, private field/helper, engine mock or silent registry default is used. The public output-presence check at `:31` fails if a successful Workflow omits the field; stubs therefore remain runnable/typecheckable without a bootstrap interface edit.

- `:142`: exactly six ORD-1…ORD-6 origins from independent source transcription, deterministic calls, fresh list/records, no aliases to REQUIRED_ORDERS/input/scenario/revision orders, and unchanged source/input data.
- `:162–239`: deterministic first-acceptance order rather than ID/current-order sorting; multiple new IDs in one accepted action; retention through rename/removal and same-original reuse without duplication; separate quantity/due conflict rejections after removal; unauthorized and whole-action-invalid submissions append nothing; a later valid first acceptance uses its actual values, not rejected/transient values; committed ID normalization without duplicate origins; restore resets to precisely the six origins while preserving the old lineage/scenario, then permits new originals for the old custom ID in the new lineage.
- `:243`: export includes the ordered full registry, even after two very large custom demands are removed. Compare its real current evaluation and complete independently checked execution/outputs with the original current-order-only Plan. Hidden origins cannot create phantom order rows, deficits, allocations, output or stock. No expert numerical checksum or universal deadline-feasibility oracle is introduced.
- `:282`: through real submit, both-role approvals, successor creation, supported failure, independently constructed future A transfer, absence and renewed approvals, assert registry retention after every action and complete input/old-state immutability. No manually invented agreement or arbitrary version-count assertion is added.
- `:335`, `:441`: **28 finite-JSON malformed states**, each checking both immutable transition rejection and deterministic D2 export of the original supplied workflow with INVALID_INPUT. Cases cover missing/null/nonarray ledgers; duplicate/empty/blank IDs; zero/negative/null/text quantities; out-of-range/fractional/noninteger-type due shifts; missing or changed baseline origins even after visible removal; missing custom origins; current/scenario/historical quantity/due disagreement; missing historical-only origins; null/nonobject records and missing fields. Valid states/history are obtained through public actions before corruption; historical rows are real retained revisions, not fabricated state. No missing custom origin is invented during validation.
- `:452`: **three raw nonfinite quantities** (NaN/+Infinity/−Infinity) must be rejected immutably as INVALID_INPUT. D2 is expressly limited to finite JSON-compatible data, so export is checked on the actual JSON-boundary representation (quantity=null), requiring that original null-bearing workflow and INVALID_INPUT diagnostics remain unchanged, not that raw Infinity be serialized faithfully.

Count composition is **10 lifecycle/output/behavior cases + 28 malformed-state cases + 3 nonfinite-boundary cases = 41**. Each malformed-state case exercises both transition and export; grouping does not skip either check. New tests use no hard-coded private state IDs, registry implementation logic, branch knowledge or new UI requirement.

### Necessary legacy fixture-data alignment, no assertion changes

`tests/unit/workflow-boundaries.test.ts:33/:58` and `tests/unit/recorded-history.test.ts:26/:54` now seed independent six-origin records in their existing external-JSON draft fixture builders, using the same documented local intersection. Without that fixture-only addition, their earlier valid-draft control and unrelated malformed-plan/event checks would be invalid merely because v1.3 now forbids a missing ledger. Existing tests/actions/expected outcomes, including all previously requested regressions, remain unchanged. No production interface was declared/edited and no registry was fabricated as an output of a public API: only owned external-input fixtures received the required documented field.

### Current actual-byte SHA-256 evidence

Computed with `Get-FileHash -Algorithm SHA256 -LiteralPath` on the six named existing files, from the tester CWD. These are individual current-byte identities, **not** a Git/source-candidate manifest or an inherited approval claim.

| Path | SHA-256 |
| --- | --- |
| `docs/PUBLIC_SPEC.md` | `dba0fb0f17977da2b2b2a485d9fc58fbaf978dbd30bef7bb92f195df73916df9` |
| `docs/SPEC.md` | `f6cf0837c70260b9a1c25f4420ee95001025a23f7deeae86c5dc33cf0ab77fff` |
| `docs/SOURCE_REQUIREMENTS.md` | `5d9f9ef37bd619b72b5015f11f90f4a302604fe22f520e7044e653c6a279171f` |
| `tests/unit/order-origins-contract.test.ts` | `06c0f94826ad30f031f5bbe2d6a63ccf617df3fc493f6b0546a2b82deeea3336` |
| `tests/unit/workflow-boundaries.test.ts` | `f4a422277c1a03e11156dac92e787344477be8aba4df26e32bdafd45497c7194` |
| `tests/unit/recorded-history.test.ts` | `5ce4f261c465130586a710c41523299a7a034f5ff83108e3547d74c32c68d936` |

### Checks actually executed

All commands used the sole tester CWD above and existing local dependencies.

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0; local intersection compiles without changing the old bootstrap Workflow declaration |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; typed lint, zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Final exit **1**; **490 total / 81 passed / 409 failed / 0 other**; zero unhandled/module errors |
| Read-only SHA-256 command on the six paths above | Exit 0; current byte hashes recorded above |
| Scoped code/fixture/report reread and new-case discovery inspection | New 41 cases present; unit report header and representative initialization/malformed/history/nonfinite records reread |

Discovery is **449 + 41 = 490**, within the unchanged **512-record** reporter bound. `unit-review-red.json` was regenerated and retains all 490 records, `truncated:false`; the 41 additions reach the preserved public `Not implemented: createWorkflow` throw rather than failing at an import or accepting a synthesized registry. Output absence would likewise fail explicitly if an older successful implementation omitted orderOrigins. Current execution proves meaningful stub RED and tooling validity, not successful v1.3 behavior against implementation. The previous 81 source/witness passes remain unchanged.

**Browser was not rerun for this unit-only supplement.** `browser-review-red.json` and browser files/artifacts remain the prior 449-unit-stage evidence: 30 browser runs, 9 helper passes, 21 placeholder product failures (18 prior product runs plus the three repetitions of the new order-origin UI case), zero skips/interruption/global errors. That historical run is not a new browser check or a real-product GREEN. Existing repeat=3/retry=0/90-second browser bounds and all UI requirements remain unchanged.

Tool history: initial typecheck/lint passed. Formatting checks initially identified the new registry file and one fixture file; formatting was applied only via apply_patch, then final full unit/type/lint/format checks passed with the expected unit RED status above. Hashes refer to the final checked code bytes. Existing ignored-evidence policy remains unchanged; retain this handoff and desired reports explicitly during orchestration.

The public v1.3 artifact is now present, so **there is no documentation/interface wait** for these tests. **Both review gates remain pending before code fixes/freeze.** No coder handoff, real-implementation registry result, coverage pass, production fix or release acceptance is claimed. The new registry behavior and D3-aligned external fixtures still require the independent foreground implementation run after review.

## Previous: order-origin lineage and independent template D1 regressions

Added only three focused test files plus this handoff and generated baseline evidence. All preexisting 441 unit cases and browser expectations remain untouched. Sole worktree/CWD: `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests`. Baseline `734cb60` is the orchestrator-supplied identity, not a new Git verification; **no Git commands** were run. No implementation/source inspection, other-worktree access, chat, delegation, installs or source/configuration edits were performed. The unchanged browser webServer made its normal generated build/preview outputs. No private testcase was sent to the coder and no production correction was authored.

### Order-origin behavior (four unit cases and one browser case)

- `tests/unit/order-origin-regression.test.ts:19`, `:59`: through real createWorkflow/transition calls, the planner adds ORIGIN-X with quantity 10/originalDue 1, then replaces it with ORIGIN-Y in the same draft. The test establishes that **no retained revision contains X** and only one draft version exists; reintroducing X with quantity 1/originalDue 4 must be explained, immutable rejection with no partial value. Thus scanning only current drafts/versions cannot satisfy the oracle. No particular origin-error code is prescribed; all returned issues must be explanatory errors with nonempty codes/messages and issue refs.
- `order-origin-regression.test.ts:64`: remove one independently transcribed source-original ID, retain its unchanged scenarioPlan original, then attempt changed quantity/due on reintroduction. This must also reject without mutating state/action.
- `order-origin-regression.test.ts:80`, `:91`: a genuinely unused ID remains accepted, and restore begins a fresh lineage in which the removed custom X may be submitted with new originals. These positives distinguish lineage immutability from blanket rejection or permanent global ID blacklisting.
- `tests/e2e/order-origin.test.ts:17`: create X=10/due1, edit its exact primary-table row to Y, then attempt X=1/due4 through the actual named form. A changed semantic alert snapshot and visible nonempty alert are required without hard-coding localized error text; invalid inputs remain entered. Normal modal cancellation permits a subsequent JSON download, whose complete bytes/workflow must equal the pre-attempt export. All table/form/field/button names are semantic and exact where applicable; no forced click, app-state read or background modal bypass.

### Independent applyTemplate D1 behavior (four unit cases)

- `tests/unit/template-d1-regression.test.ts:72`: both repair and night templates receive a GRIND-1/B target with a valid A→B setup [0,20), REWIND-2/B fed from its 100-unit initial buffer, and positive B production spanning t=120. Independently derived rates are 2.125 REWIND and .68 GRIND; the hand roster covers baseline setup/production through quota completion. A real baseline report and full independent ledger establish actual B production, then real physical evaluation with the supplied failure/absence events must remain structurally accepted with no malformed/event-target/event-order errors. This is a legal general physical target but **not** the supported D1 A target; each standalone template API must return explained immutable failure, no partial Plan/report.
- `template-d1-regression.test.ts:93`: both templates receive a public factory Plan whose GRIND-4 VAL-2 Job is relocated, retaining its public-derived ID, onto GRIND-1 during [90,270). The engine may honestly report validation/staff/work infeasibility. The tests independently establish actual GRIND-1/A production around 120 and positive intersection with repair, use the full ledger only on consistently configured inputs, and then require template rejection rather than an accepted engine report. No exact arbitrary rejection code or universal feasibility requirement is imposed.
- The shared local refusal helper snapshots plan/events/source constants, invokes only the public evaluate/applyTemplate APIs, and requires nonempty error issues, no partial value and unchanged input/source data. There are no mocks, evaluator substitutions or private imports. Existing common-lineage/idempotence positives are unchanged.

### Documentation/interface status

PUBLIC_SPEC was reread and still identified **v1.2** at final inspection; the D3 artifact was not yet present. These regressions use the user-authorized existing lineage/D1 behavior through existing public signatures and **never reference or construct `orderOrigins`**. Therefore no new interface/stub extension is needed for these tests, and execution is **not waiting on a D3 interface update**. The documentation owner still owns the later additive registry specification; its publication/alignment and both independent reviews remain coordination gates. No D3 documentation or source types were edited here.

### Checks actually executed against the preserved stubs

All commands used the sole tester CWD and installed local dependencies.

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Exit **1**; **449 total / 81 passed / 368 failed / 0 other**; zero unhandled/module errors |
| `npm.cmd run test:e2e -- --reporter=./tests/reporters/browser.ts --output=tests/evidence/browser-origin-d1-results` | Exit **1**; **30 total / 9 helper passes / 21 product failures / 0 skipped / 0 interrupted**; zero global errors; repeat=3, retry=0 |
| Scoped new-file reread and bounded report/header/new-record inspection | Eight new unit records retained; new browser title/repeat failure recorded; no existing assertions edited |

Delta: **441 + 8 = 449 unit cases** and **one additional browser case × three repetitions: 27→30 runs**. New unit failures explicitly reach `Not implemented: createWorkflow` (four lineage cases), `Not implemented: evaluate` (two B-target cases) or `Not implemented: createScenarioPlan` (two validation cases). The new UI repetitions fail at the placeholder's missing planner role control, before form behavior. These are observed **stub RED**, not proof that the real-candidate bugs were reproduced or fixed. The foreground prefixed-QA run remains necessary for meaningful implementation-bug RED.

Reporters/caps were unchanged. Refreshed `unit-review-red.json` and `browser-review-red.json` retain **all 449/30 records**, `truncated:false`, within the existing 512/64 limits. Baseline failure screenshots/context/traces are under `browser-origin-d1-results/`; prior evidence remains. Timeout 90s, three repeats, zero retries, source/runtime guards, all earlier physical assertions and quality thresholds are unchanged. Initial typecheck/typed lint passed; formatting was applied only through apply_patch using local formatter output, then the final type/lint/format and full suites ran. Existing ignored-evidence policy is unchanged; retain the new files/artifacts explicitly during orchestration.

**Both new bug regressions require primary and secondary review before the production fixes/freeze.** No new real-implementation execution, coverage result, D3 registry-shape check, downstream UI success or production acceptance is claimed. No blocker prevents reviewing these behavior-only tests; the pending D3 artifact must still be coordinated by its owner.

## Previous: exact two-stage night-template target guard regression

Added only `tests/unit/night-event-chain.test.ts`, this handoff update and generated unit evidence in the preserved tester tree. Existing 440 cases, including the positive GRIND-1 full lineage, remain untouched. No Git, chat, delegation, implementation/source inspection or production/configuration edit was performed. No testcase was sent to the coder and no production patch was made.

One focused public regression (`night-event-chain.test.ts:30`) uses createScenarioPlan with the physical events `[{kind:'failure',machineId:'GRIND-2'},{kind:'absence'}]`. Before invoking the night template, it must independently establish:

- Actual positive GRIND-2 production immediately before and containing t=120 from the baseline evaluation, allowing equivalent interval splits (`:38–46`), rather than trusting a machine name/setting/campaign permission.
- A real `ok:true` physical evaluation for those exact events, finite evidence and the independent complete ledger, with no malformed-input/unknown-target/illegal-sequence error (`:49–58`). The report may honestly disclose physical effects; no arbitrary all-feasible requirement was added.
- GRIND-2 repair [120,270) totaling exactly 150 workminutes and zero production in that interval (`:59–68`). Thus the template request cannot be dismissed merely as an unknown/nonoperating physical target.

The template must then return explained `ok:false` with nonempty error issues and **no partial value**, while plan/events and all public source constants remain equal to pre-call snapshots (`:72–84`). No arbitrary individual template error code is mandated. PUBLIC_SPEC v1.2 §4.5 specifies exactly the GRIND-1 failure→absence chain for NIGHT_WRAP_STAGGERED; the broader physical evaluator's support for another operating GRIND target does not authorize that template lineage. No skips, fallback target selection, mocks or private imports were introduced. The new unit case follows the existing scoped 60-second coupled-ledger convention; no existing timeout or quality gate changed.

Checks actually run from `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests` with local dependencies:

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Final exit **1**; **441 total / 81 passed / 360 failed / 0 other**; zero unhandled/module errors |

Delta is exactly **+1 unit case: 440→441**. Bounded `unit-review-red.json` was regenerated and reread: all **441** records retained, `truncated:false`, within the unchanged 512 bound. The new record is observed RED at **`Not implemented: createScenarioPlan`**, not a missing import or a caught/ignored exception. Its physical prerequisites and target-refusal assertions therefore remain unexecuted against implementation; no real-candidate failure/pass or coverage improvement is claimed. Final unit/type/lint/format were rerun after apply_patch-only formatting. Browser was **not rerun** and browser files/reports/artifacts were untouched.

Instruction-route caveat: the initial-instructions tool returned its manual and reported automatic activation of the main-project path outside the permitted tester tree. No semantic project tools or file inspection were used through that project; all explicit file operations/commands used the tester paths. Possible automatic activation artifacts were not inspected, because other-worktree access is prohibited.

**This new test requires both primary and secondary approval BEFORE any production patch.** Orchestrator owns those gates and any coder communication. Neither approval nor a production correction is claimed here.

## Previous: exactly three narrow external-data/history boundary cases

Only `tests/unit/recorded-history.test.ts` was added, alongside this handoff update and regenerated unit evidence. All existing 437 cases remain untouched. Work stayed in the preserved tester tree; no implementation/source reads, Git commands, other worktrees, QA inspection, delegation, source/configuration changes or browser execution. The supplied 437-case real-candidate GREEN is context, not an execution claimed here. Serena initial instructions timed out once; no alternate discovery was attempted.

The three added cases are:

1. `tests/unit/recorded-history.test.ts:52`: a plain finite-JSON manager baseline draft has an independently cloned, intact scenarioPlan; **only** its current revision's plan.campaigns becomes null. apply-failure must return explained input/workflow rejection with no value, no state/action mutation and no successor. It does not corrupt scenarioPlan to shortcut the current-plan boundary.
2. `tests/unit/recorded-history.test.ts:66`: an externally constructed manager baseline/sent/draft at D 11:00 is unlocked, has a structurally valid empty physical Plan and legal `[failure GRIND-1]` event array, but no actual GRIND-1 production. Valid counts/reasons cannot lock requests; EVENT_TARGET or a relevant explained input/event/workflow rejection is accepted. The complete state/action must remain unchanged, with null locks/requests and no approvals. No claim is made that this externally supplied combination is reachable through the normal UI.
3. `tests/unit/recorded-history.test.ts:87`: obtain the public factory and repair template result, then construct the external absence Plan by surrounding **one actually produced pre-cut campaign ID** with whitespace. The record is selected using public campaign fields and evaluated pre-cut production, preferring start=0/PRESS-1 and otherwise any actual pre-cut campaign; no private ID is hard-coded. The night template may refuse with an explained known public input/engine/workflow error and immutable input. On acceptance, the original whitespace-bearing historical ID, machine/product/start and pre-cut permission extent must survive; real evaluation and the independent ledger/full machine/settings/material/work/operator prefix must match the repaired reference under identical absence events. The only difference in that reference input is the record's spelling; no report is fabricated. This is already recorded external history, **not** a ban on trimming ordinary form submissions. No single error code or arbitrary external-plan feasibility is mandated.

Checks actually run from `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-tests` using local existing dependencies:

| Command | Observed result |
| --- | --- |
| `npm.cmd run typecheck` | Final exit 0 |
| `node node_modules/eslint/bin/eslint.js tests --max-warnings=0` | Final exit 0; zero errors/warnings |
| `node node_modules/prettier/bin/prettier.cjs tests --check` | Final exit 0; all matched files formatted |
| `npm.cmd run test:unit -- --reporter=./tests/reporters/unit.ts` | Final exit **1**; **440 total / 81 passed / 359 failed / 0 other**; zero unhandled/module errors |

Discovery is exactly **437 + 3 = 440**. The three new cases are meaningful RED against public throw stubs: the first two reach transition and the third reaches createScenarioPlan; no new cases pass by catching stub exceptions. `unit-review-red.json` was regenerated and its header/new records reread; all **440** records remain retained, `truncated:false`, within the unchanged 512 bound. Existing helper policies, original tests, browser reports, timeouts/repeats/retries and quality gates are untouched. Browser was **not rerun**; its earlier evidence below is historical, not a new pass. Final unit/type/lint/format were rerun after apply_patch-only formatting of the new file.

**Final small primary and secondary reviews are both required before freeze/transfer.** The new boundaries and historical-ID accepted/refused paths remain unverified against implementation; no new real-candidate GREEN or coverage is claimed. No private test material was supplied to the coder.

## Previous: second-review VAL-2 external-placement oracle correction

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
