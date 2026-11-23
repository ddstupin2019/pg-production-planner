# QA shared-tooling newline normalization

## Scope and identity

- Working directory: `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-qa`.
- Read-only verification: branch `pipeline/hackathon/qa`, HEAD `2cd2fbd170218842b10dd69d46b5f6e9ee65f3d5` before and after normalization.
- Environment observed: Node `v24.19.0`, npm `11.17.0`, locally pinned Prettier `3.10.1`.
- This is pre-final-candidate byte normalization, not a change to test conditions or product behavior. No semantic/configuration/script/threshold changes were made. No Git mutations, delegation, archive access, installations, or global configuration updates were performed.
- Only the eleven explicitly authorized baseline shared files below were normalized. This ignored evidence note was added with `apply_patch`. No new utility scripts were added.

## Commands and observed results

All commands ran in the working directory above. The formatter was invoked through Node rather than a Windows package shim:

```powershell
node node_modules/prettier/bin/prettier.cjs --version
node node_modules/prettier/bin/prettier.cjs --write eslint.config.mjs package.json playwright.config.ts prettier.config.mjs tools/files.mjs tools/manifest.mjs tools/preview.mjs tools/serve.mjs tsconfig.json vite.config.ts vitest.config.ts
npm run typecheck
npm run lint
npm run format:check
node node_modules/prettier/bin/prettier.cjs --check eslint.config.mjs package.json playwright.config.ts prettier.config.mjs tools/files.mjs tools/manifest.mjs tools/preview.mjs tools/serve.mjs tsconfig.json vite.config.ts vitest.config.ts
```

| Command/check | Observed result |
| --- | --- |
| Pinned Prettier version | Exit 0; `3.10.1` |
| Explicit Prettier write | Exit 0; only the eleven listed paths were passed |
| In-memory before/after byte verification wrapper | Exit 0; each result equals its input with CRLF replaced by LF, and equals the exact bytes from `git show HEAD:PATH` |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0; zero errors/warnings |
| `npm run format:check` | **Exit 1**; remaining formatting failure is `src/domain/model.ts`, outside this assignment; not modified or excluded |
| Explicit owned-file Prettier check | Exit 0; all eleven files use Prettier style |
| Read-only Git status/HEAD/branch and owned-path diff inspection | HEAD/branch unchanged; owned-path diff emitted no content differences, with existing Git LF-to-CRLF conversion warnings. No Git setting was updated |

No product tests, coverage, build, or browser checks were run in this phase. Their status is not implied by the tooling checks. The remaining whole-repository format failure must be handled by the source owner; it was not masked by configuration changes.

## Actual-byte SHA-256 evidence

Hashes are of actual file bytes, not normalized Git diff content. Every file had zero CRLF pairs afterward; the count below records the initial CRLF pairs. There were no other byte changes.

