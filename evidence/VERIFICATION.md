# Final verification evidence refresh — SPEC v1.3 / D3

This is an evidence inventory and observation record for the frozen combined candidate. It is **not a final acceptance verdict**, contains no reviewer approvals, and does not manufacture placeholders for later review. Machine-readable details, exact raw-report hashes, command provenance, coverage denominators/exceptions and limitations are in [package.json](package.json).

## Frozen identities independently rechecked

Working directory for foreground commands and this seal: `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-qa`.

| Identity | Actual-byte SHA-256 | Entries |
| --- | --- | ---: |
| Source candidate | `d3f3d9c2c1e9f12c3345b6112327e2998bf8066f5518e2e635233c98171cea3f` | 76 |
| Production build (`dist`) | `d7394d72d7c1f81e2444aa9414d0e14fab1a541063eb756679c73561a8187124` | 6 |
| Delivery (`artifacts`) | `377e2da31aeb03e01a241951a26d73f4a53147aed290afc766cf114107bfda67` | 15 |

The existing manifest utility hashes actual file bytes and filesystem modes, sorts relative forward-slash paths by fixed ordinal comparison, then hashes the UTF-8 two-space JSON entry array with a final LF. Generated reports/logs/caches remain outside source identity. Source/docs/tests/tools, build and artifacts were not changed during sealing. No export was rerun: PDF metadata changes would invalidate the final delivery identity.

The pre-refresh evidence ID `f9040e2780d3e19cca08d7cebd3fd570477e1e9284069e501b5ae515fb5f29f3` and all prior v1.2 seal IDs are historical. **Compute the refreshed evidence ID after these two files are finalized**, using `node tools/manifest.mjs evidence`; it is returned separately rather than embedded into its own hash inputs. Never save an evidence manifest within evidence or a delivery manifest within artifacts.

## Provenance and scope

The orchestrator reports QA baseline `2cd2fbd`, historical v1.2 source/test revisions and night fix `bac3012`/test `734cb60`, followed by **D3 domain commit `2d6f9ce`, tests through `804e613`, and root documentation `b2ec5b4`**. Current docs/DELIVERY states **495 tests**. Existing shared tooling and the recorded byte-only LF housekeeping are included in the actual-byte source identity above. These abbreviated revision references describe composition; they do not replace the full combined candidate hash. No Git command was executed during this refresh, and no prefix has been expanded without evidence.

The original PDF's actual-byte SHA-256 remains `910e80970cc6b68d1f956801fd00fe2bed3e51f44578ea88007b98f9d960c858`, matching the previously recorded unchanged input. Its historical Git blob is `e738d22c3c8e75c0ddd7cf9067f1c86632fccc40` (not recomputed here). The orchestration record describes an initial PDF-only repository, with no initial user changes overwritten. Source requirements and the original PDF were preserved. Scoped owner prompts/worktrees are process coordination, **not a security sandbox**.

Only `evidence/VERIFICATION.md` and `evidence/package.json` were updated by this refresh. Existing raw reports and tooling notes were read/hash-pinned, not rewritten; the night-target RED, D3 targeted RED and Eprotect raw report were all preserved. No optional report copies were created. No source, tools, app, public, tests, docs/guides, configs, lock, artifact or global configuration changes; no installs, delegation, chat archive, other worktrees, Git, test rerun, build, audit or export execution. The frozen source/build/delivery identities are checked both before and after this evidence-only edit.

## Foreground results and what was independently inspected

The commands below were **already executed in the foreground by the orchestrator**; they were not rerun during sealing. Their exit codes are foreground observations. Existing test/coverage/export reports and byte hashes were independently inspected in this seal. No separate raw log for the type/lint/format/build/audit exits is available here; that limitation is explicit rather than presented as a new run.

