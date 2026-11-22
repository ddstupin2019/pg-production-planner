import { describe, expect, test } from 'vitest';
import { compare, evaluate } from '../../src/domain/engine';
import type { Event, Plan, Product } from '../../src/domain/model';
import {
  deepFreeze,
  emptyPlan,
  feasiblePlan,
  reject,
  roster,
  run,
  unwrap,
} from '../support/fixture';
import { checkLedger, near, quantity } from '../support/ledger';

function report(plan: Plan, events: Event[] = []) {
  return unwrap(evaluate({ plan, events }));
}
function issue(plan: Plan, code: string) {
  const r = report(plan);
  expect(r.feasible).toBe(false);
  expect(r.issues).toEqual(
    expect.arrayContaining([expect.objectContaining({ code, severity: 'error' })]),
  );
  return r;
}

describe('small independent physically feasible witness', () => {
  test.each([false, true])('all mandatory work and real identities; parallel=%s', (parallel) => {
    const plan = deepFreeze(feasiblePlan(parallel));
    const before = JSON.stringify(plan);
    const r = report(plan);
    expect(r.feasible).toBe(true);
    checkLedger(r, plan);
    expect(JSON.stringify(plan)).toBe(before);
    expect(r.issues.some((i) => i.code === 'ORDER_SHORTFALL' && i.severity === 'warning')).toBe(
      true,
    );
    expect(r.jobs).toHaveLength(12);
    for (const job of plan.jobs) {
      expect(r.jobs.find((j) => j.jobId === job.id)).toMatchObject({
        complete: true,
        creditedMinutes: job.end - job.start,
      });
    }
    near(quantity(r, 'GRIND-1'), 190.4);
    near(quantity(r, 'GRIND-4'), 122.4);
    near(quantity(r, 'GRIND-5'), 122.4);
    near(quantity(r, 'LASER-1'), 183.6); // .765 * 240, not 1.275 * 240
    near(quantity(r, 'WRAP-1'), 43.605);
    near(quantity(r, 'PACK-1'), 130.815);
    expect(r.shifts.map((s) => s.peak)).toEqual([parallel ? 11 : 13, 2, 10, 0]);
    expect(r.shifts.map((s) => s.laborMinutes)).toEqual([3970, 55, 2040, 0]);
    near(r.shifts[0]!.reserveMinutes, 21230);
    near(r.orders.find((o) => o.orderId === 'ORD-1')!.originalDeficit, 1400);
    near(r.orders.find((o) => o.orderId === 'ORD-1')!.allocatedByShift[2], 130.815);
    near(
      r.shifts[2]!.stocks.find((s) => s.product === 'A' && s.before === 'WRAP')!.quantity,
      169.185,
    );
    expect(
      r.shifts[2]!.stocks.some(
        (s) => !['REWIND', 'WASH', 'WRAP'].includes(s.before) && s.quantity > 0,
      ),
    ).toBe(true);
    expect(report(plan)).toEqual(r);
  });
  test('comparison evaluates both and uses right minus left without choosing a winner', () => {
    const left = feasiblePlan();
    const right = feasiblePlan(true);
    right.id = 'parallel';
    const result = unwrap(compare({ plan: left, events: [] }, { plan: right, events: [] }));
    expect(result.left).toEqual(report(left));
    expect(result.right).toEqual(report(right));
    checkLedger(result.left, left);
    checkLedger(result.right, right);
    near(result.delta.packed.A, 0);
    near(result.delta.packed.B, 0);
    near(result.delta.packed.C, 0);
    near(result.delta.originalDeficit, 0);
    expect(result.delta.peak).toEqual([-2, 0, 0, 0]);
    near(result.delta.laborMinutes, 0);
  });
  test('draft availability derives maximum suffix, fixed versus forecast remains distinct', () => {
    const p = feasiblePlan();
    p.requests = null;
    const r = report(p);
    expect(r.feasible).toBe(true);
    checkLedger(r, p);
    expect(r.shifts.map((s) => s.requested)).toEqual([null, null, null, null]);
    expect(r.shifts.map((s) => s.available)).toEqual([13, 2, 40, 40]);
    expect(r.shifts[0]!.peakSpans).toEqual([{ start: 0, end: 90 }]);
  });
});