| Path | CRLF before | SHA-256 before | SHA-256 after (baseline LF bytes) |
| --- | ---: | --- | --- |
| `eslint.config.mjs` | 31 | `0e93752be2b27f33fbbaef60e50725392616c6cbce46fbaa3ebafeac24586da5` | `17aa406140294d697b277a0c34d7184ac5c2fd0e451484410528b2be778a4bad` |
| `package.json` | 36 | `931fce78b362b6932e83289bb33be1e936f047e47f48321901a924c9a25b8c17` | `74155e94fb534c5d80e4fe4b12037bed31db88a7a382ab7d41852d500945ead7` |
| `playwright.config.ts` | 28 | `6f6cc7a66623a83aae6ee3c0fbe23cf4baa6d1db6f87f934d6272696e448f71b` | `0a1dc062b7cf90279cb5dd78a1cc37d29f76716a5b7560933ae156e1ff36cfb5` |
| `prettier.config.mjs` | 7 | `edca7cc944060da1cac6d27608029278e23573b2b3a4f92094bbfd97f2a0f739` | `00e7b6f7c4638d61f8b4754da1344f2dbc2d867920c6764cadeca8b72f4705b2` |
| `tools/files.mjs` | 60 | `0e9b33de4005f86aa22c0d7bb778e0f8f813cc380e24ea61be996457eac9941b` | `e17a13b6cfc5e4fc088e8f47d7adcff2a932af613c826f083e30d32e50ad78da` |
| `tools/manifest.mjs` | 108 | `225260bd04d72d1e441a856539202d88d54fd4901e0d6b4e3d7a9629e66bf153` | `04b5907c2ac16eff8779dfd5e3fbe06e35829bf14dbdcd0e113a0004cf4bd9de` |
| `tools/preview.mjs` | 34 | `2dbf88536bfacc5950c98ad79cd108f7d8af56a7f12cf3e0a35b5fc1dee1bf33` | `9b9da580fe1fea5820ea9493b16172704592d5ed6e7e8292c05b2f18f5b3a0bb` |
| `tools/serve.mjs` | 81 | `c47107522df5cf4df961c9f19d3dc8e37cb64802abdc148b9bd2888d3c86aa87` | `e2365ec0550cfb641108ba87d061f0609218367378c3d0d61c87b2f79934e19b` |
| `tsconfig.json` | 28 | `1d877b006e81ae8b97e232d960d28db64cffaed70747ebf1d661b30558951dfa` | `9c5e21ab86e5d8d2c875871298704c1891623123fcbbbbf2c6c6c45e28f55039` |
| `vite.config.ts` | 8 | `6ede23f0f4d55a113de0a802af99ce9e0150e2a4515502c5011e9bed56f55ebd` | `743efde3a3baba4b229f9cfd106e936619ed9b90d21c4bce56477d0b21e38e93` |
| `vitest.config.ts` | 30 | `97efeb20868abf00bcfb9d09c9f6135f31127a0617aca2508131165c1b6f67b3` | `64a955e2db24ee1c78a8cd91bded4365463299e6793174d9a37587aa615392f1` |

## Source/test scope preservation and candidate identity

The verification wrapper captured `node tools/manifest.mjs source` before and after invoking Prettier and compared every non-owned entry, including relative path, mode and actual-byte SHA-256. All **37 non-owned candidate entries** were identical. The canonical array for those entries (`JSON.stringify(entries, null, 2) + '\n'`, UTF-8) has SHA-256 `2b5cd03f3acbe8b80b1d44ec1464f5c1e47f24ea7cf112fdde76ad69e7b2da27` both before and after.

The protected subset comprising **34 entries** under `src/**`, `tests/**`, `public/**`, `docs/**`, plus `index.html` and `package-lock.json`, has canonical-array SHA-256 `6e8a45d3b8556b2091d34bf388b0a9f1655bc911606180ec2b155dbd29a3e1a8` before and after. Existing combined-candidate source/test changes were preserved byte-for-byte; they were not reverted to baseline. The original PDF and other protected root candidate entries were also unchanged.

- Candidate ID before normalization: `40551bfb09a39d3c363f110aee22ce6701482bd7a4828ac494763afe2f14af3d`.
- Candidate ID after normalization: `f5bbb59835f846cb178a94a6cfb129429cf22bcd68e9c158942ee71e94d2fcdd`.
- The changed candidate identity is expected for actual-byte CRLF-to-LF normalization and is not a release/acceptance claim. The existing manifest utility is sufficient; no additional script or test-condition change was needed. This note is excluded by the existing ignored `evidence/` policy and does not change the source candidate ID.

## Final-phase delivery tooling — staged, not executed

Scope for this later assignment: `tools/**`, `.gitattributes`, `.gitignore`, this ignored note, and one explicitly authorized CRLF-to-LF normalization of `src/domain/model.ts`. Work stayed in the QA worktree and on `pipeline/hackathon/qa`, HEAD `2cd2fbd170218842b10dd69d46b5f6e9ee65f3d5`. No Git mutations, delegation, archive access, other-worktree access, installs, dependency/lockfile changes, quality threshold/config changes, or source/test/public/documentation edits were made beyond the permitted model newline normalization. The foreground browser run and its port 4173 server were not queried, started, killed or reused; `dist` was not built or modified by this task.