| Foreground command | Exit | Observed outcome |
| --- | ---: | --- |
| `npm run typecheck` | 0 | Strict TypeScript gate completed |
| `npm run lint` | 0 | Typed lint/zero-warning policy completed, unchanged |
| `npm run format:check` | 0 | Formatting check completed |
| `npm run build` | 0 | Production build completed; existing six build files rehashed here |
| `npm audit --include=dev --audit-level=high` | 0 | Foreground reported zero vulnerabilities including development dependencies; no advisory rerun |
| `node node_modules/vitest/vitest.mjs run --coverage --reporter=json --outputFile=evidence/unit-green.json` | 0 | **495 passed, 0 failed, 0 pending, 0 todo**; raw report success=true, 18 files / 40 reported suites. Foreground reports 0 unhandled errors; JSON has no top-level unhandled-error field |
| `npm run test:e2e -- --reporter=list,./tests/reporters/browser.ts` | 0 | **30 passed, 0 failed, 0 skipped/interrupted, 0 unhandled errors**; 10 logical cases × 3 repetitions, retry indices all 0. Includes the new origin UI case. Approximately 15.3 minutes reported by foreground |
| `node tools/export-deliverables.mjs --run --evidence` | 0 | Final foreground export complete; 15 actual files, 8 UI/API-matching real screenshots, reported 33/10 PDF pages, zero recorded remote/WebSocket attempts/runtime errors/axe violations |

**Do not infer RED from the filename.** The current `tests/evidence/browser-review-red.json` is GREEN (`status: passed`, 30/30) despite its legacy name. It is neither the preserved historical bootstrap RED nor the prior UI RED (which was overwritten). Its exact current content hash is pinned in package.json.

Installed versions observed during sealing: Node **24.19.0**, npm **11.17.0**, Windows win32/x64 release **10.0.26200**; TypeScript **6.0.3**, Vite **8.3.8**, Vitest/V8 coverage **5.1.1**, ESLint **10.15.0**, typescript-eslint **8.73.0**, Prettier **3.10.1**, Playwright **1.65.1**, axe-core **4.14.1**, @types/node **24.10.1**, @eslint/js **10.0.1**, eslint-config-prettier **10.1.8**. Installed Chromium metadata identifies revision **1255**, version **159.0.8154.6**; no browser was launched here. Root dependencies remain development-only, with no runtime packages.

## Coverage evidence

Existing v1.3 V8 summary: **843/843 lines (100%)**, **968/968 statements (100%)**, **212/212 functions (100%)**, **844/847 branches (99.64%)**; no skipped counters in these four totals. Every executable domain file has 100% lines/statements/functions and at least 95% branches. Engine branches are 99.31%, prefix branches 96.42%, and the other seven covered domain files have 100% branches. Current scenario preflight has 85/85 covered branches; workflow has 250/250.

Thresholds were not changed: global 90% lines/statements/functions, 85% branches; each executable `src/domain/**/*.ts` file 100% lines/statements/functions, 95% branches. Coverage includes otherwise-unexecuted eligible `src/**/*.ts`. Exact exceptions remain:

- `src/domain/model.ts`: public types and frozen source fixture/constants, not a domain-behavior exception.
- `src/main.ts`: imperative DOM rendering/UI, exercised by browser interactions rather than unit instrumentation.
- `src/**/*.d.ts`: type declarations without executable statements.

Raw summary and detailed map hashes are in package.json. Full browser evidence covers 390/1440 widths and both themes; the backup images themselves are all light theme. These are different evidence sets, not an invented dark screenshot sequence.

## Export and final PDF byte identity

Latest same-candidate v1.3 export reports show three agreed revisions in the actual baseline → failure/transfer → absence/adaptation lineage, eight exact public-API-versus-UI JSON matches, zero recorded forbidden HTTP/WebSocket attempts, zero page/console/HTTP errors and zero axe findings of any impact in all eight captured states. All **15 recorded output hashes** were reread and recomputed during this refresh and matched. The exporter's own in-memory served-build ID is `6bdefb83fed1c24e611a5b3d0c3009b46eecabfaa86eb8f40771a79d21275ce5`; it is distinct from the six-file production dist identity above and is not mislabeled as the build used by the full E2E suite.

| Current final PDF | Exporter pages | Bytes | Actual-byte SHA-256 |
| --- | ---: | ---: | --- |
| `artifacts/scenario-passport.pdf` | 33 | 1587632 | `e70460f6acb769142933926b34f4ded4ac2cc50438ea31b89f8502e37be9209b` |
| `artifacts/presentation.pdf` | 10 | 128814 | `b2ab89bfc4455c78cce6672bb0e34425d9684bb66db46769c83396c24b1ffcc4` |

