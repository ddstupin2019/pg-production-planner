# Public product specification — v1.2

## 1. Scope and authority

Build a Russian-language interactive **deterministic training simulation**, not an optimizer, live MES connection or production-ready planning system. Use TypeScript, Vite and vanilla DOM with **zero runtime dependencies**. No backend, accounts, remote services, telemetry, CDN assets or generic manufacturing claims. Role switching demonstrates workflow, not authentication or security. All runtime resources must work offline when the production build is served over loopback HTTP; do not promise `file://` support.

[SOURCE_REQUIREMENTS.md](SOURCE_REQUIREMENTS.md), R1–R9, is part of this v1.2 contract: preserve every route, constant, order, stock, setup, work window and event from PDF pp. 5–10. In a discrepancy the original PDF wins; record and resolve the discrepancy rather than silently changing a contract. No complete deadline-feasibility result has yet been computed. An honest infeasible replay is preferable to fabricated success.

Implement a bounded common scenario with explicit handcrafted campaigns. Deterministically evaluate their physical ledger; no generic scheduling search is needed. Prioritize the common four-shift scenario and exact numerical evidence over extensibility. The source PDF must remain unchanged.

**v1.1 scope correction D1:** the shipped demonstration fails **GRIND-1 while it produces A at t=120**, with no validation on GRIND-1 overlapping its repair interval [120,270). Shipped VAL-2 assignments remain on **GRIND-4 and GRIND-5**, producing B. These machine choices define supported demo interactions, not new PDF constraints or changes to the fixed dataset. The physical evaluator may assess other inputs; the interactive workflow does not promise recovery for every hypothetical equipment event or an interrupted validation. Do not implement a generic validation retry/restart subsystem.

**v1.2 clarification D2:** expose the scenario factory and the four existing template choices through `src/domain/scenario.ts` (§4.5). Specify immutable, phase-guarded, idempotent transformations and safe failure export for malformed JSON-compatible workflow data. Source conditions, UI requirements, D1 limits, existing signatures and schemaVersion=1 remain unchanged; only the two scenario exports are added. These contracts do not assert that implementation or numerical verification has been completed.

## 2. Required interaction and artifacts

1. Start in the planner role at D 11:00. Show all six original orders. Provide a real create/edit form for product, thousand-blade quantity, due shift and priority; validate before committing. Planner sends the visible demand to the manager.
2. The manager assigns campaigns, quotas, setups, mandatory work and staff through the bounded named choices below, with editable staffing requests/forecasts. A selected template must change the evaluated Plan records, not only explanatory text; preview the affected machine/work/operator assignments before applying it. A free-form equipment editor or event optimizer is not required. Show all machine settings, mandatory windows, material/staff conflicts and S3/S4 forecasts.
3. Compare at least two admissible choices for an important decision using evaluated reports (e.g. parallel versus staggered validation). Show output, original-deadline deficits, staff peak, labor minutes, work coverage and a reason for selection. Do not call an alternative admissible before checking its physical constraints.
4. Before simulated D noon, the manager fixes separate integer S1/S2 staffing requests with reserve explanations. Show requested versus actual headcount. No post-fix increase; S3/S4 remain forecasts in this cycle.
5. Submit a draft and let **both roles approve the same unchanged revision**. Show draft, pending and agreed clearly. Any edit invalidates pending approvals. Keep the prior agreed revision immutable and visible for comparison. Allow agreement on explicit deadline shortfalls only with an acknowledged rationale; never label a physically invalid plan feasible.
6. After baseline agreement, apply the prescribed **GRIND-1** failure at D+1 10:00 (t=120) only after checking that it actually produces A and that its repair will not intersect a validation on that machine. Open a successor draft. Show impact, the supported GRIND-1→GRIND-3 transfer and order consequences, then obtain both approvals. Only then enable absence. Apply the two-person S2 absence to that same lineage, keep the failure and locked requests, revise using the supported night WRAP staggering and obtain both approvals again. Block duplicates, wrong event order and unsupported failure inputs with explained guards; never silently select another machine.
7. Provide scenario restore, custom-order mode, reset with confirmation, version comparison and JSON export. Restore must recover the six mandatory orders and all original inputs. Custom edits/additions are visibly **custom**, never relabeled as the required scenario; do not alter immutable original quantities/deadlines. Custom demand uses the same bounded replay, with unmet quantities shown rather than an optimizer promise.
8. Render/export a Russian scenario passport from the very same report as the UI: four shifts, actual per-operation ledger, stocks including nonzero internal stocks, staff peaks/reserve use, required work, per-order original and revised fulfillment, alternatives and successive impacts. Provide Russian HTML slides and a PDF if browser printing is available; otherwise disclose the export limitation. Provide a screenshot sequence as demo backup. Never invent pilot observations.

