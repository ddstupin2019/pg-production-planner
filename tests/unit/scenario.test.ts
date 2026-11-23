import { describe, expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Report } from '../../src/domain/engine';
import {
  INITIAL_STOCKS,
  MACHINES,
  NOMINAL_RATES,
  REQUIRED_ORDERS,
  REQUIRED_WORK,
  ROUTES,
  SETUP_MINUTES,
} from '../../src/domain/model';
import type { Event, Plan, Result } from '../../src/domain/model';
import { applyTemplate, createScenarioPlan } from '../../src/domain/scenario';
import { createWorkflow, exportWorkflow, transition } from '../../src/domain/workflow';
import type { Action, Workflow } from '../../src/domain/workflow';
import { deepFreeze, feasiblePlan, originalOrders, unwrap } from '../support/fixture';
import { checkLedger, near, quantity } from '../support/ledger';
import {
  finiteTree,
  nearTree,
  sameExecution,
  sameOutputs,
  uniqueSchedule,
} from '../support/execution';
import { checkJobs } from '../support/work-witness';

type Template = Parameters<typeof applyTemplate>[2];
const templates: Template[] = [
  'VAL2_STAGGERED',
  'VAL2_PARALLEL',
  'REPAIR_G1_TO_G3',
  'NIGHT_WRAP_STAGGERED',
];
const failure: Event[] = [{ kind: 'failure', machineId: 'GRIND-1' }];
const absence: Event[] = [...failure, { kind: 'absence' }];
const sources = () => ({
  MACHINES,
  INITIAL_STOCKS,
  NOMINAL_RATES,
  REQUIRED_ORDERS,
  REQUIRED_WORK,
  ROUTES,
  SETUP_MINUTES,
});

function objects(value: unknown, found = new Set<object>()): Set<object> {
  if (value && typeof value === 'object' && !found.has(value)) {
    found.add(value);
    Object.values(value).forEach((child: unknown) => objects(child, found));
  }
  return found;
}

function refused<T>(result: Result<T>): void {
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Unsupported template request succeeded');
  expect(result.errors.length).toBeGreaterThan(0);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}

function checked(plan: Plan, events: Event[] = [], feasible = true): Report {
  const snapshot = structuredClone({ plan, events });
  const report = unwrap(evaluate(deepFreeze({ plan, events })));
  expect({ plan, events }).toEqual(snapshot);
  finiteTree(report);
  uniqueSchedule(plan);
  checkLedger(report, plan, events);
  if (feasible) {
    expect(report.feasible, JSON.stringify(report.issues)).toBe(true);
    expect(checkJobs(report, plan, events).every((work) => work.complete >= work.required)).toBe(
      true,
    );
  }
  for (const order of report.orders) {
    const original = plan.orders.find((row) => row.id === order.orderId)!;
    near(order.originalDeficit, original.quantity - order.atOriginalDue);
  }
  return report;
}

function transformed(plan: Plan, events: Event[], template: Template): Plan {
  const input = structuredClone({ plan, events });
  const originalSources = structuredClone(sources());
  const next = unwrap(applyTemplate(deepFreeze(plan), deepFreeze(events), template));
  expect({ plan, events }).toEqual(input);
  expect(sources()).toEqual(originalSources);
  expect(next.orders).toEqual(plan.orders);
  expect(next.mode).toBe(plan.mode);
  expect(next.requests).toEqual(plan.requests);
  const affected = template.startsWith('VAL2_')
    ? ['GRIND-4', 'GRIND-5']
    : template === 'REPAIR_G1_TO_G3'
      ? ['GRIND-1', 'GRIND-3']
      : Array.from({ length: 15 }, (_, i) => `WRAP-${i + 1}`);
  for (const key of ['campaigns', 'setups'] as const) {
    const view = (p: Plan) =>
      p[key]
        .filter((row) => !affected.includes(row.machineId))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    expect(view(next)).toEqual(view(plan));
  }
  const jobs = (p: Plan) =>
    p.jobs
      .filter((row) => !template.startsWith('VAL2_') || row.code !== 'VAL-2')
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  expect(jobs(next)).toEqual(jobs(plan));
  uniqueSchedule(next);
  finiteTree(next);
  return next;
}