### Source identity and checkout rules

- `.gitattributes` now requests deterministic LF text and binary PDF/image/font handling. Read-only `git check-attr` confirmed `src/domain/model.ts` text=auto/eol=lf and the original PDF text/diff unset (binary).
- `.gitignore` now includes `.playwright-mcp/`; existing artifacts/evidence exclusions remain. Read-only `git check-ignore` confirmed all three derived roots without creating or removing probe files.
- `tools/manifest.mjs` includes `.gitattributes` and root `README.md` in its source allowlist, plus all existing `docs/**` through the existing recursive tree policy. README is included when supplied by its owner, not fabricated by tooling. `.playwright-mcp` is excluded alongside the other derived roots. The observed source manifest includes the actual README and attributes file.
- Model normalization was guarded **before writing**: pinned Prettier output had to equal the original bytes with CRLF replaced by LF, and that LF content had to equal `git show HEAD:src/domain/model.ts`. It removed 322 CRLF pairs, no other bytes/fixture changes. SHA-256 before: `f21ffee81ff8f3c45ff3ca65d84a41a5dfe12b09cd787658fe458a1adfe26588`; after: `de7d62d08ea3bd53f398e1c9c1191e03b0ea25384ca2eda540d9c9f422ccf02d`.
- All **62 protected source-candidate entries** (excluding owned tools, attributes/ignore and the authorized model path) remained byte/mode/path-identical across normalization and the final check. Their canonical-array SHA-256 is `97986767e674f162b8422ccddb6658531ee4209a0187aab9aef01561a7029a61`. This includes the other source, tests, public assets, documentation, root README, lock and unchanged shared quality configs.
- Final staged source manifest observed **70 entries**, candidate ID `6fa89790d304cf38e73ee8bc3c66e92a2338eead5ac734e97e895fd3aa9390ed`. `tools/export-deliverables.mjs` actual-byte SHA-256: `09f807ec99d99fd5ce51d0063c54bd5a408e6619bd4cb8e42baeaa0b9daab147`. These are staging identities, not a release acceptance claim; any later included edit invalidates them.

### Exporter design and planned output contract

`tools/export-deliverables.mjs` is checked JavaScript, using only already-installed Node/Vite/Playwright/axe. A process-local Node extension resolver and built-in type stripping import the actual public scenario/workflow/engine/model/calendar APIs; no private UI-state parsing, copied test fixtures, test helpers, hardcoded report answers or new dependencies are involved.

It constructs the default plan through `createScenarioPlan`, starts via `createWorkflow`, sends demand, switches role, applies the baseline template, fixes the **factory-computed** requests, acknowledges all evaluated warnings, and obtains distinct approvals through real `transition` calls. Failure/transfer and then absence/night adaptation each create and agree successors in that same lineage. Both baseline VAL-2 alternatives must be physically admissible under the same computed default requests before comparison is labeled admissible. The default staggered choice has an explicit rationale displaying both computed reports; there is no optimization claim. The tool fails rather than fabricating feasible agreement or inflating staffing.

Planned generated paths (none were generated by this task):

