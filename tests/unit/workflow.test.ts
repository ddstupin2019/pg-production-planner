import { describe, expect, test } from 'vitest';
import { evaluate } from '../../src/domain/engine';
import type { Plan } from '../../src/domain/model';
import { createWorkflow, exportWorkflow, transition } from '../../src/domain/workflow';
import type { Action, Revision, Workflow } from '../../src/domain/workflow';
import { deepFreeze, feasiblePlan, originalOrders, reject, run, unwrap } from '../support/fixture';
import { checkLedger, near, prefix, quantity } from '../support/ledger';

function current(state: Workflow): Revision {
  return state.versions.find((v) => v.id === state.currentId)!;
}
function step(state: Workflow, action: Action): Workflow {
  const snapshot = structuredClone(state);
  deepFreeze(state);
  const next = unwrap(transition(state, action));
  expect(state).toEqual(snapshot);
  return next;
}
function denied(state: Workflow, action: Action, code = 'WORKFLOW_GUARD'): void {
  const snapshot = structuredClone(state);
  deepFreeze(state);
  reject(transition(state, action), code);
  expect(state).toEqual(snapshot);
}
function badField(state: Workflow, action: Action): void {
  const snapshot = structuredClone(state);
  const result = transition(deepFreeze(state), action);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.some((e) => ['INVALID_INPUT', 'WORKFLOW_GUARD'].includes(e.code))).toBe(
      true,
    );
  }
  expect(state).toEqual(snapshot);
}
function sent(): Workflow {
  return step(step(unwrap(createWorkflow(feasiblePlan())), { type: 'send-demand' }), {
    type: 'switch-role',
    role: 'manager',
  });
}
function fixed(): Workflow {
  return step(sent(), {
    type: 'fix-requests',
    counts: [40, 40],
    reasons: ['Резерв на события', 'Ночной резерв'],
  });
}
function submit(state: Workflow): Workflow {
  const revision = current(state);
  const report = unwrap(evaluate({ plan: revision.plan, events: revision.events }));
  expect(report.feasible).toBe(true);
  checkLedger(report, revision.plan, revision.events);
  return step(state, {
    type: 'submit',
    acknowledgements: [
      ...new Set(report.issues.filter((i) => i.severity === 'warning').map((i) => i.code)),
    ].map((code) => ({ code, reason: 'Дефицит раскрыт, обязательства сохраняются' })),
  });
}
function agree(state: Workflow): Workflow {
  let s = submit(state);
  s = step(s, { type: 'approve' });
  expect(current(s).status).toBe('pending');
  s = step(s, { type: 'switch-role', role: s.role === 'planner' ? 'manager' : 'planner' });
  s = step(s, { type: 'approve' });
  expect(current(s).status).toBe('agreed');
  return step(s, { type: 'switch-role', role: 'manager' });
}
function repaired(): { baseline: Workflow; failure: Workflow } {
  const baseline = agree(fixed());
  let failure = step(baseline, { type: 'apply-failure', machineId: 'GRIND-1' });
  const plan = structuredClone(current(failure).plan);
  plan.id = 'transfer';
  // Existing A worker covers transferred GRIND-3 during the precise repair interval.
  run(plan, 'GRIND-3', 'A', 120, 270, 102);
  failure = step(failure, { type: 'edit-plan', plan });
  return { baseline, failure: agree(failure) };
}

