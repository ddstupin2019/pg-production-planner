import assert from 'node:assert/strict';
import type { MachineInterval, Report } from '../../src/domain/engine';
import type { Plan, Product, Operation, Event } from '../../src/domain/model';
import { checkJobs } from './work-witness';
import { checkSetups } from './setup-witness';

// Independent physical witness checker. It does not calculate a candidate schedule.
const routes: Record<Product, Operation[]> = {
  A: 'PRESS THERMAL PRINT REWIND GRIND WASH CHROME TEF LUBE WRAP PACK'.split(' ') as Operation[],
  B: 'PRESS THERMAL PRINT REWIND GRIND WASH TEF LUBE WRAP PACK'.split(' ') as Operation[],
  C: 'PRESS THERMAL LASER REWIND GRIND WASH CHROME TEF LUBE WRAP PACK'.split(' ') as Operation[],
};
const speed: Record<string, number> = {
  PRESS: 900,
  THERMAL: 1540,
  PRINT: 1300,
  LASER: 1500,
  REWIND: 2500,
  GRIND: 800,
  WASH: 7680,
  CHROME: 2680,
  TEF: 3385,
  LUBE: 7680,
  WRAP: 285,
  PACK: 1350,
};
const counts: Record<string, number> = {
  PRESS: 5,
  THERMAL: 3,
  PRINT: 2,
  LASER: 1,
  REWIND: 2,
  GRIND: 5,
  WASH: 1,
  CHROME: 2,
  TEF: 2,
  LUBE: 1,
  WRAP: 16,
  PACK: 3,
};
const initial: Record<string, Record<Product, number>> = {
  REWIND: { A: 200, B: 100, C: 150 },
  WASH: { A: 250, B: 150, C: 0 },
  WRAP: { A: 300, B: 100, C: 0 },
};

export function near(actual: number, expected: number, context = ''): void {
  assert(Number.isFinite(actual), `${context}: nonfinite ${String(actual)}`);
  assert(
    Math.abs(actual - expected) <= 1e-6,
    `${context}: ${String(actual)} != ${String(expected)}`,
  );
}

export function quantity(report: Report, machine: string, start = 0, end = 2520): number {
  return report.machineIntervals
    .filter((r) => r.machineId === machine && r.kind === 'produce')
    .reduce(
      (sum, r) => sum + r.rate * Math.max(0, Math.min(end, r.end) - Math.max(start, r.start)),
      0,
    );
}

function operation(row: MachineInterval): string {
  return row.machineId.split('-')[0]!;
}

function integral(
  report: Report,
  product: Product,
  op: string,
  start: number,
  end: number,
): number {
  return report.machineIntervals
    .filter((r) => r.kind === 'produce' && r.product === product && operation(r) === op)
    .reduce(
      (sum, r) => sum + r.rate * Math.max(0, Math.min(r.end, end) - Math.max(r.start, start)),
      0,
    );
}

export function prefix(report: Report, cut: number): unknown {
  return {
    machines: report.machineIntervals
      .filter((r) => r.start < cut)
      .map((r) => ({
        ...r,
        end: Math.min(r.end, cut),
        quantity: r.rate * (Math.min(r.end, cut) - r.start),
      })),
    stocks: report.stockIntervals
      .filter((r) => r.start < cut)
      .map((r) => ({
        ...r,
        end: Math.min(r.end, cut),
        closing: r.opening + (r.inflowRate - r.consumedRate) * (Math.min(r.end, cut) - r.start),
      })),
  };
}