**Independent final-reader inspection of these exact regenerated PDF bytes is still pending.** The orchestrator reports that the primary reviewer actually read the preceding 33/10-page PDFs and verified key numbers, and the tooling owner also opened earlier PDFs. The latest export regenerated PDF metadata/byte hashes; those earlier inspections are not relabeled as review of these exact current files. Numerical outputs are reported unchanged. `evidence/tooling-notes.md` is preserved historical evidence and contains superseded delivery/PDF identities. Current pins here and in package.json identify the latest foreground artifacts.

## Historical v1.2 night-chain regression

An earlier primary review rejected a v1.2 candidate for a real public-API guard bug: the night template could accept an operating GRIND-2 failure followed by absence rather than the supported GRIND-1 chain. The fix and regression remain historical provenance. The orchestrator reports a later primary APPROVE for **SPEC v1.2**; it is **stale for v1.3/D3**. Both v1.3 final reviews are required; no approval or verdict file is added here.

An independent **85-line** regression `tests/unit/night-event-chain.test.ts`, reported test commit **`734cb60`**, was reviewed under **Ereg1**. The orchestrator reports two independent test-review approvals before the minimal production fix; the review documents/approvals are not included in this evidence package and are not a final product approval.

The preserved `evidence/night-target-red.json` records **one test, one failure, zero passes/pending**, success=false, with **`AssertionError: expected true to be false // Object.is equality`** against the pre-fix behavior. Its actual-byte SHA-256 is `5c85a0fb53b4dc54b6afd0116e714f08f6f6899e4f665a87419a1bb12ac267f5`; 2205 bytes. The reported blob identity **`20c9b73d777cb1ee6bf8daaf077aa08962304409`** was independently validated by computing SHA-1 over the standard blob header plus those bytes, **without running Git**. The raw file remains unchanged.

That production correction was commit **`bac3012`**; its former source size/hash is explicitly historical in package.json, not a pin for the expanded current D3 file. The earlier 441-unit/27-browser result is likewise historical. Current source/test references and the **495-unit/30-browser** same-candidate reports are pinned separately below; no tests were rerun by the evidence sealer.

## D3 corrections and honest RED provenance

SPEC **v1.3/D3** makes the immutable originals requirement explicit through the public `Workflow.orderOrigins` audit registry: retain the first accepted quantity/originalDue for each normalized committed ID, including removed/renamed-away IDs; append only after an accepted planner action, in first-acceptance order; rejected actions append nothing. Restore starts a new lineage with the original six. Registry entries are not extra demand or phantom allocations.

All **four** public templates now enforce the complete D1 preflight, not merely event machine identity: actual supported GRIND-1/A pre-event production, plus no positive-length validation overlap on that machine during repair. Baseline checks and the post-event preserved-prefix left boundary are phase-appropriate. No removed campaign is recreated to fabricate eligibility, no invented transfer/past rewrite or validation retry subsystem is added, and the general physical evaluator remains broader than the bounded workflow policy. Original PDF numerical/staff/event conditions and function signatures/schemaVersion=1 are unchanged.

The orchestrator reports domain fix **`2d6f9ce`**, independent tests through **`804e613`**, and root docs **`b2ec5b4`**. Current byte hashes for scenario/workflow/UI, the origin-contract/template/protective unit files and `tests/e2e/order-origin.test.ts` are pinned in package.json; no source or test file was edited during this refresh.

- **Preserved D3 targeted RED:** actual file `evidence/d3-regressions-red.json`, **53 total / 5 passed / 48 failed / 0 pending**, success=false, three pre-fix unit files. SHA-256 **`a77a79dd64ce38d19e54ec624fa8faa5871441fe3ae4e4fbe065b2a6a09c4b39`**, 79568 bytes. This covers forgotten original IDs, missing/invalid origin registry and incomplete template preflight. All 53 matching cases are now independently found passed in the full 495-case GREEN report. The earlier `night-target-red.json` is a separate preserved report, not overwritten or substituted.
- **Eprotect justified RED exception:** `evidence/repair-left-protection.json`, **1 passed / 0 failed**, success=true. SHA-256 **`c7aa701c48088f22d13257598da908c8835d3faedc8133a868d218dc2a3f73ca`**, 1051 bytes. This was an already-passing protective repair-left-boundary test: preserve ended A permission or explain refusal without inventing transfer. It is **not a fabricated failing bug** and is not relabeled RED; the passing protective case remains in the current full suite.
- **Actual UI RED, transcript provenance only:** the orchestrator recorded one real pre-fix failure for a missing alert in the origin UI path. The reporter file was subsequently **overwritten by the full GREEN run**; no separate raw UI RED or trace is claimed retained. Any test-results trace may also have been overwritten. The transcript observation is not treated as a raw report hash. The current exact test `tests/e2e/order-origin.test.ts` is pinned and passed all three repetitions in the 30-case report.

