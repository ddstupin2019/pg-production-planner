import { describe, expect, test } from 'vitest';
import { compare, evaluate } from '../../src/domain/engine';
import type { Report } from '../../src/domain/engine';
import type { Event, Plan, Result } from '../../src/domain/model';
import { createWorkflow, exportWorkflow, transition } from '../../src/domain/workflow';
import type { Action, Workflow } from '../../src/domain/workflow';
import { deepFreeze, emptyPlan, feasiblePlan, roster, run, unwrap } from '../support/fixture';
import { checkLedger, near, quantity } from '../support/ledger';
import { finiteTree, nearTree } from '../support/execution';

function rejected<T>(result: Result<T>, codes = ['INVALID_INPUT']): void {
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('value');
  if (result.ok) throw new Error('Untrusted input succeeded');
  expect(result.errors.some((issue) => codes.includes(issue.code))).toBe(true);
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}
function projected(plan: Plan): Report {
  const report = unwrap(evaluate({ plan: deepFreeze(plan), events: [] }));
  finiteTree(report);
  return report;
}
function current(state: Workflow) {
  return state.versions.find((v) => v.id === state.currentId)!;
}
function step(state: Workflow, action: Action): Workflow {
  const before = structuredClone(state);
  const next = unwrap(transition(deepFreeze(state), action));
  expect(state).toEqual(before);
  return next;
}
function denied(state: Workflow, action: Action, codes = ['WORKFLOW_GUARD', 'INVALID_INPUT']) {
  const before = structuredClone(state);
  rejected(transition(deepFreeze(state), action), codes);
  expect(state).toEqual(before);
}
function fixed(): Workflow {
  let state = unwrap(createWorkflow(feasiblePlan()));
  state = step(state, { type: 'send-demand' });
  state = step(state, { type: 'switch-role', role: 'manager' });
  return step(state, {
    type: 'fix-requests',
    counts: [40, 40],
    reasons: ['Дневной резерв', 'Ночной резерв'],
  });
}
function acknowledgements(state: Workflow) {
  const row = current(state);
  const report = unwrap(evaluate({ plan: row.plan, events: row.events }));
  return [...new Set(report.issues.filter((i) => i.severity === 'warning').map((i) => i.code))].map(
    (code) => ({ code, reason: 'Исходные риски раскрыты' }),
  );
}