Use a responsive industrial dashboard with dark/light themes, legible numbers, textual status in addition to color, labels, visible keyboard focus, semantic headings/tables, keyboard-operable forms/dialogs and accessible validation messages. Keep main workflows usable at 390 and 1440 CSS pixels; wide ledgers may use labeled local horizontal scrolling, not page-wide overflow. Keep simulation disclosure visible in both themes. No external competition deadline or slide limit is known.

### Supported manager choices and visible limits

The following named templates are the supported equipment/work edits. Their intervals are candidate placements to encode and **physically prevalidate before shipping**, not a claim that feasibility has already been verified. Existing Plan/Job/Campaign/Assignment shapes carry the changes through the public scenario API in §4.5; no data-schema extension is required.

| Choice | Bounded change |
| --- | --- |
| `VAL2_STAGGERED` | VAL-2 on GRIND-4/B [0,180) and GRIND-5/B [240,420); one extra worker per active validation |
| `VAL2_PARALLEL` | VAL-2 on GRIND-4/B and GRIND-5/B, both [240,420); two distinct extra workers during the overlap |
| `REPAIR_G1_TO_G3` | After prescribed GRIND-1 repair is applied, transfer its affected future A work and an available operator to A-configured GRIND-3 during [120,270); compute the transferable quantity from actual supply/capacity, preserve all earlier output and do not credit the transfer as validation or TO |
| `NIGHT_WRAP_STAGGERED` | After absence, change WRAP-1…WRAP-13 B→C [915,940), WRAP-14…WRAP-15 B→C [940,965); the first thirteen may produce while the last two change, subject to actual material and distinct operator coverage; WRAP-16 stays outside this template |

Both VAL-2 variants must be independently evaluated with the full coupled plan, including feed, production, normal/extra staff and all other work. A template name is never proof of feasibility. If any candidate is infeasible, show its issues, correct its placement within the unchanged source windows and document the replacement before claiming two admissible alternatives. Reevaluate every selected variant for custom demand; do not reuse a feasible label from the required scenario. Order creation/editing, priorities, promise negotiation, staffing and agreement remain functional within this bounded replay; they do not imply arbitrary equipment replanning.

The Russian UI must state that the demo supports the prescribed GRIND-1/A failure and named plan choices, with VAL-2 on GRIND-4/5; it must not offer an arbitrary failure-target selector. Show an actionable explanation if a custom or externally supplied draft no longer supports the event: review the conflicting work or restore the scenario. Do not silently cancel validation, rewrite completed work, declare a restart successful or promise automatic recovery from every custom edit.

## 3. Numerical semantics

- Quantities are thousand blades, time is unrounded working minutes. Export full finite numbers; round only display. Export **EPSILON = 1e-6** for quantity/time comparisons; absolute residuals within epsilon may be normalized to zero, never used to mask material shortages. No rounding before integration, allocation or comparisons.
- Integrate piecewise-constant rates; split at campaign/job/event/shift boundaries, quotas and buffer-empty times. A fixed one-minute step that overconsumes stock or changes deadlines is not acceptable. At shared boundaries finish intervals before starting successors; intervals are half-open [start,end). Count production finishing at a due boundary toward that deadline.
- Apply 0.85 **once to each machine's nominal speed** (`nominal * 0.85 / 1000` thousand/minute), not again as material passes downstream. Rate is also bounded by available input. No extra yield or validation hold.
- Stocks are product-specific queues immediately **before each operation**, with PACK output held separately as finished goods. Initialize only REWIND/WASH/WRAP inputs from R5, once at t=0; all other queues and finished stock start at zero. Move material through every route edge continuously. Raw input is unlimited only at PRESS. B bypasses CHROME; C cannot use PRINT.
- For each product/input operation, `closing = opening + inflow - consumed`; produced quantity equals consumed quantity for every non-PRESS operation. PACK consumes WRAP output, never stage-Z stock directly. For zero stock, downstream simultaneous flow cannot exceed upstream flow. Solve each product's acyclic route in route order; distribute scarce input among eligible machines by ascending machine ID numeric suffix. Report any starvation and uncompleted quota, not negative stocks.
- Campaigns are explicit production permissions, not guaranteed output. A machine may be idle, blocked, supply-throttled or at nominal effective capacity. A setup/maintenance/failure suspends production; its union removes capacity once. A campaign ends at `until` or completed quota, whichever comes first; no automatic spill beyond `until`. Preserve completed work and production in the frozen prefix when applying a successor change.
- Validation must have continuous actual positive production of its named product throughout its working duration with its extra worker. Underfeeding may throttle rate; a stopped/starved interval does not count as completed validation. Ordinary setups require no validation. Do not credit repair as maintenance.
- Normal production tasks use R3 group norms across simultaneously producing machines of an operation, even different products. Each simultaneous setup has a separate normal operator allocation: one per setup machine except TEF/PACK use two; WRAP uses one per setup machine. Do not share that worker with simultaneous production or other setup/validation. This is an explicit conservative allocation convention, not an extra source specialist requirement. Unused workers are reserve; repair staff are outside this pool. Validation adds one distinct worker per machine.
- Allocate finished goods to same-product orders by original due shift, then priority high/medium/low, then ID lexicographically. An order cannot share allocated units. Retain original deadline deficits even after a negotiated promise. Quantity shortfall is a warning about commitments; machine, material, staff and mandatory-work violations are physical errors. Do not automatically change requests or dates to suppress either.