describe('initialization, roles, fixed requests and revision approvals', () => {
  test('starts D 11:00, with deep-copied originals and null unapproved requests', () => {
    const p = feasiblePlan();
    const s = unwrap(createWorkflow(deepFreeze(p)));
    expect(s).toMatchObject({
      schemaVersion: 1,
      role: 'planner',
      demandSent: false,
      phase: 'baseline',
      planningMinute: 660,
      lockedRequests: null,
      currentId: 1,
    });
    expect(s.versions).toHaveLength(1);
    expect(current(s)).toMatchObject({
      id: 1,
      parentId: null,
      status: 'draft',
      approvals: [],
      acknowledgements: [],
      events: [],
    });
    expect(current(s).plan.orders).toEqual(originalOrders());
    expect(current(s).plan.requests).toBe(null);
    expect(s.scenarioPlan.requests).toBe(null);
    expect(s.scenarioPlan.orders).toEqual(originalOrders());
    expect(current(s).plan).not.toBe(p);
    expect(s.scenarioPlan).not.toBe(current(s).plan);
    expect(s.scenarioPlan.orders).not.toBe(current(s).plan.orders);
  });
  test('manager cannot edit/send planner demand; planner cannot edit production/fix/apply events', () => {
    const p = unwrap(createWorkflow(feasiblePlan()));
    denied(p, { type: 'edit-plan', plan: feasiblePlan() });
    denied(p, { type: 'fix-requests', counts: [40, 40], reasons: ['x', 'x'] });
    denied(p, { type: 'apply-failure', machineId: 'GRIND-1' });
    denied(p, { type: 'apply-absence' });
    const m = step(p, { type: 'switch-role', role: 'manager' });
    denied(m, { type: 'send-demand' });
    denied(m, { type: 'edit-orders', orders: originalOrders() });
    denied(m, { type: 'fix-requests', counts: [40, 40], reasons: ['x', 'x'] });
    denied(m, { type: 'submit', acknowledgements: [] });
  });
  test.each([720, 719.5])('fixation at minute %s respects strict noon boundary', (minute) => {
    let s = sent();
    s = step(s, { type: 'set-planning-minute', minute });
    if (minute === 720) denied(s, { type: 'fix-requests', counts: [40, 40], reasons: ['x', 'x'] });
    else
      expect(
        step(s, { type: 'fix-requests', counts: [40, 40], reasons: ['x', 'x'] }).lockedRequests,
      ).toEqual([40, 40]);
  });
  test.each([659, 721, NaN, Infinity])('invalid planning clock %s', (minute) => {
    badField(sent(), { type: 'set-planning-minute', minute });
  });
  test('clock is monotone and a fixed request cannot be replaced or increased', () => {
    const s = step(fixed(), { type: 'set-planning-minute', minute: 700 });
    denied(s, { type: 'set-planning-minute', minute: 699 });
    denied(s, { type: 'fix-requests', counts: [41, 40], reasons: ['x', 'x'] });
    denied(s, { type: 'fix-requests', counts: [39, 40], reasons: ['x', 'x'] });
    const p = structuredClone(current(s).plan);
    p.requests = [41, 40];
    denied(s, { type: 'edit-plan', plan: p });
    const forecast = structuredClone(current(s).plan);
    forecast.forecasts = [41, 42];
    expect(current(step(s, { type: 'edit-plan', plan: forecast })).plan.forecasts).toEqual([
      41, 42,
    ]);
  });
  test.each(
    (
      [
        [1, 40],
        [40, -1],
        [2.5, 40],
        [NaN, 40],
      ] as [number, number][]
    ).map((counts) => ({ counts })),
  )('bad request %j', ({ counts }) => {
    badField(sent(), { type: 'fix-requests', counts, reasons: ['x', 'x'] });
  });
  test('reserve reason is required when supply exceeds actual task demand', () => {
    denied(sent(), { type: 'fix-requests', counts: [40, 40], reasons: [' ', 'x'] });
  });
  test('warnings need reasons; missing maintenance cannot be acknowledged into feasibility', () => {
    const s = fixed();
    denied(s, { type: 'submit', acknowledgements: [] });
    denied(s, { type: 'submit', acknowledgements: [{ code: 'ORDER_SHORTFALL', reason: ' ' }] });
    const p = structuredClone(current(s).plan);
    p.jobs = p.jobs.filter((j) => j.id !== 'to1');
    const invalid = step(s, { type: 'edit-plan', plan: p });
    const result = transition(invalid, {
      type: 'submit',
      acknowledgements: [
        { code: 'WORK_MISSING', reason: 'Cannot waive physics' },
        { code: 'ORDER_SHORTFALL', reason: 'x' },
        { code: 'QUOTA_SHORTFALL', reason: 'x' },
      ],
    });
    expect(result.ok).toBe(false);
    expect(current(invalid).status).toBe('draft');
  });
  test('both distinct approvals on same unchanged revision; editing pending invalidates them', () => {
    let s = step(submit(fixed()), { type: 'approve' });
    const pending = structuredClone(current(s));
    denied(s, { type: 'approve' });
    s = step(s, { type: 'switch-role', role: 'planner' });
    expect(current(s).approvals).toEqual(['manager']);
    s = step(s, { type: 'switch-role', role: 'manager' });
    const p = structuredClone(current(s).plan);
    p.forecasts = [41, 40];
    s = step(s, { type: 'edit-plan', plan: p });
    expect(current(s)).toMatchObject({
      id: pending.id + 1,
      parentId: pending.id,
      status: 'draft',
      approvals: [],
    });
    expect(s.versions.find((v) => v.id === pending.id)).toEqual(pending);
    denied(s, { type: 'approve' });
    s = agree(s);
    expect(current(s).approvals.slice().sort()).toEqual(['manager', 'planner']);
  });
  test('agreed predecessor stays byte-for-byte unchanged after ordinary future editing', () => {
    const agreed = agree(fixed());
    const old = JSON.stringify(current(agreed));
    const p = structuredClone(current(agreed).plan);
    p.forecasts = [42, 40];
    const next = step(agreed, { type: 'edit-plan', plan: p });
    expect(JSON.stringify(next.versions.find((v) => v.id === agreed.currentId))).toBe(old);
    expect(current(next).parentId).toBe(agreed.currentId);
    expect(current(next).status).toBe('draft');
  });
});

