import { expect } from 'vitest';
import type { Assignment, Job, Order, Plan, Result } from '../../src/domain/model';

// Independent transcription: do not build expected orders from production constants.
export function originalOrders(): Order[] {
  return [
    ['ORD-1', 'A', 1400, 1, 'high'],
    ['ORD-2', 'B', 1000, 2, 'medium'],
    ['ORD-3', 'C', 1000, 2, 'high'],
    ['ORD-4', 'A', 1500, 3, 'high'],
    ['ORD-5', 'B', 1000, 4, 'low'],
    ['ORD-6', 'C', 1100, 4, 'medium'],
  ].map((row) => ({
    id: row[0] as string,
    product: row[1] as Order['product'],
    quantity: row[2] as number,
    originalDue: row[3] as Order['originalDue'],
    priority: row[4] as Order['priority'],
    promise: null,
  }));
}

export function unwrap<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

export function reject<T>(result: Result<T>, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error(`Expected ${code}, received success`);
  expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
  for (const issue of result.errors) {
    expect(issue.severity).toBe('error');
    expect(issue.message.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(issue.refs)).toBe(true);
  }
}

export function emptyPlan(): Plan {
  return {
    id: 'independent-small',
    mode: 'required',
    orders: originalOrders(),
    campaigns: [],
    setups: [],
    jobs: [],
    assignments: [],
    requests: [40, 40],
    forecasts: [40, 40],
    reserveReasons: ['Резерв для перестроения', 'Резерв ночной смены'],
  };
}

export function run(
  plan: Plan,
  machineId: string,
  product: 'A' | 'B' | 'C',
  start: number,
  until: number,
  quota = 10000,
): string {
  const id = `c-${machineId}-${String(start)}`;
  plan.campaigns.push({ id, machineId, product, start, until, quota });
  return id;
}

export interface TaskWindow {
  taskId: string;
  start: number;
  end: number;
  count: number;
}

// Hand-specified roster builder, not an evaluator or feasibility oracle.
export function roster(windows: TaskWindow[]): Assignment[] {
  const assignments: Assignment[] = [];
  for (let shift = 1; shift <= 4; shift++) {
    const start = (shift - 1) * 630;
    const end = shift * 630;
    const cuts = [...new Set([start, end, ...windows.flatMap((w) => [w.start, w.end])])]
      .filter((t) => t >= start && t <= end)
      .sort((a, b) => a - b);
    for (let index = 0; index < cuts.length - 1; index++) {
      const a = cuts[index]!;
      const b = cuts[index + 1]!;
      let worker = 1;
      for (const window of windows.filter((w) => w.start <= a && w.end >= b)) {
        assignments.push({
          taskId: window.taskId,
          start: a,
          end: b,
          workerIds: Array.from(
            { length: window.count },
            () => `S${String(shift)}-${String(worker++)}`,
          ),
        });
      }
    }
  }
  return assignments;
}

export function feasiblePlan(parallel = false): Plan {
  const plan = emptyPlan();
  // A: REWIND produces 191.25 from initial stock; GRIND consumes 190.4.
  // WASH/CHROME/TEF have positive input for all 240 validation minutes.
  run(plan, 'REWIND-1', 'A', 0, 90);
  run(plan, 'GRIND-1', 'A', 0, 280);
  for (const machine of ['WASH-1', 'CHROME-1', 'TEF-1']) run(plan, machine, 'A', 0, 240);
  // B: upstream .765 plus 100 initial stock feeds both .68 validations.
  for (const machine of ['PRESS-4', 'THERMAL-3', 'PRINT-2', 'REWIND-2']) {
    run(plan, machine, 'B', 0, 420);
  }
  run(plan, 'GRIND-4', 'B', parallel ? 240 : 0, parallel ? 420 : 180);
  run(plan, 'GRIND-5', 'B', 240, 420);
  // C: zero buffers; PRESS supplies .765 continuously through THERMAL/LASER.
  plan.setups.push(
    { id: 's-press-c', machineId: 'PRESS-5', from: 'B', to: 'C', start: 1235, end: 1260 },
    { id: 's-thermal-c', machineId: 'THERMAL-2', from: 'A', to: 'C', start: 1230, end: 1260 },
  );
  for (const machine of ['PRESS-5', 'THERMAL-2', 'LASER-1']) run(plan, machine, 'C', 1260, 1500);
  for (let n = 1; n <= 3; n++) run(plan, `WRAP-${String(n)}`, 'A', 1260, 1440);
  run(plan, 'PACK-1', 'A', 1260, 1440);
  const job = (
    id: string,
    code: Job['code'],
    machineId: string,
    start: number,
    end: number,
  ): Job => ({ id, code, machineId, start, end });
  const jobs = [
    job('to1', 'TO-1', 'PRESS-1', 420, 600),
    job('to2', 'TO-2', 'GRIND-2', 420, 660),
    job('to3', 'TO-3', 'THERMAL-1', 420, 600),
    job('to4', 'TO-4', 'CHROME-2', 0, 240),
    job('to5', 'TO-5', 'PACK-2', 1260, 1440),
    job('v1', 'VAL-1', 'TEF-1', 0, 240),
    job('v2a', 'VAL-2', 'GRIND-4', parallel ? 240 : 0, parallel ? 420 : 180),
    job('v2b', 'VAL-2', 'GRIND-5', 240, 420),
    job('v3', 'VAL-3', 'LASER-1', 1260, 1500),
    ...[1, 2, 3].map((n) => job(`v4-${String(n)}`, 'VAL-4', `WRAP-${String(n)}`, 1260, 1440)),
  ];
  plan.jobs = jobs;
  const task = (taskId: string, start: number, end: number, count = 1): TaskWindow => ({
    taskId,
    start,
    end,
    count,
  });
  const windows: TaskWindow[] = [
    task('run:REWIND', 0, 90, 2),
    task('run:REWIND', 90, 420),
    ...['PRESS', 'THERMAL', 'PRINT'].map((op) => task(`run:${op}`, 0, 420)),
    ...['WASH', 'CHROME'].map((op) => task(`run:${op}`, 0, 240)),
    task('run:TEF', 0, 240, 2),
    ...(parallel
      ? [task('run:GRIND', 0, 240), task('run:GRIND', 240, 280, 3), task('run:GRIND', 280, 420, 2)]
      : [
          task('run:GRIND', 0, 180, 2),
          task('run:GRIND', 180, 240),
          task('run:GRIND', 240, 280, 2),
          task('run:GRIND', 280, 420),
        ]),
    task('setup:s-press-c', 1235, 1260),
    task('setup:s-thermal-c', 1230, 1260),
    ...['PRESS', 'THERMAL', 'LASER'].map((op) => task(`run:${op}`, 1260, 1500)),
    task('run:WRAP', 1260, 1440),
    task('run:PACK', 1260, 1440, 2),
    ...jobs
      .filter((j) => j.code.startsWith('VAL'))
      .map((j) => task(`validate:${j.id}`, j.start, j.end)),
  ];
  plan.assignments = roster(windows);
  return plan;
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