## 4. Public TypeScript modules

These are **required interfaces to implement**, not claims that behavior is implemented. Export the following named types/functions directly from the five modules. Use JSON-compatible plain data; no Date, Map, class instance, random IDs, clock reads, DOM or I/O in domain functions. Types below use mutable array syntax for brevity; functions treat all inputs as immutable, return fresh state, and never mutate prior reports or versions. Shared types live in `src/domain/model.ts`. Additional private helpers are allowed; do not change these public signatures without an amendment. D1 changes supported workflow semantics; D2 adds scenario.ts without changing existing signatures or schemaVersion.

### 4.1 `src/domain/model.ts`

```ts
export type Product = 'A' | 'B' | 'C';
export type Shift = 1 | 2 | 3 | 4;
export type Operation = 'PRESS' | 'THERMAL' | 'PRINT' | 'LASER'
  | 'REWIND' | 'GRIND' | 'WASH' | 'CHROME' | 'TEF' | 'LUBE' | 'WRAP' | 'PACK';
export type Role = 'planner' | 'manager';
export type Triple = Record<Product, number>;
export type Four = [number, number, number, number];
export type JobCode = 'TO-1' | 'TO-2' | 'TO-3' | 'TO-4' | 'TO-5'
  | 'VAL-1' | 'VAL-2' | 'VAL-3' | 'VAL-4';
export interface Order {
  id: string; product: Product; quantity: number; originalDue: Shift;
  priority: 'high' | 'medium' | 'low';
  promise: null | { quantity: number; due: Shift; reason: string };
}
export interface Machine {
  id: string; operation: Operation; initialProduct: Product;
}
export interface Campaign {
  id: string; machineId: string; product: Product;
  start: number; until: number; quota: number;
}
export interface Setup {
  id: string; machineId: string; from: Product; to: Product;
  start: number; end: number;
}
export interface Job {
  id: string; code: JobCode; machineId: string; start: number; end: number;
}
export interface Assignment {
  taskId: string; start: number; end: number; workerIds: string[];
}
export interface Plan {
  id: string; mode: 'required' | 'custom'; orders: Order[];
  campaigns: Campaign[]; setups: Setup[]; jobs: Job[];
  assignments: Assignment[];
  requests: null | [number, number]; forecasts: [number, number];
  reserveReasons: [string, string];
}
export type Event =
  | { kind: 'failure'; machineId: string }
  | { kind: 'absence' };
export interface Issue {
  code: string; message: string; severity: 'error' | 'warning';
  refs: string[]; start: number | null; end: number | null;
}
export type Result<T> = { ok: true; value: T } | { ok: false; errors: Issue[] };
export const EPSILON: number; // exactly 1e-6
export const MACHINES: readonly Machine[];
export const ROUTES: Readonly<Record<Product, readonly Operation[]>>;
export const NOMINAL_RATES: Readonly<Record<Operation, number>>;
export const INITIAL_STOCKS: Readonly<Record<'REWIND' | 'WASH' | 'WRAP', Triple>>;
export const SETUP_MINUTES: Readonly<Record<Product, Readonly<Triple>>>;
export const REQUIRED_ORDERS: readonly Order[];
export const REQUIRED_WORK: readonly {
  code: JobCode; operation: Operation; count: number;
  minutes: number; firstShift: Shift; lastShift: Shift; product: Product | null;
}[];
```

Machine IDs are `OPERATION-n` with one-based unpadded suffix, e.g. `GRIND-1`, `WRAP-16`. Assign initial A machines first, then B, then C in numeric order, using R6. Constants exactly reproduce R3–R7. `REQUIRED_ORDERS` have null promises. Required mode has exactly these original IDs/products/quantities/due shifts/priorities; a promise does not replace originals. For exploratory edits, create a custom copy with a new order ID and visibly retain the original scenario for restoration. Within a workflow lineage an existing order's quantity/originalDue cannot be overwritten; use promise for renegotiation. A new custom order keeps its submitted original due/quantity across later revisions. Changed original demand (other than promise fields) makes Plan.mode custom; only restore returns from custom to required mode. Renegotiating promises alone keeps required mode and its original-deadline accounting.