- `artifacts/scenario-lineage.json`: source inputs, seed, actual actions, all checkpoint workflows/reports, all revision evaluations, two alternatives/comparison, sequential impacts, and the public authoritative `exportWorkflow` document. Full machine/stock/staff intervals, quotas, jobs, order originals/promises and finite numbers are retained without numerical rounding.
- `artifacts/scenario-passport.html`: standalone Russian HTML with inline styles and three-digit **display-only** formatting; inputs/routes/rates/settings/stocks/setup matrix, all four shift results and all operation queues (including zeros), finished unallocated stock, staffing requests/availability/forecasts/peaks and every peak interval, labor/reserve/reasons, original and promise order accounting, all mandatory job placements with working/calendar coordinates and credited work, warning acknowledgements, alternatives/choice rationale and limitations. Invalid before-adaptation projections are explicitly not achieved production.
- `artifacts/scenario-passport.pdf` and `artifacts/presentation.pdf`: Chromium print of the generated passport and the existing `public/slides.html`, respectively. Headers and actual `/Type /Page` dictionaries are checked; page counts are recorded, not assumed. This is not a substitute for an independent PDF reader inspection of every generated page.
- Eight planned actual UI captures in `artifacts/screenshots/`: planner, manager, baseline agreed, raw failure, repair successor agreed, raw absence, adapted final agreed, and the same final version at 390 px. `screenshots/index.html` supplies Russian captions/navigation. Every screenshot is preceded by a public UI JSON download, checked for exact workflow/report equality with the corresponding API checkpoint. No screenshots of an unexecuted state or injected application state are used.
- `artifacts/README.md`: Russian navigation, regeneration, interpretation and limitations. Original slides/UI statements that exports were not yet created are treated as pre-export historical statements, not silently rewritten in product scope.
- `artifacts/export-checks.json`, and optional `evidence/export-checks.json`: actual completion/failure, source and in-memory build identity, output-byte hashes, screenshot/export correspondence, PDF page counts, axe findings and runtime/network errors. Failed regeneration records `completed:false` rather than retaining a success claim. Save source/delivery/evidence manifests outside their own input trees to avoid self-reference.

The exporter reserves **its own** strict `127.0.0.1:4183` socket and refuses an occupied port. It makes one production UI build **in memory** (`write:false`, `publicDir:false`, `configFile:false`); it never builds to/serves/reuses `dist` or port 4173. Browser requests may reach only its exact loopback origin; other HTTP is aborted and recorded, and all WebSocket handshakes are closed before server connection and recorded. It fails on runtime/page/console/HTTP errors or any forbidden attempts. Local pinned axe runs on captured states, serious/critical findings fail, lower findings are retained for review. PDF/local-link/image/caption/readback checks run on actual generated outputs; final source identity must match the starting identity. Only fixed artifacts paths and the optional evidence JSON are persistent outputs; installed Playwright manages its own temporary browser profile/download lifecycle.

The repair effect is integrated from actual GRIND-1/A production in t=[120,270) before versus during failure, not an assertion of 102. The S2 availability delta and night-window peak changes are computed from before/after reports, not asserted as a hardcoded result. All original shortfalls remain visible. Printable summaries do not replace the full JSON ledger or independently performed product acceptance/pilot work.

### Static checks actually run in this phase

```powershell
node --check tools/export-deliverables.mjs
npm run typecheck
node node_modules/eslint/bin/eslint.js tools/export-deliverables.mjs tools/manifest.mjs --max-warnings=0
node node_modules/prettier/bin/prettier.cjs tools/export-deliverables.mjs tools/manifest.mjs src/domain/model.ts --check
```

All four final commands exited **0**; typed lint had zero errors/warnings. Initial annotations/JS global typing and formatter-layout findings were fixed in the owned exporter and checks rerun without changing a rule or gate. Pinned formatting was applied only to the new/owned tool files and the explicitly authorized model newline path. The exporter was **not invoked**, so there was no domain replay execution, in-memory UI build, own server, browser launch, artifact creation, export check result or PDF/page-count/accessibility success to report. Independent product/unit/browser tests and full quality gates were not run or masked in this phase.

### Foreground handoff — run only after the existing browser run finishes

From `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-qa`:

```powershell
node tools/export-deliverables.mjs --run --evidence
# Continue only if the export command exits 0; do not publish partial failed output.
node tools/manifest.mjs source
node tools/manifest.mjs delivery
node tools/manifest.mjs evidence
```