export function checkLedger(report: Report, plan: Plan, events: Event[] = []): void {
  assert.equal(report.planId, plan.id);
  checkSetups(report, plan, events);
  checkJobs(report, plan, events);
  assert.equal(report.feasible, !report.issues.some((i) => i.severity === 'error'));
  assert.equal(report.shifts.length, 4);
  const expectedMachines = Object.entries(counts).flatMap(([op, n]) =>
    Array.from({ length: n }, (_, i) => `${op}-${String(i + 1)}`),
  );
  assert.deepEqual([...new Set(report.machineIntervals.map((r) => r.machineId))], expectedMachines);
  for (const id of expectedMachines) {
    const rows = report.machineIntervals.filter((r) => r.machineId === id);
    let end = 0;
    for (const row of rows) {
      near(row.start, end, `${id} gap/overlap`);
      assert(row.end > row.start);
      end = row.end;
      near(row.quantity, row.rate * (row.end - row.start), `${id} integrated quantity`);
      assert(row.rate >= 0 && row.rate <= (speed[operation(row)]! * 0.85) / 1000 + 1e-6);
      if (row.kind !== 'produce') near(row.rate, 0);
      else {
        assert(row.rate > 0);
        assert(routes[row.product].includes(operation(row) as Operation));
        const campaign = plan.campaigns.find((c) => c.id === row.campaignId);
        assert(campaign);
        assert.equal(campaign.machineId, id);
        assert.equal(campaign.product, row.product);
        assert(row.start >= campaign.start - 1e-6 && row.end <= campaign.until + 1e-6);
      }
    }
    near(end, 2520, `${id} horizon`);
  }
  for (const product of ['A', 'B', 'C'] as const) {
    const route = routes[product];
    for (let index = 1; index < route.length; index++) {
      const before = route[index]!;
      const rows = report.stockIntervals.filter(
        (r) => r.product === product && r.before === before,
      );
      assert(rows.length > 0, `missing ${product}/${before}`);
      let end = 0;
      let closing = initial[before]?.[product] ?? 0;
      for (const row of rows) {
        near(row.start, end, `${product}/${before} gap`);
        assert(row.end > row.start);
        near(row.opening, closing, `${product}/${before} carry, no reinitialization`);
        assert(row.opening >= -1e-6 && row.closing >= -1e-6);
        assert(row.inflowRate >= 0 && row.consumedRate >= 0);
        const duration = row.end - row.start;
        near(
          row.inflowRate * duration,
          integral(report, product, route[index - 1]!, row.start, row.end),
          'route inflow',
        );
        near(
          row.consumedRate * duration,
          integral(report, product, before, row.start, row.end),
          'route consumption',
        );
        near(
          row.closing,
          row.opening + (row.inflowRate - row.consumedRate) * duration,
          'queue balance',
        );
        end = row.end;
        closing = row.closing;
      }
      near(end, 2520);
      for (let s = 1; s <= 4; s++) {
        const t = s * 630;
        const row = rows.find((r) => r.start < t && r.end >= t);
        assert(row);
        const snapshot = report.shifts[s - 1]!.stocks.find(
          (r) => r.product === product && r.before === before,
        );
        assert(snapshot);
        near(
          snapshot.quantity,
          row.opening + (row.inflowRate - row.consumedRate) * (t - row.start),
          'shift stock',
        );
      }
    }
  }
  assert.equal(
    report.stockIntervals.some((r) => r.before === 'PRESS'),
    false,
  );
  for (const quota of report.quotas) {
    const c = plan.campaigns.find((c) => c.id === quota.campaignId);
    assert(c);
    const actual = report.machineIntervals
      .filter((r) => r.campaignId === c.id)
      .reduce((n, r) => n + r.quantity, 0);
    near(quota.produced, actual);
    near(quota.remaining, c.quota - actual);
    assert(actual <= c.quota + 1e-6);
  }
  assert.equal(report.quotas.length, plan.campaigns.length);
  // Reconstruct pooled norms from actual positive production, not permissions.
  let previous = 0;
  for (const row of report.staffIntervals) {
    near(row.start, previous, 'staff horizon');
    previous = row.end;
    const mid = (row.start + row.end) / 2;
    const active = report.machineIntervals.filter(
      (m) => m.kind === 'produce' && m.start <= mid && m.end > mid,
    );
    const expectedTasks: { taskId: string; required: number }[] = [];
    const normal = Object.keys(counts).reduce((sum, op) => {
      const n = active.filter((m) => operation(m) === op).length;
      const norm =
        op === 'PRESS'
          ? Number(n > 0)
          : op === 'PRINT' || op === 'CHROME'
            ? Math.ceil(n / 2)
            : op === 'WRAP'
              ? Math.ceil(n / 3)
              : op === 'TEF' || op === 'PACK'
                ? n * 2
                : n;
      if (norm > 0) expectedTasks.push({ taskId: `run:${op}`, required: norm });
      return sum + norm;
    }, 0);
    const setups = plan.setups.filter((s) => s.start <= mid && s.end > mid);
    const setup = setups.reduce((n, s) => n + (/^(TEF|PACK)-/.test(s.machineId) ? 2 : 1), 0);
    const validation = plan.jobs.filter(
      (j) => j.code.startsWith('VAL') && j.start <= mid && j.end > mid,
    ).length;
    for (const s of setups) {
      expectedTasks.push({
        taskId: `setup:${s.id}`,
        required: /^(TEF|PACK)-/.test(s.machineId) ? 2 : 1,
      });
    }
    for (const j of plan.jobs.filter(
      (j) => j.code.startsWith('VAL') && j.start <= mid && j.end > mid,
    )) {
      expectedTasks.push({ taskId: `validate:${j.id}`, required: 1 });
    }
    const byTask = (a: { taskId: string }, b: { taskId: string }) =>
      a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0;
    assert.deepEqual(
      row.tasks.map(({ taskId, required }) => ({ taskId, required })).sort(byTask),
      expectedTasks.sort(byTask),
      'task-specific coverage, not merely total headcount',
    );
    near(row.normal, normal);
    near(row.setup, setup);
    near(row.validation, validation);
    near(row.total, normal + setup + validation);
    const shift = Math.floor(mid / 630) + 1;
    const draft = Math.max(
      0,
      ...plan.assignments.flatMap((a) =>
        a.workerIds
          .filter((w) => w.startsWith(`S${String(shift)}-`))
          .map((w) => Number(w.split('-')[1])),
      ),
    );
    const absence = shift === 2 && events.some((e) => e.kind === 'absence') ? 2 : 0;
    const available =
      shift <= 2 ? (plan.requests?.[shift - 1] ?? draft) - absence : plan.forecasts[shift - 3]!;
    near(row.available, available);
    if (report.feasible) {
      const used = row.tasks.flatMap((task) => {
        assert(task.workerIds.length >= task.required);
        assert.equal(new Set(task.workerIds).size, task.workerIds.length);
        for (const worker of task.workerIds) {
          assert(new RegExp(`^S${String(shift)}-[1-9][0-9]*$`).test(worker));
          assert(Number(worker.split('-')[1]) <= available);
          assert(
            plan.assignments.some(
              (a) =>
                a.taskId === task.taskId &&
                a.start <= row.start &&
                a.end >= row.end &&
                a.workerIds.includes(worker),
            ),
          );
        }
        return task.workerIds;
      });
      assert.equal(new Set(used).size, used.length, 'double-booked identity');
      near(
        row.tasks.reduce((n, t) => n + t.required, 0),
        row.total,
        'all required tasks represented',
      );
    }
  }
  near(previous, 2520);
  for (let s = 1; s <= 4; s++) {
    const shift = report.shifts[s - 1]!;
    assert.equal(shift.shift, s);
    const staff = report.staffIntervals.filter((r) => r.start >= 630 * (s - 1) && r.end <= 630 * s);
    near(shift.peak, Math.max(0, ...staff.map((r) => r.total)));
    near(
      shift.laborMinutes,
      staff.reduce((n, r) => n + r.total * (r.end - r.start), 0),
    );
    near(
      shift.reserveMinutes,
      staff.reduce((n, r) => n + Math.max(0, r.available - r.total) * (r.end - r.start), 0),
    );
    for (const product of ['A', 'B', 'C'] as const) {
      near(shift.packed[product], integral(report, product, 'PACK', (s - 1) * 630, s * 630));
      const allocated = report.orders
        .filter((o) => plan.orders.find((p) => p.id === o.orderId)!.product === product)
        .reduce((n, o) => n + o.allocatedByShift.slice(0, s).reduce((a, b) => a + b, 0), 0);
      near(
        shift.finishedUnallocated[product],
        integral(report, product, 'PACK', 0, s * 630) - allocated,
      );
    }
    near(
      shift.fulfilled,
      report.orders.reduce((n, o) => n + o.allocatedByShift[s - 1]!, 0),
    );
    near(
      shift.dueDeficit,
      report.orders
        .filter((o) => plan.orders.find((p) => p.id === o.orderId)!.originalDue === s)
        .reduce((n, o) => n + o.originalDeficit, 0),
    );
  }
  for (const order of report.orders) {
    const original = plan.orders.find((o) => o.id === order.orderId);
    assert(original);
    const byDue = order.allocatedByShift.slice(0, original.originalDue).reduce((a, b) => a + b, 0);
    near(order.atOriginalDue, Math.min(original.quantity, byDue));
    near(order.originalDeficit, original.quantity - order.atOriginalDue);
    assert(order.allocatedByShift.every((n) => n >= 0));
    assert(order.allocatedByShift.reduce((a, b) => a + b, 0) <= original.quantity + 1e-6);
    if (original.promise) {
      const byPromise = order.allocatedByShift
        .slice(0, original.promise.due)
        .reduce((a, b) => a + b, 0);
      near(order.atPromiseDue!, Math.min(original.promise.quantity, byPromise));
      near(order.promiseDeficit!, original.promise.quantity - order.atPromiseDue!);
    } else {
      assert.equal(order.atPromiseDue, null);
      assert.equal(order.promiseDeficit, null);
    }
  }
}