`start/end/until` are global workminutes in [0,2520]. Positive durations and quotas are required; setup duration equals the matrix entry, with no zero-duration same-product Setup records. No duplicate IDs within any collection. `Job.code` determines product/window/duration from REQUIRED_WORK, not arbitrary UI input. Different machines for VAL-2/VAL-4 need separate Job records with the same code. Freeze source constants against accidental edits.

Staff IDs are `S1-1`…`S1-N`, etc.; each belongs only to its shift. Available N is fixed request for S1/S2 (S2 minus two after absence), or forecast for S3/S4. Absence removes the two highest-numbered S2 IDs; future assignments may reallocate the remaining people. Forecasts are nonnegative integers. Before fixation evaluation uses the maximum assigned numeric suffix in each S1/S2 (zero if none) as its draft available count; it labels this draft, never fixed. Staff task IDs are `run:OPERATION` for pooled normal production, `setup:SETUP_ID`, and `validate:JOB_ID`. A run task's machine membership/required count changes with actual active production; use Assignment segments to match it. Assignment intervals must stay within their shift, cover the required count with distinct available workers throughout each task segment, and may not double-book any worker. Unknown/inactive task assignments are invalid. Missing coverage is an error even if aggregate headcount is sufficient.

### 4.2 `src/domain/calendar.ts`

```ts
export interface Span { start: number; end: number }
export function workingMinutes(start: number, end: number): number;
export function toWorkMinute(calendarMinute: number): number;
export function toCalendarMinute(workMinute: number, edge: 'start' | 'end'): number;
export function workSpans(shift: Shift): Span[];
```

Calendar minutes are relative to D+1 08:00, domain [0,2880]. `workSpans` returns calendar-coordinate working spans for the shift (S1: [0,240), [270,480), [510,690)); S2 adds 720, S3 adds 1440, S4 adds 2160. `workingMinutes` measures intersection of [start,end) with all work spans; equal endpoints give zero. `toWorkMinute` is elapsed work time, constant over exclusions. At collapsed exclusions, `toCalendarMinute(t,'start')` returns the next working start; `'end'` returns the previous working end. Thus t=240 maps to 270/240, t=630 to 720/690; endpoint t=0 maps to 0, t=2520 maps to 2850 for both edges (no next work interval). Reject nonfinite/out-of-range/reversed arguments with `RangeError`; do not depend on timezone, locale, wall-clock date or daylight saving. These numeric conversion functions are the sole exception to Result-based validation.

### 4.3 `src/domain/engine.ts`

```ts
export interface EvaluationInput { plan: Plan; events: Event[] }
export interface MachineInterval {
  machineId: string; campaignId: string | null;
  start: number; end: number; product: Product;
  kind: 'produce' | 'setup' | 'maintenance' | 'repair' | 'idle';
  rate: number; quantity: number; jobIds: string[]; setupId: string | null;
}
export interface StockInterval {
  product: Product; before: Operation; start: number; end: number;
  opening: number; inflowRate: number; consumedRate: number; closing: number;
}
export interface StaffInterval {
  start: number; end: number; normal: number; setup: number; validation: number;
  total: number; available: number;
  tasks: { taskId: string; required: number; workerIds: string[] }[];
}
export interface OrderResult {
  orderId: string; completedAt: number | null; allocatedByShift: Four;
  atOriginalDue: number; originalDeficit: number;
  atPromiseDue: number | null; promiseDeficit: number | null;
}
export interface JobResult {
  jobId: string; code: JobCode; machineId: string;
  creditedMinutes: number; complete: boolean; issues: string[];
}
export interface ShiftResult {
  shift: Shift; packed: Triple; fulfilled: number;
  dueDeficit: number; stocks: { product: Product; before: Operation; quantity: number }[];
  finishedUnallocated: Triple; requested: number | null; available: number;
  peak: number; peakSpans: { start: number; end: number }[];
  laborMinutes: number; reserveMinutes: number;
}
export interface Report {
  planId: string; feasible: boolean; issues: Issue[];
  machineIntervals: MachineInterval[]; stockIntervals: StockInterval[];
  staffIntervals: StaffInterval[]; shifts: ShiftResult[];
  orders: OrderResult[]; jobs: JobResult[];
  quotas: { campaignId: string; produced: number; remaining: number }[];
}
export interface Comparison {
  left: Report; right: Report;
  delta: { packed: Triple; originalDeficit: number; peak: Four; laborMinutes: number };
}
export function evaluate(input: EvaluationInput): Result<Report>;
export function compare(left: EvaluationInput, right: EvaluationInput): Result<Comparison>;
```

