import { describe, expect, test } from 'vitest';
import type { Event, Plan, Product } from '../../src/domain/model';
import { emptyPlan, feasiblePlan } from '../support/fixture';
import { checkJobs } from '../support/work-witness';
import type { JobEvidence } from '../support/work-witness';

// Hand-built evidence ONLY for the witness checker, not a mocked evaluator or workflow report.
// Deliberately omit materials/campaign feasibility: checkJobs accepts only its four evidence fields.
function witness(change: (plan: Plan) => void = () => {}, events: Event[] = []) {
  const plan = emptyPlan();
  plan.jobs = feasiblePlan().jobs;
  change(plan);
  const evidence: JobEvidence = { jobs: [], machineIntervals: [], staffIntervals: [], issues: [] };
  const cuts = [
    ...new Set([0, 120, 270, 630, 1260, 1890, 2520, ...plan.jobs.flatMap((j) => [j.start, j.end])]),
  ].sort((a, b) => a - b);
  for (const machineId of new Set(plan.jobs.map((j) => j.machineId))) {
    for (let i = 0; i < cuts.length - 1; i++) {
      const start = cuts[i]!;
      const end = cuts[i + 1]!;
      const t = (start + end) / 2;
      const jobs = plan.jobs.filter((j) => j.machineId === machineId && j.start <= t && t < j.end);
      const validation = jobs.find((j) => j.code.startsWith('VAL'));
      const repair =
        t >= 120 &&
        t < 270 &&
        events.some((e) => e.kind === 'failure' && e.machineId === machineId);
      const maintenance = jobs.some((j) => j.code.startsWith('TO'));
      const product: Product =
        validation?.code === 'VAL-2' ? 'B' : validation?.code === 'VAL-3' ? 'C' : 'A';
      const kind = repair
        ? 'repair'
        : maintenance
          ? 'maintenance'
          : validation
            ? 'produce'
            : 'idle';
      const rate = kind === 'produce' ? 0.1 : 0;
      evidence.machineIntervals.push({
        machineId,
        campaignId: null,
        start,
        end,
        product,
        kind,
        rate,
        quantity: rate * (end - start),
        jobIds: jobs.map((j) => j.id),
        setupId: null,
      });
    }
  }
  for (let i = 0; i < cuts.length - 1; i++) {
    const start = cuts[i]!;
    const end = cuts[i + 1]!;
    const t = (start + end) / 2;
    const tasks: { taskId: string; required: number; workerIds: string[] }[] = [];
    const active = evidence.machineIntervals.filter(
      (r) => r.start === start && r.kind === 'produce',
    );
    for (const operation of ['TEF', 'GRIND', 'LASER', 'WRAP']) {
      const count = active.filter((r) => r.machineId.startsWith(`${operation}-`)).length;
      const required =
        operation === 'TEF' ? count * 2 : operation === 'WRAP' ? Math.ceil(count / 3) : count;
      if (required) tasks.push({ taskId: `run:${operation}`, required, workerIds: [] });
    }
    const normal = tasks.reduce((n, task) => n + task.required, 0);
    for (const job of plan.jobs.filter(
      (j) => j.code.startsWith('VAL') && j.start <= t && t < j.end,
    )) {
      tasks.push({ taskId: `validate:${job.id}`, required: 1, workerIds: [] });
    }
    let worker = 1;
    for (const task of tasks) {
      task.workerIds = Array.from(
        { length: task.required },
        () => `S${String(Math.floor(t / 630) + 1)}-${String(worker++)}`,
      );
      plan.assignments.push({ taskId: task.taskId, start, end, workerIds: [...task.workerIds] });
    }
    evidence.staffIntervals.push({
      start,
      end,
      normal,
      setup: 0,
      validation: tasks.length - tasks.filter((task) => task.taskId.startsWith('run')).length,
      total: worker - 1,
      available: 40,
      tasks,
    });
  }
  evidence.jobs = plan.jobs
    .map((job) => {
      const interrupted =
        job.code.startsWith('VAL') &&
        events.some(
          (event) =>
            event.kind === 'failure' &&
            event.machineId === job.machineId &&
            job.start < 270 &&
            job.end > 120,
        );
      return {
        jobId: job.id,
        code: job.code,
        machineId: job.machineId,
        creditedMinutes:
          job.end -
          job.start -
          (interrupted ? Math.min(job.end, 270) - Math.max(job.start, 120) : 0),
        complete: !interrupted,
        issues: interrupted ? ['VALIDATION_OUTPUT'] : [],
      };
    })
    .sort((a, b) => (a.jobId < b.jobId ? -1 : 1));
  if (evidence.jobs.some((j) => !j.complete))
    evidence.issues.push({
      code: 'VALIDATION_OUTPUT',
      message: 'Interrupted validation',
      severity: 'error',
      refs: [],
      start: 120,
      end: 270,
    });
  return { plan, evidence, events };
}