The explicit `--run` flag is mandatory; omitting it fails before domain replay or output generation. Export runtime is intentionally **unverified** at staging. The orchestrator must inspect actual export-checks, resolve any fail-closed runtime/API/UI discrepancy with its scoped owner, open both PDFs with the available PDF reader to inspect page counts/content, review lesser axe findings and screenshots/captions, and record final candidate/delivery/evidence identities and foreground command exit codes. Do not store a delivery manifest inside artifacts or an evidence manifest inside evidence. No human deliverables or successful export are claimed until that foreground run and review have actually completed.

## Executed export correction and verification

This section supersedes the earlier staging-only export status, not any independent product acceptance requirement. The orchestrator's first foreground attempt failed on `locator('#template').selectOption` after 120000 ms; its evidence had `completed:false` and only the initial planner capture. The actual UI helper assigns `field-template`, not `template`. The same helper prefixes staffing input IDs, so merely patching that one ID would have left more failures.

Only `tools/export-deliverables.mjs` was changed in source for this correction; generated artifacts/evidence were regenerated in their existing allowed roots. No Git commands, app/source/test/spec/public/guide/config/lock edits, installs, delegations, or other-worktree access occurred. The existing Russian guides were left intact. No check was removed, bypassed or weakened; exact workflow/report equality and all accessibility/network/PDF/completeness checks remained active.

### Complete interactive selector audit

Audited against current `src/main.ts` markup, labels and helper implementations (button/section/field/select/input):

- Template: exact accessible combobox **«Вариант плана»**, within the numbered **«Выбор производственного решения»** region. No guessed CSS ID.
- Demand button: exact **«Передать спрос»**, within **«Заказы и спрос»**.
- Role buttons: exact **«Планировщик» / «Руководитель»**, within group **«Учебная роль»**.
- Compare/preview/apply: exact **«Сравнить варианты» / «Предпросмотр варианта» / «Применить вариант»**, within the production-choice region.
- Staffing: form **«Заявка на персонал»**; exact field labels **S1, S2, Резерв S1, Резерв S2** and exact **«Зафиксировать заявки»** button, all form-scoped.
- Agreement: exact **«Причина принятия рисков»** textbox and **«Отправить на согласование» / «Подтвердить версию»** buttons within **«Совместное согласование»**.
- Events: exact **«Сбой GRIND-1» / «Отсутствие S2»** buttons within that same agreement region.
- Public download: exact **«Экспорт JSON»** within the inner exact **«Паспорт сценария»** region, not the differently named numbered outer region.
- Screenshot anchors: audited named overview/orders/planning/agreement regions rather than CSS IDs. Idle uses the standard aria-busy attribute and the semantic export control, and verifies no dialog is open. This path opens no dialogs and invokes no table pager/edit control; none is selected by a global ambiguous name. Remaining structural selectors only enumerate generated-document links/images or verify their actual href fragments.

### Commands and observed execution

Working directory remained `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-qa`.

```powershell
node node_modules/prettier/bin/prettier.cjs --write tools/export-deliverables.mjs
node --check tools/export-deliverables.mjs
npm run typecheck
node node_modules/eslint/bin/eslint.js tools/export-deliverables.mjs --max-warnings=0
node node_modules/prettier/bin/prettier.cjs tools/export-deliverables.mjs --check
node tools/export-deliverables.mjs --run --evidence
node tools/manifest.mjs delivery
```

All listed commands exited **0** in this correction task. Export actually completed once with eight captures. A bind-and-close probe verified port **4183 free before and after** the export (exit 0); only the exporter's own server/browser were started and closed. No use of port 4173 or writes to dist. Partial files from the failed attempt were overwritten only at the exporter's expected paths; no files were removed.

### Actual generated outcomes

