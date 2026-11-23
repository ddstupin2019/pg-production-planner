# Scoped delivery coordination — v1 (internal)

## Authority and scope

The user requests SPEC artifacts, not implementation in this authoring task. This author may use apply_patch only for `docs/SPEC.md`, `docs/PUBLIC_SPEC.md`, `docs/SOURCE_REQUIREMENTS.md`, `docs/EXPERT_PLAN.md`, `docs/QUALITY.md`, `docs/ORCHESTRATION.md`. No source/config/test modifications, side files, delegation, chat archive or Git mutation. Read-only path/branch/status/diff checks are allowed. The source PDF remains untouched.

Verified before writing: path `C:\Users\ddstu\Desktop\hacatons\p&g`, branch master, full baseline `e631994f68fa09da7aec443a2e8e0be1c39d94e5`; clean initial status and only the original PDF tracked. This supersedes the generic environment hint that no repository was detected: explicit Git commands found the repository. No product code, config or tests existed to read at that baseline. PDF pp. 5–10 were read directly. This task does not activate a full multi-agent run.

## Handoff packets and ownership

| Packet | Recipient | Contents / allowed work |
| --- | --- | --- |
| Product contract | Coder | PUBLIC_SPEC + SOURCE_REQUIREMENTS; `src/**`, `index.html`, `public/**` only |
| Acceptance contract | Independent tester | Full SPEC, public contract, source requirements, original PDF; `tests/**` only |
| Bootstrap/QA | Separate gpt-helper agent | QUALITY + public signatures; root shared configs/manifest/lockfile/tool scripts only |
| Narrative | Documentation writer | `docs/**`, with this task limited to six files |
| Integration | Orchestrator | Git/branches/worktrees/commits and third-worktree integration |

No author edits another author's scope, including convenient fixture/config fixes. Request a scoped owner correction. Coder must not receive private tester case names, inputs, hidden scenario variants or QA artifacts. PUBLIC_SPEC contains the same v1 product requirements and API, but no private test paths/scenarios. SOURCE_REQUIREMENTS is safe factual source context. EXPERT_PLAN is optional provisional planning input, not a correctness oracle; do not mistake the task's common PDF scenario for a private test.

## Milestones for later orchestration

1. **Accept v1 contracts.** Review source transcription and exact public signatures; record amendments before implementation. Resolve material ambiguities without changing fixed source conditions. No general-purpose optimizer is required.
2. **Bootstrap separately.** Check registry/engines/peers for proposed versions; pin actually installable tools and axe integration; create runnable behavior-free module skeleton, strict types, lint/format, coverage and browser configuration. Finalize exact commands and coverage exceptions before RED. Do not implement replay behavior in bootstrap.
3. **Establish common accepted baseline.** Only the orchestrator creates/commits it and provisions distinct tester/coder branches/worktrees from the **same** accepted baseline. The initial PDF-only SHA is provenance, not an assertion that future branches should omit accepted contracts/bootstrap. Integration uses a third worktree. User permits initialization and milestone commits/full autonomy to the orchestrator; no push is requested. This author performs none.
4. **Independent RED.** Tester authors source/API/physics/interaction checks in tests scope. Run against the skeleton and retain actual failures. Distinguish unavailable infrastructure from missing product behavior; never count not-run checks as passed.
5. **Implement within product scope.** Coder implements public contracts and Russian interactions. Handcraft explicit campaigns and compute their physical consequences. Use provisional expert data only as a candidate; fix schedules, not source inputs. Request shared tooling/documentation changes from their owners.
6. **Integrate and verify.** Orchestrator integrates in the third worktree; bootstrap/QA owner executes accepted tools and records evidence for the exact manifest. Tester verifies independent physical ledgers and browser workflows. Review numerical truth, public/private separation, security/accessibility and deliverable consistency without unsupported pass claims.
7. **Deliver human artifacts in Russian.** Provide interactive prototype, reproducible passport, five metrics/pilot, HTML slides, PDF if available and screenshot backup. Pin generated files separately. Summarize observed checks, honest deficits, limitations and missing external competition rules. Do not report a factory pilot or optimized schedule.