function phasePlan(template: Template): { plan: Plan; events: Event[] } {
  const plan = createScenarioPlan();
  if (template.startsWith('VAL2_')) return { plan, events: [] };
  if (template === 'REPAIR_G1_TO_G3') return { plan, events: structuredClone(failure) };
  return {
    plan: transformed(plan, structuredClone(failure), 'REPAIR_G1_TO_G3'),
    events: structuredClone(absence),
  };
}

function revision(state: Workflow) {
  return state.versions.find((v) => v.id === state.currentId)!;
}
function step(state: Workflow, action: Action): Workflow {
  const before = structuredClone(state);
  const next = unwrap(transition(deepFreeze(state), action));
  expect(state).toEqual(before);
  return next;
}
function agree(state: Workflow): Workflow {
  const row = revision(state);
  const report = checked(row.plan, row.events);
  const codes = [
    ...new Set(report.issues.filter((i) => i.severity === 'warning').map((i) => i.code)),
  ];
  let next = step(state, {
    type: 'submit',
    acknowledgements: codes.map((code) => ({ code, reason: 'Исходные риски раскрыты' })),
  });
  next = step(next, { type: 'approve' });
  expect(revision(next).status).toBe('pending');
  next = step(next, { type: 'switch-role', role: 'planner' });
  next = step(next, { type: 'approve' });
  expect(revision(next).status).toBe('agreed');
  return step(next, { type: 'switch-role', role: 'manager' });
}