- Three agreed revisions **1 → 2 → 3**, parents null/1/2, each approved by manager and planner. Events are respectively [], [GRIND-1 failure], [same failure, absence]. Each evaluated revision is feasible, has four shifts and **12/12 completed jobs**.
- **Eight actual UI screenshots**, seven at 1440 px and the final agreed state also at 390 px. Every capture's public downloaded workflow and full report matched its public-API checkpoint exactly. All eight images were opened for visual inspection; version tables/role states, fixed requests and final mobile results are visible across the sequence. Local-link, image-load and caption checks passed.
- **Zero attempted nonlocal HTTP/WebSocket connections**, zero page/console/HTTP runtime errors. Blocking routes stayed enabled. Axe reported **zero violations of any impact** in all eight captured states (including raw failure/absence and final mobile); this is automated export-state evidence, not a proof of full accessibility.
- `scenario-passport.pdf`: **33 pages**, 1587634 bytes, SHA-256 `900d2eb7dcd21b4c20dc825092af7ce44d134001c7a1223520190efc58fd9be0`.
- `presentation.pdf`: **10 pages**, 128814 bytes, SHA-256 `64316877d12fe4610b363e87b33a6fe360a82785310482c0114734465d9ea96b`.
- Both PDFs were opened successfully through the available PDF reader. Reader page totals agreed with the exporter; parsed content/rendered pages showed the Russian disclosure, source inputs, actual shift/staff/stock/order/job tables, alternatives, raw invalid projections, corrected agreements, metrics/pilot and limitations. Dense passport tables span many pages with repeated headings; full interval evidence remains in JSON. The source slides retain their historical pre-export wording, as disclosed in artifacts/README; public slides were not modified.
- Full authoritative `scenario-lineage.json` is about 58.4 MB because it retains all checkpoint/revision/alternative machine, stock and staff ledgers without truncation or rounding. SHA-256 `0388db3753ef27b53eb4e2767ce4f3de3a26f6b848edfcd2b94b1d659cf57159`.
- Observed computed effects, not fixed expected answers: GRIND-1/A displaced output **102** thousand in [120,270); raw total PACK **6901.399999999997**, adapted **6999.9999999999945**. S2 requested **41**, actual **41 → 39**, difference **−2**; night-window required peak **41 → 39** after adaptation. The raw reports retain their actual physical errors; they are not presented as achieved production.
- Canonical delivery manifest succeeded with exactly **15 generated files**: JSON, passport HTML/PDF, presentation PDF, eight PNGs, screenshot index, README and export checks. All **15 recorded output-byte hashes** were independently reread/recomputed and matched the generated evidence.

### Identities for this actual run

- Source candidate: `91533c16af1f02a2d29b896505b7d54945973fe9a96df75f3aef56bdca55b86a`.
- In-memory served build: `c7cd28a8edc322e711ab8e29fcd57098165eea6d286d1bc5bac0e383a55d92a4`.
- Delivery ID: `9c964c19175235fe79d9c2110a015f86dcfab44aec6ea5a2b83c219fa9026fa4`.
- Corrected exporter SHA-256: `96824d1b1ff0d7ebf3c16d572aee8f8c3c1a25d9b3a0ef7a447211e6539b6e7d`.
- `artifacts/export-checks.json` SHA-256: `10d0a02896c36f4e788c7f112f2b5631f283df01e1967858297143834f6de27f`.
- `evidence/export-checks.json` SHA-256: `b422d9b7fad2934b621271a67e92cd7611f5197b6dbfdbeb5df8e48b4ddf753d`.
- All **65 non-tools source-manifest entries** (including app, tests, public, docs/guides, root policies/config and lock) stayed unchanged from the beginning of this correction. Their canonical-array SHA-256 remained `59c49989e7ba0c92d39aa6c50c2c03bc8a91f64666439f5ad4ab2ce79157cbc5`.

This was one successful export verification, **not** a new full product-suite/coverage/repeated-browser acceptance run. The orchestrator's final foreground evidence rerun is still outstanding and must refresh actual delivery/evidence hashes afterward: PDF metadata/rendering may change output bytes on regeneration even when source/report values are unchanged. No factory pilot or signed provenance is claimed.