describe('operation-level flow, once-only losses, numeric sharing and quota boundaries', () => {
  test.each(['A', 'B', 'C'] as Product[])('complete %s route without shortcuts', (product) => {
    const p = emptyPlan();
    const machines =
      product === 'B'
        ? 'PRESS-4 THERMAL-3 PRINT-2 REWIND-2 GRIND-4 WASH-1 TEF-1 LUBE-1 WRAP-11 PACK-3'
        : product === 'C'
          ? 'PRESS-5 THERMAL-2 LASER-1 REWIND-1 GRIND-1 WASH-1 CHROME-1 TEF-1 LUBE-1 WRAP-1 PACK-1'
          : 'PRESS-1 THERMAL-1 PRINT-1 REWIND-1 GRIND-1 WASH-1 CHROME-1 TEF-1 LUBE-1 WRAP-1 PACK-1';
    for (const id of machines.split(' ')) {
      const initial =
        id === 'LASER-1'
          ? 'C'
          : /^(PRESS-4|PRESS-5|THERMAL-3|PRINT-2|REWIND-2|GRIND-4|WRAP-11|PACK-3)$/.test(id)
            ? 'B'
            : 'A';
      if (initial !== product) {
        const duration = initial === 'B' ? 25 : product === 'C' ? 30 : 20;
        p.setups.push({
          id: `s-${id}`,
          machineId: id,
          from: initial,
          to: product,
          start: 30 - duration,
          end: 30,
        });
      }
      run(p, id, product, 30, 40);
    }
    const r = report(p);
    checkLedger(r, p);
    const rates =
      product === 'C'
        ? [0.765, 0.765, 0.765, 2.125, 0.68, 0.68, 0.68, 0.68, 0.68, 0.24225, 0.24225]
        : product === 'B'
          ? [0.765, 0.765, 0.765, 2.125, 0.68, 6.528, 2.87725, 2.87725, 0.24225, 0.24225]
          : [0.765, 0.765, 0.765, 2.125, 0.68, 6.528, 2.278, 2.278, 2.278, 0.24225, 0.24225];
    machines.split(' ').forEach((id, index) => near(quantity(r, id), rates[index]! * 10, id));
    if (product === 'A') {
      near(
        r.shifts[0]!.stocks.find((s) => s.product === 'A' && s.before === 'GRIND')!.quantity,
        14.45,
      );
      near(
        r.shifts[0]!.stocks.find((s) => s.product === 'A' && s.before === 'CHROME')!.quantity,
        42.5,
      );
      near(
        r.shifts[0]!.stocks.find((s) => s.product === 'A' && s.before === 'WRAP')!.quantity,
        320.3575,
      );
    }
  });
  test('zero-buffer route applies .85 once, and excludes nonexistent route queues', () => {
    const p = emptyPlan();
    for (const m of ['PRESS-4', 'THERMAL-3', 'PRINT-2']) run(p, m, 'B', 0, 10);
    const r = report(p);
    checkLedger(r, p);
    for (const m of ['PRESS-4', 'THERMAL-3', 'PRINT-2']) near(quantity(r, m), 7.65);
    expect(r.stockIntervals.some((s) => s.product === 'B' && s.before === 'CHROME')).toBe(false);
    expect(r.stockIntervals.some((s) => s.product === 'C' && s.before === 'PRINT')).toBe(false);
    near(
      r.shifts[0]!.stocks.find((s) => s.product === 'B' && s.before === 'REWIND')!.quantity,
      107.65,
    );
  });
  test('fractional exhaustion transfers the scarce .25 to the lower numeric machine, then stops', () => {
    const p = emptyPlan();
    run(p, 'WRAP-1', 'A', 0, 1);
    run(p, 'WRAP-2', 'A', 0, 1);
    run(p, 'PACK-1', 'A', 0, 1, 0.25);
    run(p, 'PACK-2', 'A', 0, 1);
    const r = report(p);
    checkLedger(r, p);
    near(quantity(r, 'WRAP-1'), 0.24225);
    near(quantity(r, 'PACK-1'), 0.25);
    near(quantity(r, 'PACK-2'), 0.2345);
    const pack1 = r.machineIntervals.filter(
      (m) => m.machineId === 'PACK-1' && m.kind === 'produce',
    );
    near(pack1.at(-1)!.end, 0.25 / 0.4845);
    near(r.quotas.find((q) => q.campaignId === 'c-PACK-1-0')!.produced, 0.25);
    near(r.quotas.find((q) => q.campaignId === 'c-PACK-1-0')!.remaining, 0);
  });
  test('PACK cannot consume stage stock, and midnight cannot replenish any queue', () => {
    const p = emptyPlan();
    run(p, 'PACK-1', 'A', 0, 2520);
    const r = report(p);
    checkLedger(r, p);
    near(quantity(r, 'PACK-1'), 0);
    expect(
      r.shifts.map((s) => s.stocks.find((q) => q.product === 'A' && q.before === 'WRAP')!.quantity),
    ).toEqual([300, 300, 300, 300]);
    expect(r.issues.some((i) => i.code === 'QUOTA_SHORTFALL' && i.severity === 'warning')).toBe(
      true,
    );
  });
  test('initial stock exhausts exactly once across all four shifts', () => {
    const p = emptyPlan();
    run(p, 'WRAP-1', 'A', 0, 2520);
    const r = report(p);
    checkLedger(r, p);
    near(quantity(r, 'WRAP-1'), 300);
    near(
      r.machineIntervals.filter((m) => m.machineId === 'WRAP-1' && m.kind === 'produce').at(-1)!
        .end,
      300 / 0.24225,
    );
    near(r.shifts[3]!.stocks.find((s) => s.product === 'A' && s.before === 'PACK')!.quantity, 300);
  });
  test.each(['A', 'B', 'C'] as Product[])('queues remain product-specific: %s', (product) => {
    const p = emptyPlan();
    const machine = product === 'A' ? 'WRAP-1' : 'WRAP-11';
    if (product === 'C')
      p.setups.push({ id: 's', machineId: machine, from: 'B', to: 'C', start: 0, end: 25 });
    run(p, machine, product, product === 'C' ? 25 : 0, 100);
    const r = report(p);
    checkLedger(r, p);
    near(quantity(r, machine), product === 'C' ? 0 : 0.24225 * 100);
  });
  test('campaign ends at its finite until, without automatically spilling quota', () => {
    const p = emptyPlan();
    run(p, 'PRESS-1', 'A', 0.125, 1.375, 100);
    const r = report(p);
    near(quantity(r, 'PRESS-1'), 0.95625);
    expect(r.quotas[0]!.remaining).toBeCloseTo(99.04375, 10);
    expect(
      r.machineIntervals
        .filter((m) => m.machineId === 'PRESS-1' && m.start >= 1.375)
        .every((m) => m.kind !== 'produce'),
    ).toBe(true);
  });
});