describe('D2 shipped factory and public template physical contracts', () => {
  test('factory is deterministic, fresh at every record and source-independent', () => {
    const original = structuredClone(sources());
    const first = createScenarioPlan();
    const second = createScenarioPlan();
    expect(first).toEqual(second);
    expect(first.mode).toBe('required');
    expect(first.orders).toEqual(originalOrders());
    expect(first.campaigns.length).toBeGreaterThan(0);
    expect(first.setups.length).toBeGreaterThan(0);
    expect(first.assignments.length).toBeGreaterThan(0);
    const other = objects(second);
    const sourceObjects = objects(sources());
    for (const record of objects(first)) {
      expect(other.has(record)).toBe(false);
      expect(sourceObjects.has(record)).toBe(false);
    }
    first.orders[0]!.quantity = 1;
    first.jobs[0]!.start = 1;
    first.assignments[0]!.workerIds.push('LOCAL-EDIT');
    expect(createScenarioPlan()).toEqual(second);
    expect(sources()).toEqual(original);
  });
  test('factory budgets are justified by actual interval peaks, never expert counts', () => {
    const plan = createScenarioPlan();
    const report = checked(plan);
    expect(plan.requests).not.toBe(null);
    const budgets = [...plan.requests!, ...plan.forecasts];
    report.shifts.forEach((shift, index) => {
      const budget = budgets[index]!;
      expect(Number.isInteger(budget)).toBe(true);
      expect(budget).toBeGreaterThanOrEqual(shift.peak);
      if (index < 2 && budget > shift.peak)
        expect(plan.reserveReasons[index]!.trim().length).toBeGreaterThan(0);
      near(shift.laborMinutes + shift.reserveMinutes, budget * 630);
      expect(shift.available).toBe(budget);
    });
    const workflow = unwrap(createWorkflow(plan));
    expect(revision(workflow).plan.requests).toBe(null);
    expect(workflow.lockedRequests).toBe(null);
    expect(workflow.demandSent).toBe(false);
    expect(revision(workflow)).toMatchObject({ status: 'draft', approvals: [] });
  }, 60_000);
  test.each(['VAL2_STAGGERED', 'VAL2_PARALLEL'] as Template[])(
    'coupled alternative %s is actually feasible',
    (template) => {
      const plan = transformed(createScenarioPlan(), [], template);
      const report = checked(plan);
      const jobs = plan.jobs
        .filter((job) => job.code === 'VAL-2')
        .sort((a, b) => (a.machineId < b.machineId ? -1 : 1));
      expect(jobs.map((job) => job.machineId)).toEqual(['GRIND-4', 'GRIND-5']);
      nearTree(
        jobs.map((job) => [job.start, job.end]),
        template === 'VAL2_PARALLEL'
          ? [
              [240, 420],
              [240, 420],
            ]
          : [
              [0, 180],
              [240, 420],
            ],
      );
      expect(
        report.machineIntervals.some(
          (r) =>
            r.machineId === 'GRIND-1' &&
            r.kind === 'produce' &&
            r.product === 'A' &&
            r.start < 120 &&
            r.end > 120 &&
            r.rate > 0,
        ),
      ).toBe(true);
      expect(
        plan.jobs.some(
          (j) =>
            j.machineId === 'GRIND-1' && j.code.startsWith('VAL') && j.start < 270 && j.end > 120,
        ),
      ).toBe(false);
    },
    60_000,
  );
  test.each(templates)(
    '%s is physically idempotent and does not accumulate records',
    (template) => {
      const { plan, events } = phasePlan(template);
      const first = transformed(plan, events, template);
      const second = transformed(first, events, template);
      const repeat = transformed(plan, events, template);
      if (template === 'NIGHT_WRAP_STAGGERED') {
        for (let machine = 1; machine <= 15; machine++) {
          expect(first.setups).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                machineId: `WRAP-${machine}`,
                from: 'B',
                to: 'C',
                start: machine <= 13 ? 915 : 940,
                end: machine <= 13 ? 940 : 965,
              }),
            ]),
          );
        }
        expect(first.campaigns.filter((c) => c.machineId === 'WRAP-16')).toEqual(
          plan.campaigns.filter((c) => c.machineId === 'WRAP-16'),
        );
        expect(first.setups.filter((s) => s.machineId === 'WRAP-16')).toEqual(
          plan.setups.filter((s) => s.machineId === 'WRAP-16'),
        );
      }
      if (template.startsWith('VAL2_')) {
        expect(first.jobs.filter((j) => j.code !== 'VAL-2')).toEqual(
          plan.jobs.filter((j) => j.code !== 'VAL-2'),
        );
      }
      const a = checked(first, events);
      const b = checked(second, events);
      const c = checked(repeat, events);
      sameExecution(a, first, b, second);
      sameExecution(a, first, c, repeat);
      sameOutputs(a, b);
      sameOutputs(a, c);
      for (const key of ['campaigns', 'jobs', 'setups', 'assignments'] as const) {
        expect(second[key].length).toBe(first[key].length);
      }
      const quotaView = (report: Report, p: Plan) =>
        report.quotas
          .map((row) => {
            const permission = p.campaigns.find((c) => c.id === row.campaignId)!;
            const campaign = {
              machineId: permission.machineId,
              product: permission.product,
              start: permission.start,
              until: permission.until,
              quota: permission.quota,
            };
            return { campaign, produced: row.produced, remaining: row.remaining };
          })
          .sort((x, y) => (JSON.stringify(x.campaign) < JSON.stringify(y.campaign) ? -1 : 1));
      nearTree(quotaView(a, first), quotaView(b, second));
    },
    60_000,
  );
  test('switching VAL-2 placements replaces, rather than adds, work', () => {
    const base = createScenarioPlan();
    const left = transformed(base, [], 'VAL2_STAGGERED');
    const right = transformed(left, [], 'VAL2_PARALLEL');
    const back = transformed(right, [], 'VAL2_STAGGERED');
    sameExecution(checked(left), left, checked(back), back);
    sameOutputs(checked(left), checked(back));
    expect(back.jobs.filter((job) => job.code === 'VAL-2')).toHaveLength(2);
  }, 60_000);
  test.each(
    templates.flatMap((template) =>
      [true, false].map((nullRequests) => ({ template, nullRequests })),
    ),
  )(
    'custom demand survives $template, null requests=$nullRequests',
    ({ template, nullRequests }) => {
      const prepared = phasePlan(template);
      const plan = structuredClone(prepared.plan);
      const events = structuredClone(prepared.events);
      plan.mode = 'custom';
      plan.orders[0]!.promise = {
        quantity: 0.123456789,
        due: 4,
        reason: 'Частичное обязательство',
      };
      plan.orders.push({
        id: 'CUSTOM-INDEPENDENT',
        product: 'C',
        quantity: 1e7,
        originalDue: 1,
        priority: 'high',
        promise: null,
      });
      if (nullRequests) plan.requests = null;
      const next = transformed(plan, events, template);
      const report = checked(next, events, false);
      expect(
        report.orders.find((row) => row.orderId === 'CUSTOM-INDEPENDENT')!.originalDeficit,
      ).toBeGreaterThan(0);
      expect(
        report.issues.some(
          (issue) => issue.code === 'ORDER_SHORTFALL' && issue.severity === 'warning',
        ),
      ).toBe(true);
      expect(next.orders).toEqual(plan.orders);
      expect(next.mode).toBe('custom');
    },
    60_000,
  );
  test('factory lineage uses real approvals, fixed budgets and preserved execution', () => {
    const base = createScenarioPlan();
    const baseline = checked(base);
    let state = unwrap(createWorkflow(base));
    state = step(state, { type: 'send-demand' });
    state = step(state, { type: 'switch-role', role: 'manager' });
    state = step(state, {
      type: 'fix-requests',
      counts: [...base.requests!],
      reasons: [...base.reserveReasons],
    });
    state = agree(state);
    const agreed = structuredClone(revision(state));
    state = step(state, { type: 'apply-failure', machineId: 'GRIND-1' });
    const beforeRepair = revision(state);
    const stopped = checked(beforeRepair.plan, beforeRepair.events, false);
    const transfer = transformed(beforeRepair.plan, beforeRepair.events, 'REPAIR_G1_TO_G3');
    const repaired = checked(transfer, beforeRepair.events);
    sameExecution(stopped, beforeRepair.plan, repaired, transfer, 120);
    sameExecution(baseline, base, repaired, transfer, 120);
    expect(quantity(repaired, 'GRIND-3', 120, 270)).toBeGreaterThan(
      quantity(stopped, 'GRIND-3', 120, 270),
    );
    near(
      repaired.machineIntervals
        .filter((r) => r.machineId === 'GRIND-1' && r.kind === 'repair')
        .reduce((n, r) => n + r.end - r.start, 0),
      150,
    );
    state = step(state, { type: 'edit-plan', plan: transfer });
    state = agree(state);
    const failureAgreement = structuredClone(revision(state));
    state = step(state, { type: 'apply-absence' });
    const beforeNight = revision(state);
    const absent = checked(beforeNight.plan, beforeNight.events, false);
    const night = transformed(beforeNight.plan, beforeNight.events, 'NIGHT_WRAP_STAGGERED');
    const nightReport = checked(night, beforeNight.events);
    sameExecution(absent, beforeNight.plan, nightReport, night, 630);
    sameExecution(repaired, transfer, nightReport, night, 630);
    state = step(state, { type: 'edit-plan', plan: night });
    state = agree(state);
    expect(state.phase).toBe('absence');
    expect(revision(state).events).toEqual(absence);
    expect(state.lockedRequests).toEqual(base.requests);
    for (const version of state.versions) {
      expect(version.plan.requests).toEqual(base.requests);
      expect(version.plan.orders).toEqual(originalOrders());
      uniqueSchedule(version.plan);
    }
    expect(state.versions.find((v) => v.id === agreed.id)).toEqual(agreed);
    expect(state.versions.find((v) => v.id === failureAgreement.id)).toEqual(failureAgreement);
    expect(nightReport.shifts[1]!.available).toBe(base.requests![1] - 2);
    const pastQuota = structuredClone(revision(state).plan);
    const pastRow = nightReport.machineIntervals.find(
      (r) => r.machineId === 'GRIND-4' && r.kind === 'produce' && r.start < 630 && r.quantity > 0,
    )!;
    const permission = pastQuota.campaigns.find((c) => c.id === pastRow.campaignId)!;
    const priorOutput = nightReport.machineIntervals
      .filter((r) => r.campaignId === permission.id && r.kind === 'produce')
      .reduce((n, r) => n + r.rate * Math.max(0, Math.min(630, r.end) - r.start), 0);
    expect(priorOutput).toBeGreaterThan(0);
    const permissionTimes = [permission.start, permission.until];
    permission.quota = priorOutput / 2;
    expect([permission.start, permission.until]).toEqual(permissionTimes);
    const frozen = structuredClone(state);
    const rewritten = transition(deepFreeze(state), { type: 'edit-plan', plan: pastQuota });
    refused(rewritten);
    if (!rewritten.ok)
      expect(rewritten.errors.some((error) => error.code === 'WORKFLOW_GUARD')).toBe(true);
    expect(state).toEqual(frozen);
    const text = exportWorkflow(state);
    expect(exportWorkflow(state)).toBe(text);
    expect((JSON.parse(text) as { evaluation: unknown }).evaluation).toEqual(
      evaluate({ plan: revision(state).plan, events: revision(state).events }),
    );
  }, 90_000);
});

