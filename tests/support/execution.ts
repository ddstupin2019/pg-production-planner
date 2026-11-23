import assert from 'node:assert/strict';
import type { Report } from '../../src/domain/engine';
import type { Plan } from '../../src/domain/model';
import { near } from './ledger';

export function finiteTree(value: unknown): void {
  if (typeof value === 'number') assert(Number.isFinite(value), 'nonfinite exported/report number');
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteTree);
}

// Numeric comparisons use public EPSILON, never rounded display figures or an expert checksum.
export function nearTree(actual: unknown, expected: unknown, path = 'root'): void {
  if (typeof expected === 'number') {
    assert.equal(typeof actual, 'number', path);
    near(actual as number, expected, path);
  } else if (Array.isArray(expected)) {
    assert(Array.isArray(actual), path);
    assert.equal(actual.length, expected.length, `${path} length`);
    expected.forEach((value: unknown, index) => nearTree(actual[index], value, `${path}/${index}`));
  } else if (expected !== null && typeof expected === 'object') {
    assert(actual !== null && typeof actual === 'object' && !Array.isArray(actual), path);
    const a = actual as Record<string, unknown>;
    const e = expected as Record<string, unknown>;
    assert.deepEqual(Object.keys(a).sort(), Object.keys(e).sort(), `${path} keys`);
    for (const key of Object.keys(e)) nearTree(a[key], e[key], `${path}/${key}`);
  } else assert.deepEqual(actual, expected, path);
}

export function uniqueSchedule(plan: Plan): void {
  for (const records of [plan.orders, plan.campaigns, plan.jobs, plan.setups]) {
    assert.equal(new Set(records.map((record) => record.id)).size, records.length, 'duplicate ID');
  }
  for (const records of [plan.campaigns, plan.jobs, plan.setups]) {
    const physical = records.map(({ id: _id, ...record }) => JSON.stringify(record));
    assert.equal(new Set(physical).size, physical.length, 'duplicate physical work/permission');
  }
  const assignments = plan.assignments.map((a) =>
    JSON.stringify({
      ...a,
      workerIds: [...a.workerIds].sort(),
    }),
  );
  assert.equal(new Set(assignments).size, assignments.length, 'duplicate assignment');
}

// Equivalent splits are permitted. Compare the actual ledger over the union of both partitions.
export function sameExecution(
  left: Report,
  leftPlan: Plan,
  right: Report,
  rightPlan: Plan,
  cut = 2520,
): void {
  const cuts = [
    ...new Set([
      0,
      cut,
      ...[left, right].flatMap((r) => [
        ...r.machineIntervals.flatMap((row) => [row.start, row.end]),
        ...r.stockIntervals.flatMap((row) => [row.start, row.end]),
        ...r.staffIntervals.flatMap((row) => [row.start, row.end]),
      ]),
    ]),
  ]
    .filter((t) => t >= 0 && t <= cut)
    .sort((a, b) => a - b);
  const machineIds = [...new Set(left.machineIntervals.map((r) => r.machineId))];
  const queues = [
    ...new Map(
      left.stockIntervals.map((r) => [
        `${r.product}/${r.before}`,
        { product: r.product, before: r.before },
      ]),
    ).values(),
  ];
  const machines = [left, right].map(
    (r) =>
      new Map(
        machineIds.map((id) => [id, r.machineIntervals.filter((row) => row.machineId === id)]),
      ),
  );
  const stocks = [left, right].map((r) =>
    queues.map((queue) =>
      r.stockIntervals.filter(
        (row) => row.product === queue.product && row.before === queue.before,
      ),
    ),
  );
  for (let i = 0; i < cuts.length - 1; i++) {
    const start = cuts[i]!;
    const end = cuts[i + 1]!;
    if (end - start <= 1e-6) continue;
    const t = (start + end) / 2;
    for (const id of machineIds) {
      const rows = machines.map((m) => m.get(id)!.find((r) => r.start <= t && r.end > t));
      assert(rows[0] && rows[1], `${id}: missing execution witness`);
      const view = rows.map((row, index) => {
        const plan = index === 0 ? leftPlan : rightPlan;
        const jobs = row!.jobIds
          .map((jobId) => {
            const job = plan.jobs.find((j) => j.id === jobId);
            assert(job);
            return `${job.code}/${job.machineId}`;
          })
          .sort();
        const setup = plan.setups.find((s) => s.id === row!.setupId);
        return {
          product: row!.product,
          kind: row!.kind,
          rate: row!.rate,
          quantity: row!.rate * (end - start),
          jobs,
          setup: setup ? { from: setup.from, to: setup.to } : null,
        };
      });
      nearTree(view[0], view[1], `machine ${id} at ${start}`);
    }
    queues.forEach((_queue, q) => {
      const rows = stocks.map((s) => s[q]!.find((r) => r.start <= t && r.end > t));
      assert(rows[0] && rows[1], 'missing stock witness');
      const view = rows.map((row) => ({
        start: row!.opening + (row!.inflowRate - row!.consumedRate) * (start - row!.start),
        end: row!.opening + (row!.inflowRate - row!.consumedRate) * (end - row!.start),
        inflow: row!.inflowRate,
        consumed: row!.consumedRate,
      }));
      nearTree(view[0], view[1], `queue ${q} at ${start}`);
    });
    const staff = [left, right].map((r) => r.staffIntervals.find((s) => s.start <= t && s.end > t));
    assert(staff[0] && staff[1], 'missing staff witness');
    const view = staff.map((row, index) => {
      const plan = index === 0 ? leftPlan : rightPlan;
      const tasks = row!.tasks
        .map((task) => {
          let key = task.taskId;
          if (key.startsWith('validate:')) {
            const job = plan.jobs.find((j) => `validate:${j.id}` === key);
            assert(job);
            key = `validate:${job.code}/${job.machineId}`;
          } else if (key.startsWith('setup:')) {
            const setup = plan.setups.find((s) => `setup:${s.id}` === key);
            assert(setup);
            key = `setup:${setup.machineId}/${setup.from}/${setup.to}`;
          }
          return { key, required: task.required, workers: [...task.workerIds].sort() };
        })
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      return {
        normal: row!.normal,
        setup: row!.setup,
        validation: row!.validation,
        total: row!.total,
        available: row!.available,
        tasks,
      };
    });
    nearTree(view[0], view[1], `staff at ${start}`);
  }
}

export function sameOutputs(left: Report, right: Report): void {
  nearTree(left.shifts, right.shifts, 'shifts');
  nearTree(left.orders, right.orders, 'orders');
  const jobs = (report: Report) =>
    report.jobs
      .map(({ jobId: _id, ...job }) => job)
      .sort((a, b) => (`${a.code}/${a.machineId}` < `${b.code}/${b.machineId}` ? -1 : 1));
  nearTree(jobs(left), jobs(right), 'work');
}