describe('setups, union of stops, mandatory work and continuous validation', () => {
  test('initial configuration blocks wrong-product output rather than fabricating production', () => {
    const p = emptyPlan();
    run(p, 'PRESS-1', 'B', 0, 60);
    const r = issue(p, 'SETUP_REQUIRED');
    near(quantity(r, 'PRESS-1'), 0);
  });
  test('completed setup changes the product at the half-open boundary; ordinary setup needs no validation', () => {
    const p = emptyPlan();
    p.setups = [{ id: 's', machineId: 'PRESS-1', from: 'A', to: 'B', start: 0, end: 20 }];
    run(p, 'PRESS-1', 'B', 20, 30);
    const r = report(p);
    near(quantity(r, 'PRESS-1'), 7.65);
    expect(
      r.machineIntervals.find((m) => m.machineId === 'PRESS-1' && m.start === 0),
    ).toMatchObject({ kind: 'setup', product: 'A', setupId: 's' });
    expect(r.issues.some((i) => i.code === 'VALIDATION_OUTPUT')).toBe(false);
  });
  test('repair and planned TO remove their union once and only explicit TO is credited', () => {
    const p = emptyPlan();
    run(p, 'REWIND-1', 'A', 0, 500);
    run(p, 'GRIND-1', 'A', 0, 500);
    p.jobs = [{ id: 'to', code: 'TO-2', machineId: 'GRIND-1', start: 200, end: 440 }];
    const r = report(p, [{ kind: 'failure', machineId: 'GRIND-1' }]);
    checkLedger(r, p, [{ kind: 'failure', machineId: 'GRIND-1' }]);
    near(quantity(r, 'GRIND-1'), 0.68 * (120 + 60)); // union [120,440), not 150+240
    expect(r.jobs[0]).toMatchObject({ jobId: 'to', creditedMinutes: 240, complete: true });
    expect(r.issues.some((i) => i.code === 'MACHINE_CONFLICT')).toBe(false);
    const overlap = r.machineIntervals.find((m) => m.machineId === 'GRIND-1' && m.start === 200)!;
    expect(overlap).toMatchObject({ kind: 'repair', jobIds: ['to'], rate: 0 });
    const noTO = structuredClone(p);
    noTO.jobs = [];
    expect(
      report(noTO, [{ kind: 'failure', machineId: 'GRIND-1' }]).issues.some(
        (i) => i.code === 'WORK_MISSING',
      ),
    ).toBe(true);
  });
  test('repair cannot satisfy the only missing mandatory TO-2', () => {
    const p = feasiblePlan();
    p.jobs = p.jobs.filter((j) => j.code !== 'TO-2');
    run(p, 'GRIND-3', 'A', 120, 270, 102);
    const r = report(p, [{ kind: 'failure', machineId: 'GRIND-1' }]);
    expect(r.feasible).toBe(false);
    expect(r.issues.some((i) => i.code === 'WORK_MISSING')).toBe(true);
    expect(r.issues.some((i) => i.code === 'STAFF_ASSIGNMENT')).toBe(false);
    expect(r.jobs.some((j) => j.code === 'TO-2')).toBe(false);
  });
  test.each([
    [
      'missing code',
      (p: Plan) => {
        p.jobs = p.jobs.filter((j) => j.code !== 'TO-1');
      },
      'WORK_MISSING',
    ],
    [
      'insufficient distinct machines',
      (p: Plan) => {
        p.jobs.find((j) => j.id === 'v2b')!.machineId = 'GRIND-4';
      },
      'WORK_MISSING',
    ],
    [
      'wrong duration',
      (p: Plan) => {
        p.jobs.find((j) => j.id === 'to1')!.end--;
      },
      'WORK_DURATION',
    ],
    [
      'outside window',
      (p: Plan) => {
        Object.assign(
          p.jobs.find((j) => j.id === 'to1')!,
          { start: 600, end: 780 },
        );
      },
      'WORK_WINDOW',
    ],
    [
      'early LASER validation',
      (p: Plan) => {
        Object.assign(
          p.jobs.find((j) => j.id === 'v3')!,
          { start: 1020, end: 1260 },
        );
      },
      'WORK_WINDOW',
    ],
    [
      'maintenance during validation',
      (p: Plan) => {
        p.jobs.push({ id: 'stop', code: 'TO-2', machineId: 'GRIND-4', start: 0, end: 240 });
      },
      'MACHINE_CONFLICT',
    ],
  ] as const)('%s is a physical error', (_name, change, code) => {
    const p = feasiblePlan();
    change(p);
    issue(p, code);
  });
  test('no campaign/positive production means no completed validation', () => {
    const p = feasiblePlan();
    p.campaigns = p.campaigns.filter((c) => c.machineId !== 'TEF-1');
    const r = issue(p, 'VALIDATION_OUTPUT');
    expect(r.jobs.find((j) => j.jobId === 'v1')!.complete).toBe(false);
  });
  test('physical evaluator supports another producing GRIND; interrupted validation stays incomplete', () => {
    const p = feasiblePlan();
    const r = report(p, [{ kind: 'failure', machineId: 'GRIND-4' }]);
    expect(r.feasible).toBe(false);
    expect(r.jobs.find((j) => j.jobId === 'v2a')!.complete).toBe(false);
    expect(r.jobs.find((j) => j.jobId === 'v2a')!.creditedMinutes).toBeLessThan(180);
    expect(r.issues.some((i) => i.code === 'VALIDATION_OUTPUT')).toBe(true);
  });
  test('a late starvation fragment cannot be counted as continuous validation', () => {
    const p = feasiblePlan();
    p.campaigns.find((c) => c.machineId === 'GRIND-5')!.quota = 1;
    const r = issue(p, 'VALIDATION_OUTPUT');
    expect(r.jobs.find((j) => j.jobId === 'v2b')!.complete).toBe(false);
  });
});

