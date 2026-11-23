import { expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Event, Plan, Result } from '../../src/domain/model';
import { applyTemplate, createScenarioPlan } from '../../src/domain/scenario';
import { deepFreeze, emptyPlan, feasiblePlan, run, unwrap } from '../support/fixture';
import { finiteTree, sameExecution, uniqueSchedule } from '../support/execution';
import { checkLedger, near, quantity } from '../support/ledger';

type Template = Parameters<typeof applyTemplate>[2];
function explained<T>(result: Result<T>): void {
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Unsupported template unexpectedly succeeded');
  expect(result.errors.length).toBeGreaterThan(0);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.code.trim().length).toBeGreaterThan(0);
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}

function transform(plan: Plan, events: Event[], template: Template): Result<Plan> {
  const before = structuredClone({ plan, events });
  const result = applyTemplate(deepFreeze(plan), deepFreeze(events), template);
  expect({ plan, events }).toEqual(before);
  if (!result.ok) explained(result);
  else {
    finiteTree(result.value);
    uniqueSchedule(result.value);
    expect(result.value.orders).toEqual(plan.orders);
    expect(result.value.mode).toBe(plan.mode);
    expect(result.value.requests).toEqual(plan.requests);
    expect(result.value.campaigns.every((campaign) => campaign.quota > 0)).toBe(true);
  }
  return result;
}

test.each(
  (['VAL2_STAGGERED', 'VAL2_PARALLEL'] as const).flatMap((template) =>
    ['GRIND-2', 'GRIND-3'].map((machineId) => ({ template, machineId })),
  ),
)(
  '$template corrects external VAL-2 on $machineId to the bounded pair or explains refusal',
  ({ template, machineId }) => {
    const plan = feasiblePlan();
    plan.jobs.find((job) => job.id === 'v2a')!.machineId = machineId;
    const events: Event[] = [];
    const result = transform(plan, events, template);
    if (result.ok) {
      const next = result.value;
      const jobs = next.jobs
        .filter((job) => job.code === 'VAL-2')
        .sort((a, b) => a.machineId.localeCompare(b.machineId));
      expect(jobs.map((job) => [job.machineId, job.start, job.end])).toEqual(
        template === 'VAL2_PARALLEL'
          ? [
              ['GRIND-4', 240, 420],
              ['GRIND-5', 240, 420],
            ]
          : [
              ['GRIND-4', 0, 180],
              ['GRIND-5', 240, 420],
            ],
      );
      for (const key of ['campaigns', 'setups'] as const) {
        const unrelated = (p: Plan) =>
          p[key]
            .filter((row) => !['GRIND-4', 'GRIND-5'].includes(row.machineId))
            .sort((a, b) => a.id.localeCompare(b.id));
        expect(unrelated(next)).toEqual(unrelated(plan));
      }
      const unrelatedJobs = (p: Plan) =>
        p.jobs.filter((job) => job.code !== 'VAL-2').sort((a, b) => a.id.localeCompare(b.id));
      expect(unrelatedJobs(next)).toEqual(unrelatedJobs(plan));
      expect(next.forecasts).toEqual(plan.forecasts);
      expect(next.reserveReasons).toEqual(plan.reserveReasons);
      // Later shifts' nonpooled work is unrelated; contemporaneous/pool allocation may change.
      const laterAssignments = (p: Plan) =>
        p.assignments
          .filter((assignment) => assignment.start >= 630 && !assignment.taskId.startsWith('run:'))
          .map((assignment) => JSON.stringify(assignment))
          .sort();
      expect(laterAssignments(next)).toEqual(laterAssignments(plan));
      const report = unwrap(evaluate({ plan: deepFreeze(next), events }));
      finiteTree(report);
      checkLedger(report, next, events);
    }
  },
);

test.each([0.51, 0.68, 1.02])(
  'repair transfer handles several distinct small quotas around t=120, crossing quota=%s',
  (crossingQuota) => {
    const plan = emptyPlan();
    run(plan, 'REWIND-1', 'A', 0, 60, 20);
    for (const [start, until, quota] of [
      [0, 50, 1.36],
      [110, 119.5, 0.68],
      [119.5, 121.5, crossingQuota],
      [121.5, 150, 0.34],
      [180, 260, 0.51],
      [270, 300, 0.85],
    ] as const)
      run(plan, 'GRIND-1', 'A', start, until, quota);
    const events: Event[] = [{ kind: 'failure', machineId: 'GRIND-1' }];
    const before = unwrap(evaluate(deepFreeze({ plan, events })));
    checkLedger(before, plan, events);
    // Initial input supplies 20; these permissions consume only 2.38 before the failure.
    near(quantity(before, 'GRIND-1', 0, 120), 1.36 + 0.68 + 0.68 * 0.5);
    const result = transform(plan, events, 'REPAIR_G1_TO_G3');
    if (result.ok) {
      const after = unwrap(evaluate({ plan: deepFreeze(result.value), events }));
      checkLedger(after, result.value, events);
      sameExecution(before, plan, after, result.value, 120);
    }
  },
);