Invalid data returns `ok:false`, not a partially trusted report: unknown IDs/enums, duplicate IDs, nonfinite/negative quantities, invalid ranges, overlapping campaigns on one machine, illegal event sequence/target, or required-mode source changes. Legal event arrays are [], [failure], [failure,absence]; a failure target must be GRIND with positive production immediately before t=120 in the preserved prefix. Other physical violations return an evaluated `ok:true` report with `feasible:false`: wrong/missing setup, incompatible work overlap/window/duration/coverage, worker shortage/double booking, impossible validation, etc. `feasible` means **no error issues**, not that all original deadlines are met. Deadline shortfalls and quota starvation are warnings; they never create material. With a staffing error, computed production is a counterfactual machine/material-capacity projection, not a physically achieved result; label the report invalid and block agreement rather than silently inventing or adding workers. Unknown exceptions are defects, not success.

A physically wrong route or setup using otherwise recognizable records may instead be rejected structurally with an explained `ok:false` input/engine issue. Either representation is acceptable: structural rejection, or `ok:true` with `feasible:false` and the applicable physical issues. Neither may produce forbidden-route output, output without the required completed setup, or a successful feasibility claim. Do not require one arbitrary error-code mapping for every malformed combination. Actions rejecting such plans may propagate relevant input/engine codes (for example INVALID_INPUT or SETUP_REQUIRED); not every rejection must be WORKFLOW_GUARD. The explicitly specified D1 workflow guards still apply to their supported-event cases.

The preceding target rule belongs to the general **physical evaluator**, not the supported demo workflow. evaluate/compare may inspect arbitrary structurally valid physical plans, including another operating GRIND target or a stopped validation, without choosing a recovery. An interrupted validation remains incomplete with its physical issues; do not combine disconnected validation fragments into a successful retry. D1's GRIND-1/A and no-overlapping-validation requirements are additional transition guards below, not changes to REQUIRED_WORK or to general physical input validity.

Stable issue codes: `INVALID_INPUT`, `SOURCE_CHANGED`, `EVENT_ORDER`, `EVENT_TARGET`, `SETUP_REQUIRED`, `MACHINE_CONFLICT`, `WORK_WINDOW`, `WORK_DURATION`, `WORK_MISSING`, `VALIDATION_OUTPUT`, `STAFF_SHORTAGE`, `STAFF_ASSIGNMENT`, `ORDER_SHORTFALL`, `QUOTA_SHORTFALL`. Use refs and intervals for explanations. Multiple applicable issues may be reported; do not fabricate production on an invalidly configured machine. Missing job codes yield WORK_MISSING even though there is no JobResult row to reference.

Output rules: machine intervals cover each machine's entire [0,2520) working horizon, split where evidence changes; produce has actual rate/quantity, other kinds have zero. A validation is an annotation on produce via jobIds, not extra output. For overlapping stops use repair over maintenance over setup for the displayed kind and retain all applicable jobIds/setupId. Repair overlapping separately scheduled maintenance is not itself an error: exclude the union once, credit only the explicitly scheduled maintenance duration, and never credit repair alone as TO. Maintenance/setup or stopped validation conflicts still produce issues. `product` is the current configured product (setup retains from until completion); a blocked campaign retains its campaignId, otherwise it is null. `stockIntervals` includes every legal non-PRESS input queue including zeros; raw PRESS input is excluded. Shift stocks are closing snapshots for every such queue, not a recomputed stage total. `fulfilled` is newly allocated PACK quantity in that shift; `dueDeficit` sums original deficits due in that shift, not cumulative lateness. `allocatedByShift` is incremental allocated quantity; `atOriginalDue` and `atPromiseDue` are cumulative allocated quantity capped at the applicable quantity. `completedAt` is first full original-quantity allocation or null. Finished stock not allocated to orders remains separate. Jobs count only qualifying workminutes; partial/invalid coverage stays incomplete.

Staff rows split at every task/count/availability/assignment change. `peak` is maximum required total, not available workers; `peakSpans` retains every maximal interval at that total. Labor minutes integrate required total; reserve minutes integrate max(available−required,0). S3/S4 requested is null. All shift outputs have four rows even when empty. Sort machine intervals by operation order in R3, numeric machine suffix, start; stocks by A/B/C, route index, start; staff by start; orders by allocation order; jobs/quotas by ID. `compare` evaluates both inputs; delta is **right minus left**, total packed by product, summed original deficits, per-shift peak and total labor minutes. It never chooses a winner automatically.

### 4.4 `src/domain/workflow.ts`