describe('selected GRIND-1 repair followed by absence, never mocked evaluation', () => {
  test('both real agreements, exact loss, supported operator transfer, stock carry and frozen history', () => {
    const { baseline, failure } = repaired();
    const b = current(baseline);
    const f = current(failure);
    expect(failure.phase).toBe('failure');
    expect(f.events).toEqual([{ kind: 'failure', machineId: 'GRIND-1' }]);
    expect(f.parentId).toBe(b.id);
    expect(failure.versions.find((v) => v.id === b.id)).toEqual(b);
    const before = unwrap(evaluate({ plan: b.plan, events: b.events }));
    const after = unwrap(evaluate({ plan: f.plan, events: f.events }));
    checkLedger(after, f.plan, f.events);
    const producing = before.machineIntervals.filter(
      (m) => m.machineId === 'GRIND-1' && m.kind === 'produce' && m.product === 'A',
    );
    expect(producing.some((m) => m.start < 120 && m.end > 120 && m.rate > 0)).toBe(true);
    near(quantity(before, 'GRIND-1') - quantity(after, 'GRIND-1'), 102);
    near(quantity(after, 'GRIND-3'), 102);
    near(
      after.machineIntervals
        .filter((m) => m.machineId === 'GRIND-1' && m.kind === 'repair')
        .reduce((n, m) => n + m.end - m.start, 0),
      150,
    );
    expect(prefix(after, 120)).toEqual(prefix(before, 120));
    let absence = step(failure, { type: 'apply-absence' });
    expect(absence.phase).toBe('absence');
    expect(current(absence).events).toEqual([...f.events, { kind: 'absence' }]);
    expect(absence.lockedRequests).toEqual([40, 40]);
    const a = unwrap(evaluate({ plan: current(absence).plan, events: current(absence).events }));
    checkLedger(a, current(absence).plan, current(absence).events);
    expect(a.shifts[1]).toMatchObject({ requested: 40, available: 38 });
    expect(prefix(a, 630)).toEqual(prefix(after, 630));
    absence = agree(absence);
    expect(current(absence).status).toBe('agreed');
    expect(absence.versions.find((v) => v.id === failure.currentId)).toEqual(f);
    denied(absence, { type: 'apply-absence' });
    denied(absence, { type: 'apply-failure', machineId: 'GRIND-1' });
  });
  test('event order, agreement gates and duplicates leave lineage untouched', () => {
    const s = fixed();
    denied(s, { type: 'apply-absence' });
    denied(s, { type: 'apply-failure', machineId: 'GRIND-1' });
    const failure = step(agree(s), { type: 'apply-failure', machineId: 'GRIND-1' });
    denied(failure, { type: 'apply-absence' });
    denied(failure, { type: 'apply-failure', machineId: 'GRIND-1' });
  });
  test('past campaign, job, setup or assignment edits cannot rewrite the frozen prefix', () => {
    const { failure } = repaired();
    const variants: ((p: Plan) => void)[] = [
      (p) => {
        p.campaigns.find((c) => c.machineId === 'GRIND-1')!.start = 1;
      },
      (p) => {
        p.jobs.find((j) => j.id === 'to4')!.start = 1;
        p.jobs.find((j) => j.id === 'to4')!.end = 241;
      },
      (p) => {
        p.setups.push({ id: 'past', machineId: 'PRESS-2', from: 'A', to: 'B', start: 0, end: 20 });
      },
      (p) => {
        p.assignments[0]!.workerIds = ['S1-39', 'S1-40'];
      },
    ];
    for (const change of variants) {
      const p = structuredClone(current(failure).plan);
      change(p);
      denied(failure, { type: 'edit-plan', plan: p });
    }
    const absence = step(failure, { type: 'apply-absence' });
    const p = structuredClone(current(absence).plan);
    p.campaigns.find((c) => c.machineId === 'GRIND-5')!.until = 419;
    denied(absence, { type: 'edit-plan', plan: p });
  });
  test('splitting a campaign exactly at the frozen cut is a legal future-only edit', () => {
    const { failure } = repaired();
    const p = structuredClone(current(failure).plan);
    const campaign = p.campaigns.find((c) => c.machineId === 'GRIND-1')!;
    const until = campaign.until;
    campaign.until = 120;
    run(p, 'GRIND-1', 'A', 120, until);
    const next = step(failure, { type: 'edit-plan', plan: p });
    const old = current(failure);
    const revision = current(next);
    const before = unwrap(evaluate({ plan: old.plan, events: old.events }));
    const after = unwrap(evaluate({ plan: revision.plan, events: revision.events }));
    expect(after.feasible).toBe(true);
    checkLedger(after, revision.plan, revision.events);
    expect(prefix(after, 120)).toEqual(prefix(before, 120));
  });
  test('absence removes exactly the two highest S2 identities, never silently adds workers', () => {
    const { failure } = repaired();
    const absence = step(failure, { type: 'apply-absence' });
    const p = structuredClone(current(absence).plan);
    const assignment = p.assignments.find((a) => a.taskId === 'setup:s-press-c')!;
    assignment.workerIds = ['S2-40'];
    const result = transition(absence, { type: 'edit-plan', plan: p });
    if (result.ok) {
      const r = unwrap(
        evaluate({ plan: current(result.value).plan, events: current(result.value).events }),
      );
      expect(r.feasible).toBe(false);
      denied(result.value, { type: 'submit', acknowledgements: [] });
    } else
      expect(
        result.errors.some((e) => ['STAFF_ASSIGNMENT', 'WORKFLOW_GUARD'].includes(e.code)),
      ).toBe(true);
    expect(absence.lockedRequests).toEqual([40, 40]);
  });
});

