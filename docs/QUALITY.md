# Quality and evidence contract — v1 (internal)

## Present evidence and prerequisites

At documentation authoring, the repository is source-PDF-only: there is no package manifest, executable product, test suite or tool configuration. Read-only Git verification confirmed master at `e631994f68fa09da7aec443a2e8e0be1c39d94e5` and a clean initial worktree. The original PDF was read directly, including pp. 5–10. No installation, lint, typecheck, unit test, browser test, audit, coverage calculation or expert schedule simulation has been run by this author. Do not turn this statement into a claim of skipped test cases: no suite exists yet.

Environment reported by the orchestrator as foreground-verified: Windows, Node24.19.0, npm11.17.0, Python3.9, Git2.51.0. This author did not independently rerun those version commands. Use installed Node; do not change global tools/settings. Python is not required by the runtime. Package registry availability, engine/peer compatibility and browser binary availability remain bootstrap checks.

Researcher-proposed exact development pins (**not installed/observed here**):

| Package | Proposed version |
| --- | --- |
| vite | 8.3.8 |
| typescript | 6.0.3 |
| @types/node | 24.10.1 |
| vitest | 5.1.1 |
| @vitest/coverage-v8 | 5.1.1 |
| @playwright/test | 1.65.1 |
| eslint | 10.15.0 |
| @eslint/js | 10.0.1 |
| typescript-eslint | 8.73.0 |
| prettier | 3.10.1 |
| eslint-config-prettier | 10.1.8 |

Bootstrap must install-check and pin actual compatible versions in manifest+lockfile, report proposed/actual differences and finalize commands before RED. Do not claim the proposed list is available. Add a pinned development-only axe integration (`@axe-core/playwright` or local axe-core injection) after availability checks; no axe version was supplied. No runtime dependencies, remote fonts/scripts or CDN injection.

## Mandatory gates

- Strict TypeScript, including domain, UI and test/config code as appropriate. Typed ESLint: **zero errors and zero warnings**. Prettier check: clean, no hidden automatic source edits during verification.
- Vitest with V8 coverage: global **90% lines/statements/functions, 85% branches**; every executable file under `src/domain/**`: **100% lines/statements/functions, 95% branches**. Include untested eligible files in coverage. No ignored critical branches or coverage directives introduced merely to pass.
- Explicit coverage exception: imperative DOM rendering is exercised through browser interactions, not instrumented unit coverage. Isolate it from calculation/state logic; enumerate exact excluded rendering files in the final configuration/evidence. Domain behavior must not migrate into the exception. Pure non-DOM application logic remains unit-covered. Type-only files with no executable statements cannot provide meaningful runtime coverage; enumerate rather than claiming exercised lines.
- Production build must succeed. Browser checks use the built artifact on explicit loopback HTTP, not a development server or `file://`. Run every browser check **three repetitions, zero retries**. No unexplained console/page errors. Missing browser/tool route is a blocker, not a pass.
- Responsive interaction at **390 and 1440 CSS-pixel widths**; verify both themes, keyboard operation, forms, dialogs, status changes and ledgers. Axe: **zero serious/critical violations** for relevant role/workflow states; review lower-impact findings. Automated axe is not a proof of full accessibility.
- No remote requests during runtime, including fonts, telemetry, assets, fetches and WebSockets. Deny and record attempted non-loopback traffic; absence of successful requests alone is not enough. Browser fixtures must be deterministic and must not conceal runtime dependency on external resources. Test offline use over loopback with the built assets.
- `npm audit` includes development dependencies: no high/critical findings; review each moderate finding individually and record disposition. A missing audit, advisory outage or incomplete report is not clean security evidence. Signature/provenance and offline rebuild are advisory, not release blockers merely because external services are unavailable. Offline runtime remains mandatory.
- Never fabricate, silently skip, quarantine or weaken a test/gate. Report executed/passed/failed/not-run counts, reason and limitations from actual output. Capture RED against absent behavior, then GREEN only after implementation and independent review.

## Command contract and source-checked examples

Exact npm script names/contents are **not finalized**. Bootstrap owns them and must publish the exact runnable sequence before RED, covering clean locked install, types, typed lint, formatting check, unit/coverage, build, loopback preview, repeated browser checks, accessibility and dev-inclusive audit. No documentation should tell readers to run a nonexistent npm script.