```ts
export interface Revision {
  id: number; parentId: number | null; plan: Plan; events: Event[];
  status: 'draft' | 'pending' | 'agreed'; approvals: Role[];
  acknowledgements: { code: string; reason: string }[];
}
export interface Workflow {
  schemaVersion: 1; role: Role; demandSent: boolean;
  phase: 'baseline' | 'failure' | 'absence';
  planningMinute: number; lockedRequests: null | [number, number];
  versions: Revision[]; currentId: number; scenarioPlan: Plan;
}
export type Action =
  | { type: 'switch-role'; role: Role }
  | { type: 'edit-orders'; orders: Order[] }
  | { type: 'send-demand' }
  | { type: 'edit-plan'; plan: Plan }
  | { type: 'fix-requests'; counts: [number, number]; reasons: [string, string] }
  | { type: 'set-planning-minute'; minute: number }
  | { type: 'submit'; acknowledgements: { code: string; reason: string }[] }
  | { type: 'approve' }
  | { type: 'apply-failure'; machineId: string }
  | { type: 'apply-absence' }
  | { type: 'restore-scenario' };
export function createWorkflow(plan: Plan): Result<Workflow>;
export function transition(state: Workflow, action: Action): Result<Workflow>;
export function exportWorkflow(state: Workflow): string;
```

`createWorkflow` accepts a structurally valid required-mode plan even if physically incomplete; copy it with null requests and original orders with null promises into immutable scenarioPlan and revision 1 (parentId=null). Set planner, minute=660 (D 11:00 relative to D 00:00), baseline, unsent, unlocked, draft, no approvals/acknowledgements. Workflow planningMinute uses **D calendar minutes [660,720]**, separate from production coordinates. `set-planning-minute` is monotone; at 720 fixation is too late. No real clock is used.

Planner alone edits orders/sends demand; manager alone edits production plan/fixes requests/applies events. Editing orders after send marks demand unsent; manager must not overwrite planner orders with edit-plan. Fix once at minute<720 after demand sent; counts are integers ≥2, source requests are immutable afterward. All fixed plans must use locked counts. Forecasts remain editable. During draft before fixation they are not represented as approved requests. Require nonempty reserve explanations whenever available headcount exceeds computed demand.

Submit requires demand sent, requests fixed, physically feasible evaluation, and nonempty reasons acknowledging every warning code present. Set pending with empty approvals. Either role can approve once; only two distinct approvals on the same revision produce agreed. Invalid actions return `ok:false` with Issue code `WORKFLOW_GUARD` or the relevant engine/input issues, and leave input untouched. No role switch implies approval.

Editing a draft replaces its data with approvals cleared; editing pending/agreed creates a successor draft with monotone revision ID and parentId pointing to its predecessor; prior revision is unchanged. Production edits after events must preserve all campaigns/jobs/setups/assignments and resulting ledger **strictly before the event cut** (failure t=120, absence t=630); splits at the cut are allowed. Keep unchanged prefix evidence and carry its stocks/settings forward; never inject initial stocks again. Exact-boundary future setups are revisable. An edit that rewrites past output returns WORKFLOW_GUARD.

Apply-failure requires the manager role, agreed baseline and the **supported GRIND-1/A target**, subject to the D1 guards below; apply-absence requires agreed failure successor. Each accepted event creates a new draft and advances phase, carrying all existing events and locked staffing; absence has no worker-count parameter. Retain planned work until the manager applies a supported plan change. No event automatically retries validation. Phase-specific available actions must be visibly gated. Restore returns createWorkflow(state.scenarioPlan), restoring original orders and clearing promises/events/approvals/locks/history; it is allowed from either role. Reset uses this action after UI confirmation. Export is JSON text with exact top-level shape `{ schemaVersion: 1, workflow: Workflow, evaluation: Result<Report> }`, using the current revision's plan/events, two-space indentation and a final newline; downloads encode it as UTF-8. Preserve documented field order and deterministically ordered arrays; no wall-clock metadata or private data. Equal state produces identical bytes. Export is not a claim of signed provenance. Import/reload persistence is not required.

**D2 malformed-data export:** keep `exportWorkflow(state: Workflow): string`; runtime callers may nevertheless supply malformed data through a JSON boundary or an unsafe type assertion. If the supplied JSON-compatible value is not a valid Workflow, return deterministic JSON with the same wrapper keys, `schemaVersion:1`, `workflow` containing the **original supplied JSON value**, and `evaluation:{ ok:false, errors:[...] }`. Include at least one explanatory error Issue with code `INVALID_INPUT`; never invent a current revision, substitute an empty/default workflow, mark the evaluation successful or mutate the input. This fallback serializes the original data for diagnosis, not a repaired workflow. Use the same two-space indentation, final newline and UTF-8 download encoding; repeated identical input yields identical text. For a proper Workflow, preserve the existing export behavior, including the real current evaluation and honest physical errors/shortfall warnings. A shape-valid but physically infeasible plan is not automatically malformed workflow data.