## Pre-final source-byte normalization after D3

This is a newly authorized byte-identity housekeeping step, not an implementation, specification, test, harness, dependency, quality-threshold or acceptance change. All work stayed in `C:\Users\ddstu\AppData\Local\Temp\opencode\pg-hackathon-qa`. The user's original workspace and its tool-created metadata were neither read nor edited. No metadata files were removed, no Git command/mutation, delegation, archive access, installs or runtime/network operation occurred. Only manifest-listed text files containing CRLF were normalized, plus the explicit `/.serena/` ignore rule and this note. Artifacts and other evidence files were excluded from normalization and were not regenerated; `evidence/package.json` and `evidence/VERIFICATION.md` were intentionally left unchanged for the later evidence refresh.

### Before/after byte identity

Initial actual-byte source candidate: `27f00ccde0fc8b3e194d90b8e90c6e9bc6e8faac37564143e67d7e5726314287` (76 entries). Source text was decoded as strict UTF-8 with BOM/characters preserved; PDF/image/font binary extensions and NUL-bearing files were excluded before decoding. The PDF contains byte sequences resembling CRLF and was correctly classified as binary, not normalized. An initial discovery attempt stopped on binary UTF-8 decoding before any write; the corrected classifier skipped binaries. Some exact-context patch attempts were refused without changes and retried with exact source text. Final hashes/proofs below, not any attempted patch, establish the outcome.

| Manifest path | CRLF pairs removed | SHA-256 before | SHA-256 after |
| --- | ---: | --- | --- |
| `.gitignore` | 10 | `92d2d9a1dc929370d8f22327ba34a7f0794d25c1ec5ec40758e206086b77e756` | `6bd53331c43f084dfe66929ba3f126c53ab45dfa9d86ee92181e57b0261ee425` |
| `.prettierignore` | 14 | `e9ff06b9d81805c3129786edbea2db04a52543d451b4f120158512b703e60f3e` | `cfe6efc5923f3f69342fafcb5246aa3c77480697de5001f396ee9e0bb0f0b49e` |
| `docs/EXPERT_PLAN.md` | 93 | `0bd3a8edd626136017eb5241f3a41eefa59ecc1ed78ab64283f913d8719f6e06` | `68700d5ff27d25cc4dbda70c7a6710cc6f0f29e1819c3c8d2e3be32e6192319b` |
| `docs/QUALITY.md` | 161 | `adb10bac17be9a20ef6dd03dc17182f1152f08e2e4366fc1747ffa292384c91d` | `5b54a30e6be2f84dabf3d75ccfd1310ee50c39369271158f3e5abd34686b7208` |
| `docs/SOURCE_REQUIREMENTS.md` | 164 | `5d9f9ef37bd619b72b5015f11f90f4a302604fe22f520e7044e653c6a279171f` | `9ddd7771dc9bed1c9f6da10ef46979a970ecc47b5b96676711ebfef7594ce092` |
| `package-lock.json` | 2758 | `7b938f1dd5dafe5bbd334636a2fe48ce4bd7ee481d8558051699829a4e140335` | `ffd39ee46e97717eeecd363286cf38b75caec47c0de9e40ff2fa62ff33f19949` |

Total: **3200 CRLF pairs removed**. All six files now contain zero CRLF pairs. No spaces, punctuation, Unicode characters, Markdown layout, JSON field ordering, dependency version/integrity, test contents or executable behavior were changed. `.gitignore` additionally appends exactly **`/.serena/` plus LF** (10 bytes), as authorized; all earlier ignore rules remain unchanged. The root-anchored rule excludes metadata from future staging without reading/removing it or changing the canonical manifest's allowed source inputs.

### Exact transformation proof and edit mechanisms