describe('public setup ordering, conflicts and fractional integration', () => {
  test('unsorted sequential setups finish before exact-boundary production successors', () => {
    const p = emptyPlan();
    p.setups = [
      { id: 'ab', machineId: 'PRESS-1', from: 'A', to: 'B', start: 0.125, end: 20.125 },
      { id: 'bc', machineId: 'PRESS-1', from: 'B', to: 'C', start: 25.375, end: 50.375 },
      { id: 'ca', machineId: 'PRESS-1', from: 'C', to: 'A', start: 55.625, end: 85.625 },
    ];
    run(p, 'PRESS-1', 'A', 0, 0.125);
    run(p, 'PRESS-1', 'B', 20.125, 25.375);
    run(p, 'PRESS-1', 'C', 50.375, 55.625);
    run(p, 'PRESS-1', 'A', 85.625, 86.125);
    p.assignments = roster([
      ...p.setups.map((s) => ({ taskId: `setup:${s.id}`, start: s.start, end: s.end, count: 1 })),
      ...p.campaigns.map((c) => ({ taskId: 'run:PRESS', start: c.start, end: c.until, count: 1 })),
    ]);
    const reversed = structuredClone(p);
    reversed.setups.reverse();
    reversed.campaigns.reverse();
    reversed.assignments.reverse();
    const a = projected(p);
    const b = projected(reversed);
    checkLedger(a, p);
    checkLedger(b, reversed);
    nearTree(a.machineIntervals, b.machineIntervals);
    nearTree(a.stockIntervals, b.stockIntervals);
    near(quantity(a, 'PRESS-1'), 0.765 * 11.125);
    expect(a.issues.some((i) => ['SETUP_REQUIRED', 'MACHINE_CONFLICT'].includes(i.code))).toBe(
      false,
    );
    for (const [time, product] of [
      [20.125, 'B'],
      [50.375, 'C'],
      [85.625, 'A'],
    ] as const) {
      expect(
        a.machineIntervals.find(
          (r) => r.machineId === 'PRESS-1' && r.start <= time && r.end > time,
        ),
      ).toMatchObject({ kind: 'produce', product });
    }
    near(quantity(a, 'PRESS-1', 0.125, 20.125), 0);
  });
  test('overlapping setup and maintenance never manufacture during either stop', () => {
    const p = emptyPlan();
    p.jobs = [{ id: 'to', code: 'TO-1', machineId: 'PRESS-1', start: 0, end: 180 }];
    p.setups = [{ id: 'ab', machineId: 'PRESS-1', from: 'A', to: 'B', start: 100, end: 120 }];
    run(p, 'PRESS-1', 'B', 120, 200);
    const result = evaluate({ plan: deepFreeze(p), events: [] });
    if (!result.ok) rejected(result, ['INVALID_INPUT', 'MACHINE_CONFLICT', 'SETUP_REQUIRED']);
    else {
      expect(result.value.feasible).toBe(false);
      expect(
        result.value.issues.some((i) => i.code === 'MACHINE_CONFLICT' && i.severity === 'error'),
      ).toBe(true);
      near(quantity(result.value, 'PRESS-1', 0, 180), 0);
      near(quantity(result.value, 'PRESS-1', 180, 200), 0.765 * 20);
    }
  });
  test('setups inside repair exclude a union, not another twenty minutes', () => {
    const p = emptyPlan();
    run(p, 'REWIND-1', 'A', 0, 120);
    run(p, 'REWIND-2', 'B', 0, 300);
    run(p, 'GRIND-1', 'A', 0, 200);
    run(p, 'GRIND-1', 'B', 220, 300);
    p.setups = [{ id: 'ab', machineId: 'GRIND-1', from: 'A', to: 'B', start: 200, end: 220 }];
    const report = unwrap(
      evaluate({ plan: deepFreeze(p), events: [{ kind: 'failure', machineId: 'GRIND-1' }] }),
    );
    finiteTree(report);
    near(quantity(report, 'GRIND-1', 120, 270), 0);
    near(quantity(report, 'GRIND-1'), 0.68 * (120 + 30));
    expect(
      report.machineIntervals.find((r) => r.machineId === 'GRIND-1' && r.start === 200),
    ).toMatchObject({ kind: 'repair', setupId: 'ab', rate: 0 });
    expect(report.jobs.some((job) => job.code === 'TO-2')).toBe(false);
  });
  test('validation cannot be completed across two setup interruptions', () => {
    const p = feasiblePlan();
    p.setups.push(
      { id: 'ba', machineId: 'GRIND-4', from: 'B', to: 'A', start: 100, end: 120 },
      { id: 'ab', machineId: 'GRIND-4', from: 'A', to: 'B', start: 120, end: 140 },
    );
    const result = evaluate({ plan: deepFreeze(p), events: [] });
    if (!result.ok) rejected(result, ['INVALID_INPUT', 'MACHINE_CONFLICT', 'SETUP_REQUIRED']);
    else {
      expect(result.value.feasible).toBe(false);
      expect(result.value.jobs.find((job) => job.jobId === 'v2a')!.complete).toBe(false);
      near(quantity(result.value, 'GRIND-4', 100, 140), 0);
      expect(result.value.jobs.find((job) => job.jobId === 'v2a')!.creditedMinutes).toBeLessThan(
        180,
      );
    }
  });
  test.each([0.0000003, 0.070000123, 0.1211249])(
    'fractional PACK quota %s creates no material or rounding spill',
    (quota) => {
      const p = emptyPlan();
      run(p, 'WRAP-1', 'A', 629.75, 630.25);
      run(p, 'PACK-1', 'A', 629.75, 630.25, quota);
      const finish = 629.75 + quota / 0.24225;
      p.assignments = roster([
        { taskId: 'run:WRAP', start: 629.75, end: 630.25, count: 1 },
        { taskId: 'run:PACK', start: 629.75, end: finish, count: 2 },
      ]);
      const report = projected(p);
      checkLedger(report, p);
      near(quantity(report, 'WRAP-1'), 0.121125);
      near(quantity(report, 'PACK-1'), quota);
      near(
        report.shifts[3]!.stocks.find((s) => s.product === 'A' && s.before === 'PACK')!.quantity,
        0.121125 - quota,
      );
      near(report.shifts[0]!.packed.A, Math.min(quota, 0.24225 * 0.25));
      expect(report.stockIntervals.every((s) => s.closing >= -1e-6)).toBe(true);
    },
    10_000,
  );
});