const eventLists: Event[][] = [
  [],
  failure,
  absence,
  [{ kind: 'absence' }],
  [{ kind: 'failure', machineId: 'GRIND-4' }],
  [...failure, ...failure],
  [...absence, { kind: 'absence' }],
  [...absence, ...failure],
];
const guards = templates.flatMap((template) =>
  eventLists
    .filter((events) => {
      const accepted = template.startsWith('VAL2_')
        ? []
        : template === 'REPAIR_G1_TO_G3'
          ? failure
          : absence;
      return JSON.stringify(events) !== JSON.stringify(accepted);
    })
    .map((events) => ({ template, events })),
);

describe('D2 public template refusals are immutable and explained', () => {
  test.each(guards)('$template refuses unsupported event sequence %#', ({ template, events }) => {
    const plan = feasiblePlan();
    const before = structuredClone({ plan, events });
    refused(applyTemplate(deepFreeze(plan), deepFreeze(events), template));
    expect({ plan, events }).toEqual(before);
  });
  test.each(['', 'AUTO_OPTIMIZE', 'VAL2', null, 42])('unsupported template name %j', (name) => {
    const plan = deepFreeze(feasiblePlan());
    const before = structuredClone(plan);
    refused(applyTemplate(plan, [], name as Template));
    expect(plan).toEqual(before);
  });
  test.each([null, {}, { campaigns: [] }])('malformed template plan %j', (input) => {
    const before = structuredClone(input);
    refused(applyTemplate(deepFreeze(input) as unknown as Plan, [], 'VAL2_STAGGERED'));
    expect(input).toEqual(before);
  });
  test('supported failure response needs actual GRIND-1/A work, not just its initial setting', () => {
    const plan = feasiblePlan();
    plan.campaigns.find((campaign) => campaign.machineId === 'GRIND-1')!.machineId = 'GRIND-3';
    const before = structuredClone(plan);
    refused(
      applyTemplate(deepFreeze(plan), deepFreeze(structuredClone(failure)), 'REPAIR_G1_TO_G3'),
    );
    expect(plan).toEqual(before);
  });
});