- Before editing, SHA-256 values of `before.replace(CRLF, LF)` were computed from actual input bytes. For the five pure-normalization files, every final byte hash equals that precomputed value. Their original all-CRLF bytes were additionally reconstructed from the result, matched the recorded pre-edit SHA-256, and checked with direct Buffer equality: **`before.replace(CRLF, LF) == after`**, all true (validation exit 0).
- `.gitignore` originally mixed ten CRLF and two LF line endings. Its exact original layout was identified uniquely by the pre-edit byte hash (LF on original lines 9 and 10); direct equality confirmed **`before.replace(CRLF, LF) + '/.serena/\n' == after`**. Removing the one added rule from the result yields the precomputed LF-only original hash `be1edfc3f965c7a9a072746409f73ef8a9d45d04a9c6304844cebc56312c884c`.
- Ignore files and documents were edited via `apply_patch` same-text context/replacement hunks. No document formatter or narrative rewrite was used.
- The user explicitly allowed a formatter on existing config only if its output matched the same text. For `package-lock.json`, pinned Prettier 3.10.1's in-memory result was guarded **before writing** to equal only `before.replace(CRLF, LF)` exactly. Then `node node_modules/prettier/bin/prettier.cjs --ignore-path .gitignore --write package-lock.json` ran (exit 0), and direct post-write Buffer equality passed. That invocation-specific ignore path merely allowed the explicitly named generated lockfile to be visited; it changed no formatter configuration, gate, dependency or JSON style. The lockfile went from 97093 to 94335 bytes, exactly 2758 removed CR bytes.

### Scope and preservation checks

- All **70 nontarget manifest entries** retained identical paths, modes and actual-byte hashes: canonical-array SHA-256 `f1836a6a887fa87f801eed9d39a1cc4f4aa62e98b4c5e43bd6ecc0267cb600f9` before and after.
- All **34 accepted test source entries** retained **exact byte identity**, stronger than line-ending-normalized equivalence. Their canonical-array SHA-256 stayed `9fc2945f029a7cae8776587816c29f5e4735cc1f315f5396d2bfe0b9f329b30a`. No test file needed normalization and no app/domain/tool/harness file was changed.
- All **75 source entries except `.gitignore`**, when canonicalized after only text CRLF-to-LF normalization, have SHA-256 `829ba23bc409e61072d8393a2ec7284bfd08f448ee97b797c282cced30062b92` both before and after. This separately proves identical logical source contents across the entire candidate, with the one authorized ignore-rule addition accounted for outside that comparison.
- Original PDF actual-byte SHA-256 stayed `910e80970cc6b68d1f956801fd00fe2bed3e51f44578ea88007b98f9d960c858`. Binary PDF/images were not edited; no images with binary extensions occurred among the source normalization targets. Derived screenshot/PDF/artifact/evidence inputs were not included in the normalizer.
- A final manifest scan found **zero CRLF-bearing text files** across the canonical source inputs. No files were added to or removed from the 76-entry source manifest.

### Checks actually run and handoff

After all source-byte writes, the following non-fixing gates ran from the QA worktree:

```powershell
npm run typecheck
npm run lint
npm run format:check
```

All exited **0**; lint enforced zero warnings and formatting was check-only. No test, coverage, full-browser, build, audit or export command was run by this housekeeping task. No new tool scripts, runtime dependencies or quality-threshold changes.

**New pre-final actual-byte candidate:** `d3f3d9c2c1e9f12c3345b6112327e2998bf8066f5518e2e635233c98171cea3f` (76 entries). The identity change is intentional before staging/transfer: the files now have LF bytes compatible with the existing .gitattributes policy. **No prior approval or GREEN run is silently transferred to this new manifest.** The orchestrator reports the preceding D3 full unit suite had 495 passes, 100% lines/statements/functions and 99.64% branches; those are historical foreground facts, not a unit run performed here. The new 30-case repeated browser run and regenerated exports/evidence package remain pending with the orchestrator. Existing artifacts and sealed package were preserved, not relabeled as evidence for this new identity.