## Decisions fixed by v1

- `src/domain/model.ts` owns public types/source constants; `calendar.ts` numeric work/calendar conversion; `engine.ts` deterministic physical evaluation and comparison; `workflow.ts` pure state transitions/export. No implementation exists as a result of this task.
- All actual operation queues are part of the evidence. Initial stage stocks enter REWIND/WASH/WRAP once; D+2 is carried execution. An infeasible plan is an acceptable disclosed finding, not permission to fabricate output.
- Source constants and required orders remain immutable. Custom demand is marked custom; original commitments survive renegotiation. Reserve choices and setup-worker allocation are explicit assumptions, not pilot findings.
- Failure applies to an operating named GRIND and must be agreed before absence is enabled. Frozen prefixes use t=120 and t=630. Fixed S1/S2 requests never increase; S3/S4 are forecasts, not locked promises.
- Agreement requires both roles and physical feasibility; deadline warnings may be acknowledged with reasons. Editing invalidates approval; predecessor remains immutable. Role switching has no security claim.
- Domain EPSILON is 1e-6 with display-only rounding. The provisional expert's rounded buffers/peaks are not oracle values. Independent verification may change the selected campaigns and their predictions.
- Offline runtime means production build over loopback with no remote requests. It does not mean offline package acquisition, file-URL operation or mandatory signed provenance. No known slide/deadline/format limit is supplied by external competition rules.

## Pending orchestrator confirmations / blockers to later claims

| Item | Status / next owner |
| --- | --- |
| Actual package availability and compatibility | Not checked; bootstrap install-checks proposed pins and publishes actual versions |
| Exact npm scripts and axe package pin | Not finalized; bootstrap must fix before RED |
| Complete feasible baseline and alternatives | Not computed; coder encodes, tester checks; expert archive lacks complete per-machine quotas/worker assignments |
| Candidate requests 28/41 and forecasts 41/32 | Provisional, not computed peaks; compute interval evidence before fixation |
| Russian artifact exact filenames / print-PDF availability | Later delivery owner decides and records in manifest; do not link nonexistent files as ready |
| External competition rules | Unavailable; ask only if a material submission constraint becomes necessary |
| Requested tool/model route availability | No alternate agent/model was launched here; future unavailable route must be reported to orchestrator |
| Read-only diff-policy helper | Failed because its fixed cwd was `/`, outside the repository, with no workdir argument; not a policy pass. Use explicit-workdir Git checks and direct document inspection for this authoring task |

No material blocker prevents these six v1 documentation artifacts. Pending items prevent claims of installed tooling, verified numerical feasibility or release readiness. Perform independent work first, then report actual evidence rather than requesting nonmaterial choices prematurely.

## Bootstrap-only ownership update — 2026-11-23

The earlier authoring scope/evidence remains historical. The current explicit bootstrap assignment authorizes the shared package manifest/lockfile, TypeScript/ESLint/Prettier/Vite/Vitest/Playwright configs, ignore files, `tools/**`, **initial behavior-absent** `src/domain/model.ts`, `calendar.ts`, `engine.ts`, `workflow.ts`, `src/main.ts` and `index.html`, plus exact bootstrap/environment/script notes in QUALITY and this document. It does not authorize substantive product implementation, tests, PDF edits or other specification edits. No Git mutation, delegation, archive access or global tool/config changes are authorized or performed.