describe('public malformed collections and operations, not implementation branch matching', () => {
  const mutations: [string, (p: Plan) => void][] = [
    [
      'null order',
      (p) => {
        (p.orders as unknown[]).push(null);
      },
    ],
    [
      'null campaign',
      (p) => {
        (p.campaigns as unknown[]).push(null);
      },
    ],
    [
      'nonobject setup',
      (p) => {
        (p.setups as unknown[]).push(7);
      },
    ],
    [
      'empty job',
      (p) => {
        (p.jobs as unknown[]).push({});
      },
    ],
    [
      'null assignment',
      (p) => {
        (p.assignments as unknown[]).push(null);
      },
    ],
    [
      'nonarray orders',
      (p) => {
        Object.assign(p, { orders: {} });
      },
    ],
    [
      'nonarray campaigns',
      (p) => {
        Object.assign(p, { campaigns: {} });
      },
    ],
    [
      'nonarray jobs',
      (p) => {
        Object.assign(p, { jobs: 'TO-1' });
      },
    ],
    [
      'invalid forecasts tuple',
      (p) => {
        Object.assign(p, { forecasts: null });
      },
    ],
    [
      'invalid requests tuple',
      (p) => {
        Object.assign(p, { requests: [2, 3, 4] });
      },
    ],
    [
      'unknown campaign product',
      (p) => {
        run(p, 'PRESS-1', 'A', 0, 1);
        Object.assign(p.campaigns[0]!, { product: 'D' });
      },
    ],
    [
      'unknown setup product',
      (p) => {
        (p.setups as unknown[]).push({
          id: 's',
          machineId: 'PRESS-1',
          from: 'D',
          to: 'B',
          start: 0,
          end: 20,
        });
      },
    ],
    [
      'unknown job code',
      (p) => {
        (p.jobs as unknown[]).push({
          id: 'j',
          code: 'VAL-999',
          machineId: 'GRIND-1',
          start: 0,
          end: 180,
        });
      },
    ],
    [
      'null workers',
      (p) => {
        (p.assignments as unknown[]).push({
          taskId: 'run:PRESS',
          start: 0,
          end: 1,
          workerIds: null,
        });
      },
    ],
    [
      'nonstring worker',
      (p) => {
        (p.assignments as unknown[]).push({
          taskId: 'run:PRESS',
          start: 0,
          end: 1,
          workerIds: [null],
        });
      },
    ],
    [
      'nonstring task',
      (p) => {
        (p.assignments as unknown[]).push({ taskId: 42, start: 0, end: 1, workerIds: ['S1-1'] });
      },
    ],
    [
      'infinite assignment',
      (p) => {
        p.assignments.push({ taskId: 'run:PRESS', start: 0, end: Infinity, workerIds: ['S1-1'] });
      },
    ],
    [
      'duplicate job ID',
      (p) => {
        p.jobs = [0, 1].map(() => ({
          id: 'same',
          code: 'TO-1',
          machineId: 'PRESS-1',
          start: 0,
          end: 180,
        }));
      },
    ],
  ];
  test.each(mutations)('%s is refused without mutation or partial data', (_name, change) => {
    const p = emptyPlan();
    change(p);
    const before = structuredClone(p);
    rejected(evaluate({ plan: deepFreeze(p), events: [] }));
    expect(p).toEqual(before);
  });
  test.each([
    null,
    {},
    { kind: 'holiday' },
    { kind: 'failure' },
    { kind: 'failure', machineId: 7 },
  ])('malformed event entry %j', (event) => {
    const input = { plan: emptyPlan(), events: [event] };
    const before = structuredClone(input);
    rejected(evaluate(deepFreeze(input) as unknown as { plan: Plan; events: Event[] }), [
      'INVALID_INPUT',
      'EVENT_ORDER',
      'EVENT_TARGET',
    ]);
    expect(input).toEqual(before);
  });
  test('work on the wrong operation cannot claim mandatory credit', () => {
    const p = emptyPlan();
    p.jobs = [{ id: 'wrong', code: 'TO-1', machineId: 'GRIND-2', start: 0, end: 180 }];
    const result = evaluate({ plan: deepFreeze(p), events: [] });
    if (!result.ok) rejected(result, ['INVALID_INPUT', 'MACHINE_CONFLICT', 'WORK_MISSING']);
    else {
      expect(result.value.feasible).toBe(false);
      const job = result.value.jobs.find((job) => job.jobId === 'wrong')!;
      expect(job.complete).toBe(false);
      near(job.creditedMinutes, 0);
      expect(
        result.value.issues.some(
          (i) =>
            i.severity === 'error' &&
            ['WORK_MISSING', 'MACHINE_CONFLICT', 'INVALID_INPUT'].includes(i.code),
        ),
      ).toBe(true);
    }
  });
  test.each(['left', 'right', 'both'])('compare refuses invalid %s input', (side) => {
    const left = feasiblePlan();
    const right = feasiblePlan();
    if (side !== 'right') left.forecasts[0] = -1;
    if (side !== 'left') right.forecasts[1] = -1;
    const before = structuredClone({ left, right });
    rejected(
      compare({ plan: deepFreeze(left), events: [] }, { plan: deepFreeze(right), events: [] }),
    );
    expect({ left, right }).toEqual(before);
  });
});