No historical source candidate ID or raw UI-red artifact is invented. Raw reports remain untouched; current GREEN is not confused with preserved behavioral RED or the protective passing exception.

## LF byte identity and final-candidate boundary

The recorded housekeeping normalized exactly six CRLF-bearing source text files: `.gitignore`, `.prettierignore`, `docs/EXPERT_PLAN.md`, `docs/QUALITY.md`, `docs/SOURCE_REQUIREMENTS.md`, and `package-lock.json`. It removed **3200 CRLF pairs** and added only the authorized **`/.serena/`** ignore rule. All 34 test source entries and 70 nontarget entries retained exact byte identity; no executable/test/spec/lock semantics changed. The full before/after hash and direct byte-equivalence proofs remain in unchanged `evidence/tooling-notes.md`, now pinned at SHA-256 **`32932a738ed3b780a1b118e798e2f6515bd82423f02fe8450c903e13e7fc001f`**. All 75 current source text files use LF; original PDF/binaries were untouched, and original-root metadata was neither read nor edited.

That byte step intentionally changed candidate `27f00ccde0fc8b3e194d90b8e90c6e9bc6e8faac37564143e67d7e5726314287` to **`d3f3d9c2c1e9f12c3345b6112327e2998bf8066f5518e2e635233c98171cea3f`** before the latest full foreground gates/browser/export. Current reports and artifact metadata identify the latter same frozen candidate; stale v1.2 approvals and earlier source identities are not carried forward.

## Historical RED is separate from final GREEN

The orchestrator reports meaningful RED established against the behavior-absent bootstrap baseline `2cd2fbd`, extended by the D2 `scenario.ts` throwing public-API stub, with tester branch `2f740b7`. The historical frozen-suite/output-source reference supplied for this seal is **Etest10**, candidate prefix **`0457fd`**. That abbreviated historical reference is not a full SHA-256 and is **not the final product candidate**. No full historical digest, historical test counts or inaccessible raw RED logs are invented here; no other branch/worktree was accessed or historical tests rerun. The current legacy-named browser report must not be substituted for that history.

## Limits, advisories and later review

- External competition regulations are unavailable. There is no known submission deadline, slide limit, team-size limit or defense-time rule; do not invent one. The actual ten-slide output is not a rule.
- Cosmetic v1.1/D1 labels remain in UI/static narrative; actual PUBLIC_SPEC v1.3/D3 and its public origin registry/template preflight govern the candidate. This disclosed advisory does not waive the current contract or tests.
- Backup screenshots are all light theme; dark mode is covered by the full browser suite. No extra screenshots are claimed.
- This is a deterministic training simulation, not an optimizer, live MES, production backend, authentication system or security boundary. No factory pilot observations, measured improvement, performance benchmark or production-readiness claim. Test duration is not a product performance result.
- Tests and automated axe checks are bounded evidence, not universal numerical correctness or complete accessibility proof. Simulated replay values are not real factory observations.
- Raw files referenced outside evidence are pinned in place, not copied; retain those files when transporting this package. The foreground audit lacks a separate raw report here, and historical RED raw logs were not independently reread in this worktree.
- Final independent review verdicts are **not part of this evidence package**. They will be stored under repository-root `reviews/**`, outside the existing manifest hash input roots, after the separate review/acceptance process. No placeholder approvals or final acceptance decision were created.
- The prior primary approval applied to SPEC v1.2, not this v1.3/D3 candidate. **Both final reviews and reader inspection of the exact current regenerated PDF bytes remain pending**; final reviewers can open the pinned 33/10-page files. Earlier inspections of PDFs/core numbers are not relabeled as inspection of these new bytes.

The sealer independently reran only read-only version/report/hash/manifest checks and validation of these two evidence files. Source, build and delivery identities must still equal the frozen values after evidence creation. The new final evidence ID is computed afterward and returned separately so that no file attempts to hash itself.