describe('staffing is task and identity coverage, not an aggregate number', () => {
  test('positive validation output without its extra worker is not completed work', () => {
    const p = feasiblePlan();
    p.assignments = p.assignments.filter((a) => a.taskId !== 'validate:v1');
    const r = issue(p, 'STAFF_ASSIGNMENT');
    expect(quantity(r, 'TEF-1')).toBeGreaterThan(0);
    expect(r.jobs.find((j) => j.jobId === 'v1')!.complete).toBe(false);
  });
  test.each([
    [
      'missing',
      (p: Plan) => {
        p.assignments = p.assignments.filter((a) => a.taskId !== 'run:TEF');
      },
    ],
    [
      'duplicate identity',
      (p: Plan) => {
        const a = p.assignments.find((a) => a.taskId === 'run:TEF')!;
        a.workerIds = [a.workerIds[0]!, a.workerIds[0]!];
      },
    ],
    [
      'double-booked across tasks',
      (p: Plan) => {
        const a = p.assignments.find((a) => a.taskId === 'validate:v1')!;
        a.workerIds = [
          p.assignments.find((b) => b.taskId === 'run:TEF' && b.start === a.start)!.workerIds[0]!,
        ];
      },
    ],
    [
      'wrong shift',
      (p: Plan) => {
        p.assignments[0]!.workerIds = ['S2-1', 'S2-2'];
      },
    ],
    [
      'inactive task',
      (p: Plan) => {
        p.assignments.push({ taskId: 'run:PACK', start: 0, end: 10, workerIds: ['S1-40'] });
      },
    ],
    [
      'unknown task',
      (p: Plan) => {
        p.assignments[0]!.taskId = 'run:UNKNOWN';
      },
    ],
    [
      'cross-shift',
      (p: Plan) => {
        p.assignments[0]!.end = 631;
      },
    ],
  ] as const)('%s cannot be hidden by large requests', (_name, change) => {
    const p = feasiblePlan();
    change(p);
    issue(p, 'STAFF_ASSIGNMENT');
  });
  test('fixed headcount shortage stays invalid even though capacity projection has production', () => {
    const p = feasiblePlan();
    p.requests = [2, 2];
    const r = issue(p, 'STAFF_SHORTAGE');
    expect(quantity(r, 'GRIND-1')).toBeGreaterThan(0);
  });
  test('PRESS, PRINT, CHROME pool products; six WRAP need two; TEF/PACK need two each', () => {
    const p = emptyPlan();
    for (const m of [
      'PRESS-1',
      'PRESS-4',
      'PRINT-1',
      'PRINT-2',
      'CHROME-1',
      'CHROME-2',
      'TEF-1',
      'TEF-2',
      'PACK-1',
      'PACK-2',
      'WRAP-1',
      'WRAP-2',
      'WRAP-3',
      'WRAP-4',
      'WRAP-5',
      'WRAP-11',
    ]) {
      run(p, m, m === 'PRESS-4' || m === 'PRINT-2' || m === 'WRAP-11' ? 'B' : 'A', 0, 10);
    }
    run(p, 'THERMAL-1', 'A', 0, 10);
    run(p, 'THERMAL-3', 'B', 0, 10);
    run(p, 'WASH-1', 'A', 0, 10);
    const r = report(p);
    checkLedger(r, p);
    // 1 PRESS + 2 THERMAL + 1 PRINT + 1 WASH + 1 CHROME + 4 TEF + 2 WRAP + 4 PACK
    expect(r.staffIntervals[0]!.normal).toBe(16);
    expect(r.staffIntervals[0]!.tasks.find((t) => t.taskId === 'run:WRAP')!.required).toBe(2);
  });
  test('four WRAP round their pooled normal count up, across different products', () => {
    const p = emptyPlan();
    for (const id of ['WRAP-1', 'WRAP-2', 'WRAP-3', 'WRAP-11']) {
      run(p, id, id === 'WRAP-11' ? 'B' : 'A', 0, 10);
    }
    const r = report(p);
    expect(r.staffIntervals[0]!.normal).toBe(2);
    near(quantity(r, 'WRAP-11'), 2.4225);
  });
  test('two simultaneous setups cannot share a pooled run worker; TEF/PACK setup use two each', () => {
    const p = emptyPlan();
    p.setups = ['PRESS-1', 'PRESS-2', 'TEF-1', 'PACK-1', 'WRAP-1'].map((m, i) => ({
      id: `s${String(i)}`,
      machineId: m,
      from: 'A',
      to: 'B',
      start: 0,
      end: 20,
    }));
    p.assignments = roster(
      p.setups.map((s) => ({
        taskId: `setup:${s.id}`,
        start: 0,
        end: 20,
        count: /^(TEF|PACK)/.test(s.machineId) ? 2 : 1,
      })),
    );
    const r = report(p);
    expect(r.staffIntervals[0]!.setup).toBe(7);
    expect(r.staffIntervals[0]!.normal).toBe(0);
    p.assignments[1]!.workerIds = p.assignments[0]!.workerIds;
    issue(p, 'STAFF_ASSIGNMENT');
  });
});