Here JSON-compatible data means plain finite JSON values/arrays/objects. Cycles, non-JSON objects and values that cannot be represented faithfully as JSON are outside this public data contract. D2 explains the bounded export safety behavior; it does not require a general malicious-object, accessor or serialization platform.

**D1 failure guards:** retain the `{ type: 'apply-failure'; machineId: string }` signature, but accept only `machineId === 'GRIND-1'` in the workflow. Return `ok:false` with an error Issue code `UNSUPPORTED_FAILURE_TARGET` for any other target, explaining the supported demo target. If any validation Job on GRIND-1 has a positive-length intersection with [120,270), reject with code `UNSUPPORTED_FAILURE_VALIDATION`, refs containing GRIND-1 and the conflicting job IDs, start=120 and end=270. Explain that interrupted-validation recovery is outside this replay and that the user must review work or restore the scenario. A job ending at120 or starting at270 does not intersect; use the existing EPSILON convention. Do not reject validations on GRIND-4/5 merely because their times overlap the repair on another machine.

For a manager's baseline-phase request, check those two unsupported-input guards before the generic draft/pending approval guard, so a conflicting **draft** gets the specific explanation rather than an implied recoverable event. All usual role, phase and duplicate-event guards still apply. Once eligible to apply, evaluate the unchanged pre-failure baseline and require a positive-rate `produce` interval for GRIND-1/A immediately before **and containing t=120** (half-open interval semantics); being configured for A or merely having a campaign is insufficient. If production is absent, starved, already stopped or of another product, return `EVENT_TARGET` with an explanation. Every rejected action leaves state, phase, versions, events and approvals unchanged; do not create a successor. Subsequent edit-plan actions in the failure/absence lineage must also reject a validation newly placed on GRIND-1 across [120,270) with `UNSUPPORTED_FAILURE_VALIDATION`, without relaxing the frozen-prefix or other physical checks. This bounded support policy is not an assertion that every custom-order plan can proceed through both events.

Form/domain validation rejects empty/duplicate IDs, unknown products/priorities, nonfinite/zero/negative quantities, due shifts outside 1–4, empty promise reasons, promise quantities outside (0,original quantity], and malformed custom records. Trim textual IDs/reasons on submission; surface field errors without losing entered values. Numeric text may accept comma or dot decimals in the UI, but the domain receives finite numbers. Engine APIs return Issue records, not localized HTML; the UI maps codes to Russian descriptions and renders user text safely.

### 4.5 `src/domain/scenario.ts` — D2

```ts
import type { Event, Plan, Result } from './model';

export function createScenarioPlan(): Plan;
export function applyTemplate(
  plan: Plan,
  events: Event[],
  template: 'VAL2_STAGGERED' | 'VAL2_PARALLEL'
    | 'REPAIR_G1_TO_G3' | 'NIGHT_WRAP_STAGGERED',
): Result<Plan>;
```

`createScenarioPlan` returns a fresh, deterministic, required-mode baseline with the original six orders and null promises, actual planned campaigns/setups/mandatory Jobs, complete operator assignments, and **computed standalone** `requests:[S1,S2]` and `forecasts:[S3,S4]`. Include reserve explanations where needed. Calls with no arguments return equal data but share no mutable arrays/records with each other or the source constants. Use calculated interval demand and an explained reserve policy, not the provisional expert counts as a numerical oracle. The returned requests are standalone planning numbers, not an already fixed workflow agreement. `createWorkflow(createScenarioPlan())` still clears requests/locks, demand-sent state and approvals as §4.4 requires; users must send demand and fix requests before agreement.

`applyTemplate` is a bounded deterministic transformation of the existing schedule, not a new optimizer or an event/approval transition. It must preserve the input Plan and events, all source constants, the exact order originals/promises/priority/order-set, mode, and requests (including null). A nonnull request tuple must never be increased, replaced or silently recalculated by a template; actual availability still follows events. Keep unrelated plan records unchanged; only edit the records needed for the named choice. Return an independently evaluate-able Plan, not cached metrics or an asserted report. The caller passes an accepted result to the existing edit-plan transition; workflow role, approval and locked-request checks remain authoritative.

| Template | Accepted event list | Transformation boundary |
| --- | --- | --- |
| `VAL2_STAGGERED`, `VAL2_PARALLEL` | `[]` only | Baseline VAL-2 work/associated staffing on GRIND-4/5, as the named choices above specify |
| `REPAIR_G1_TO_G3` | `[{kind:'failure',machineId:'GRIND-1'}]` only | Future affected A work/operator transfer; preserve the entire executed prefix before t=120 |
| `NIGHT_WRAP_STAGGERED` | `[{kind:'failure',machineId:'GRIND-1'},{kind:'absence'}]` only | Night WRAP setup/production/operator changes; preserve the entire executed prefix before t=630, including the prior failure response |