describe('D1 guards are specific, ordered and half-open', () => {
  test.each(['GRIND-2', 'GRIND-4', 'PRESS-1', 'UNKNOWN'])(
    'unsupported target %s gets no successor',
    (machineId) => {
      denied(sent(), { type: 'apply-failure', machineId }, 'UNSUPPORTED_FAILURE_TARGET');
    },
  );
  test('conflicting validation draft gets actionable refs/interval before not-agreed guard', () => {
    const p = feasiblePlan();
    p.jobs.push({ id: 'conflict', code: 'VAL-2', machineId: 'GRIND-1', start: 120, end: 300 });
    const s = step(step(unwrap(createWorkflow(p)), { type: 'send-demand' }), {
      type: 'switch-role',
      role: 'manager',
    });
    const snapshot = structuredClone(s);
    const result = transition(deepFreeze(s), { type: 'apply-failure', machineId: 'GRIND-1' });
    reject(result, 'UNSUPPORTED_FAILURE_VALIDATION');
    if (!result.ok) {
      const error = result.errors.find((e) => e.code === 'UNSUPPORTED_FAILURE_VALIDATION')!;
      expect(error.refs).toEqual(expect.arrayContaining(['GRIND-1', 'conflict']));
      expect(error.start).toBe(120);
      expect(error.end).toBe(270);
      expect(error.message.trim().length).toBeGreaterThan(20);
    }
    expect(s).toEqual(snapshot);
  });
  test.each([
    [0, 120],
    [270, 450],
    [270 - 0.0000005, 450],
  ])('boundary [%s,%s) is not a positive epsilon overlap', (start, end) => {
    const p = feasiblePlan();
    p.jobs.push({ id: 'edge', code: 'VAL-2', machineId: 'GRIND-1', start, end });
    const s = step(unwrap(createWorkflow(p)), { type: 'switch-role', role: 'manager' });
    denied(s, { type: 'apply-failure', machineId: 'GRIND-1' }); // draft guard, not unsupported-validation
  });
  test('positive overlap above epsilon is rejected after failure edits too', () => {
    const { failure } = repaired();
    const p = structuredClone(current(failure).plan);
    p.jobs.push({
      id: 'new-conflict',
      code: 'VAL-2',
      machineId: 'GRIND-1',
      start: 270 - 0.000002,
      end: 450,
    });
    denied(failure, { type: 'edit-plan', plan: p }, 'UNSUPPORTED_FAILURE_VALIDATION');
  });
  test('eligible agreement with no production at t=120 rejects EVENT_TARGET', () => {
    const p = feasiblePlan();
    p.campaigns.find((c) => c.machineId === 'GRIND-1')!.machineId = 'GRIND-3';
    // Identical A supply and pooled task counts, but the supported target is idle.
    let s = unwrap(createWorkflow(p));
    s = step(s, { type: 'send-demand' });
    s = step(s, { type: 'switch-role', role: 'manager' });
    s = step(s, { type: 'fix-requests', counts: [40, 40], reasons: ['x', 'x'] });
    s = agree(s);
    denied(s, { type: 'apply-failure', machineId: 'GRIND-1' }, 'EVENT_TARGET');
  });
  test.each(['starts', 'ends'])('target %s at repair cut lacks one side', (edge) => {
    const p = feasiblePlan();
    const campaign = p.campaigns.find((c) => c.machineId === 'GRIND-1')!;
    if (edge === 'starts') {
      campaign.start = 120;
      run(p, 'GRIND-3', 'A', 0, 120);
    } else {
      campaign.until = 120;
      run(p, 'GRIND-3', 'A', 120, 280);
    }
    let s = unwrap(createWorkflow(p));
    s = step(s, { type: 'send-demand' });
    s = step(s, { type: 'switch-role', role: 'manager' });
    s = step(s, { type: 'fix-requests', counts: [40, 40], reasons: ['x', 'x'] });
    denied(agree(s), { type: 'apply-failure', machineId: 'GRIND-1' }, 'EVENT_TARGET');
  });
});

