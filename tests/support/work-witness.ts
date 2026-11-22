import assert from 'node:assert/strict';
import type { MachineInterval, Report } from '../../src/domain/engine';
import type { Event, Job, JobCode, Plan, Product } from '../../src/domain/model';

// Independent R7 transcription, deliberately not imported from production fixtures.
export const workRules: readonly {
  code: JobCode;
  operation: string;
  count: number;
  minutes: number;
  start: number;
  end: number;
  product: Product | null;
}[] = [
  { code: 'TO-1', operation: 'PRESS', count: 1, minutes: 180, start: 0, end: 630, product: null },
  { code: 'TO-2', operation: 'GRIND', count: 1, minutes: 240, start: 0, end: 1260, product: null },
  {
    code: 'TO-3',
    operation: 'THERMAL',
    count: 1,
    minutes: 180,
    start: 0,
    end: 2520,
    product: null,
  },
  { code: 'TO-4', operation: 'CHROME', count: 1, minutes: 240, start: 0, end: 2520, product: null },
  {
    code: 'TO-5',
    operation: 'PACK',
    count: 1,
    minutes: 180,
    start: 1260,
    end: 2520,
    product: null,
  },
  { code: 'VAL-1', operation: 'TEF', count: 1, minutes: 240, start: 0, end: 1260, product: 'A' },
  { code: 'VAL-2', operation: 'GRIND', count: 2, minutes: 180, start: 0, end: 2520, product: 'B' },
  {
    code: 'VAL-3',
    operation: 'LASER',
    count: 1,
    minutes: 240,
    start: 1260,
    end: 2520,
    product: 'C',
  },
  {
    code: 'VAL-4',
    operation: 'WRAP',
    count: 3,
    minutes: 180,
    start: 1260,
    end: 2520,
    product: 'A',
  },
];

export type JobEvidence = Pick<Report, 'jobs' | 'machineIntervals' | 'staffIntervals' | 'issues'>;
export interface WorkCoverage {
  code: JobCode;
  required: number;
  complete: number;
}

const epsilon = 1e-6;
const at = (span: { start: number; end: number }, t: number) => span.start <= t && t < span.end;
const op = (id: string) => id.split('-')[0]!;

function taskCovered(
  evidence: JobEvidence,
  plan: Plan,
  events: Event[],
  taskId: string,
  required: number,
  start: number,
  end: number,
): boolean {
  const t = (start + end) / 2;
  const shift = Math.floor(t / 630) + 1;
  const staff = evidence.staffIntervals.filter((r) => r.start <= start && r.end >= end);
  if (staff.length !== 1) return false;
  const tasks = staff[0]!.tasks.filter((task) => task.taskId === taskId);
  if (tasks.length !== 1 || tasks[0]!.required !== required) return false;
  const workers = tasks[0]!.workerIds;
  if (workers.length < required || new Set(workers).size !== workers.length) return false;
  const active = plan.assignments.filter((a) => a.start <= start && a.end >= end);
  const draft = Math.max(
    0,
    ...plan.assignments.flatMap((a) =>
      a.workerIds
        .filter((id) => id.startsWith(`S${String(shift)}-`))
        .map((id) => Number(id.split('-')[1])),
    ),
  );
  const absence = shift === 2 && events.some((event) => event.kind === 'absence') ? 2 : 0;
  const available =
    shift <= 2 ? (plan.requests?.[shift - 1] ?? draft) - absence : plan.forecasts[shift - 3]!;
  return workers.every((id) => {
    if (!new RegExp(`^S${String(shift)}-[1-9][0-9]*$`).test(id)) return false;
    if (Number(id.split('-')[1]) > available) return false;
    const uses = active.filter((assignment) => assignment.workerIds.includes(id));
    const reportedUses = staff[0]!.tasks.filter((task) => task.workerIds.includes(id));
    return uses.length === 1 && uses[0]!.taskId === taskId && reportedUses.length === 1;
  });
}

function normalCount(operation: string, machines: number): number {
  if (operation === 'PRESS') return Number(machines > 0);
  if (operation === 'PRINT' || operation === 'CHROME') return Math.ceil(machines / 2);
  if (operation === 'WRAP') return Math.ceil(machines / 3);
  return operation === 'TEF' || operation === 'PACK' ? machines * 2 : machines;
}