type Witness = ReturnType<typeof witness>;
function check(value: Witness) {
  return checkJobs(value.evidence, value.plan, value.events);
}

describe('independent job witness checker rejects fabricated success without evaluate mocks', () => {
  test('all nine work codes and twelve distinct required jobs have witnessed credit', () => {
    const coverage = check(witness());
    expect(coverage).toHaveLength(9);
    expect(coverage.reduce((n, c) => n + c.complete, 0)).toBe(12);
    expect(coverage.every((c) => c.complete === c.required)).toBe(true);
  });
  test('explicit maintenance overlapping repair is credited once, never repair alone', () => {
    const value = witness(
      (p) =>
        Object.assign(
          p.jobs.find((j) => j.id === 'to2')!,
          { start: 200, end: 440 },
        ),
      [{ kind: 'failure', machineId: 'GRIND-2' }],
    );
    expect(() => check(value)).not.toThrow();
    expect(value.evidence.jobs.find((j) => j.jobId === 'to2')!.creditedMinutes).toBe(240);
  });
  test('honestly interrupted validation has bounded partial credit and remains incomplete', () => {
    const value = witness(undefined, [{ kind: 'failure', machineId: 'GRIND-4' }]);
    expect(check(value).find((c) => c.code === 'VAL-2')!.complete).toBe(1);
  });
  test('parallel validation needs two distinct extras, not two references to one worker', () => {
    const value = witness((p) =>
      Object.assign(
        p.jobs.find((j) => j.id === 'v2a')!,
        { start: 240, end: 420 },
      ),
    );
    expect(() => check(value)).not.toThrow();
    const staff = value.evidence.staffIntervals.find((r) => r.start === 240)!;
    const id = staff.tasks.find((task) => task.taskId === 'validate:v2a')!.workerIds[0]!;
    staff.tasks.find((task) => task.taskId === 'validate:v2b')!.workerIds = [id];
    value.plan.assignments.find((a) => a.start === 240 && a.taskId === 'validate:v2b')!.workerIds =
      [id];
    expect(() => check(value)).toThrow();
  });
  const corruptions: [string, (value: Witness) => void][] = [
    [
      'missing job result',
      (v) => {
        v.evidence.jobs.pop();
      },
    ],
    [
      'duplicate job result',
      (v) => {
        v.evidence.jobs.push({ ...v.evidence.jobs[0]! });
      },
    ],
    [
      'wrong result code',
      (v) => {
        v.evidence.jobs[0]!.code = 'TO-5';
      },
    ],
    [
      'wrong result machine',
      (v) => {
        v.evidence.jobs[0]!.machineId = 'PRESS-2';
      },
    ],
    [
      'invented work minutes',
      (v) => {
        v.evidence.jobs[0]!.creditedMinutes++;
      },
    ],
    [
      'maintenance secretly produces',
      (v) => {
        const row = v.evidence.machineIntervals.find((r) => r.kind === 'maintenance')!;
        row.kind = 'produce';
        row.rate = 0.1;
        row.quantity = 0.1 * (row.end - row.start);
      },
    ],
    [
      'missing maintenance annotation',
      (v) => {
        v.evidence.machineIntervals.find((r) => r.kind === 'maintenance')!.jobIds = [];
      },
    ],
    [
      'starved validation',
      (v) => {
        const row = v.evidence.machineIntervals.find(
          (r) => r.machineId === 'TEF-1' && r.kind === 'produce',
        )!;
        row.kind = 'idle';
        row.rate = 0;
        row.quantity = 0;
      },
    ],
    [
      'wrong validation product',
      (v) => {
        v.evidence.machineIntervals.find(
          (r) => r.machineId === 'TEF-1' && r.kind === 'produce',
        )!.product = 'B';
      },
    ],
    [
      'missing machine slice',
      (v) => {
        v.evidence.machineIntervals = v.evidence.machineIntervals.filter(
          (r) => !(r.machineId === 'TEF-1' && r.start === 0),
        );
      },
    ],
    [
      'missing validation extra',
      (v) => {
        v.plan.assignments = v.plan.assignments.filter((a) => a.taskId !== 'validate:v1');
      },
    ],
    [
      'missing normal coverage',
      (v) => {
        v.evidence.staffIntervals[0]!.tasks.find((t) => t.taskId === 'run:TEF')!.workerIds = [];
      },
    ],
    [
      'extra worker double booked as normal',
      (v) => {
        const id = v.evidence.staffIntervals[0]!.tasks.find((t) => t.taskId === 'run:TEF')!
          .workerIds[0]!;
        v.evidence.staffIntervals[0]!.tasks.find((t) => t.taskId === 'validate:v1')!.workerIds = [
          id,
        ];
        v.plan.assignments.find((a) => a.start === 0 && a.taskId === 'validate:v1')!.workerIds = [
          id,
        ];
      },
    ],
    [
      'false incomplete flag on valid work',
      (v) => {
        v.evidence.jobs[0]!.complete = false;
      },
    ],
  ];
  test.each(corruptions)('%s', (_name, corrupt) => {
    const value = witness();
    corrupt(value);
    expect(() => check(value)).toThrow();
  });
  test.each(['missing code', 'same machine twice', 'wrong window', 'wrong duration'])(
    '%s cannot masquerade as mandatory coverage',
    (kind) => {
      const value = witness((p) => {
        if (kind === 'missing code') p.jobs = p.jobs.filter((j) => j.code !== 'TO-2');
        if (kind === 'same machine twice')
          p.jobs.find((j) => j.id === 'v2b')!.machineId = 'GRIND-4';
        if (kind === 'wrong window')
          Object.assign(
            p.jobs.find((j) => j.id === 'v3')!,
            { start: 1020, end: 1260 },
          );
        if (kind === 'wrong duration') p.jobs.find((j) => j.id === 'v1')!.end--;
      });
      expect(() => check(value)).toThrow();
    },
  );
  test('disconnected fragments cannot be falsely reported complete', () => {
    const value = witness(undefined, [{ kind: 'failure', machineId: 'GRIND-4' }]);
    const job = value.evidence.jobs.find((j) => j.jobId === 'v2a')!;
    job.complete = true;
    job.creditedMinutes = 180;
    expect(() => check(value)).toThrow();
  });
  test('the absent highest S2 worker cannot witness cross-shift validation', () => {
    const value = witness(
      (p) =>
        Object.assign(
          p.jobs.find((j) => j.id === 'v1')!,
          { start: 600, end: 840 },
        ),
      [{ kind: 'failure', machineId: 'GRIND-1' }, { kind: 'absence' }],
    );
    const assignment = value.plan.assignments.find(
      (a) => a.start === 630 && a.taskId === 'validate:v1',
    )!;
    assignment.workerIds = ['S2-40'];
    value.evidence.staffIntervals
      .find((r) => r.start === 630)!
      .tasks.find((t) => t.taskId === 'validate:v1')!.workerIds = ['S2-40'];
    expect(() => check(value)).toThrow();
  });
});