Public v1 signatures are frozen by PUBLIC_SPEC, without amendment. Initial domain functions explicitly throw not-implemented errors so independent tests can import the API and observe missing behavior, not missing files. The correct frozen source fixtures are not a numerical replay. The placeholder UI is not an implemented workflow. Product ownership of these initial source files transfers to the coder only after the orchestrator accepts bootstrap; shared tooling remains exclusively bootstrap-owned. The independent test writer owns **tests/** only and must request shared config changes rather than editing them.

Registry checks and local strict-peer installation retained **all eleven proposed package/version rows** (Vitest + coverage are two pins), and added **axe-core 4.14.1** development-only. Node24.19.0/npm11.17.0 were observed locally. Playwright1.65.1's cached Chromium launched; no browser download was necessary. QUALITY's bootstrap section contains the exact locked versions/scripts, install and candidate/evidence hash conventions, coverage exceptions and Windows ampersand-path correction. Earlier “not finalized” package/script rows are now resolved by that section; physical feasibility, actual acceptance tests and delivery artifacts remain outstanding.

The tester can use `npm run test:unit` and separately `npm run test:unit -- --coverage`; unit discovery is isolated to tests/unit. `npm run test:e2e` uses tests/e2e only, Chromium/one worker/zero retries/three repetitions and a freshly built loopback preview with strict port 4173. It does not multiply repetitions or reuse an existing server. The tester must add network/WebSocket denial+recording, responsive/theme/interaction assertions and local axe checks within tests scope. Shared config does not claim these checks already exist. No tests passed at bootstrap: none were authored, and a behavior-free scaffold must not be accepted as GREEN.

The orchestrator alone manages any future baseline commit/branches/integration. Bootstrap leaves master/HEAD unchanged, does not stage files and does not export human delivery artifacts. `tools/manifest.mjs` can later hash accepted source, built output and separately produced delivery/evidence bytes without writing files itself. Final acceptance must refer to the actual candidate after integration, not an intermediate bootstrap hash.

## D1 — bounded failure interaction correction, v1.1 — 2026-11-23

Authority: the orchestrator selected this scope correction after SPEC review identified that an arbitrary operating-GRIND failure plus an immutable executed prefix could interrupt VAL-2 without a defined recovery. PUBLIC_SPEC and SPEC are now v1.1. This delta supersedes earlier generic workflow-target wording; preceding bootstrap notes are retained unchanged. Public TypeScript signatures and schemaVersion=1 are unchanged; no bootstrap/config/source edits are part of this documentation correction.

Decision: the shipped workflow applies failure only to **GRIND-1**, verified by physical output to produce A immediately before and at t=120, with no validation on that machine intersecting repair [120,270). Shipped VAL-2 stays on **GRIND-4/5**, product B. This is the selected demonstration interaction, not a change to PDF source conditions or a rule forbidding other machine choices in general physical inputs. No generic validation retry/restart subsystem or universal equipment-event optimizer is required.

Supported equipment/work choices are `VAL2_STAGGERED`, `VAL2_PARALLEL`, `REPAIR_G1_TO_G3` and `NIGHT_WRAP_STAGGERED`, with concrete Plan edits and Russian UI disclosure. Their proposed placements are not newly verified feasibility results: coder must encode and evaluate them; independent tester must check the full material/interval/staff evidence. Custom-order creation/editing, staffing, promises and both-role agreement remain supported, but every affected plan is reevaluated and may not satisfy the selected event preconditions. No template bypasses physical checks, fixed requests, original commitments or frozen history.

Workflow guards: other targets return `UNSUPPORTED_FAILURE_TARGET`; a validation on GRIND-1 intersecting [120,270) returns `UNSUPPORTED_FAILURE_VALIDATION` with conflicting job refs, interval and a review/restore explanation. In a manager's baseline draft, this specific unsupported-validation guard precedes the generic agreement guard. An eligible baseline without actual GRIND-1/A production returns `EVENT_TARGET`. Rejection leaves all state unchanged; post-event edits cannot introduce the same validation conflict. The engine can still evaluate arbitrary structurally valid physical inputs and honestly report interrupted validation, without synthesizing retries or accumulating disconnected fragments into success.

Acceptance handoff: tester adds independent checks for the selected target's actual A production, repair duration/union, untouched prefix, G1→G3 future transfer, G4/5 validation in both variants, night WRAP staffing/material balance, specific guards and immutable rejection, boundary non-overlap, sequential agreement/absence, and public/UI limits. Do not claim alternatives valid until their coupled physical ledgers pass. Full D1 acceptance additions are in SPEC; this author has not implemented or run those tests. Bootstrap/source owners receive the semantic delta separately without any permission to alter another owner's scope.

Documentation correction scope: only PUBLIC_SPEC, SPEC, SOURCE_REQUIREMENTS (implementation-choice distinction only) and this appended delta. No Git operations, delegation, source/config/test changes, bootstrap-note rewriting or expert-number verification were performed for D1.

## D2 — scenario API and bounded export clarification, v1.2

Authority and location: the resumed documentation-only assignment specifies the original root `C:\Users\ddstu\Desktop\hacatons\p&g`, user-reported master at `2cd2fbd`, not another worktree. Before editing, direct reads of PUBLIC_SPEC/SPEC showed v1.1 and this document ended with D1; no D2 content was present in these files. Git was neither accessed nor independently used to verify the supplied branch/commit because this assignment prohibits it. Earlier bootstrap and D1 notes are retained unchanged; this section is appended, not a claim that historical checks were rerun.

Contract delta: PUBLIC_SPEC/SPEC are now v1.2. Add product-owned `src/domain/scenario.ts` with exactly `createScenarioPlan(): Plan` and `applyTemplate(plan: Plan, events: Event[], template: 'VAL2_STAGGERED' | 'VAL2_PARALLEL' | 'REPAIR_G1_TO_G3' | 'NIGHT_WRAP_STAGGERED'): Result<Plan>`. Existing module signatures and schemaVersion=1 remain unchanged. Fixed PDF data, UI requirements and D1's selected GRIND-1/A failure/GRIND-4/5 validation limits are not revised.

The factory returns fresh deterministic required-mode source-plan data, original orders/null promises, actual jobs/campaigns/setups, assignments and computed standalone S1/S2 requests and S3/S4 forecasts/reserve explanations. These are calculated planning numbers, not an oracle or an existing lock; createWorkflow still clears requests/locks and requires the normal daily workflow. The factory plan, two admissible alternatives and complete common lineage must be independently verified under actual fixed staffing before shipping, with original-deadline warnings retained honestly.

Templates are bounded deterministic Plan transformations: baseline-only VAL-2 choices; transfer with exactly [failure on GRIND-1]; night staggering with exactly [failure on GRIND-1, absence]. Preserve input/events/source data, order originals/promises/mode and requests, and actual frozen-prefix evidence at t=120/630. Reapplication must be physically idempotent without duplicate jobs/campaigns; no changed Plan.id is required. Unsupported names, phase, input or schedule preconditions return explained failures using relevant input/engine/WORKFLOW_GUARD codes without an arbitrary exhaustive mapping. A pending disruption's physical conflicts do not by themselves preclude its supported corrective template; transformation success is still not a feasibility certificate. D1's specific workflow guards remain in force. Custom demand is reevaluated, not overwritten or silently labeled feasible; no event optimizer or validation retry subsystem is added.

Export clarification: malformed JSON-compatible workflow input must still yield deterministic UTF-8 JSON wrapper data with schemaVersion=1, workflow preserving the original supplied JSON value and evaluation.ok=false with explanatory INVALID_INPUT issues; no input mutation, invented default workflow or success report. Proper Workflow export remains unchanged. Cyclic/non-JSON objects are outside this public JSON-data contract; this explains bounded safety behavior rather than requiring a generic malicious-object platform. A physically wrong route/setup may yield structural rejection or feasible=false, but never forbidden output or false success; action failures may propagate specific engine/input codes.

Evidence and ownership: SPEC adds independent factory/template/lineage/prefix/idempotence/export/error checks without lowering quality thresholds or adding numerical checksums. PUBLIC_SPEC includes only a minimal unexecuted public common-scenario example, no private cases or QA artifacts. Tool-independent physical evidence remains required; text inspection or missing tool routes cannot establish GREEN. This author's D2 work is limited to PUBLIC_SPEC, SPEC and this appended section, using apply_patch only; no source/config/test/PDF/other-worktree/chat access, Git operations, implementation or executable acceptance checks are part of this delta. Remaining behavior and feasibility obligations belong to the product owner and independent tester.