Reject unsupported template names at the runtime boundary, wrong/duplicate/out-of-order events, other failure targets, malformed input or unsupported schedule preconditions with an explained `ok:false` Result. Use relevant input/engine/WORKFLOW_GUARD issues; no exhaustive arbitrary mapping of these template failures to individual codes is imposed. Retain D1's actual GRIND-1/A production and no-overlapping-validation prerequisites. On either result path do not mutate the original plan/events or source constants. A rejected request must not silently select another template or restore the scenario.

A pending disruption may make the input plan physically infeasible before its designated corrective template is applied; that alone is not an unsupported-input guard. Apply the bounded correction where its preconditions hold, then evaluate the result. Conversely, `ok:true` from applyTemplate means a Plan transformation was accepted, not that its physical report is feasible.

Frozen-prefix preservation covers the actual machine/work/operator intervals, produced quantities, settings and material stocks, not merely matching total output. Equivalent interval splits at the cut are permitted; no change before the cut and no second injection of initial stocks is allowed. Compare input and output with the **same supplied events** when checking the preserved prefix. No template call records an event, grants approval, fixes staffing or adds validation retries.

Reapplying the same template in its valid phase must be **idempotent in physical schedule and evaluated output**, including jobs, stocks, staffing and order fulfillment. Plan.id may remain unchanged; generating a new ID is not required. Reuse/replace the relevant records rather than appending duplicate jobs, campaigns, setups or assignments. Determinism and idempotence must not depend on invocation count, time, randomness or previous calls. Switching between the two baseline VAL-2 choices replaces that placement, not accumulates it.

The factory baseline, both admissible VAL-2 alternatives and the full required-scenario lineage (baseline → prescribed failure/transfer → absence/night staggering) must be independently checked as physically feasible coupled schedules before shipping, including all mandatory work and assigned staff under unchanged fixed requests. Deadline warnings remain honest original-commitment findings; physical feasibility is not a promise that every deadline is met. No successful transformation or template name alone certifies feasibility: evaluate its result. Reevaluate custom-order plans and expose their quantity/deadline warnings; do not reuse a required-scenario success label or silently change custom orders. Unsupported preconditions may produce an explained failure rather than a generic recovery.

Minimal public contract example (illustrative, not executed here; inspect both Result values rather than assuming success):

```ts
import { evaluate } from './engine';
import { applyTemplate, createScenarioPlan } from './scenario';

const baseline = createScenarioPlan();
const alternative = applyTemplate(baseline, [], 'VAL2_PARALLEL');
if (alternative.ok) {
  const evaluation = evaluate({ plan: alternative.value, events: [] });
  console.log(evaluation); // Inspect issues and feasibility; baseline is unchanged.
} else {
  console.error(alternative.errors);
}
```

This example contains only the public common scenario. It supplies no measured outputs, reference checksums or claim of executed feasibility verification.

## 5. Pilot content contract

Include exactly five proposed metrics, with no invented baseline or achieved improvement:

| Metric | Formula and data | Improvement and pilot verification |
| --- | --- | --- |
| On-time quantity | Sum PACK allocated by original deadline / total due quantity; order originals and allocation ledger | Higher; compare the same replay and later authorized observations, retaining original commitments |
| Replanning lead time | Both-role agreement time minus event disclosure time; workflow interaction timestamps collected in a supervised pilot | Lower without hiding conflicts; measure manual baseline first with the same tasks |
| Labor use and reserve | Required operator-minutes / available operator-minutes; report reserve minutes and peak shortage separately | Less idle reserve without shortages; reconcile interval assignments and observe justified reserves |
| WIP exposure | Integral of all intermediate thousand-blade stocks over workminutes; per-operation ledger | Lower at equal demand fulfillment; compare alternatives without counting one unit twice |
| Collaboration completion | Completed paired-role tasks without facilitator intervention / attempted tasks; observation checklist | Higher; record failures and timeouts, do not infer usability from clicks alone |

Pilot proposal: one planner, one manager, a production-domain observer and a facilitator; validate source transcription, rehearse the common scenario manually, run baseline and both disruptions, compare alternatives and exports, then conduct a debrief. First measure missing manual baselines. Proposed success criteria: traceable figures, no concealed physical conflicts, both roles can complete/agree the tasks, original shortfalls remain visible and exported numbers match the display. Risks/controls: simulation mistaken for production (persistent disclosure), incorrect material assumptions (operation ledger), excessive staffing (peak/reserve review), stale agreements (version invalidation), data-entry errors (validation), unavailable demo equipment (local build and screenshot backup). This proposal is not a performed factory pilot.