The following CLI forms are documentation-checked examples, **not executed here**; prerequisites are locally installed, accepted package versions and, for preview, an existing build. Use local executables so no package is fetched implicitly:

```powershell
.\node_modules\.bin\vite.cmd build
.\node_modules\.bin\vite.cmd preview --host 127.0.0.1 --port 4173 --strictPort
.\node_modules\.bin\vitest.cmd run --coverage
.\node_modules\.bin\playwright.cmd test --repeat-each=3 --retries=0
npm audit --include=dev
```

Run preview in a separate foreground terminal, or let the accepted Playwright webServer configuration own it; do not start both. A Vite preview server is for local demonstration/verification, not a production hosting promise. Bootstrap must confirm these forms against the actually installed versions and avoid multiplying repetitions if config already sets repeatEach=3. CLI flags do not replace coverage inclusion, physical invariant assertions, network blocking or accessibility configuration.

Documentation consulted through Context7: [Vite CLI](https://vite.dev/guide/cli) (`build`, loopback `preview`, port and strictPort); [Vitest coverage](https://vitest.dev/config/coverage) (explicit per-glob perFile thresholds; all four threshold values must be set on the domain glob); [Playwright CLI](https://playwright.dev/docs/test-cli), [web server](https://playwright.dev/docs/test-webserver) and [accessibility](https://playwright.dev/docs/accessibility-testing). Retrieved current documentation is not proof that proposed versions install. Bootstrap must verify its chosen API/config syntax. Link destinations are official documentation references; an end-to-end external link checker has not been run here.

## Independent numerical verification

Independent tester owns `tests/unit` and `tests/e2e`. Validate physics from the interval evidence: correct effective machine rates, all route queues, cumulative inflow/consumption, stop unions, setup transitions, named-product validation, mandatory work counts/windows, individual staff coverage and non-overlap, deadline allocation and event-prefix conservation. Check near epsilon and exact due boundaries without pre-rounding. Test infeasible inputs and honest shortfalls, not only the handcrafted happy path. Do not use expert rounded figures as checksums or replace evidence with aggregate capacity.

The expert archive is provisional. Verification must supply exact selected campaign inputs and full-precision resulting reports, including decision-critical nonzero internal buffers and all staff peak intervals. Required UI, passport, exported JSON and slides must agree with one accepted report lineage. If they do not, report the discrepancy and repair only the responsible owner's scope.

## Candidate identity and evidence

The shared tooling owner defines a candidate manifest before final gates. Hash actual file bytes with SHA-256, not a normalized diff. Include mode and repository-relative path; sort by path using a fixed ordinal rule; serialize a JSON array of `{path, mode, sha256}` entries with documented UTF-8/canonical whitespace and hash its actual bytes. Reject symlinks, junctions, external paths, traversal and nonregular files; no uncontrolled external inputs. Include accepted source/docs/tests/configs/lockfile/local assets and original PDF identity. Do not hash a manifest into itself.

Exclude derived logs, build output and caches from the source-candidate hash to avoid unstable self-reference. Pin generated delivery files (slides export, passport, PDF where produced, screenshots) separately with actual byte hashes and the source candidate ID that produced them. Runtime build evidence identifies the tested build as well. Logs use separate **evidence_id**, recording candidate/build/delivery IDs, exact command, working directory, tool versions, exit code, observed counts and limitations; log content does not redefine candidate identity. Never publish secrets or private acceptance artifacts in public product materials.

A change to an included byte invalidates prior candidate acceptance and requires the relevant gates again. Documentation-only changes still require scope/link/public-boundary review; changed data, UI, assets or configs require affected numerical/browser/build gates. Do not reuse a GREEN result from a different manifest. No signed provenance or fully offline rebuild assertion is mandatory without available tooling and inputs.

## Documentation-authoring checks actually observed

Direct reread and local-reference inspection covered all six documents; linked local Markdown targets exist. Content search found no private test paths or QA-document links in PUBLIC_SPEC. Explicit-workdir Git status listed exactly the six assigned new Markdown files, with master/HEAD unchanged. Original PDF worktree blob and baseline blob both hash to `e738d22c3c8e75c0ddd7cf9067f1c86632fccc40`; the PDF diff was empty. Git no-index whitespace checks against NUL emitted no whitespace diagnostics for the new files (exit1 denotes their added-file differences). A first wrapper incorrectly treated that expected difference as failure; the rerun accepted the documented difference status. The diff-policy helper itself could not inspect this repository because its fixed cwd was `/`; this is a tool-route limitation, not GREEN policy evidence. No package/tool/product checks are implied by these documentation checks.

## Bootstrap handoff — 2026-11-23

This section supersedes the earlier **bootstrap prerequisites and proposed commands**, not the product or acceptance contracts. Read-only Git verification independently found `master` at `e631994f68fa09da7aec443a2e8e0be1c39d94e5`; the initial status contained the existing untracked `docs/` only. Node `v24.19.0` and npm `11.17.0` were independently observed. No Git mutations, global configuration changes, delegation or archive access were performed.

### Locked dependencies and environment

Every proposed exact version above was available in the configured npm registry and was retained: vite **8.3.8**, typescript **6.0.3**, @types/node **24.10.1**, vitest and @vitest/coverage-v8 **5.1.1**, @playwright/test **1.65.1**, eslint **10.15.0**, @eslint/js **10.0.1**, typescript-eslint **8.73.0**, prettier **3.10.1**, eslint-config-prettier **10.1.8**. Added development-only **axe-core 4.14.1** for local browser injection. There are **no runtime dependencies**. All direct pins are exact and transitive packages/integrities are in package-lock.json (lockfileVersion 3). No proposed-pin deviations were necessary. Registry latest TypeScript was 7.0.2, deliberately not adopted: typescript-eslint's peer range is `>=4.8.4 <6.1.0`. Installed Node satisfies the published Vite/Vitest/ESLint engines.

Local installation used `npm install --strict-peer-deps --ignore-scripts --no-fund --include=dev`: exit 0, 148 packages added / 149 audited, zero vulnerabilities. Lifecycle scripts are intentionally disabled; the installed native optional packages were sufficient for the observed production build. `npm ls --all` resolved required peers; absent optional browsers/frameworks/platform binaries are not missing required dependencies. `npm audit --include=dev` returned zero vulnerabilities. These observations do not imply a permanent advisory guarantee.

**Windows path correction:** the initial bare tool commands and `.cmd` shims failed with module-not-found errors caused by this workspace's `p&g` path. Scripts now use Node plus local package entrypoints, not shims or npx. No shell/global settings were changed. Playwright's webServer launches `node tools/preview.mjs`, which builds and then spawns the same pinned Vite preview CLI without shell interpolation. This is the sole script-form deviation from the earlier examples.

Chromium **159.0.8154.6** for Playwright 1.65.1 launched and closed successfully using the existing browser cache; no download, global install or configuration change was needed. On a new machine only, if launch reports a missing binary, explicitly install the pinned project's Chromium via `node node_modules/@playwright/test/cli.js install chromium` (local browser cache, not global npm). Do not implicitly fetch another Playwright version.

### Exact script contract

| npm script | Exact content |
| --- | --- |
| typecheck | `node node_modules/typescript/bin/tsc --noEmit` |
| lint | `node node_modules/eslint/bin/eslint.js . --max-warnings=0` |
| format:check | `node node_modules/prettier/bin/prettier.cjs . --check` |
| test:unit | `node node_modules/vitest/vitest.mjs run` |
| build | `node node_modules/vite/bin/vite.js build` |
| preview | `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort` |
| serve | `node tools/serve.mjs` |
| test:e2e | `node node_modules/@playwright/test/cli.js test --project=chromium --workers=1 --retries=0 --repeat-each=3` |
| manifest | `node tools/manifest.mjs` |

Sequence for the later accepted candidate (these are runnable commands, **not an assertion that a suite already exists or passes**):

```powershell
npm ci --strict-peer-deps --ignore-scripts --include=dev --no-fund
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:unit -- --coverage
npm run build
npm run test:e2e
npm audit --include=dev
npm run manifest
```

Use `npm run preview` or `npm run serve` separately for manual local demonstration after build. Do not run either alongside Playwright's webServer on port 4173. `serve` is a dependency-free GET/HEAD static server for the existing dist; it binds only 127.0.0.1:4173, fails on an occupied port, does not rebuild or provide SPA fallbacks, and rejects traversal/links/nonregular input. It is not a hardened public hosting service.

### Coverage, lint and independent test ownership

- TypeScript strict mode also enables noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noFallthroughCasesInSwitch, noUnusedLocals/Parameters, noPropertyAccessFromIndexSignature, consistent casing, isolatedModules and verbatimModuleSyntax. There is no emit or skipLibCheck bypass. The tsconfig includes future `tests/**/*.ts`, root configs and checked-JS `tools/**/*.mjs`; no tester-owned tsconfig is needed.
- ESLint uses recommended **type-checked** rules with projectService for source/tests/config/tools, plus Prettier compatibility, and zero-warning CLI enforcement. Underscore-prefixed unused parameters support explicit skeletons; no broad fixture-hostile stylistic rule set is added.
- Unit discovery is only `tests/unit/**/*.test.ts` / `**/*.spec.ts`; E2E discovery is independently `tests/e2e/**/*.test.ts` / `**/*.spec.ts`. No bootstrap tests or fixtures were added. Empty unit discovery is deliberately not a pass.
- V8 includes **all** `src/**/*.ts`, including otherwise-unexecuted files. Global thresholds: **90 lines/statements/functions, 85 branches**. The `src/domain/**/*.ts` glob explicitly sets **perFile: true**, **100 lines/statements/functions, 95 branches**. Coverage is separately invoked with `npm run test:unit -- --coverage`.
- Exact coverage exceptions: `src/domain/model.ts` (public types and frozen source fixtures only), `src/main.ts` (imperative DOM placeholder; later browser-covered), and `src/**/*.d.ts` (declarations). No other executable domain or non-DOM application logic is excluded. These exclusions do **not** mean the placeholder has been verified against product UI requirements. Future rendering files need an explicit reviewed amendment rather than a broad UI glob.
- Prettier checks source, tests, configs and tools. It excludes dependency/build/coverage/browser reports, artifacts/evidence/logs/cache, binary PDFs and generated lockfile; existing `docs/**` preserve the specification author's formatting and are reviewed separately, not silently reformatted by bootstrap. Gitignore uses the same derived-output roots.
- E2E uses one Chromium project, one worker, zero retries, three repetitions. Config defaults and the matching CLI overrides produce **three, not nine**, runs. The webServer always builds first, serves the built artifact through strict-port loopback Vite preview, and refuses reuse of an unrelated server. Service workers are blocked. No test-level viewport/theme/network/accessibility assertions are pretended by shared config: the independent tester owns these under `tests/**`.
- Axe is available from the pinned local `axe-core` package: inject its local script (for example, resolve `axe-core/axe.min.js`), run `window.axe.run`, fail on serious/critical findings and review lesser findings. Do not use CDN injection. Tests must deny **and record** all attempted non-loopback HTTP and WebSocket traffic, exercise 390/1440 widths and both themes, and surface page/console errors. Merely having axe installed is not an accessibility pass.

### Behavior-free public contracts

The four modules export all PUBLIC_SPEC v1 names and data structures. `model.ts` transcribes R3–R7 fixtures (43 machines, six orders, nine work codes), freezes exported collections and nested source records, and sets EPSILON=1e-6. The nine calendar/engine/workflow functions **only throw `Error('Not implemented: FUNCTION_NAME')`**. They do not fabricate reports or return feasible success. A native Node import smoke reached all nine explicit throws without a missing module/export. This is infrastructure evidence, not behavioral RED or GREEN; the independent test author must capture actual behavior failures. The Russian UI only discloses an unimplemented training simulation. No scheduler, evaluator, calendar conversion or workflow implementation is present.

### Actual-byte identity tooling

`node tools/manifest.mjs [source|build|delivery|evidence]` only reads fixed workspace roots and emits JSON to stdout; it creates no manifest/export/log files. `source` is the default. Source includes the explicit shared root config/lock/index allowlist, the original root PDF(s), and `src`, `docs`, `tests`, `public`, `tools` if present. Unknown new root configs are **not silently included**: extend/review the allowlist before acceptance. Derived roots (.git/node_modules/dist/coverage/browser reports/artifacts/evidence/logs/.cache/__pycache__), .log and .tsbuildinfo are excluded. Build hashes dist, delivery hashes artifacts, evidence hashes evidence; missing/empty input is an error. No delivery artifacts were generated by bootstrap.

Each entry is `{path, mode, sha256}` in that order: repository-relative forward-slash path (no Unicode normalization), regular-file mode `100755` if filesystem execute bits exist, otherwise `100644` (Windows files currently 100644), and SHA-256 of **actual bytes**. Sort paths by fixed JavaScript UTF-16 code-unit ordinal comparison, not locale. Canonical identity bytes are `JSON.stringify(entries, null, 2) + '\n'`, UTF-8 without BOM, LF. The wrapper's candidate_id/build_id/delivery_id/evidence_id is SHA-256 of those canonical array bytes, not of the wrapper itself. Save output outside its input tree to prevent self-reference. The utility rejects external/traversal input, symlinks/junctions/nonregular files and sensitive filenames; it verifies realpath containment plus pre/open/post file identity through a pinned handle. It is a local consistency tool, not signed provenance or protection against an adversarial concurrent filesystem writer.

Later evidence records must still state source candidate/build/delivery IDs, exact command/cwd/versions/exit codes/counts/limitations; `evidence` hashes their actual saved bytes rather than inventing those records. Re-run identity after any included documentation or code edit. The original PDF's SHA-256 observed during bootstrap is `910e80970cc6b68d1f956801fd00fe2bed3e51f44578ea88007b98f9d960c858`.

### Bootstrap checks actually observed

Commands ran from `C:\Users\ddstu\Desktop\hacatons\p&g` using the versions pinned above. Initial attempts are not hidden: bare command shims failed (exit 1) on the ampersand path; after the local-entrypoint correction, the first typecheck found a fixture literal-inference error (exit 2), lint found undeclared Node globals in checked JS (exit 1), and formatting found scaffold layout issues (exit 1). These were repaired in authorized bootstrap files without disabling strict/type-aware checks or changing gates. Pre-existing document formatting was excluded explicitly rather than rewriting other authors' prose/tables.

| Check actually run | Observed result |
| --- | --- |
| `npm ci --strict-peer-deps --ignore-scripts --include=dev --no-fund` | Exit 0; 148 packages installed, 149 audited, zero vulnerabilities |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0; zero errors/warnings |
| `npm run format:check` | Exit 0; all matched files formatted |
| `npm run build` | Exit 0; Vite 8.3.8, 4 modules, built index plus local JS/source map |
| `npm run test:unit -- --coverage` | **Exit 1**, no test files; all three executable domain modules present at **0% lines/statements/functions**; global and each per-file threshold correctly fail. 100% branch display is vacuous for branch-free throw stubs, not behavioral evidence |
| `npm run test:e2e -- --list` | **Exit 1**, zero tests in zero files; no browser acceptance run |
| `npm audit --include=dev` | Exit 0; zero vulnerabilities including development dependencies |
| Native Node import smoke | Exit 0; nine functions reached their exact not-implemented throws; fixture shape 43 machines / 6 orders / 9 work codes |
| TypeScript-AST public declaration comparison against all four PUBLIC_SPEC code blocks | Exit 0; **47 named contracts** match types/fields/signatures (parameter identifier names are immaterial). A first inline shell-quoting attempt exited 1 before running the comparison; the corrected command performed it successfully |
| Cached pinned Chromium launch/close | Exit 0; browser 159.0.8154.6 |
| Owned-process infrastructure smoke of `tools/preview.mjs` and `tools/serve.mjs` | Exit 0; actual built placeholder rendered in Chromium; no page/console errors or attempted non-loopback HTTP seen in this narrow smoke. A second static server correctly exited 1 on occupied port for both. Static HEAD=200, POST=405, encoded traversal=400, root package.json=404. Owned server process trees and browser were stopped afterward |

These are bootstrap observations, **not passed product tests, behavioral RED, release acceptance or coverage compliance**. No acceptance tests have been authored. Network/WebSocket policy, all workflow states, source arithmetic, responsive themes, accessibility/axe, exports/printing and delivery evidence remain unverified until independent tests/product implementation exist. The infrastructure smoke is not the required three-repeat E2E run. No artifacts/passport/slides/screenshots were exported.