function exoticPlan(night: boolean): Plan {
  const plan = emptyPlan();
  run(plan, 'REWIND-1', 'A', 0, 90, 191.25);
  run(plan, 'GRIND-1', 'A', 0, 280, 190.4);
  plan.setups = [
    { id: 'external-press-b', machineId: 'PRESS-1', from: 'A', to: 'B', start: 70, end: 90 },
    { id: 'external-grind-b', machineId: 'GRIND-3', from: 'A', to: 'B', start: 50, end: 70 },
  ];
  run(plan, 'PRESS-1', 'B', 90, 300, 160.65);
  plan.assignments = [
    { taskId: 'run:REWIND', start: 0, end: 90, workerIds: ['S1-17'] },
    { taskId: 'run:GRIND', start: 0, end: 120, workerIds: ['S1-18'] },
    { taskId: 'run:GRIND', start: 270, end: 280, workerIds: ['S1-18'] },
    { taskId: 'run:PRESS', start: 90, end: 300, workerIds: ['S1-19'] },
    { taskId: 'setup:external-press-b', start: 70, end: 90, workerIds: ['S1-20'] },
    { taskId: 'setup:external-grind-b', start: 50, end: 70, workerIds: ['S1-20'] },
  ];
  if (night) {
    plan.setups.push(
      { id: 'external-wrap-b', machineId: 'WRAP-1', from: 'A', to: 'B', start: 500, end: 520 },
      { id: 'external-wrap14-b', machineId: 'WRAP-14', from: 'B', to: 'A', start: 500, end: 520 },
    );
    run(plan, 'WRAP-1', 'B', 520, 700, 43.605);
    run(plan, 'WRAP-14', 'A', 520, 750, 55.7175);
    plan.assignments.push(
      { taskId: 'setup:external-wrap-b', start: 500, end: 520, workerIds: ['S1-21'] },
      { taskId: 'setup:external-wrap14-b', start: 500, end: 520, workerIds: ['S1-22'] },
      { taskId: 'run:WRAP', start: 520, end: 630, workerIds: ['S1-23'] },
      { taskId: 'run:WRAP', start: 630, end: 750, workerIds: ['S2-1'] },
    );
  }
  return plan;
}

test.each(['REPAIR_G1_TO_G3', 'NIGHT_WRAP_STAGGERED'] as const)(
  '%s may refuse an exotic external plan but cannot rewrite its frozen state',
  (template) => {
    const night = template === 'NIGHT_WRAP_STAGGERED';
    const plan = exoticPlan(night);
    const events: Event[] = [{ kind: 'failure', machineId: 'GRIND-1' }];
    if (night) events.push({ kind: 'absence' });
    const cut = night ? 630 : 120;
    const before = unwrap(evaluate(deepFreeze({ plan, events })));
    checkLedger(before, plan, events);
    expect(
      before.machineIntervals.some(
        (row) => row.machineId === 'GRIND-3' && row.product === 'B' && row.start < cut,
      ),
    ).toBe(true);
    expect(
      before.stockIntervals.some(
        (row) => row.start < cut && row.closing > 0 && row.before !== 'REWIND',
      ),
    ).toBe(true);
    expect(
      before.staffIntervals.some(
        (row) => row.start < cut && row.tasks.some((task) => task.workerIds.includes('S1-17')),
      ),
    ).toBe(true);
    const result = transform(plan, events, template);
    if (result.ok) {
      const after = unwrap(evaluate({ plan: deepFreeze(result.value), events }));
      checkLedger(after, result.value, events);
      sameExecution(before, plan, after, result.value, cut);
    }
  },
);

test.each(['VAL2_STAGGERED', 'VAL2_PARALLEL'] as const)(
  '%s preserves unrelated later setup/validation assignments, not pooled run allocation',
  (template) => {
    const plan = createScenarioPlan();
    const unaffected = new Set([
      ...plan.jobs
        .filter((job) => job.code.startsWith('VAL-') && job.code !== 'VAL-2' && job.start >= 630)
        .map((job) => `validate:${job.id}`),
      ...plan.setups
        .filter((setup) => !['GRIND-4', 'GRIND-5'].includes(setup.machineId) && setup.start >= 630)
        .map((setup) => `setup:${setup.id}`),
    ]);
    const view = (p: Plan) =>
      p.assignments
        .filter((assignment) => unaffected.has(assignment.taskId))
        .map((assignment) => JSON.stringify(assignment))
        .sort();
    const original = view(plan);
    expect(original.length).toBeGreaterThan(0);
    const next = unwrap(transform(plan, [], template));
    expect(view(next)).toEqual(original);
  },
);