describe('PACK allocation, original commitments, promises and signed deltas', () => {
  test('allocation by original due, priority, then ID; no double allocation', () => {
    const p = emptyPlan();
    p.mode = 'custom';
    p.orders = [
      { id: 'z', product: 'A', quantity: 1, originalDue: 1, priority: 'low', promise: null },
      { id: 'b', product: 'A', quantity: 1, originalDue: 1, priority: 'high', promise: null },
      { id: 'a', product: 'A', quantity: 1, originalDue: 1, priority: 'high', promise: null },
      { id: 'early', product: 'A', quantity: 1, originalDue: 2, priority: 'high', promise: null },
    ];
    run(p, 'WRAP-1', 'A', 0, 10);
    run(p, 'PACK-1', 'A', 0, 10);
    const r = report(p);
    checkLedger(r, p);
    expect(r.orders.map((o) => o.orderId)).toEqual(['a', 'b', 'z', 'early']);
    [1, 1, 0.4225, 0].forEach((expected, i) => near(r.orders[i]!.atOriginalDue, expected));
    near(r.orders[0]!.completedAt!, 1 / 0.24225);
    near(r.orders[1]!.completedAt!, 2 / 0.24225);
    expect(r.orders[2]!.completedAt).toBe(null);
  });
  test('output finishing at shift end counts; revised promise never rewrites original deficit', () => {
    const p = emptyPlan();
    p.mode = 'custom';
    p.orders = [
      {
        id: 'due',
        product: 'A',
        quantity: 10,
        originalDue: 1,
        priority: 'high',
        promise: { quantity: 2.4225, due: 2, reason: 'Согласованная часть' },
      },
    ];
    run(p, 'WRAP-1', 'A', 630, 640);
    run(p, 'PACK-1', 'A', 630, 640);
    const r = report(p);
    checkLedger(r, p);
    expect(r.orders[0]).toMatchObject({ atOriginalDue: 0, originalDeficit: 10, completedAt: null });
    near(r.orders[0]!.atPromiseDue!, 2.4225);
    near(r.orders[0]!.promiseDeficit!, 0);
    [0, 2.4225, 0, 0].forEach((v, i) => near(r.orders[0]!.allocatedByShift[i]!, v));
    const boundary = structuredClone(p);
    boundary.orders[0]!.quantity = 2.4225;
    boundary.orders[0]!.promise = null;
    boundary.campaigns.forEach((c) => {
      c.start = 620;
      c.until = 630;
    });
    near(report(boundary).orders[0]!.originalDeficit, 0);
    const c = unwrap(compare({ plan: p, events: [] }, { plan: boundary, events: [] }));
    near(c.delta.originalDeficit, -10);
    near(c.delta.packed.A, 0);
  });
});