describe('workflow public safety edges and D2 JSON export', () => {
  test.each(['custom', 'invalid'])('createWorkflow refuses %s initial data', (kind) => {
    const p = emptyPlan();
    if (kind === 'custom') p.mode = 'custom';
    else Object.assign(p, { campaigns: [null] });
    const before = structuredClone(p);
    rejected(createWorkflow(deepFreeze(p)), ['INVALID_INPUT', 'SOURCE_CHANGED', 'WORKFLOW_GUARD']);
    expect(p).toEqual(before);
  });
  test.each([
    null,
    {},
    { type: 'do-everything' },
    { type: 'switch-role', role: 'observer' },
    { type: 'switch-role', role: 7 },
  ])('unknown action or role %j', (action) => {
    denied(unwrap(createWorkflow(feasiblePlan())), action as Action);
  });
  test('production editing before fixation cannot smuggle in approved requests', () => {
    let state = unwrap(createWorkflow(feasiblePlan()));
    state = step(state, { type: 'send-demand' });
    state = step(state, { type: 'switch-role', role: 'manager' });
    const p = structuredClone(current(state).plan);
    p.requests = [99, 99];
    denied(state, { type: 'edit-plan', plan: p });
    expect(state.lockedRequests).toBe(null);
    expect(current(state).plan.requests).toBe(null);
  });
  test('removing a reserve explanation cannot pass submit even with all warnings acknowledged', () => {
    const state = fixed();
    const plan = structuredClone(current(state).plan);
    plan.reserveReasons[0] = ' ';
    const before = structuredClone(state);
    const edited = transition(deepFreeze(state), { type: 'edit-plan', plan });
    expect(state).toEqual(before);
    if (!edited.ok) rejected(edited, ['INVALID_INPUT', 'WORKFLOW_GUARD']);
    else {
      expect(current(edited.value).plan.reserveReasons[0].trim()).toBe('');
      denied(edited.value, { type: 'submit', acknowledgements: acknowledgements(edited.value) });
    }
  });
  test('a changed quota that rewrites past output is rejected despite identical permission times', () => {
    let state = fixed();
    state = step(state, { type: 'submit', acknowledgements: acknowledgements(state) });
    state = step(state, { type: 'approve' });
    state = step(state, { type: 'switch-role', role: 'planner' });
    state = step(state, { type: 'approve' });
    state = step(state, { type: 'switch-role', role: 'manager' });
    state = step(state, { type: 'apply-failure', machineId: 'GRIND-1' });
    const p = structuredClone(current(state).plan);
    const campaign = p.campaigns.find((c) => c.machineId === 'GRIND-1')!;
    const times = [campaign.start, campaign.until];
    campaign.quota = 1;
    expect([campaign.start, campaign.until]).toEqual(times);
    denied(state, { type: 'edit-plan', plan: p }, ['WORKFLOW_GUARD']);
  });
  const malformed: unknown[] = [
    null,
    false,
    17,
    'данные',
    [],
    {},
    { schemaVersion: 2 },
    { schemaVersion: 1, versions: [] },
    { schemaVersion: 1, currentId: 999, versions: [{ id: 1 }] },
    { schemaVersion: 1, role: 'observer', versions: [] },
    { schemaVersion: 1, phase: 'later', planningMinute: 660 },
    { schemaVersion: 1, currentId: '1', versions: null },
  ];
  test.each(malformed.map((input, index) => ({ input, index })))(
    'malformed finite JSON export $index preserves original diagnostic data',
    ({ input }) => {
      const before = structuredClone(input);
      const text = exportWorkflow(deepFreeze(input) as Workflow);
      expect(exportWorkflow(input as Workflow)).toBe(text);
      expect(input).toEqual(before);
      const parsed = JSON.parse(text) as {
        schemaVersion: number;
        workflow: unknown;
        evaluation: Result<Report>;
      };
      expect(Object.keys(parsed)).toEqual(['schemaVersion', 'workflow', 'evaluation']);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.workflow).toEqual(before);
      rejected(parsed.evaluation);
      finiteTree(parsed);
      expect(text).toBe(JSON.stringify(parsed, null, 2) + '\n');
    },
  );
  test('proper but physically incomplete workflow exports the real infeasible evaluation', () => {
    const state = unwrap(createWorkflow(emptyPlan()));
    const row = current(state);
    const real = evaluate({ plan: row.plan, events: row.events });
    const payload = JSON.parse(exportWorkflow(deepFreeze(state))) as {
      workflow: Workflow;
      evaluation: Result<Report>;
    };
    expect(payload.workflow).toEqual(state);
    expect(payload.evaluation).toEqual(real);
    expect(unwrap(payload.evaluation).feasible).toBe(false);
  });
  test.each(['currentId', 'role', 'phase', 'planningMinute'])(
    'otherwise complete workflow with invalid %s exports original data, not defaults',
    (field) => {
      const input = structuredClone(unwrap(createWorkflow(feasiblePlan())));
      Object.assign(input, {
        [field]: field === 'currentId' ? 999 : field === 'planningMinute' ? 721 : 'unknown',
      });
      const before = structuredClone(input);
      const text = exportWorkflow(deepFreeze(input));
      const payload = JSON.parse(text) as { workflow: unknown; evaluation: Result<Report> };
      expect(payload.workflow).toEqual(before);
      expect(input).toEqual(before);
      rejected(payload.evaluation);
      expect(exportWorkflow(input)).toBe(text);
      expect(text).toBe(JSON.stringify(payload, null, 2) + '\n');
    },
  );
});