// No feasible flag is accepted here: derive completion from work, machine and identity evidence.
export function checkJobs(evidence: JobEvidence, plan: Plan, events: Event[] = []): WorkCoverage[] {
  const error = (code: string) =>
    evidence.issues.some((i) => i.code === code && i.severity === 'error');
  const ids = plan.jobs.map((job) => job.id).sort();
  assert.deepEqual(
    evidence.jobs.map((job) => job.jobId),
    ids,
    'exactly one sorted result per planned job',
  );
  const boundaries = [
    ...new Set([
      0,
      630,
      1260,
      1890,
      2520,
      120,
      270,
      ...plan.jobs.flatMap((j) => [j.start, j.end]),
      ...plan.setups.flatMap((s) => [s.start, s.end]),
      ...plan.assignments.flatMap((a) => [a.start, a.end]),
      ...evidence.machineIntervals.flatMap((r) => [r.start, r.end]),
      ...evidence.staffIntervals.flatMap((r) => [r.start, r.end]),
    ]),
  ].sort((a, b) => a - b);

  // All scheduled maintenance really stops its machine, even if job rows claim success.
  // Retain annotations on overlapping repair/maintenance; stop union is never double counted.
  for (const row of evidence.machineIntervals) {
    const cuts = boundaries.filter((t) => t >= row.start && t <= row.end);
    for (let i = 0; i < cuts.length - 1; i++) {
      const t = (cuts[i]! + cuts[i + 1]!) / 2;
      const jobs = plan.jobs.filter((j) => j.machineId === row.machineId && at(j, t));
      assert.deepEqual([...row.jobIds].sort(), jobs.map((j) => j.id).sort(), 'work annotations');
      const setup = plan.setups.find((s) => s.machineId === row.machineId && at(s, t));
      assert.equal(row.setupId, setup?.id ?? null, 'setup annotation during stops');
      const repair =
        t >= 120 &&
        t < 270 &&
        events.some((event) => event.kind === 'failure' && event.machineId === row.machineId);
      const maintenance = jobs.some((j) => j.code.startsWith('TO'));
      const stop = repair ? 'repair' : maintenance ? 'maintenance' : setup ? 'setup' : null;
      if (stop) {
        assert.equal(row.kind, stop, 'scheduled stop and repair precedence');
        assert.equal(row.rate, 0, 'no production during scheduled stop');
        assert.equal(row.quantity, 0, 'no output during scheduled stop');
      } else assert(!['repair', 'maintenance', 'setup'].includes(row.kind), 'invented stop');
    }
  }

  const completed = new Map<string, boolean>();
  for (const job of plan.jobs) {
    const rule = workRules.find((rule) => rule.code === job.code);
    assert(rule, `unknown job code ${job.code}`);
    const result = evidence.jobs.find((row) => row.jobId === job.id)!;
    assert.equal(result.code, job.code);
    assert.equal(result.machineId, job.machineId);
    const duration = job.end - job.start;
    const rightDuration = Math.abs(duration - rule.minutes) <= epsilon;
    const inWindow = job.start >= rule.start - epsilon && job.end <= rule.end + epsilon;
    const rightOperation = op(job.machineId) === rule.operation;
    if (!rightDuration) assert(error('WORK_DURATION'), `${job.id}: duration issue missing`);
    if (!inWindow) assert(error('WORK_WINDOW'), `${job.id}: window issue missing`);
    if (!rightOperation) assert(evidence.issues.some((i) => i.severity === 'error'));
    let qualifying = 0;
    let continuous = true;
    const cuts = boundaries.filter((t) => t >= job.start && t <= job.end);
    for (let i = 0; i < cuts.length - 1; i++) {
      const start = cuts[i]!;
      const end = cuts[i + 1]!;
      const t = (start + end) / 2;
      const rows = evidence.machineIntervals.filter(
        (row) => row.machineId === job.machineId && row.start <= start && row.end >= end,
      );
      assert.equal(rows.length, 1, `${job.id}: missing/overlapping machine witness`);
      const row: MachineInterval = rows[0]!;
      const conflict =
        plan.jobs.some(
          (other: Job) => other.id !== job.id && other.machineId === job.machineId && at(other, t),
        ) || plan.setups.some((setup) => setup.machineId === job.machineId && at(setup, t));
      let good = rightOperation && t >= rule.start && t < rule.end && !conflict;
      if (rule.product === null) {
        good &&= ['maintenance', 'repair'].includes(row.kind) && row.rate === 0;
      } else {
        const active = evidence.machineIntervals.filter(
          (r) =>
            op(r.machineId) === rule.operation && r.kind === 'produce' && r.rate > 0 && at(r, t),
        );
        good &&= row.kind === 'produce' && row.rate > 0 && row.product === rule.product;
        good &&= taskCovered(evidence, plan, events, `validate:${job.id}`, 1, start, end);
        good &&= taskCovered(
          evidence,
          plan,
          events,
          `run:${rule.operation}`,
          normalCount(rule.operation, active.length),
          start,
          end,
        );
      }
      if (good) qualifying += end - start;
      else continuous = false;
    }
    const complete =
      rightDuration && inWindow && continuous && Math.abs(qualifying - duration) <= epsilon;
    assert.equal(result.complete, complete, `${job.id}: independently witnessed completion`);
    assert(Number.isFinite(result.creditedMinutes) && result.creditedMinutes >= 0);
    assert(result.creditedMinutes <= qualifying + epsilon, `${job.id}: invented work credit`);
    // Invalid/disconnected fragments may be discarded, but can never be promoted to full credit.
    if (complete)
      assert(Math.abs(result.creditedMinutes - rule.minutes) <= epsilon, `${job.id}: full credit`);
    else {
      assert(
        evidence.issues.some((i) => i.severity === 'error'),
        `${job.id}: invalid work concealed`,
      );
      assert(result.issues.length > 0, `${job.id}: incomplete work has no explanation`);
    }
    completed.set(job.id, complete);
  }
  return workRules.map((rule) => {
    const scheduled = plan.jobs.filter((job) => job.code === rule.code);
    const distinct = new Set(scheduled.map((job) => job.machineId));
    if (distinct.size < rule.count)
      assert(error('WORK_MISSING'), `${rule.code}: mandatory count hidden`);
    const complete = new Set(
      scheduled.filter((job) => completed.get(job.id)).map((job) => job.machineId),
    ).size;
    return { code: rule.code, required: rule.count, complete };
  });
}