describe('untrusted malformed input returns errors, never throws or a partial report', () => {
  const bad: [string, (p: Plan) => void, string][] = [
    [
      'source quantity',
      (p) => {
        p.orders[0]!.quantity++;
      },
      'SOURCE_CHANGED',
    ],
    [
      'source missing',
      (p) => {
        p.orders.pop();
      },
      'SOURCE_CHANGED',
    ],
    [
      'source due',
      (p) => {
        p.orders[0]!.originalDue = 2;
      },
      'SOURCE_CHANGED',
    ],
    [
      'empty id',
      (p) => {
        p.id = '';
      },
      'INVALID_INPUT',
    ],
    [
      'duplicate order',
      (p) => {
        p.orders[1]!.id = p.orders[0]!.id;
      },
      'INVALID_INPUT',
    ],
    [
      'unknown machine',
      (p) => {
        run(p, 'NO-1', 'A', 0, 1);
      },
      'INVALID_INPUT',
    ],
    [
      'illegal route',
      (p) => {
        run(p, 'PRINT-1', 'C', 0, 1);
      },
      'INVALID_INPUT',
    ],
    [
      'zero quota',
      (p) => {
        run(p, 'PRESS-1', 'A', 0, 1, 0);
      },
      'INVALID_INPUT',
    ],
    [
      'nonfinite quota',
      (p) => {
        run(p, 'PRESS-1', 'A', 0, 1, NaN);
      },
      'INVALID_INPUT',
    ],
    [
      'negative start',
      (p) => {
        run(p, 'PRESS-1', 'A', -1, 1);
      },
      'INVALID_INPUT',
    ],
    [
      'empty duration',
      (p) => {
        run(p, 'PRESS-1', 'A', 1, 1);
      },
      'INVALID_INPUT',
    ],
    [
      'outside horizon',
      (p) => {
        run(p, 'PRESS-1', 'A', 0, 2521);
      },
      'INVALID_INPUT',
    ],
    [
      'overlap',
      (p) => {
        run(p, 'PRESS-1', 'A', 0, 2);
        run(p, 'PRESS-1', 'A', 1, 3);
      },
      'INVALID_INPUT',
    ],
    [
      'duplicate campaign',
      (p) => {
        run(p, 'PRESS-1', 'A', 0, 1);
        p.campaigns.push({ ...p.campaigns[0]! });
      },
      'INVALID_INPUT',
    ],
    [
      'fractional request',
      (p) => {
        p.requests = [2.5, 3];
      },
      'INVALID_INPUT',
    ],
    [
      'negative forecast',
      (p) => {
        p.forecasts = [-1, 3];
      },
      'INVALID_INPUT',
    ],
    [
      'same product setup',
      (p) => {
        p.setups.push({ id: 's', machineId: 'PRESS-1', from: 'A', to: 'A', start: 0, end: 1 });
      },
      'INVALID_INPUT',
    ],
  ];
  test.each(bad)('%s', (_name, change, code) => {
    const p = emptyPlan();
    change(p);
    reject(evaluate({ plan: p, events: [] }), code);
  });
  test.each([0, -1, NaN, Infinity])('bad custom quantity %s', (quantity) => {
    const p = emptyPlan();
    p.mode = 'custom';
    p.orders[0]!.quantity = quantity;
    reject(evaluate({ plan: p, events: [] }), 'INVALID_INPUT');
  });
  test.each([
    { priority: 'urgent' },
    { product: 'D' },
    { originalDue: 0 },
    { originalDue: 5 },
    { id: ' ' },
    { promise: { quantity: 1401, due: 2, reason: 'x' } },
    { promise: { quantity: 0, due: 2, reason: 'x' } },
    { promise: { quantity: 1, due: 2, reason: ' ' } },
    { promise: { quantity: 1, due: 5, reason: 'x' } },
  ])('malformed custom order %j', (change) => {
    const p = emptyPlan();
    p.mode = 'custom';
    Object.assign(p.orders[0]!, change);
    reject(evaluate({ plan: p, events: [] }), 'INVALID_INPUT');
  });
  test.each([
    null,
    {},
    { plan: null, events: [] },
    { plan: {}, events: [] },
    { plan: emptyPlan(), events: null },
  ])('malformed shape %#', (input) => {
    reject(evaluate(input as Parameters<typeof evaluate>[0]), 'INVALID_INPUT');
  });
  test.each(
    [
      [{ kind: 'absence' }],
      [
        { kind: 'failure', machineId: 'GRIND-1' },
        { kind: 'failure', machineId: 'GRIND-1' },
      ],
      [{ kind: 'absence' }, { kind: 'failure', machineId: 'GRIND-1' }],
    ].map((events) => ({ events: events as Event[] })),
  )('illegal event order %#', ({ events }) =>
    reject(evaluate({ plan: feasiblePlan(), events }), 'EVENT_ORDER'),
  );
  test('event requires actual GRIND production, not a setting or starving permission', () => {
    reject(
      evaluate({ plan: emptyPlan(), events: [{ kind: 'failure', machineId: 'GRIND-1' }] }),
      'EVENT_TARGET',
    );
    reject(
      evaluate({ plan: feasiblePlan(), events: [{ kind: 'failure', machineId: 'PRESS-4' }] }),
      'EVENT_TARGET',
    );
  });
  test('compare propagates an invalid side rather than inventing a delta', () => {
    const p = emptyPlan();
    p.forecasts = [NaN, 2];
    reject(compare({ plan: feasiblePlan(), events: [] }, { plan: p, events: [] }), 'INVALID_INPUT');
  });
});