describe('custom copies, promises, restore and exact deterministic export', () => {
  test('promise-only edit retains mandatory originals; changing original quantity in-line is forbidden', () => {
    let s = unwrap(createWorkflow(feasiblePlan()));
    const orders = originalOrders();
    orders[0]!.promise = { quantity: 100, due: 4, reason: 'Открытый перенос' };
    s = step(s, { type: 'edit-orders', orders });
    expect(current(s).plan.mode).toBe('required');
    const changed = structuredClone(orders);
    changed[0]!.quantity = 100;
    denied(s, { type: 'edit-orders', orders: changed });
  });
  test('custom order new identity persists original submission; manager cannot replace demand', () => {
    let s = unwrap(createWorkflow(feasiblePlan()));
    const orders = originalOrders();
    orders.push({
      id: 'CUSTOM-1',
      product: 'A',
      quantity: 2,
      originalDue: 2,
      priority: 'low',
      promise: null,
    });
    s = step(s, { type: 'edit-orders', orders });
    expect(current(s).plan.mode).toBe('custom');
    s = step(s, { type: 'send-demand' });
    const changed = structuredClone(current(s).plan.orders);
    changed.at(-1)!.quantity = 3;
    denied(s, { type: 'edit-orders', orders: changed });
    s = step(s, { type: 'switch-role', role: 'manager' });
    const plan = structuredClone(current(s).plan);
    plan.orders.pop();
    denied(s, { type: 'edit-plan', plan });
    s = step(s, { type: 'switch-role', role: 'planner' });
    const promise = structuredClone(current(s).plan.orders);
    promise.at(-1)!.promise = { quantity: 1, due: 3, reason: 'Частичная поставка' };
    s = step(s, { type: 'edit-orders', orders: promise });
    expect(s.demandSent).toBe(false);
    expect(s.scenarioPlan.orders).toEqual(originalOrders());
    const restored = step(s, { type: 'restore-scenario' });
    expect(restored).toEqual(unwrap(createWorkflow(feasiblePlan())));
  });
  test('restoration from agreed absence clears events, history, requests and promises for either role', () => {
    const { failure } = repaired();
    const s = agree(step(failure, { type: 'apply-absence' }));
    for (const role of ['planner', 'manager'] as const) {
      const restored = step(step(s, { type: 'switch-role', role }), { type: 'restore-scenario' });
      expect(restored).toEqual(unwrap(createWorkflow(feasiblePlan())));
    }
  });
  test('UTF-8 JSON shape/order, current real report, two spaces, newline and identical bytes', () => {
    const { failure } = repaired();
    const snapshot = structuredClone(failure);
    deepFreeze(failure);
    const text = exportWorkflow(failure);
    const revision = current(failure);
    const expected = {
      schemaVersion: 1,
      workflow: failure,
      evaluation: evaluate({ plan: revision.plan, events: revision.events }),
    };
    expect(text).toBe(JSON.stringify(expected, null, 2) + '\n');
    expect(exportWorkflow(failure)).toBe(text);
    expect(failure).toEqual(snapshot);
    expect(Object.keys(JSON.parse(text) as object)).toEqual([
      'schemaVersion',
      'workflow',
      'evaluation',
    ]);
    expect(text).not.toMatch(/timestamp|Date\(|NaN|Infinity/);
  });
});
